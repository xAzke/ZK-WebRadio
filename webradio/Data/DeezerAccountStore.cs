using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Webradio.Auth;

namespace Webradio.Data;

public class DeezerAccountStore : IDeezerAccountStore
{
    private readonly IDbContextFactory<WebradioDbContext> _contextFactory;
    private readonly ILogger<DeezerAccountStore> _logger;
    private readonly string _encryptionKey;

    public event Action? OnAccountsChanged;

    public DeezerAccountStore(
        IDbContextFactory<WebradioDbContext> contextFactory, 
        ILogger<DeezerAccountStore> logger,
        IOptions<ApplicationOptions> options)
    {
        _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _encryptionKey = !string.IsNullOrEmpty(options.Value?.EncryptionKey) 
            ? options.Value.EncryptionKey 
            : "default-fallback-key-zk-radio";
    }

    public async Task<List<DeezerAccountEntity>> GetAllAsync()
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        var accounts = await context.DeezerAccounts
            .OrderBy(a => a.Username)
            .ToListAsync();

        foreach (var a in accounts)
        {
            a.Arl = EncryptionHelper.Decrypt(a.Arl, _encryptionKey);
        }

        return accounts;
    }

    public async Task<DeezerAccountEntity?> GetByIdAsync(Guid id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        var account = await context.DeezerAccounts.FindAsync(id);
        if (account != null)
        {
            account.Arl = EncryptionHelper.Decrypt(account.Arl, _encryptionKey);
        }
        return account;
    }

    public async Task<DeezerAccountEntity?> GetActiveAccountAsync()
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        // Load balancing: pick the active account with the lowest request count
        var account = await context.DeezerAccounts
            .Where(a => a.IsActive)
            .OrderBy(a => a.RequestCount)
            .FirstOrDefaultAsync();

        if (account != null)
        {
            account.Arl = EncryptionHelper.Decrypt(account.Arl, _encryptionKey);
        }
        return account;
    }

    public async Task<DeezerAccountEntity> CreateAsync(DeezerAccountEntity entity)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        entity.Id = Guid.NewGuid();
        entity.CreatedAt = DateTime.UtcNow;
        
        var rawArl = entity.Arl;
        entity.Arl = EncryptionHelper.Encrypt(rawArl, _encryptionKey);
        
        context.DeezerAccounts.Add(entity);
        await context.SaveChangesAsync();
        
        // Restore raw ARL to the returned entity object
        entity.Arl = rawArl;
        
        _logger.LogInformation("Created Deezer account record for: {Username} ({UserId})", entity.Username, entity.UserId);
        OnAccountsChanged?.Invoke();
        
        return entity;
    }

    public async Task<DeezerAccountEntity?> UpdateAsync(Guid id, DeezerAccountEntity entity)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var existing = await context.DeezerAccounts.FindAsync(id);
        if (existing == null) return null;

        var rawArl = entity.Arl;
        existing.Arl = EncryptionHelper.Encrypt(rawArl, _encryptionKey);
        existing.Username = entity.Username;
        existing.UserId = entity.UserId;
        existing.AvatarUrl = entity.AvatarUrl;
        existing.IsPremium = entity.IsPremium;
        existing.IsActive = entity.IsActive;
        
        await context.SaveChangesAsync();
        
        // Restore raw ARL to the returned entity object
        existing.Arl = rawArl;
        
        _logger.LogInformation("Updated Deezer account record for: {Username} ({UserId})", existing.Username, existing.UserId);
        OnAccountsChanged?.Invoke();
        
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var entity = await context.DeezerAccounts.FindAsync(id);
        if (entity == null) return false;

        context.DeezerAccounts.Remove(entity);
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted Deezer account record for: {Username} ({UserId})", entity.Username, entity.UserId);
        OnAccountsChanged?.Invoke();
        
        return true;
    }

    public async Task IncrementRequestCountAsync(Guid id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var entity = await context.DeezerAccounts.FindAsync(id);
        if (entity != null)
        {
            entity.RequestCount++;
            entity.LastUsedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    public async Task SetActiveStatusAsync(Guid id, bool isActive)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var entity = await context.DeezerAccounts.FindAsync(id);
        if (entity != null)
        {
            entity.IsActive = isActive;
            await context.SaveChangesAsync();
            
            _logger.LogInformation("Set active status of Deezer account {Username} ({UserId}) to {IsActive}", entity.Username, entity.UserId, isActive);
            OnAccountsChanged?.Invoke();
        }
    }
}
