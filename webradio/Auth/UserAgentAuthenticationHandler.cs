using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Webradio.Data;

namespace Webradio.Auth;

public partial class UserAgentAuthenticationHandler : AuthenticationHandler<UserAgentAuthenticationOptions>
{
    [GeneratedRegex(@"^MTA:SA Server\s+(\S+)")]
    private static partial Regex MtaServerRegex();

    [GeneratedRegex(@"^(?:NSPlayer|NSServer|WMCacheProxy)\/\d+\.\d+(?:\.\d+\.\d+)")]
    private static partial Regex WindowsMediaRegex();

    private static readonly Regex currentServerRegex = MtaServerRegex();
    private static readonly Regex windowMediaRegex = WindowsMediaRegex();

    private readonly ApiKeyManager apiKeyManager;
    private readonly IApiKeyStore apiKeyStore;
    private bool isEnabled = true;
    private bool logUserAgent = false;

    public UserAgentAuthenticationHandler(
        IOptionsMonitor<UserAgentAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IOptionsMonitor<ApplicationOptions> applicationOptionsMonitor,
        ApiKeyManager apiKeyManager,
        IApiKeyStore apiKeyStore)
        : base(options, logger, encoder)
    {
        this.apiKeyManager = apiKeyManager ?? throw new ArgumentNullException(paramName: nameof(apiKeyManager));
        this.apiKeyStore = apiKeyStore ?? throw new ArgumentNullException(paramName: nameof(apiKeyStore));

        isEnabled = RuntimeSettings.ResolveUserAgentAuth(applicationOptionsMonitor.CurrentValue);
        logUserAgent = RuntimeSettings.ResolveLogUserAgent(applicationOptionsMonitor.CurrentValue);

        applicationOptionsMonitor.OnChange(options =>
        {
            isEnabled = RuntimeSettings.ResolveUserAgentAuth(options);
            logUserAgent = RuntimeSettings.ResolveLogUserAgent(options);
        });
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        IPAddress? ipAddress = Request.HttpContext.Connection.RemoteIpAddress;
        string? userAgent = Request.Headers.UserAgent;
        string path = $"{Request.Path}{Request.QueryString}";

        // Check runtime overrides first (for hot-toggle via admin API)
        if (RuntimeSettings.UseUserAgentAuthentication.HasValue)
            isEnabled = RuntimeSettings.UseUserAgentAuthentication.Value;
        if (RuntimeSettings.LogUserAgent.HasValue)
            logUserAgent = RuntimeSettings.LogUserAgent.Value;

        if (!isEnabled)
        {
            if (logUserAgent)
            {
                Logger.LogInformation("{IpAddress} -> {Path} (user-agent: {UserAgent})", ipAddress, path, userAgent);
            }

            return Success("Nobody");
        }

        if (string.IsNullOrWhiteSpace(userAgent))
        {
            Logger.LogInformation("Access for ip {IpAddress} denied - empty (path: {Path}, user-agent: {UserAgent})", ipAddress, path, userAgent);
            return AuthenticateResult.Fail("invalid user agent");
        }

        if (windowMediaRegex.Match(userAgent).Success)
        {
            return Success("MS-WMSP"); // Windows Media HTTP Streaming Protocol
        }

        Match currentServerMatch = currentServerRegex.Match(userAgent);

        if (currentServerMatch.Success)
        {
            string serverAddress = currentServerMatch.Groups[1].Value;
            ApiKey? apiKey = apiKeyManager.GetApiKeyFromServer(serverAddress);

            if (apiKey != null)
            {
                try
                {
                    await apiKeyStore.UpdateLastUsedAsync(apiKey.Key);
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Failed to update last used timestamp for API key");
                }
                return Success(apiKey.Owner);
            }
            else
            {
                Logger.LogInformation("Access for ip {IpAddress} denied - unknown server (path: {Path}, user-agent: {UserAgent})", ipAddress, path, userAgent);
                return AuthenticateResult.Fail("invalid user agent");
            }
        }

        Logger.LogInformation("Access for ip {IpAddress} denied - unmatched (path: {Path}, user-agent: {UserAgent})", ipAddress, path, userAgent);
        return AuthenticateResult.Fail("invalid user agent");
    }

    private AuthenticateResult Success(string owerName)
    {
        var claims = new List<Claim>()
        {
            new(ClaimTypes.Name, owerName),
        };
        var identity = new ClaimsIdentity(claims, Options.AuthenticationType);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Options.Scheme);
        return AuthenticateResult.Success(ticket);
    }
}
