#nullable enable
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Webradio.Data;

namespace Webradio.Service;

public interface IStatsService
{
    Task RecordRequest(string apiKeyOwner, string ip, string action, string serviceName, string? userAgent = null, string? trackId = null);
    Task<StatsSnapshot> GetStats();
}

public class StatsService : IStatsService
{
    private readonly IDistributedCache _cache;
    private readonly IDbContextFactory<WebradioDbContext>? _contextFactory;
    private readonly string _cacheDirectory;
    private static readonly DateTime _startTime = DateTime.UtcNow;
    
    // In-memory tracking for top users/IPs (faster than Redis scans)
    private static readonly ConcurrentDictionary<string, int> _apiKeyRequests = new();
    private static readonly ConcurrentDictionary<string, int> _ipRequests = new();
    private static readonly ConcurrentDictionary<string, int> _userAgentRequests = new();
    private static readonly ConcurrentDictionary<string, int> _trackRequests = new();

    public StatsService(IDistributedCache cache, IDbContextFactory<WebradioDbContext>? contextFactory = null)
    {
        _cache = cache;
        _contextFactory = contextFactory;
        _cacheDirectory = "/tmp/deezer-cache";
    }

    public async Task RecordRequest(string apiKeyOwner, string ip, string action, string serviceName, string? userAgent = null, string? trackId = null)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        
        // Increment counters in cache
        await IncrementCounter($"stats:total:{action}");
        await IncrementCounter($"stats:daily:{today}:{action}");
        await IncrementCounter($"stats:apikey:{apiKeyOwner}:{today}");
        await IncrementCounter($"stats:ip:{ip}:{today}");
        await IncrementCounter($"stats:service:{serviceName}:{today}:{action}");
        
        // Track in memory for quick access
        _apiKeyRequests.AddOrUpdate(apiKeyOwner, 1, (_, count) => count + 1);
        _ipRequests.AddOrUpdate(ip, 1, (_, count) => count + 1);
        
        // Track user agents
        if (!string.IsNullOrEmpty(userAgent))
        {
            var shortAgent = userAgent.Length > 50 ? userAgent.Substring(0, 50) + "..." : userAgent;
            _userAgentRequests.AddOrUpdate(shortAgent, 1, (_, count) => count + 1);
        }
        
