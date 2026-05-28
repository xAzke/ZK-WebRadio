using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeezNET;
using DeezNET.Data;
using Grpc.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using Webradio.Service;
using static Webradio.Service.Webradio;

namespace DeezerService;

public sealed class DeezerService : WebradioBase
{
    private readonly DeezerClient _defaultClient;
    private readonly ConcurrentDictionary<string, DeezerClient> _clients = new();
    private readonly ILogger<DeezerService> logger;
    private readonly string cacheDirectory;
    private readonly ConcurrentDictionary<long, DateTime> _failedTracks = new();
    private readonly ConcurrentDictionary<long, SemaphoreSlim> _downloadLocks = new();
    private readonly TimeSpan _failedTrackCacheDuration = TimeSpan.FromHours(6);

    public DeezerService(DeezerClient client, ILogger<DeezerService> logger, IConfiguration configuration)
    {
        this._defaultClient = client;
        this.logger = logger;
        
        // Create cache directory for downloaded tracks
        var cacheDir = configuration["CacheDirectory"];
        cacheDirectory = !string.IsNullOrWhiteSpace(cacheDir) ? cacheDir : Path.Combine(Path.GetTempPath(), "deezer-cache");
        if (!Directory.Exists(cacheDirectory))
        {
            Directory.CreateDirectory(cacheDirectory);
        }
        
        logger.LogInformation("Deezer cache directory: {CacheDirectory}", cacheDirectory);
    }

    private async Task<DeezerClient> GetClientAsync(string requestArl)
    {
        if (string.IsNullOrWhiteSpace(requestArl))
        {
            return _defaultClient;
        }

        if (_clients.TryGetValue(requestArl, out var cachedClient))
        {
            return cachedClient;
        }

        var newClient = new DeezerClient();
        try
        {
            await newClient.SetARL(requestArl);
            _clients[requestArl] = newClient;
            logger.LogInformation("Successfully initialized new dynamic DeezerClient for ARL");
            return newClient;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to initialize dynamic DeezerClient with ARL");
            throw new RpcException(new Status(StatusCode.Unauthenticated, "ARL token is invalid or expired"));
        }
    }

    public override Task<Configuration> GetConfiguration(ConfigurationRequest request, ServerCallContext context)
    {
        return Task.FromResult(new Configuration
        {
            SearchExpirationInSeconds = Convert.ToInt64(TimeSpan.FromDays(7).TotalSeconds),
            StreamExpirationInSeconds = Convert.ToInt64(TimeSpan.FromHours(24).TotalSeconds), // Cached files last 24h
        });
    }

    public async override Task<SearchResponse> Search(SearchRequest request, ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return SearchFailure("query is empty");
        }

