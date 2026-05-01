using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Webradio.Data;

public interface IApiKeyStore
{
    event Action OnApiKeysChanged;
    Task<List<ApiKeyEntity>> GetAllAsync();
    Task<ApiKeyEntity?> GetByIdAsync(Guid id);
    Task<ApiKeyEntity?> GetByKeyAsync(string key);
    Task<ApiKeyEntity> CreateAsync(ApiKeyEntity entity);
    Task<ApiKeyEntity?> UpdateAsync(Guid id, ApiKeyEntity entity);
    Task<bool> DeleteAsync(Guid id);
    Task<string> RegenerateKeyAsync(Guid id);
    Task UpdateLastUsedAsync(string key);
}

public class ApiKeyStore : IApiKeyStore
{
    private readonly IDbContextFactory<WebradioDbContext> _contextFactory;
    private readonly ILogger<ApiKeyStore> _logger;

    public event Action? OnApiKeysChanged;

    public ApiKeyStore(IDbContextFactory<WebradioDbContext> contextFactory, ILogger<ApiKeyStore> logger)
    {
        _contextFactory = contextFactory;
        _logger = logger;
    }

    public async Task<List<ApiKeyEntity>> GetAllAsync()
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        return await context.ApiKeys
            .Where(k => k.IsActive)
            .OrderBy(k => k.Owner)
            .ToListAsync();
    }

    public async Task<ApiKeyEntity?> GetByIdAsync(Guid id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        return await context.ApiKeys.FindAsync(id);
    }

    public async Task<ApiKeyEntity?> GetByKeyAsync(string key)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        return await context.ApiKeys
            .FirstOrDefaultAsync(k => k.Key == key && k.IsActive);
    }

    public async Task<ApiKeyEntity> CreateAsync(ApiKeyEntity entity)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        entity.Id = Guid.NewGuid();
        entity.Key = GenerateSecureKey();
        entity.CreatedAt = DateTime.UtcNow;
        
        context.ApiKeys.Add(entity);
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Created API key for owner: {Owner}", entity.Owner);
        OnApiKeysChanged?.Invoke();
        
        return entity;
    }

    public async Task<ApiKeyEntity?> UpdateAsync(Guid id, ApiKeyEntity entity)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var existing = await context.ApiKeys.FindAsync(id);
        if (existing == null) return null;

        existing.Owner = entity.Owner;
        existing.ServerAddress = entity.ServerAddress;
        existing.AllowedIPAddresses = entity.AllowedIPAddresses;
        existing.IsActive = entity.IsActive;
        
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Updated API key for owner: {Owner}", existing.Owner);
        OnApiKeysChanged?.Invoke();
        
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var entity = await context.ApiKeys.FindAsync(id);
        if (entity == null) return false;

        context.ApiKeys.Remove(entity);
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted API key for owner: {Owner}", entity.Owner);
        OnApiKeysChanged?.Invoke();
        
        return true;
    }

    public async Task<string> RegenerateKeyAsync(Guid id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var entity = await context.ApiKeys.FindAsync(id);
        if (entity == null) throw new KeyNotFoundException($"API key with id {id} not found");

        entity.Key = GenerateSecureKey();
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Regenerated API key for owner: {Owner}", entity.Owner);
        OnApiKeysChanged?.Invoke();
        
        return entity.Key;
    }

    public async Task UpdateLastUsedAsync(string key)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var entity = await context.ApiKeys.FirstOrDefaultAsync(k => k.Key == key);
        if (entity != null)
        {
            entity.LastUsedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    private static string GenerateSecureKey()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}
