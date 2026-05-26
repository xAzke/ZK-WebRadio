using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Webradio.Data;

/// <summary>
/// Service to manage track metadata and play counts
/// </summary>
public interface ITrackMetadataService
{
    Task RecordPlayAsync(string trackId, string title, string artist, string? albumCover, string? previewUrl);
    Task RecordFailureAsync(string trackId, string title, string artist);
}

public class TrackMetadataService : ITrackMetadataService
{
    private readonly IDbContextFactory<WebradioDbContext> _contextFactory;
    private readonly ILogger<TrackMetadataService> _logger;

    public TrackMetadataService(
        IDbContextFactory<WebradioDbContext> contextFactory,
        ILogger<TrackMetadataService> logger)
    {
        _contextFactory = contextFactory;
        _logger = logger;
    }

    /// <summary>
    /// Records a track play - creates new entry or increments play count
    /// </summary>
    public async Task RecordPlayAsync(string trackId, string title, string artist, string? albumCover, string? previewUrl)
    {
        try
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            
            var existing = await context.TrackMetadata.FindAsync(trackId);
            
            if (existing != null)
            {
                // Increment play count for existing track
                existing.PlayCount++;
                existing.LastPlayedAt = DateTime.UtcNow;
                
                // Update metadata if we have newer info
                if (!string.IsNullOrEmpty(title)) existing.Title = title;
                if (!string.IsNullOrEmpty(artist)) existing.Artist = artist;
                if (!string.IsNullOrEmpty(albumCover)) existing.AlbumCover = albumCover;
                if (!string.IsNullOrEmpty(previewUrl)) existing.PreviewUrl = previewUrl;
                
                _logger.LogInformation("Track Play Updated: {TrackId} ({Title} - {Artist}). New Count: {Count}", 
                    trackId, existing.Title, existing.Artist, existing.PlayCount);
            }
            else
            {
                // Create new track entry
                context.TrackMetadata.Add(new TrackMetadata
                {
                    TrackId = trackId,
                    Title = title ?? "Unknown",
                    Artist = artist ?? "Unknown",
                    AlbumCover = albumCover,
                    PreviewUrl = previewUrl,
                    PlayCount = 1,
                    FailureCount = 0,
                    CachedAt = DateTime.UtcNow,
                    LastPlayedAt = DateTime.UtcNow
                });
                
                _logger.LogInformation("New Track Recorded: {TrackId} ({Title} - {Artist})", 
                    trackId, title ?? "Unknown", artist ?? "Unknown");
            }

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database Error: Failed to record play for track {TrackId}", trackId);
        }
    }

    /// <summary>
    /// Records a track failure (fell back to preview)
    /// </summary>
    public async Task RecordFailureAsync(string trackId, string title, string artist)
    {
        try
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            
            var existing = await context.TrackMetadata.FindAsync(trackId);
            
            if (existing != null)
            {
                existing.FailureCount++;
                existing.LastPlayedAt = DateTime.UtcNow;
                _logger.LogWarning("Track Failure Updated: {TrackId} ({Title} - {Artist}). Total Failures: {Count}", 
                    trackId, existing.Title, existing.Artist, existing.FailureCount);
            }
            else
            {
                // Create new track entry with failure
                context.TrackMetadata.Add(new TrackMetadata
                {
                    TrackId = trackId,
                    Title = title ?? "Unknown",
                    Artist = artist ?? "Unknown",
                    PlayCount = 0,
                    FailureCount = 1,
                    CachedAt = DateTime.UtcNow,
                    LastPlayedAt = DateTime.UtcNow
                });
                _logger.LogWarning("New Track Recorded (with initial failure): {TrackId} ({Title} - {Artist})", 
                    trackId, title ?? "Unknown", artist ?? "Unknown");
            }

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database Error: Failed to record failure for track {TrackId}", trackId);
        }
    }
}
