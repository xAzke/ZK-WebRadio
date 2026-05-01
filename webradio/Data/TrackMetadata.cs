using System;
using System.ComponentModel.DataAnnotations;

namespace Webradio.Data;

/// <summary>
/// Cached metadata for tracks from Deezer
/// </summary>
public class TrackMetadata
{
    [Key]
    [MaxLength(50)]
    public string TrackId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Artist { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? AlbumCover { get; set; }
    
    /// <summary>
    /// 30-second preview URL from Deezer
    /// </summary>
    [MaxLength(500)]
    public string? PreviewUrl { get; set; }
    
    public int PlayCount { get; set; } = 0;
    
    /// <summary>
    /// Number of times this track failed to stream (fell back to preview)
    /// </summary>
    public int FailureCount { get; set; } = 0;
    
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastPlayedAt { get; set; }
}