        try
        {
            var clientInstance = await GetClientAsync(request.Arl);
            var searchResult = await clientInstance.PublicApi.SearchTrack(request.Query, limit: 50);

            if (searchResult == null || searchResult["data"] == null)
            {
                return SearchFailure("no results found");
            }

            var response = new SearchResponse
            {
                Status = new ResponseStatus { Success = true }
            };

            var tracks = searchResult["data"] as JArray;
            if (tracks != null)
            {
                foreach (var track in tracks)
                {
                    var durationSeconds = track["duration"]?.Value<long>() ?? 0;
                    var minutes = durationSeconds / 60;
                    var seconds = durationSeconds % 60;
                    
                    response.Items.Add(new SearchResponseItem
                    {
                        Id = track["id"]?.ToString() ?? "",
                        Title = track["title"]?.ToString() ?? "",
                        Duration = durationSeconds,
                        DurationFormatted = $"{minutes}:{seconds:D2}",
                        Artist = track["artist"]?["name"]?.ToString() ?? "",
                        CoverUrl = track["album"]?["cover_medium"]?.ToString() ?? track["album"]?["cover"]?.ToString() ?? "",
                    });
                }
            }

            logger.LogInformation("Search for '{Query}' returned {Count} results", request.Query, response.Items.Count);
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error searching for '{Query}'", request.Query);
            return SearchFailure($"search error: {ex.Message}");
        }
    }

    public override async Task<StreamResponse> Stream(StreamRequest request, ServerCallContext context)
    {
        if (!long.TryParse(request.Id, out long trackId))
        {
            return StreamFailure("invalid track id");
        }

        try
        {
            // Acquire per-track lock to prevent concurrent downloads of the same track
            var downloadLock = _downloadLocks.GetOrAdd(trackId, _ => new SemaphoreSlim(1, 1));
            await downloadLock.WaitAsync();
            
            try
            {
            // Check if file is already cached (re-check after acquiring lock)
            string cachedFilePath = Path.Combine(cacheDirectory, $"{trackId}.mp3");
            
            if (!File.Exists(cachedFilePath))
            {
                logger.LogInformation("Downloading track {TrackId}...", trackId);
                
                // Use temp file to avoid serving incomplete files
                string tempFilePath = cachedFilePath + ".downloading";
                
                // Download the full track using the Downloader (requires ARL)
                // Try lower quality first (more likely to work with free accounts)
                bool downloaded = false;
                Bitrate[] bitratesToTry = { Bitrate.MP3_128, Bitrate.MP3_320 };
                var clientInstance = await GetClientAsync(request.Arl);
                
                foreach (var bitrate in bitratesToTry)
                {
                    try
                    {
                        logger.LogDebug("Trying bitrate {Bitrate}...", bitrate);
                        await clientInstance.Downloader.WriteRawTrackToFile(
                            trackId, 
                            tempFilePath, 
                            bitrate
                        );
                        
                        // Rename temp file to final name (atomic operation)
                        if (File.Exists(tempFilePath))
                        {
                            File.Move(tempFilePath, cachedFilePath, true);
                        }
                        
                        logger.LogInformation("Track {TrackId} downloaded successfully at {Bitrate}", trackId, bitrate);
                        downloaded = true;
                        break;
                    }
                    catch (Exception bitrateEx)
                    {
                        logger.LogWarning("Bitrate {Bitrate} failed for track {TrackId}: [{ExType}] {Message}", bitrate, trackId, bitrateEx.GetType().Name, bitrateEx.Message);
                        // Clean up temp file on failure
                        try { if (File.Exists(tempFilePath)) File.Delete(tempFilePath); } catch { }
                    }
                }
                
                if (!downloaded)
                {
                    _failedTracks[trackId] = DateTime.UtcNow;
                    logger.LogWarning("All bitrates failed for track {TrackId}, cached as unavailable for {Hours}h", trackId, _failedTrackCacheDuration.TotalHours);
                    
                    // Return as failure - preview only gives 30 seconds which is not acceptable
                    return StreamFailure($"download failed: track {trackId} unavailable");
                }
            }
            else
            {
                logger.LogDebug("Track {TrackId} served from cache", trackId);
            }

            // Return the local file URL (served by the static files middleware)
            // The webradio service will need to serve these files or we return a direct path
            return new StreamResponse
            {
                Status = new ResponseStatus { Success = true },
                Url = $"file:///{cachedFilePath.Replace("\\", "/")}",
            };
            }
            finally
            {
                downloadLock.Release();
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error streaming track {TrackId}", trackId);
            return StreamFailure($"stream error: {ex.Message}");
        }
    }

    private SearchResponse SearchFailure(string errorMessage)
    {
        return new SearchResponse
        {
            Status = new ResponseStatus
            {
                Success = false,
                ErrorMessage = string.IsNullOrWhiteSpace(errorMessage) ? "unknown error" : errorMessage,
            }
        };
    }

    private StreamResponse StreamFailure(string errorMessage)
    {
        return new StreamResponse
        {
            Status = new ResponseStatus
            {
                Success = false,
                ErrorMessage = string.IsNullOrWhiteSpace(errorMessage) ? "unknown error" : errorMessage,
            }
        };
    }
}
