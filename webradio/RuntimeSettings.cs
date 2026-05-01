namespace Webradio;

/// <summary>
/// Thread-safe runtime settings that can be toggled via admin API
/// without restarting the service.
/// </summary>
public static class RuntimeSettings
{
    private static bool? _useApiKeyAuthentication;
    private static bool? _useUserAgentAuthentication;
    private static bool? _logUserAgent;

    /// <summary>
    /// When set (non-null), overrides the config file value.
    /// When null, falls back to the config file value.
    /// </summary>
    public static bool? UseApiKeyAuthentication
    {
        get => _useApiKeyAuthentication;
        set => _useApiKeyAuthentication = value;
    }

    public static bool? UseUserAgentAuthentication
    {
        get => _useUserAgentAuthentication;
        set => _useUserAgentAuthentication = value;
    }

    public static bool? LogUserAgent
    {
        get => _logUserAgent;
        set => _logUserAgent = value;
    }

    /// <summary>
    /// Resolves the effective value: runtime override > config > default
    /// </summary>
    public static bool ResolveApiKeyAuth(ApplicationOptions? config)
        => _useApiKeyAuthentication ?? config?.UseApikeyAuthentication ?? true;

    public static bool ResolveUserAgentAuth(ApplicationOptions? config)
        => _useUserAgentAuthentication ?? config?.UseUserAgentAuthentication ?? true;

    public static bool ResolveLogUserAgent(ApplicationOptions? config)
        => _logUserAgent ?? config?.LogUserAgent ?? false;
}
