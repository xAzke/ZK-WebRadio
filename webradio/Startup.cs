using System;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Webradio.Auth;
using Webradio.Data;
using Webradio.Service;

namespace Webradio;

public sealed class Startup
{
    private readonly IConfiguration configuration;

    public Startup(IConfiguration configuration)
    {
        this.configuration = configuration;
    }

    public void ConfigureServices(IServiceCollection services)
    {
        services.Configure<ApplicationOptions>(configuration.GetSection("ApplicationOptions"));
        
        // Database provider configuration (sqlite or mysql)
        var dbProvider = configuration["DatabaseProvider"]?.Trim().ToLowerInvariant() ?? "sqlite";

        if (dbProvider == "mysql")
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            var dbPass = configuration["DB_PASS"];

            if (!string.IsNullOrEmpty(dbPass))
            {
                if (!string.IsNullOrEmpty(connectionString) && connectionString.Contains("TU_PASSWORD_AQUI"))
                {
                    connectionString = connectionString.Replace("TU_PASSWORD_AQUI", dbPass);
                }
                else if (string.IsNullOrEmpty(connectionString) || connectionString.Contains("Data Source=") || connectionString.Contains("Host=aws-1-us-east-2.pooler.supabase.com"))
                {
                    var host = configuration["DB_HOST"] ?? "localhost";
                    var db = configuration["DB_NAME"] ?? "webradio";
                    var user = configuration["DB_USER"] ?? "root";
                    var port = configuration["DB_PORT"] ?? "3306";
                    
                    connectionString = $"Server={host};Port={port};Database={db};Uid={user};Pwd={dbPass};";
                }
            }
            
            if (string.IsNullOrEmpty(connectionString) || connectionString.Contains("TU_PASSWORD_AQUI") || connectionString.Contains("Data Source="))
            {
                var host = configuration["DB_HOST"] ?? "localhost";
                var db = configuration["DB_NAME"] ?? "webradio";
                var user = configuration["DB_USER"] ?? "root";
                var port = configuration["DB_PORT"] ?? "3306";
                var pass = configuration["DB_PASS"] ?? "";
                
                connectionString = $"Server={host};Port={port};Database={db};Uid={user};Pwd={pass};";
            }

            ServerVersion serverVersion;
            try
            {
                serverVersion = ServerVersion.AutoDetect(connectionString);
            }
            catch
            {
                // Fallback to standard MySQL version if ServerVersion.AutoDetect fails (e.g. database not running/reachable yet)
                serverVersion = new MySqlServerVersion(new Version(8, 0, 30));
            }

            services.AddDbContextFactory<WebradioDbContext>(options =>
                options.UseMySql(connectionString, serverVersion, mysqlOptions => 
                {
                    mysqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                }));
        }
        else // default to sqlite
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString) || connectionString.Contains("Host=") || connectionString.Contains("Server="))
            {
                var dbPath = configuration["DatabasePath"] ?? configuration["Database:Path"] ?? "data/webradio.db";
                connectionString = $"Data Source={dbPath}";
            }

            services.AddDbContextFactory<WebradioDbContext>(options =>
                options.UseSqlite(connectionString));
        }
        
        services.AddSingleton<IApiKeyStore, ApiKeyStore>();
        services.AddSingleton<IDeezerAccountStore, DeezerAccountStore>();
        
        services.AddSingleton<IServiceManager, ServiceManager>();
        services.AddSingleton<ApiKeyManager>();
        services.AddSingleton<IStatsService, StatsService>();
        services.AddScoped<ITrackMetadataService, TrackMetadataService>();
        
        services.AddHttpClient<AdminAuthService>();
        services.AddSingleton<IAdminAuthService, AdminAuthService>();

        services.AddAuthentication(options =>
        {
            options.DefaultScheme = ApiKeyAuthenticationOptions.DefaultScheme;
            options.DefaultChallengeScheme = ApiKeyAuthenticationOptions.DefaultScheme;
        })
        .AddApiKeySupport(options => { })
        .AddUserAgentSupport(options => { });

        // Use in-memory cache for development, Redis for production
        var redisConfig = configuration.GetValue<string>("Redis:Configuration");
        if (!string.IsNullOrEmpty(redisConfig))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConfig;
                options.InstanceName = "webradio";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownProxies.Clear();
            options.KnownNetworks.Clear();
        });

        // CORS for dashboard
        var corsOriginsStr = configuration["CorsOrigins"] ?? "http://localhost:3000,http://localhost:5173";
        var allowedOrigins = corsOriginsStr
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(o => o.Trim())
            .ToArray();

        services.AddCors(options =>
        {
            options.AddPolicy("Dashboard", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            });
        });

        services.AddControllers();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Database availability check
        using (var scope = app.ApplicationServices.CreateScope())
        {
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Startup>>();
            try 
            {
                var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<WebradioDbContext>>();
                using var context = contextFactory.CreateDbContext();
                
                context.Database.EnsureCreated();
                logger.LogInformation("Base de datos verificada y tablas creadas/verificadas exitosamente.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error al verificar el estado de la base de datos o crear las tablas.");
            }
        }

        app.UseForwardedHeaders();

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseRouting();
        app.UseCors("Dashboard");
        app.UseAuthentication();
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}
