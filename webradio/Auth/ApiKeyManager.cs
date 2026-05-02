using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using Webradio.Data;

namespace Webradio.Auth;

public class ApiKeyManager
{
    private readonly ILogger<ApiKeyManager> logger;
    private readonly IApiKeyStore? _apiKeyStore;
    private Dictionary<string, ApiKey> fromKey = new();
    private Dictionary<string, ApiKey> fromServerAddress = new();
    
    // Separate storage for config-sourced keys so DB reload doesn't lose them
    private Dictionary<string, ApiKey> _configFromKey = new();
    private Dictionary<string, ApiKey> _configFromServer = new();

    public ApiKeyManager(
        ILogger<ApiKeyManager> logger, 
        IOptionsMonitor<ApplicationOptions> monitor,
        IApiKeyStore? apiKeyStore = null)
    {
        this.logger = logger;
        this._apiKeyStore = apiKeyStore;

        // Subscribe to config file changes (legacy support)
        monitor.OnChange(LoadFromApplicationOptions);
        LoadFromApplicationOptions(monitor.CurrentValue);

        // Subscribe to database changes (new dynamic keys)
        if (_apiKeyStore != null)
        {
            _apiKeyStore.OnApiKeysChanged += () => _ = LoadFromDatabaseAsync();
            _ = LoadFromDatabaseAsync();
        }
    }

    private async System.Threading.Tasks.Task LoadFromDatabaseAsync()
    {
        if (_apiKeyStore == null) return;

        try
        {
            var dbKeys = await _apiKeyStore.GetAllAsync();
            
            // Start from config keys and merge DB keys on top
            var tempFromKey = new Dictionary<string, ApiKey>(_configFromKey);
            var tempFromServer = new Dictionary<string, ApiKey>(_configFromServer);

            foreach (var dbKey in dbKeys)
            {
                if (tempFromKey.ContainsKey(dbKey.Key))
                    continue;

                var addresses = ParseIPAddresses(dbKey.AllowedIPAddresses);
                var apiKey = new ApiKey(dbKey.Owner, dbKey.Key, dbKey.ServerAddress, addresses);

                tempFromKey[apiKey.Key] = apiKey;
                if (!string.IsNullOrWhiteSpace(apiKey.ServerAddress))
                    tempFromServer[apiKey.ServerAddress] = apiKey;
            }

            fromKey = tempFromKey;
            fromServerAddress = tempFromServer;

            logger.LogInformation("{Count} API keys loaded (config + database)", fromKey.Count);
        }
        catch (System.Exception ex)
        {
            logger.LogError(ex, "Failed to load API keys from database");
        }
    }

    private List<IPAddress> ParseIPAddresses(string? ipAddressesStr)
    {
        var addresses = new List<IPAddress>();
        if (string.IsNullOrWhiteSpace(ipAddressesStr)) return addresses;

        foreach (var ip in ipAddressesStr.Split(',', System.StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmed = ip.Trim();
            if (IPAddress.TryParse(trimmed, out var address))
            {
                addresses.Add(address);
            }
            else
            {
                try
                {
                    var hostInfo = Dns.GetHostEntry(trimmed);
                    addresses.AddRange(hostInfo.AddressList);
                }
                catch
                {
                    logger.LogWarning("Invalid IP/hostname: {Address}", trimmed);
                }
            }
        }
        return addresses;
    }

    private void LoadFromApplicationOptions(ApplicationOptions options)
    {
        var tempFromKey = new Dictionary<string, ApiKey>();
        var tempFromServer = new Dictionary<string, ApiKey>();

        if (options?.ApiKeys != null)
        {
            foreach (ApiKeyConfiguration config in options.ApiKeys)
            {
                if (string.IsNullOrWhiteSpace(config.Owner))
                {
                    logger.LogWarning("API key entry in application config is missing an owner");
                    continue;
                }
                else if (string.IsNullOrWhiteSpace(config.Key))
                {
                    logger.LogWarning("API key entry in application config is missing a key (owner: {Owner})", config.Owner);
                    continue;
                }
                else if (string.IsNullOrWhiteSpace(config.ServerAddress))
                {
                    logger.LogWarning("API key entry in application config is missing a server address (owner: {Owner})", config.Owner);
                    continue;
                }

                if (tempFromKey.ContainsKey(config.Key))
                {
                    logger.LogCritical("API key entry duplicates key (owner: {Owner})", config.Owner);
                    continue;
                }
                else if (tempFromServer.ContainsKey(config.ServerAddress))
                {
                    logger.LogCritical("API key entry duplicates server address (owner: {Owner})", config.Owner);
                    continue;
                }

                List<IPAddress> addresses = [];

                if (config.AllowedIPAddresses != null)
                {
                    foreach (string ipAddress in config.AllowedIPAddresses)
                    {
                        if (IPAddress.TryParse(ipAddress, out IPAddress? address) && address != null)
                        {
                            addresses.Add(address);
                        }
                        else
                        {
                            try
                            {
                                IPHostEntry hostInfo = Dns.GetHostEntry(ipAddress);

                                logger.LogInformation("API key for {Owner} has resolved {AddressCount} addresses from allowed hostname: {IpAddress}",
                                    config.Owner, hostInfo.AddressList.Length, ipAddress);

                                if (hostInfo.AddressList.Length > 0)
                                {
                                    foreach (var hostAddress in hostInfo.AddressList)
                                    {
                                        addresses.Add(hostAddress);
                                        logger.LogInformation("API key for {Owner} added resolved address: {HostAddress}", config.Owner, hostAddress);
                                    }
                                }
                            }
                            catch
                            {
                                logger.LogWarning("API key for {Owner} has an invalid allowed hostname: {IpAddress}", config.Owner, ipAddress);
                            }
                        }
                    }
                }

                var apiKey = new ApiKey(config.Owner, config.Key, config.ServerAddress, addresses);

                tempFromKey[apiKey.Key] = apiKey;
                tempFromServer[apiKey.ServerAddress] = apiKey;
            }
        }

        fromKey = tempFromKey;
        fromServerAddress = tempFromServer;
        
        // Save config keys separately so DB reload can merge on top
        _configFromKey = new Dictionary<string, ApiKey>(tempFromKey);
        _configFromServer = new Dictionary<string, ApiKey>(tempFromServer);

        logger.LogInformation("{Count} API keys are registered from config", fromKey.Count);
        
        // Trigger DB reload to merge database keys with updated config keys
        if (_apiKeyStore != null)
            _ = LoadFromDatabaseAsync();
    }

    public ApiKey? GetApiKeyFromServer(string serverAddress)
    {
        fromServerAddress.TryGetValue(serverAddress, out var apiKey);
        return apiKey;
    }

    public ApiKey? GetApiKeyFromKey(string rawKey)
    {
        fromKey.TryGetValue(rawKey, out var apiKey);
        return apiKey;
    }
}
