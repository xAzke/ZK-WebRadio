#nullable enable
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using System.Net.Http;
using System.Threading.Tasks;

namespace Webradio.Auth;

public interface IAdminAuthService
{
    bool ValidateToken(string? token, out string? userId, out string? username);
}

public class AdminAuthService : IAdminAuthService
{
    private readonly string _supabaseUrl;
    private readonly HttpClient _httpClient;
    private JsonWebKeySet? _jwks;
    private DateTime _nextRefresh = DateTime.MinValue;

    public AdminAuthService(IConfiguration configuration)
    {
        _supabaseUrl = configuration["SupabaseUrl"] ?? "https://puhmoxdpjwdjtldrmblq.supabase.co";
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(15);
    }

    private void RefreshKeys()
    {
        if (_jwks != null && DateTime.UtcNow < _nextRefresh) return;

        try
        {
            var url = $"{_supabaseUrl}/auth/v1/.well-known/jwks.json";
            var response = _httpClient.GetAsync(url).GetAwaiter().GetResult();
            response.EnsureSuccessStatusCode();
            
            var json = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            _jwks = new JsonWebKeySet(json);
            _nextRefresh = DateTime.UtcNow.AddHours(1);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminAuth] Error: {ex.Message}");
        }
    }

    public bool ValidateToken(string? token, out string? userId, out string? username)
    {
        userId = null;
        username = null;
        if (string.IsNullOrEmpty(token)) return false;

        RefreshKeys();

        if (_jwks == null || _jwks.Keys.Count == 0) return false;

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = _jwks.Keys,
                ValidateIssuer = true,
                ValidIssuer = $"{_supabaseUrl}/auth/v1",
                ValidateAudience = true,
                ValidAudience = "authenticated",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

            userId = principal.FindFirst("sub")?.Value 
                     ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var userMetadataJson = principal.FindFirst("user_metadata")?.Value;
            if (!string.IsNullOrEmpty(userMetadataJson))
            {
                using var doc = JsonDocument.Parse(userMetadataJson);
                if (doc.RootElement.TryGetProperty("full_name", out var nameProp))
                {
                    username = nameProp.GetString();
                }
            }

            if (string.IsNullOrEmpty(username))
            {
                username = principal.FindFirst("email")?.Value ?? "Supabase User";
            }

            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }
}
