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
            }

            await context.SaveChangesAsync();
            _logger.LogDebug("Recorded play for track {TrackId}: {Title} by {Artist}", trackId, title, artist);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record play for track {TrackId}", trackId);
            // Don't throw - this is background tracking, shouldn't affect the stream
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
            }

            await context.SaveChangesAsync();
            _logger.LogWarning("Recorded failure for track {TrackId}: {Title} by {Artist}", trackId, title, artist);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record failure for track {TrackId}", trackId);
        }
    }
}
