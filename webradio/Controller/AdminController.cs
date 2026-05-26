#nullable enable
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json.Linq;
using Webradio.Auth;
using Webradio.Data;
using Webradio.Service;

namespace Webradio.Controller;

[ApiController]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly IStatsService _statsService;
    private readonly IApiKeyStore _apiKeyStore;
    private readonly IDeezerAccountStore _deezerAccountStore;
    private readonly IDbContextFactory<WebradioDbContext> _contextFactory;
    private readonly IAdminAuthService _adminAuth;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _cacheDirectory;

    public AdminController(
        IStatsService statsService, 
        IApiKeyStore apiKeyStore,
        IDeezerAccountStore deezerAccountStore,
        IDbContextFactory<WebradioDbContext> contextFactory,
        IAdminAuthService adminAuth,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _statsService = statsService;
        _apiKeyStore = apiKeyStore;
        _deezerAccountStore = deezerAccountStore;
        _contextFactory = contextFactory;
        _adminAuth = adminAuth;
        _httpClientFactory = httpClientFactory;
        _cacheDirectory = configuration["CacheDirectory"] ?? (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows)
            ? System.IO.Path.Combine(System.IO.Path.GetTempPath(), "deezer-cache")
            : "/tmp/deezer-cache");
    }

    #region Stats Endpoints

    /// <summary>
    /// Get server statistics and metrics
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var stats = await _statsService.GetStats();
        return new JsonResult(stats);
    }

    /// <summary>
    /// Get top tracks with metadata (title, artist, preview)
    /// </summary>
    [HttpGet("tracks/top")]
    public async Task<ActionResult> GetTopTracks([FromQuery] int limit = 10)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        await using var context = await _contextFactory.CreateDbContextAsync();
        var tracks = await context.TrackMetadata
            .OrderByDescending(t => t.PlayCount)
            .Take(limit)
            .Select(t => new
            {
                t.TrackId,
                t.Title,
                t.Artist,
                t.AlbumCover,
                t.PreviewUrl,
                t.PlayCount,
                t.FailureCount,
                t.LastPlayedAt
            })
            .ToListAsync();

        return new JsonResult(tracks);
    }

    /// <summary>
    /// Get tracks with most failures (fell back to preview)
    /// </summary>
    [HttpGet("tracks/top-failures")]
    public async Task<ActionResult> GetTopFailures([FromQuery] int limit = 10)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        await using var context = await _contextFactory.CreateDbContextAsync();
        var tracks = await context.TrackMetadata
            .Where(t => t.FailureCount > 0)
            .OrderByDescending(t => t.FailureCount)
            .Take(limit)
            .Select(t => new
            {
                t.TrackId,
                t.Title,
                t.Artist,
                t.AlbumCover,
                t.PlayCount,
                t.FailureCount,
                FailureRatio = t.PlayCount + t.FailureCount > 0 
                    ? (double)t.FailureCount / (t.PlayCount + t.FailureCount) * 100 
                    : 0,
                t.LastPlayedAt
            })
            .ToListAsync();

        return new JsonResult(tracks);
    }

    /// <summary>
    /// Reset all failure counters
    /// </summary>
    [HttpDelete("stats/failures")]
    public async Task<ActionResult> ResetFailures()
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        await using var context = await _contextFactory.CreateDbContextAsync();
        await context.TrackMetadata
            .Where(t => t.FailureCount > 0)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.FailureCount, 0));

        return Ok(new { message = "Failure counters reset", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Fix tracks with 'Unknown' metadata by querying Deezer's public API
    /// </summary>
    [HttpPost("tracks/fix-unknown")]
    public async Task<ActionResult> FixUnknownTracks()
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        await using var context = await _contextFactory.CreateDbContextAsync();
        var unknownTracks = await context.TrackMetadata
            .Where(t => t.Title == "Unknown" || t.Artist == "Unknown")
            .ToListAsync();

        if (unknownTracks.Count == 0)
        {
            return Ok(new { message = "No tracks with Unknown metadata found", fixed_count = 0 });
        }

        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(10);
        int fixedCount = 0;
        int skippedCount = 0;

        foreach (var track in unknownTracks)
        {
            try
            {
                // Extract the numeric ID from "deezer:123456" format
                var parts = track.TrackId.Split(':');
                var deezerIdStr = parts.Length > 1 ? parts[1] : parts[0];
                
                // Retry with backoff for rate limiting
                string? responseStr = null;
                for (int attempt = 0; attempt < 3; attempt++)
                {
                    try
                    {
                        responseStr = await httpClient.GetStringAsync($"https://api.deezer.com/track/{deezerIdStr}");
                        break;
                    }
                    catch (HttpRequestException)
                    {
                        // Likely rate limited, wait longer
                        await Task.Delay(2000 * (attempt + 1));
                    }
                }
                
                if (responseStr == null) { skippedCount++; continue; }
                
                var json = JObject.Parse(responseStr);
                
                if (json["error"] != null) { skippedCount++; continue; }
                
                var title = json["title"]?.ToString();
                var artist = json["artist"]?["name"]?.ToString();
                var cover = json["album"]?["cover_medium"]?.ToString();
                
                if (!string.IsNullOrEmpty(title)) track.Title = title;
                if (!string.IsNullOrEmpty(artist)) track.Artist = artist;
                if (!string.IsNullOrEmpty(cover)) track.AlbumCover = cover;
                
                fixedCount++;
                
                // Save every 10 tracks to avoid losing progress
                if (fixedCount % 10 == 0)
                {
                    await context.SaveChangesAsync();
                }
                
                // Respect Deezer rate limit (~50 requests/5 seconds)
                await Task.Delay(500);
            }
            catch { skippedCount++; }
        }

        await context.SaveChangesAsync();

        return Ok(new { message = $"Fixed {fixedCount} of {unknownTracks.Count} tracks ({skippedCount} skipped)", fixed_count = fixedCount, total = unknownTracks.Count });
    }

    /// <summary>
    /// List all cached audio files with metadata
    /// </summary>
    [HttpGet("cache/files")]
    public async Task<ActionResult> GetCacheFiles([FromQuery] string? search = null)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var cacheDir = _cacheDirectory;
        if (!System.IO.Directory.Exists(cacheDir))
        {
            return Ok(new { files = Array.Empty<object>() });
        }

        var mp3Files = System.IO.Directory.GetFiles(cacheDir, "*.mp3");
        
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var result = new List<object>();
        foreach (var filePath in mp3Files)
        {
            var fileName = System.IO.Path.GetFileNameWithoutExtension(filePath);
            var fileInfo = new System.IO.FileInfo(filePath);
            
            // Try to find metadata in DB
            var trackId = $"deezer:{fileName}";
            var meta = await context.TrackMetadata.FirstOrDefaultAsync(t => t.TrackId == trackId);
            
            var title = meta?.Title ?? "Unknown";
            var artist = meta?.Artist ?? "Unknown";
            var cover = meta?.AlbumCover ?? "";
            
            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLowerInvariant();
                if (!title.ToLowerInvariant().Contains(s) && 
                    !artist.ToLowerInvariant().Contains(s) &&
                    !fileName.Contains(s))
                {
                    continue;
                }
            }
            
            result.Add(new
            {
                id = fileName,
                title,
                artist,
                cover,
                sizeMB = Math.Round(fileInfo.Length / (1024.0 * 1024.0), 2),
                lastAccessed = fileInfo.LastAccessTimeUtc,
            });
        }
        
        return Ok(new { files = result.OrderByDescending(f => ((dynamic)f).lastAccessed) });
    }

    /// <summary>
    /// Serve a cached audio file for playback
    /// </summary>
    [HttpGet("cache/play/{trackId}")]
    public ActionResult PlayCacheFile([FromRoute] string trackId)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        // Sanitize to prevent path traversal
        var sanitized = System.IO.Path.GetFileName(trackId);
        var filePath = System.IO.Path.Combine(_cacheDirectory, $"{sanitized}.mp3");
        
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { error = "File not found" });
        }

        var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite);
        return File(stream, "audio/mpeg", enableRangeProcessing: true);
    }

    /// <summary>
    /// Health check endpoint (public)
    /// </summary>
    [HttpGet("health")]
    public ActionResult HealthCheck()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }


    #endregion

    #region Runtime Settings

    /// <summary>
    /// Get current runtime settings
    /// </summary>
    [HttpGet("settings")]
    public ActionResult GetSettings()
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        return Ok(new
        {
            useApiKeyAuthentication = RuntimeSettings.UseApiKeyAuthentication,
            useUserAgentAuthentication = RuntimeSettings.UseUserAgentAuthentication,
            logUserAgent = RuntimeSettings.LogUserAgent,
        });
    }

    /// <summary>
    /// Update runtime settings (takes effect immediately, resets on restart)
    /// </summary>
    [HttpPut("settings")]
    public ActionResult UpdateSettings([FromBody] RuntimeSettingsDto dto)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        if (dto.UseApiKeyAuthentication.HasValue)
            RuntimeSettings.UseApiKeyAuthentication = dto.UseApiKeyAuthentication.Value;
        if (dto.UseUserAgentAuthentication.HasValue)
            RuntimeSettings.UseUserAgentAuthentication = dto.UseUserAgentAuthentication.Value;
        if (dto.LogUserAgent.HasValue)
            RuntimeSettings.LogUserAgent = dto.LogUserAgent.Value;

        return Ok(new
        {
            useApiKeyAuthentication = RuntimeSettings.UseApiKeyAuthentication,
            useUserAgentAuthentication = RuntimeSettings.UseUserAgentAuthentication,
            logUserAgent = RuntimeSettings.LogUserAgent,
            message = "Settings updated (will reset on service restart)"
        });
    }

    public class RuntimeSettingsDto
    {
        public bool? UseApiKeyAuthentication { get; set; }
        public bool? UseUserAgentAuthentication { get; set; }
        public bool? LogUserAgent { get; set; }
    }

    #endregion

    #region API Keys CRUD

    /// <summary>
    /// List all API keys
    /// </summary>
    [HttpGet("apikeys")]
    public async Task<ActionResult> GetApiKeys()
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var keys = await _apiKeyStore.GetAllAsync();
        
        // Return without exposing full key (show only first 8 chars)
        var result = keys.Select(k => new
        {
            k.Id,
            k.Owner,
            KeyPreview = k.Key.Length > 8 ? k.Key[..8] + "..." : k.Key,
            k.ServerAddress,
            k.AllowedIPAddresses,
            k.IsActive,
            k.CreatedAt,
            k.LastUsedAt
        });

        return new JsonResult(result);
    }

    /// <summary>
    /// Get a single API key by ID (includes full key)
    /// </summary>
    [HttpGet("apikeys/{id:guid}")]
    public async Task<ActionResult> GetApiKey(Guid id)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var key = await _apiKeyStore.GetByIdAsync(id);
        if (key == null) return NotFound();

        return new JsonResult(key);
    }

    /// <summary>
    /// Create a new API key
    /// </summary>
    [HttpPost("apikeys")]
    public async Task<ActionResult> CreateApiKey([FromBody] CreateApiKeyRequest request)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Owner))
            return BadRequest(new { error = "Owner is required" });

        if (string.IsNullOrWhiteSpace(request.ServerAddress))
            return BadRequest(new { error = "ServerAddress is required" });

        var entity = new ApiKeyEntity
        {
            Owner = request.Owner,
            ServerAddress = request.ServerAddress,
            AllowedIPAddresses = request.AllowedIPAddresses ?? "",
            IsActive = true
        };

        var created = await _apiKeyStore.CreateAsync(entity);
        
        return Created($"/admin/apikeys/{created.Id}", new
        {
            created.Id,
            created.Owner,
            created.Key, // Return full key only on creation
            created.ServerAddress,
            created.AllowedIPAddresses,
            created.IsActive,
            created.CreatedAt
        });
    }

    /// <summary>
    /// Update an existing API key
    /// </summary>
    [HttpPut("apikeys/{id:guid}")]
    public async Task<ActionResult> UpdateApiKey(Guid id, [FromBody] UpdateApiKeyRequest request)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var entity = new ApiKeyEntity
        {
            Owner = request.Owner ?? "",
            ServerAddress = request.ServerAddress ?? "",
            AllowedIPAddresses = request.AllowedIPAddresses ?? "",
            IsActive = request.IsActive ?? true
        };

        var updated = await _apiKeyStore.UpdateAsync(id, entity);
        if (updated == null) return NotFound();

        return new JsonResult(new
        {
            updated.Id,
            updated.Owner,
            KeyPreview = updated.Key.Length > 8 ? updated.Key[..8] + "..." : updated.Key,
            updated.ServerAddress,
            updated.AllowedIPAddresses,
            updated.IsActive,
            updated.CreatedAt,
            updated.LastUsedAt
        });
    }

    /// <summary>
    /// Delete an API key
    /// </summary>
    [HttpDelete("apikeys/{id:guid}")]
    public async Task<ActionResult> DeleteApiKey(Guid id)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var deleted = await _apiKeyStore.DeleteAsync(id);
        if (!deleted) return NotFound();

        return NoContent();
    }

    /// <summary>
    /// Regenerate an API key
    /// </summary>
    [HttpPost("apikeys/{id:guid}/regenerate")]
    public async Task<ActionResult> RegenerateApiKey(Guid id)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        try
        {
            var newKey = await _apiKeyStore.RegenerateKeyAsync(id);
            return new JsonResult(new { key = newKey });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    #endregion

    #region Deezer Accounts Endpoints

    /// <summary>
    /// List all Deezer accounts
    /// </summary>
    [HttpGet("deezer-accounts")]
    public async Task<ActionResult> GetDeezerAccounts()
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var accounts = await _deezerAccountStore.GetAllAsync();
        
        var result = accounts.Select(a => new
        {
            a.Id,
            ArlPreview = a.Arl.Length > 8 ? a.Arl[..4] + "..." + a.Arl[^4..] : "...",
            a.Username,
            a.UserId,
            a.AvatarUrl,
            a.IsPremium,
            a.IsActive,
            a.CreatedAt,
            a.LastUsedAt,
            a.RequestCount
        });

        return new JsonResult(result);
    }

    /// <summary>
    /// Register or update a Deezer account using its ARL token
    /// </summary>
    [HttpPost("deezer-accounts")]
    public async Task<ActionResult> CreateDeezerAccount([FromBody] CreateDeezerAccountRequest request)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Arl))
        {
            return BadRequest(new { message = "ARL token is required" });
        }

        var (success, username, userId, avatarUrl, isPremium) = await GetDeezerUserInfoAsync(request.Arl);

        if (!success)
        {
            return BadRequest(new { message = "ARL token is invalid or expired" });
        }

        var allAccounts = await _deezerAccountStore.GetAllAsync();
        var existing = allAccounts.FirstOrDefault(a => a.UserId == userId);

        if (existing != null)
        {
            existing.Arl = request.Arl;
            existing.Username = username;
            existing.AvatarUrl = avatarUrl;
            existing.IsPremium = isPremium;
            existing.IsActive = true;

            var updated = await _deezerAccountStore.UpdateAsync(existing.Id, existing);
            return Ok(new
            {
                id = updated?.Id,
                username = updated?.Username,
                userId = updated?.UserId,
                avatarUrl = updated?.AvatarUrl,
                isPremium = updated?.IsPremium,
                isActive = updated?.IsActive,
                createdAt = updated?.CreatedAt,
                requestCount = updated?.RequestCount
            });
        }
        else
        {
            var entity = new DeezerAccountEntity
            {
                Arl = request.Arl,
                Username = username,
                UserId = userId,
                AvatarUrl = avatarUrl,
                IsPremium = isPremium,
                IsActive = true
            };

            var created = await _deezerAccountStore.CreateAsync(entity);
            return Created($"/admin/deezer-accounts/{created.Id}", new
            {
                id = created.Id,
                username = created.Username,
                userId = created.UserId,
                avatarUrl = created.AvatarUrl,
                isPremium = created.IsPremium,
                isActive = created.IsActive,
                createdAt = created.CreatedAt,
                requestCount = created.RequestCount
            });
        }
    }

    /// <summary>
    /// Toggle dynamic state (active status) of a Deezer account
    /// </summary>
    [HttpPut("deezer-accounts/{id:guid}")]
    public async Task<ActionResult> ToggleDeezerAccountActive(Guid id, [FromBody] UpdateDeezerAccountRequest request)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var existing = await _deezerAccountStore.GetByIdAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        if (request.IsActive.HasValue)
        {
            await _deezerAccountStore.SetActiveStatusAsync(id, request.IsActive.Value);
        }

        return Ok(new { success = true });
    }

    /// <summary>
    /// Delete a Deezer account
    /// </summary>
    [HttpDelete("deezer-accounts/{id:guid}")]
    public async Task<ActionResult> DeleteDeezerAccount(Guid id)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var deleted = await _deezerAccountStore.DeleteAsync(id);
        if (!deleted)
        {
            return NotFound();
        }

        return Ok(new { success = true });
    }

    /// <summary>
    /// Refresh/Re-validate account status from Deezer
    /// </summary>
    [HttpPost("deezer-accounts/{id:guid}/refresh")]
    public async Task<ActionResult> RefreshDeezerAccount(Guid id)
    {
        if (!IsAuthenticated())
        {
            return Unauthorized();
        }

        var existing = await _deezerAccountStore.GetByIdAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        var (success, username, userId, avatarUrl, isPremium) = await GetDeezerUserInfoAsync(existing.Arl);

        if (!success)
        {
            await _deezerAccountStore.SetActiveStatusAsync(id, false);
            return Ok(new { success = false, message = "ARL token validation failed. Account marked as inactive." });
        }

        existing.Username = username;
        existing.UserId = userId;
        existing.AvatarUrl = avatarUrl;
        existing.IsPremium = isPremium;
        existing.IsActive = true;

        await _deezerAccountStore.UpdateAsync(id, existing);

        return Ok(new
        {
            success = true,
            account = new
            {
                existing.Id,
                existing.Username,
                existing.UserId,
                existing.AvatarUrl,
                existing.IsPremium,
                existing.IsActive,
                existing.RequestCount,
                existing.LastUsedAt
            }
        });
    }

    #endregion

    #region Deezer Auth Helper

    private async Task<(bool Success, string Username, string UserId, string AvatarUrl, bool IsPremium)> GetDeezerUserInfoAsync(string arl)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Post, "https://www.deezer.com/ajax/gw-light.php?method=deezer.getUserData&input=3&api_version=1.0&api_token=");
            request.Headers.Add("Cookie", $"arl={arl}");
            request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            
            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                return (false, "", "", "", false);

            var responseBody = await response.Content.ReadAsStringAsync();
            var json = JObject.Parse(responseBody);
            
            var results = json["results"];
            if (results == null)
                return (false, "", "", "", false);

            var user = results["USER"];
            if (user == null || user["USER_ID"]?.Value<long>() == 0)
                return (false, "", "", "", false);

            var username = user["BLOG_NAME"]?.ToString() ?? "Unknown";
            var userId = user["USER_ID"]?.ToString() ?? "";
            var userPicture = user["USER_PICTURE"]?.ToString() ?? "";
            var offerId = user["OPTIONS"]?["offer_id"]?.Value<int>() ?? user["OPTIONS"]?["OFFER_ID"]?.Value<int>() ?? 0;
            var licenseToken = user["OPTIONS"]?["license_token"]?.ToString() ?? "";

            var avatarUrl = !string.IsNullOrEmpty(userPicture) 
                ? $"https://e-cdns-images.dzcdn.net/images/user/{userPicture}/120x120-000000-80-0-0.jpg"
                : "";

            bool isPremium = offerId != 0 || !string.IsNullOrEmpty(licenseToken);

            return (true, username, userId, avatarUrl, isPremium);
        }
        catch
        {
            return (false, "", "", "", false);
        }
    }

    #endregion

    #region Helpers

    private bool IsAuthenticated()
    {
        // Get Bearer token from Authorization header
        var authHeader = Request.Headers["Authorization"].ToString();
        
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return false;
        }
        
        var token = authHeader.Substring("Bearer ".Length);
        return _adminAuth.ValidateToken(token, out _, out _);
    }

    #endregion
}

#region Request DTOs

public class CreateApiKeyRequest
{
    public string Owner { get; set; } = "";
    public string ServerAddress { get; set; } = "";
    public string? AllowedIPAddresses { get; set; }
}

public class UpdateApiKeyRequest
{
    public string? Owner { get; set; }
    public string? ServerAddress { get; set; }
    public string? AllowedIPAddresses { get; set; }
    public bool? IsActive { get; set; }
}

public class CreateDeezerAccountRequest
{
    public string Arl { get; set; } = "";
}

public class UpdateDeezerAccountRequest
{
    public bool? IsActive { get; set; }
}

#endregion

