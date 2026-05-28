using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Google.Protobuf.Collections;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Webradio.Data;
using Webradio.Service;

namespace Webradio.Controller;

[ApiController]
public class WebradioController : ControllerBase
{
    private const double SearchRequestTimeoutInSeconds = 7;
    private const double StreamRequestTimeoutInSeconds = 7;

    private readonly ILogger<WebradioController> logger;
    private readonly IDistributedCache cache;
    private readonly IServiceManager services;
    private readonly IStatsService statsService;
    private readonly ITrackMetadataService trackMetadataService;
    private readonly IHttpClientFactory httpClientFactory;
    private readonly IDeezerAccountStore deezerAccountStore;

    public WebradioController(
        ILogger<WebradioController> logger, 
        IDistributedCache cache, 
        IServiceManager services, 
        IStatsService statsService,
        ITrackMetadataService trackMetadataService,
        IHttpClientFactory httpClientFactory,
        IDeezerAccountStore deezerAccountStore)
    {
        this.logger = logger;
        this.cache = cache;
        this.services = services;
        this.statsService = statsService;
        this.trackMetadataService = trackMetadataService;
        this.httpClientFactory = httpClientFactory;
        this.deezerAccountStore = deezerAccountStore;
    }

    /// <summary>
    /// Fetches track metadata from Deezer's public API and caches it
    /// </summary>
    private async Task<(string title, string artist, string? coverUrl)> FetchTrackMetadataAsync(string serviceName, string id)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(3);
            
            var responseStr = await httpClient.GetStringAsync($"https://api.deezer.com/track/{id}");
            var json = JObject.Parse(responseStr);
            
            // Check for API errors
            if (json["error"] != null) return ("Unknown", "Unknown", null);
            
            var trackTitle = json["title"]?.ToString() ?? "Unknown";
            var trackArtist = json["artist"]?["name"]?.ToString() ?? "Unknown";
            var trackCover = json["album"]?["cover_medium"]?.ToString();
            
            // Cache it for future use
            if (trackTitle != "Unknown")
            {
                string metaCacheKey = $"track_meta:{serviceName}:{id}";
                var metaItem = new SearchResponseItem
                {
                    Id = id,
                    Title = trackTitle,
                    Artist = trackArtist,
                    CoverUrl = trackCover ?? "",
                    Duration = json["duration"]?.Value<long>() ?? 0,
                };
                SetCacheString(metaCacheKey, JsonConvert.SerializeObject(metaItem), 60 * 60 * 24 * 7); // 7 days
            }
            
