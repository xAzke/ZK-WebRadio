#nullable enable
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Webradio.Auth;

/// <summary>
/// Simple JWT validator for admin API authentication
/// </summary>
public interface IAdminAuthService
{
    bool ValidateToken(string? token, out string? userId, out string? username);
}

public class AdminAuthService : IAdminAuthService
{
    private readonly string _jwtSecret;

    public AdminAuthService(IConfiguration configuration)
    {
        // Use the same secret as the auth server (BETTER_AUTH_SECRET)
        _jwtSecret = configuration["JwtSecret"] 
            ?? configuration["AdminAuth:Secret"] 
            ?? "fallback-secret-change-me";
    }

    public bool ValidateToken(string? token, out string? userId, out string? username)
    {
        userId = null;
        username = null;

        if (string.IsNullOrEmpty(token))
        {
            return false;
        }

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSecret);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

            userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? principal.FindFirst("sub")?.Value;
            username = principal.FindFirst(ClaimTypes.Name)?.Value 
                ?? principal.FindFirst("name")?.Value;

            return true;
        }
        catch (SecurityTokenExpiredException)
        {
            return false;
        }
        catch (Exception)
        {
            return false;
        }
    }
}