        // Track track IDs for stream requests
        if (!string.IsNullOrEmpty(trackId))
        {
            _trackRequests.AddOrUpdate(trackId, 1, (_, count) => count + 1);
        }
    }

    private async Task IncrementCounter(string key)
    {
        try
        {
            var current = await _cache.GetStringAsync(key);
            var value = string.IsNullOrEmpty(current) ? 0 : int.Parse(current);
            value++;
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
            };
            await _cache.SetStringAsync(key, value.ToString(), options);
        }
        catch { /* Ignore cache errors */ }
    }

    private async Task<int> GetCounter(string key)
    {
        try
        {
            var value = await _cache.GetStringAsync(key);
            return string.IsNullOrEmpty(value) ? 0 : int.Parse(value);
        }
        catch { return 0; }
    }

    public async Task<StatsSnapshot> GetStats()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var uptime = DateTime.UtcNow - _startTime;

        // Get cache info
        var cacheInfo = GetCacheInfo();

        // Get today's stats
        var searchesToday = await GetCounter($"stats:daily:{today}:search");
        var streamsToday = await GetCounter($"stats:daily:{today}:stream");
        var totalSearches = await GetCounter("stats:total:search");
        var totalStreams = await GetCounter("stats:total:stream");

        // Get top users and IPs
        var topApiKeys = _apiKeyRequests
            .OrderByDescending(x => x.Value)
            .Take(5)
            .Select(x => new TopEntry { Name = x.Key, Requests = x.Value })
            .ToList();

        var topIPs = _ipRequests
            .OrderByDescending(x => x.Value)
            .Take(5)
            .Select(x => new TopEntry { Name = x.Key, Requests = x.Value })
            .ToList();

        var topUserAgents = _userAgentRequests
            .OrderByDescending(x => x.Value)
            .Take(5)
            .Select(x => new TopEntry { Name = x.Key, Requests = x.Value })
            .ToList();

        var topTracks = _trackRequests
            .OrderByDescending(x => x.Value)
            .Take(10)
            .Select(x => new TopEntry { Name = x.Key, Requests = x.Value })
            .ToList();

        // Get failure stats from database
        int totalFailures = 0;
        double failureRatio = 0;
        if (_contextFactory != null)
        {
            try
            {
                await using var context = await _contextFactory.CreateDbContextAsync();
                totalFailures = await context.TrackMetadata.SumAsync(t => t.FailureCount);
                var totalPlays = await context.TrackMetadata.SumAsync(t => t.PlayCount + t.FailureCount);
                failureRatio = totalPlays > 0 ? Math.Round((double)totalFailures / totalPlays * 100, 1) : 0;
            }
            catch { /* Ignore DB errors */ }
        }

        return new StatsSnapshot
        {
            Uptime = FormatUptime(uptime),
            UptimeSeconds = (long)uptime.TotalSeconds,
            Cache = cacheInfo,
            Requests = new RequestStats
            {
                Today = new DailyStats { Searches = searchesToday, Streams = streamsToday },
                Total = new DailyStats { Searches = totalSearches, Streams = totalStreams }
            },
            TopApiKeys = topApiKeys,
            TopIPs = topIPs,
            TopUserAgents = topUserAgents,
            TopTracks = topTracks,
            TotalFailures = totalFailures,
            FailureRatio = failureRatio,
            Timestamp = DateTime.UtcNow
        };
    }

    private CacheInfo GetCacheInfo()
    {
        try
        {
            if (!System.IO.Directory.Exists(_cacheDirectory))
                return new CacheInfo { Files = 0, SizeBytes = 0, SizeMB = 0 };

            var files = System.IO.Directory.GetFiles(_cacheDirectory, "*.mp3");
            var totalSize = files.Sum(f => new System.IO.FileInfo(f).Length);

            return new CacheInfo
            {
                Files = files.Length,
                SizeBytes = totalSize,
                SizeMB = Math.Round(totalSize / (1024.0 * 1024.0), 2)
            };
        }
        catch
        {
            return new CacheInfo { Files = 0, SizeBytes = 0, SizeMB = 0 };
        }
    }

    private string FormatUptime(TimeSpan uptime)
    {
        if (uptime.TotalDays >= 1)
            return $"{(int)uptime.TotalDays}d {uptime.Hours}h {uptime.Minutes}m";
        if (uptime.TotalHours >= 1)
            return $"{(int)uptime.TotalHours}h {uptime.Minutes}m";
        return $"{uptime.Minutes}m {uptime.Seconds}s";
    }
}

public class StatsSnapshot
{
    public string Uptime { get; set; } = "";
    public long UptimeSeconds { get; set; }
    public CacheInfo Cache { get; set; } = new();
    public RequestStats Requests { get; set; } = new();
    public List<TopEntry> TopApiKeys { get; set; } = new();
    public List<TopEntry> TopIPs { get; set; } = new();
    public List<TopEntry> TopUserAgents { get; set; } = new();
    public List<TopEntry> TopTracks { get; set; } = new();
    public int TotalFailures { get; set; }
    public double FailureRatio { get; set; }
    public DateTime Timestamp { get; set; }
}

public class TopEntry
{
    public string Name { get; set; } = "";
    public int Requests { get; set; }
}

public class CacheInfo
{
    public int Files { get; set; }
    public long SizeBytes { get; set; }
    public double SizeMB { get; set; }
}

public class RequestStats
{
    public DailyStats Today { get; set; } = new();
    public DailyStats Total { get; set; } = new();
}

public class DailyStats
{
    public int Searches { get; set; }
    public int Streams { get; set; }
}