            return (trackTitle, trackArtist, trackCover);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Failed to fetch metadata from Deezer API for track {Id}", id);
            return ("Unknown", "Unknown", null);
        }
    }

    [Authorize(AuthenticationSchemes = Auth.ApiKeyAuthenticationOptions.DefaultScheme)]
    [HttpGet("{serviceName}/search")]
    public async Task<ActionResult> Search([FromRoute] string serviceName, [FromQuery] string? query)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString()[..8];

        using (logger.BeginScope(new System.Collections.Generic.Dictionary<string, object> { ["RequestId"] = requestId, ["Service"] = serviceName }))
        {
            // Check if parameters fulfill our basic requirements
            if (string.IsNullOrWhiteSpace(serviceName) || string.IsNullOrWhiteSpace(query))
            {
                logger.LogWarning("Search: Invalid parameters received (Service: {Service}, Query: {Query})", serviceName, query);
                return NotFound();
            }

            logger.LogInformation("Search request started for query '{Query}' by {UserIdentity} from {RemoteIpAddress}",
                query, User.Identity?.Name ?? "Anonymous", HttpContext.Connection.RemoteIpAddress);

            // Use the cache before contacting the requested service
            string cacheKey = GenerateCacheKey("search", serviceName, query);
            string? cacheValue = null;

            try
            {
                using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(1));
                cacheValue = await cache.GetStringAsync(cacheKey, cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                logger.LogError("Search: Cache timeout (> 1s) for key {Key}", cacheKey);
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Search: Cache error for key {Key}", cacheKey);
            }

            if (!string.IsNullOrWhiteSpace(cacheValue))
            {
                try
                {
                    var items = JsonConvert.DeserializeObject<RepeatedField<SearchResponseItem>>(cacheValue);
                    sw.Stop();
                    logger.LogInformation("Search: Cache HIT for '{Query}'. Found {Count} items. Elapsed: {Elapsed}ms", 
                        query, items?.Count ?? 0, sw.ElapsedMilliseconds);

                    return new JsonResult(new { success = true, items });
                }
                catch (JsonReaderException readerException)
                {
                    logger.LogError(readerException, "Search: Cache deserialization failed for {Service}", serviceName);
                    RemoveCacheString(cacheKey);
                }
            }

            logger.LogDebug("Search: Cache MISS for '{Query}'. Fetching from service...", query);

            // Use the respective service client to fetch data from a remote api or remote service
            WebradioService? service = services.GetService(serviceName);

            if (service == null)
            {
                logger.LogWarning("Search: Unsupported service requested: {Service}", serviceName);
                return SearchFailure("service is not supported");
            }

            SearchResponse response;
            string arl = "";
            DeezerAccountEntity? activeAccount = null;

            if (serviceName.Equals("deezer", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    activeAccount = await deezerAccountStore.GetActiveAccountAsync();
                    if (activeAccount != null)
                    {
                        arl = activeAccount.Arl;
                        await deezerAccountStore.IncrementRequestCountAsync(activeAccount.Id);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error fetching active Deezer account for search.");
                }
            }

            try
            {
                using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(SearchRequestTimeoutInSeconds));
                response = await service.Client.SearchAsync(new SearchRequest { Query = query, Arl = arl }, cancellationToken: cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                logger.LogError("Search: {Service} timeout reached (> {Timeout}s) for query '{Query}'", 
                    serviceName, SearchRequestTimeoutInSeconds, query);
                return SearchFailure($"service timeout reached after {SearchRequestTimeoutInSeconds} seconds");
            }
            catch (RpcException exception)
            {
                logger.LogError(exception, "Search: gRPC error from {Service} for query '{Query}'", serviceName, query);
                
                // If it fails with validation/auth exception, mark the account inactive
                if (activeAccount != null && (exception.Status.Detail.Contains("ARL token is invalid") || exception.Status.Detail.Contains("expired")))
                {
                    logger.LogWarning("Deactivating invalid ARL during gRPC search exception for user: {Username}", activeAccount.Username);
                    await deezerAccountStore.SetActiveStatusAsync(activeAccount.Id, false);
                }
                
                return SearchFailure("service is out of order");
            }

            // Check the response from the service
            if (response.Status == null || response.Items == null || !response.Status.Success)
            {
                var errorMsg = response.Status?.ErrorMessage ?? "Unknown error";
                logger.LogWarning("Search: Service {Service} returned error: {Error}", serviceName, errorMsg);
                
                if (activeAccount != null && (errorMsg.Contains("ARL token is invalid") || errorMsg.Contains("expired")))
                {
                    logger.LogWarning("Deactivating invalid ARL during search response for user: {Username}", activeAccount.Username);
                    await deezerAccountStore.SetActiveStatusAsync(activeAccount.Id, false);
                }

                return SearchFailure(errorMsg);
            }

            if (response.Items.Count > 0)
            {
                SetCacheString(cacheKey, JsonConvert.SerializeObject(response.Items), service.Configuration.SearchExpirationInSeconds);
                
                // Cache individual track metadata for later use in stream
                foreach (var item in response.Items)
                {
                    string metaCacheKey = $"track_meta:{serviceName}:{item.Id}";
                    SetCacheString(metaCacheKey, JsonConvert.SerializeObject(item), 60 * 60 * 24); // 24 hours
                }
            }

            sw.Stop();
            logger.LogInformation("Search: COMPLETED for '{Query}'. Found {Count} items. Provider: {Service}. Elapsed: {Elapsed}ms", 
                query, response.Items.Count, serviceName, sw.ElapsedMilliseconds);

            // Record stats
            _ = statsService.RecordRequest(
                User.Identity?.Name ?? "Anonymous",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                "search",
                serviceName,
                Request.Headers["User-Agent"].ToString()
            );

            return new JsonResult(new { success = true, items = response.Items });
        }
    }

    [Authorize(AuthenticationSchemes = Auth.UserAgentAuthenticationOptions.DefaultScheme)]
    [HttpGet("{serviceName}/stream/{id}")]
    public async Task<ActionResult> Stream([FromRoute] string serviceName, [FromRoute] string? id)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString()[..8];

        using (logger.BeginScope(new System.Collections.Generic.Dictionary<string, object> { ["RequestId"] = requestId, ["Service"] = serviceName, ["TrackId"] = id }))
        {
            // Check if parameters fulfill our basic requirements
            if (string.IsNullOrWhiteSpace(serviceName) || string.IsNullOrWhiteSpace(id))
            {
                logger.LogWarning("Stream: Invalid parameters received (Service: {Service}, Id: {Id})", serviceName, id);
                return NotFound();
            }

            logger.LogInformation("Stream request started for track {Id} by {UserIdentity} from {RemoteIpAddress}",
                id, User.Identity?.Name ?? "Anonymous", HttpContext.Connection.RemoteIpAddress);

            // Use the cache before contacting the requested service
            string cacheKey = GenerateCacheKey("stream", serviceName, id);
            string? cacheValue = null;

            try
            {
                using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(1));
                cacheValue = await cache.GetStringAsync(cacheKey, cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                logger.LogError("Stream: Cache timeout (> 1s) for track {Id}", id);
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Stream: Cache error for track {Id}", id);
            }

            if (!string.IsNullOrWhiteSpace(cacheValue))
            {
                sw.Stop();
                logger.LogInformation("Stream: Cache HIT for track {Id}. Elapsed: {Elapsed}ms", id, sw.ElapsedMilliseconds);

                // Handle cached file:// URLs - serve directly
                if (cacheValue.StartsWith("file:///"))
                {
                    string filePath = cacheValue.Replace("file:///", "");
                    // On Linux, add leading slash; on Windows, keep as-is
                    if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                        filePath = "/" + filePath;
                    
                    // Retry logic for files that might be briefly locked
                    for (int attempt = 0; attempt < 15; attempt++)
                    {
                        if (System.IO.File.Exists(filePath))
                        {
                            try
                            {
                                var fileStream = new System.IO.FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite);
                                return File(fileStream, "audio/mpeg", enableRangeProcessing: true);
                            }
                            catch (System.IO.IOException) when (attempt < 14)
                            {
                                logger.LogDebug("Stream: File {Path} locked, retrying ({Attempt}/15)...", filePath, attempt + 1);
                                await Task.Delay(300);
                            }
                        }
                        else if (attempt < 14)
                        {
                            await Task.Delay(300);
                        }
                    }
                    logger.LogWarning("Stream: Cached file {Path} not found or locked after retries", filePath);
                }
                else
                {
                    return Redirect(cacheValue);
                }
            }

            logger.LogDebug("Stream: Cache MISS for track {Id}. Fetching from service...", id);

            // Use the respective service client to fetch data from a remote api or remote service
            WebradioService? service = services.GetService(serviceName);

            if (service == null)
            {
                logger.LogWarning("Stream: Unsupported service requested: {Service}", serviceName);
                return SearchFailure("service is not supported");
            }
            
            StreamResponse response;
            string arl = "";
            DeezerAccountEntity? activeAccount = null;

            if (serviceName.Equals("deezer", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    activeAccount = await deezerAccountStore.GetActiveAccountAsync();
                    if (activeAccount != null)
                    {
                        arl = activeAccount.Arl;
                        await deezerAccountStore.IncrementRequestCountAsync(activeAccount.Id);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error fetching active Deezer account for stream.");
                }
            }

            try
            {
                using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(StreamRequestTimeoutInSeconds));
                response = await service.Client.StreamAsync(new StreamRequest { Id = id, Arl = arl }, cancellationToken: cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                logger.LogError("Stream: {Service} timeout reached (> {Timeout}s) for track {Id}", 
                    serviceName, StreamRequestTimeoutInSeconds, id);
                return NotFound();
            }
            catch (RpcException exception)
            {
                logger.LogError(exception, "Stream: gRPC error from {Service} for track {Id}", serviceName, id);
                
                if (activeAccount != null && (exception.Status.Detail.Contains("ARL token is invalid") || exception.Status.Detail.Contains("expired")))
                {
                    logger.LogWarning("Deactivating invalid ARL during gRPC stream exception for user: {Username}", activeAccount.Username);
                    await deezerAccountStore.SetActiveStatusAsync(activeAccount.Id, false);
                }

                return NotFound();
            }

            // Check the response from the service
            if (response.Status == null || !response.Status.Success || string.IsNullOrWhiteSpace(response.Url))
            {
                var errorMsg = response.Status?.ErrorMessage ?? "Empty URL";
                logger.LogWarning("Stream: Service {Service} failed to provide URL for {Id}. Error: {Error}", 
                    serviceName, id, errorMsg);
                
                if (activeAccount != null && (errorMsg.Contains("ARL token is invalid") || errorMsg.Contains("expired")))
                {
                    logger.LogWarning("Deactivating invalid ARL during stream response for user: {Username}", activeAccount.Username);
                    await deezerAccountStore.SetActiveStatusAsync(activeAccount.Id, false);
                }
                
                // Record failure (background)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        string metadataCacheKey = $"track_meta:{serviceName}:{id}";
                        string? cachedMeta = await cache.GetStringAsync(metadataCacheKey);
                        
                        string title = "Unknown", artist = "Unknown";
                        if (!string.IsNullOrEmpty(cachedMeta))
                        {
                            var meta = JsonConvert.DeserializeObject<SearchResponseItem>(cachedMeta);
                            title = meta?.Title ?? "Unknown";
                            artist = meta?.Artist ?? "Unknown";
                        }

                        if (title == "Unknown")
                        {
                            var (apiTitle, apiArtist, _) = await FetchTrackMetadataAsync(serviceName, id);
                            title = apiTitle; 
                            artist = apiArtist;
                        }

                        await trackMetadataService.RecordFailureAsync($"{serviceName}:{id}", title, artist);
                    }
                    catch (Exception ex) { logger.LogWarning(ex, "Stream: Background failure recording failed for {Id}", id); }
                });

                return NotFound();
            }

            sw.Stop();
            logger.LogInformation("Stream: COMPLETED for track {Id}. Type: {Type}. Elapsed: {Elapsed}ms", 
                id, response.Url.StartsWith("file://") ? "Local" : "Remote", sw.ElapsedMilliseconds);

            // Record stats & play (background)
            _ = statsService.RecordRequest(User.Identity?.Name ?? "Anonymous", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                "stream", serviceName, Request.Headers["User-Agent"].ToString(), id);

            _ = Task.Run(async () =>
            {
                try
                {
                    string metadataCacheKey = $"track_meta:{serviceName}:{id}";
                    string? cachedMeta = await cache.GetStringAsync(metadataCacheKey);
                    string title = "Unknown", artist = "Unknown", coverUrl = null;

                    if (!string.IsNullOrEmpty(cachedMeta))
                    {
                        var meta = JsonConvert.DeserializeObject<SearchResponseItem>(cachedMeta);
                        title = meta?.Title ?? "Unknown";
                        artist = meta?.Artist ?? "Unknown";
                        coverUrl = meta?.CoverUrl;
                    }

                    if (title == "Unknown")
                    {
                        var (apiTitle, apiArtist, apiCover) = await FetchTrackMetadataAsync(serviceName, id);
                        title = apiTitle; artist = apiArtist; coverUrl = apiCover;
                    }

                    await trackMetadataService.RecordPlayAsync($"{serviceName}:{id}", title, artist, coverUrl, null);
                }
                catch (Exception ex) { logger.LogWarning(ex, "Stream: Background play recording failed for {Id}", id); }
            });

            SetCacheString(cacheKey, response.Url, service.Configuration.StreamExpirationInSeconds);
            
            if (response.Url.StartsWith("file:///"))
            {
                string filePath = response.Url.Replace("file:///", "");
                if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                    filePath = "/" + filePath;
                
                for (int attempt = 0; attempt < 15; attempt++)
                {
                    if (System.IO.File.Exists(filePath))
                    {
                        try
                        {
                            logger.LogDebug("Stream: Serving local file {Path} (Attempt {Attempt}/15)", filePath, attempt + 1);
                            var fileStream = new System.IO.FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite);
                            return File(fileStream, "audio/mpeg", enableRangeProcessing: true);
                        }
                        catch (System.IO.IOException) when (attempt < 14)
                        {
                            await Task.Delay(300);
                        }
                    }
                    else if (attempt < 14)
                    {
                        await Task.Delay(300);
                    }
                }
                logger.LogError("Stream: Local file not found/locked after 10 retries: {Path}", filePath);
                return NotFound();
            }
            
            return Redirect(response.Url);
        }
    }

    [NonAction]
    private static ObjectResult SearchFailure(string error)
    {
        return new ObjectResult(new
        {
            success = false,
            error = string.IsNullOrWhiteSpace(error) ? "unknown error" : error,
        });
    }

    [NonAction]
    private static string GenerateCacheKey(string action, string service, string identifier)
    {
        byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{action}-{service}-{identifier.Trim().ToLower()}"));
        return BitConverter.ToString(hash);
    }

    [NonAction]
    private void SetCacheString(string key, string value, long expirationOffsetInSeconds)
    {
        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                var cacheOptions = new DistributedCacheEntryOptions()
                {
                    SlidingExpiration = TimeSpan.FromSeconds(expirationOffsetInSeconds),
                };

                using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(3));
                await cache.SetStringAsync(key, value, cacheOptions, cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                logger.LogError("SetCacheString: Cache took too long to respond (> 3 seconds) [key: {Key}]", key);
            }
            catch (Exception cacheException)
            {
                logger.LogError(cacheException, "SetCacheString: Cache threw an exception");
            }
        });
    }

    [NonAction]
    private void RemoveCacheString(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(1));
                await cache.RemoveAsync(key, cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                logger.LogError("RemoveCacheString: Cache took too long to respond (> 1 second)");
            }
            catch (Exception cacheException)
            {
                logger.LogError(cacheException, "RemoveCacheString: Cache threw an exception");
            }
        });
    }
}
