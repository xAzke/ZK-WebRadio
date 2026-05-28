using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DeezerService;

/// <summary>
/// Background service that periodically cleans up the cache directory
/// based on configured limits (max files or max size)
/// </summary>
public class CacheCleanupService : BackgroundService
{
    private readonly ILogger<CacheCleanupService> _logger;
    private readonly string _cacheDirectory;
    private readonly int _maxFiles;
    private readonly long _maxSizeBytes;
    private readonly TimeSpan _cleanupInterval;

    public CacheCleanupService(ILogger<CacheCleanupService> logger, IConfiguration configuration)
    {
        _logger = logger;
        var cacheDir = configuration["CacheDirectory"];
        _cacheDirectory = !string.IsNullOrWhiteSpace(cacheDir) ? cacheDir : Path.Combine(Path.GetTempPath(), "deezer-cache");
        
        // Configuration with defaults
        _maxFiles = configuration.GetValue<int>("CacheMaxFiles", 1000);           // Default: 1000 files
        _maxSizeBytes = configuration.GetValue<long>("CacheMaxSizeMB", 5000) * 1024 * 1024;  // Default: 5GB
        _cleanupInterval = TimeSpan.FromMinutes(configuration.GetValue<int>("CacheCleanupIntervalMinutes", 30)); // Default: 30 min
        
        _logger.LogInformation("Cache cleanup configured: MaxFiles={MaxFiles}, MaxSizeMB={MaxSizeMB}, IntervalMinutes={Interval}",
            _maxFiles, _maxSizeBytes / (1024 * 1024), _cleanupInterval.TotalMinutes);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupCache();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during cache cleanup");
            }

            await Task.Delay(_cleanupInterval, stoppingToken);
        }
    }

    private Task CleanupCache()
    {
        if (!Directory.Exists(_cacheDirectory))
            return Task.CompletedTask;

        var files = Directory.GetFiles(_cacheDirectory, "*.mp3")
            .Select(f => new FileInfo(f))
            .OrderBy(f => f.LastAccessTime) // LRU: oldest accessed first
            .ToList();

        if (files.Count == 0)
            return Task.CompletedTask;

        var totalSize = files.Sum(f => f.Length);
        var deletedCount = 0;
        long deletedSize = 0;

        // Delete files if we exceed limits
        while ((files.Count - deletedCount > _maxFiles || totalSize - deletedSize > _maxSizeBytes) 
               && deletedCount < files.Count)
        {
            var fileToDelete = files[deletedCount];
            try
            {
                var fileSize = fileToDelete.Length;
                File.Delete(fileToDelete.FullName);
                deletedSize += fileSize;
                deletedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete cache file: {File}", fileToDelete.Name);
                deletedCount++; // Skip this file
            }
        }

        if (deletedCount > 0)
        {
            _logger.LogInformation("Cache cleanup: deleted {Count} files ({SizeMB:F2} MB). Remaining: {Remaining} files ({RemainingSizeMB:F2} MB)",
                deletedCount, 
                deletedSize / (1024.0 * 1024.0),
                files.Count - deletedCount,
                (totalSize - deletedSize) / (1024.0 * 1024.0));
        }

        return Task.CompletedTask;
    }
}
