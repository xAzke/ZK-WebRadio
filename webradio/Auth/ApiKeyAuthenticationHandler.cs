using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Webradio.Data;

namespace Webradio.Auth;

public sealed class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private const string ApiKeyHeaderName = "X-Api-Key";

    private readonly ApiKeyManager apiKeyManager;
    private readonly IApiKeyStore apiKeyStore;
    private bool isEnabled = true;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IOptionsMonitor<ApplicationOptions> applicationOptionsMonitor,
        ApiKeyManager apiKeyManager,
        IApiKeyStore apiKeyStore) : base(options, logger, encoder)
    {
        this.apiKeyManager = apiKeyManager ?? throw new ArgumentNullException(paramName: nameof(apiKeyManager));
        this.apiKeyStore = apiKeyStore ?? throw new ArgumentNullException(paramName: nameof(apiKeyStore));

        isEnabled = RuntimeSettings.ResolveApiKeyAuth(applicationOptionsMonitor.CurrentValue);

        applicationOptionsMonitor.OnChange(options =>
        {
            isEnabled = RuntimeSettings.ResolveApiKeyAuth(options);
        });
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check runtime override first (for hot-toggle via admin API)
        if (RuntimeSettings.UseApiKeyAuthentication.HasValue)
            isEnabled = RuntimeSettings.UseApiKeyAuthentication.Value;

        if (!isEnabled)
        {
            return Success("Nobody");
        }

        if (!Request.Headers.TryGetValue(ApiKeyHeaderName, out var apiKeyHeaderValues))
        {
            return AuthenticateResult.NoResult();
        }

        var providedApiKey = apiKeyHeaderValues.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(providedApiKey))
        {
            return AuthenticateResult.NoResult();
        }

        ApiKey? apiKey = apiKeyManager.GetApiKeyFromKey(providedApiKey);

        if (apiKey == null)
        {
            return AuthenticateResult.Fail("Invalid API key provided");
        }

        if (apiKey.AllowedIPAddresses.Count > 0)
        {
            IPAddress? ipAddress = Request.HttpContext.Connection.RemoteIpAddress;

            if (ipAddress == null || !apiKey.AllowedIPAddresses.Contains(ipAddress))
            {
                return AuthenticateResult.Fail($"client ip address {ipAddress} is not allowed");
            }
        }

        try
        {
            await apiKeyStore.UpdateLastUsedAsync(providedApiKey);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to update last used timestamp for API key");
        }

        return Success(apiKey.Owner);
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
