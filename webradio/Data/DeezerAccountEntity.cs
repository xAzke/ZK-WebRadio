using System;
using System.ComponentModel.DataAnnotations;

namespace Webradio.Data;

/// <summary>
/// Entity for storing Deezer accounts in the database
/// </summary>
public class DeezerAccountEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Arl { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(150)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string UserId { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string AvatarUrl { get; set; } = string.Empty;
    
    public bool IsPremium { get; set; } = false;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastUsedAt { get; set; }
    
    public int RequestCount { get; set; } = 0;
}
