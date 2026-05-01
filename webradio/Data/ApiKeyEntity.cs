using System;
using System.ComponentModel.DataAnnotations;

namespace Webradio.Data;

/// <summary>
/// Entity for storing API keys in the database
/// </summary>
public class ApiKeyEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Owner { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string ServerAddress { get; set; } = string.Empty;
    
    /// <summary>
    /// Comma-separated list of allowed IP addresses
    /// </summary>
    [MaxLength(500)]
    public string AllowedIPAddresses { get; set; } = string.Empty;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastUsedAt { get; set; }
}
