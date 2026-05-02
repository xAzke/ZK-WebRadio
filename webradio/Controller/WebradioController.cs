using System;
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

    public WebradioController(
        ILogger<WebradioController> logger, 
        IDistributedCache cache, 
        IServiceManager services, 
        IStatsService statsService,
        ITrackMetadataService trackMetadataService,
        IHttpClientFactory httpClientFactory)
    {
        this.logger = logger;
        this.cache = cache;
        this.services = services;
        this.statsService = statsService;
        this.trackMetadataService = trackMetadataService;
        this.httpClientFactory = httpClientFactory;
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
    public async Task<ActionResult> Search([FromRoute] string serviceName, [FromQuery] string query)
    {
        // Check if parameters fulfill our basic requirements
        if (string.IsNullOrWhiteSpace(serviceName))
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(query))
        {
            return NotFound();
        }

        logger.LogInformation("{UserIdentity} @ {RemoteIpAddress} -> {Path}{Query}",
            User.Identity?.Name, HttpContext.Connection.RemoteIpAddress, Request.Path, Request.QueryString);

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
            logger.LogError("Search: Cache took too long to respond (> 1 second) [key: {Key}]", cacheKey);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Search: Cache threw an exception for data lookup [key: {Key}]", cacheKey);
        }

        if (!string.IsNullOrWhiteSpace(cacheValue))
        {
            try
            {
                var items = JsonConvert.DeserializeObject<RepeatedField<SearchResponseItem>>(cacheValue);

                return new JsonResult(new
                {
                    success = true,
                    items,
                });
            }
            catch (JsonReaderException readerException)
            {
                logger.LogError(readerException, "{Service} threw an exception during cache deserialization", serviceName);
                RemoveCacheString(cacheKey);
            }
        }

        // Use the respective service client to fetch data from a remote api or remote service
        WebradioService? service = services.GetService(serviceName);

        if (service == null)
        {
            return SearchFailure("service is not supported");
        }

        SearchResponse response;

        try
        {
            using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(SearchRequestTimeoutInSeconds));
            response = await service.Client.SearchAsync(new SearchRequest { Query = query }, cancellationToken: cancellationTokenSource.Token);
        }
        catch (OperationCanceledException)
        {
            logger.LogError("Search: {Service} took too long to respond (> {Timeout} seconds)", serviceName, SearchRequestTimeoutInSeconds);
            return SearchFailure($"service timeout reached after {SearchRequestTimeoutInSeconds} seconds");
        }
        catch (RpcException exception)
        {
            logger.LogError(exception, "{Service} threw an exception", serviceName);
            return SearchFailure("service is out of order");
        }

        // Check the response from the service
        if (response.Status == null || response.Items == null || !response.Status.Success)
        {
            return SearchFailure(response.Status?.ErrorMessage ?? "Unknown error");
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

        // Record stats
        _ = statsService.RecordRequest(
            User.Identity?.Name ?? "Anonymous",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            "search",
            serviceName,
            Request.Headers["User-Agent"].ToString()
        );

        return new JsonResult(new
        {
            success = true,
            items = response.Items,
        });
    }

    [Authorize(AuthenticationSchemes = Auth.UserAgentAuthenticationOptions.DefaultScheme)]
    [HttpGet("{serviceName}/stream/{id}")]
    public async Task<ActionResult> Stream([FromRoute] string serviceName, [FromRoute] string id)
    {
        // Check if parameters fulfill our basic requirements
        if (string.IsNullOrWhiteSpace(serviceName))
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return NotFound();
        }

        logger.LogInformation("{RemoteIpAddress} @ {UserIdentity} -> {Path}{Query}",
            HttpContext.Connection.RemoteIpAddress, User.Identity?.Name, Request.Path, Request.QueryString);

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
            logger.LogError("Stream: Cache took too long to respond (> 1 second) [key: {Key}]", cacheKey);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Stream: Cache threw an exception for data lookup [key: {Key}]", cacheKey);
        }

        if (!string.IsNullOrWhiteSpace(cacheValue))
        {
            // Handle cached file:// URLs - serve directly
            if (cacheValue.StartsWith("file:///"))
            {
                string filePath = cacheValue.Replace("file:///", "");
                // On Linux, add leading slash; on Windows, keep as-is
                if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                    filePath = "/" + filePath;
                
                // Retry logic for files that might be briefly locked
                for (int attempt = 0; attempt < 5; attempt++)
                {
                    if (System.IO.File.Exists(filePath))
                    {
                        try
                        {
                            var fileStream = new System.IO.FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite);
                            return File(fileStream, "audio/mpeg", enableRangeProcessing: true);
                        }
                        catch (System.IO.IOException) when (attempt < 4)
                        {
                            System.Threading.Thread.Sleep(200);
                        }
                    }
                    else if (attempt < 4)
                    {
                        System.Threading.Thread.Sleep(200);
                    }
                }
            }
            else
            {
                return Redirect(cacheValue);
            }
        }

        // Use the respective service client to fetch data from a remote api or remote service
        WebradioService? service = services.GetService(serviceName);

        if (service == null)
        {
            return SearchFailure("service is not supported");
        }
        
        StreamResponse response;

        try
        {
            using CancellationTokenSource cancellationTokenSource = new(TimeSpan.FromSeconds(StreamRequestTimeoutInSeconds));
            response = await service.Client.StreamAsync(new StreamRequest { Id = id }, cancellationToken: cancellationTokenSource.Token);
        }
        catch (OperationCanceledException)
        {
            logger.LogError("Stream: {Service} took too long to respond (> {Timeout} seconds)", serviceName, SearchRequestTimeoutInSeconds);
            return NotFound();
        }
        catch (RpcException exception)
        {
            logger.LogError(exception, "Stream: {Service} threw an exception", serviceName);
            return NotFound();
        }

        // Check the response from the service
        if (response.Status == null || !response.Status.Success || string.IsNullOrWhiteSpace(response.Url))
        {
            // Record failure
            _ = Task.Run(async () =>
            {
                try
                {
                    string metadataCacheKey = $"track_meta:{serviceName}:{id}";
                    string? cachedMeta = await cache.GetStringAsync(metadataCacheKey);
                    
                    string title = "Unknown";
                    string artist = "Unknown";

                    if (!string.IsNullOrEmpty(cachedMeta))
                    {
                        try
                        {
                            SearchResponseItem? meta = JsonConvert.DeserializeObject<SearchResponseItem>(cachedMeta);
                            if (meta != null)
                            {
                                title = meta.Title;
                                artist = meta.Artist;
                            }
                        }
                        catch { /* ignore */ }
                    }

                    // Fallback: fetch from Deezer public API if still Unknown
                    if (title == "Unknown" || artist == "Unknown")
                    {
                        var (apiTitle, apiArtist, _) = await FetchTrackMetadataAsync(serviceName, id);
                        title = apiTitle;
                        artist = apiArtist;
                    }

                    await trackMetadataService.RecordFailureAsync(
                        trackId: $"{serviceName}:{id}",
                        title: title,
                        artist: artist
                    );
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to record track failure for {Id}", id);
                }
            });

            return NotFound();
        }

        // Record stats
        _ = statsService.RecordRequest(
            User.Identity?.Name ?? "Anonymous",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            "stream",
            serviceName,
            Request.Headers["User-Agent"].ToString(),
            id
        );

        // Record track play - try to find metadata from search cache
        _ = Task.Run(async () =>
        {
            try
            {
                // Try to find track metadata in cache (from previous search)
                string metadataCacheKey = $"track_meta:{serviceName}:{id}";
                string? cachedMeta = null;
                
                try
                {
                    cachedMeta = await cache.GetStringAsync(metadataCacheKey);
                }
                catch { /* ignore cache errors */ }

                string title = "Unknown";
                string artist = "Unknown";
                string? coverUrl = null;

                if (!string.IsNullOrEmpty(cachedMeta))
                {
                    try
                    {
                        SearchResponseItem? meta = JsonConvert.DeserializeObject<SearchResponseItem>(cachedMeta);
                        if (meta != null)
                        {
                            title = meta.Title;
                            artist = meta.Artist;
                            coverUrl = meta.CoverUrl;
                        }
                    }
                    catch { /* ignore parse errors */ }
                }

                // Fallback: fetch from Deezer public API if still Unknown
                if (title == "Unknown" || artist == "Unknown")
                {
                    var (apiTitle, apiArtist, apiCover) = await FetchTrackMetadataAsync(serviceName, id);
                    title = apiTitle;
                    artist = apiArtist;
                    coverUrl = apiCover ?? coverUrl;
                }

                await trackMetadataService.RecordPlayAsync(
                    trackId: $"{serviceName}:{id}",
                    title: title,
                    artist: artist,
                    albumCover: coverUrl,
                    previewUrl: null
                );
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to record track play for {Id}", id);
            }
        });

        SetCacheString(cacheKey, response.Url, service.Configuration.StreamExpirationInSeconds);
        
        // Check if the URL is a local file path (file:///) - serve directly instead of redirect
        if (response.Url.StartsWith("file:///"))
        {
            string filePath = response.Url.Replace("file:///", "");
            // On Linux, add leading slash; on Windows, keep as-is
            if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                filePath = "/" + filePath;
            
            // Retry logic for files that might be briefly locked
            for (int attempt = 0; attempt < 10; attempt++)
            {
                if (System.IO.File.Exists(filePath))
                {
                    try
                    {
                        logger.LogInformation("Serving local file: {FilePath}", filePath);
                        var fileStream = new System.IO.FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite);
                        return File(fileStream, "audio/mpeg", enableRangeProcessing: true);
                    }
                    catch (System.IO.IOException) when (attempt < 9)
                    {
                        // File might be locked by deezer-service writing it, wait and retry
                        logger.LogDebug("File locked, retrying... (attempt {Attempt}/10)", attempt + 1);
                        await Task.Delay(500);
                    }
                }
                else if (attempt < 9)
                {
                    // File might be being written, wait and retry
                    await Task.Delay(500);
                }
            }
            
            logger.LogError("Local file not found or locked after 10 retries: {FilePath}", filePath);
            return NotFound();
        }
        
        return Redirect(response.Url);
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
