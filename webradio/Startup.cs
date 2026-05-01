using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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
        
        // SQLite Database
        var dbPath = configuration.GetValue<string>("Database:Path") ?? "webradio.db";
        services.AddDbContextFactory<WebradioDbContext>(options =>
            options.UseSqlite($"Data Source={dbPath}"));
        
        // API Key Store (database-backed)
        services.AddSingleton<IApiKeyStore, ApiKeyStore>();
        
        services.AddSingleton<IServiceManager, ServiceManager>();
        services.AddSingleton<ApiKeyManager>();
        services.AddSingleton<IStatsService, StatsService>();
        services.AddScoped<ITrackMetadataService, TrackMetadataService>();
        services.AddSingleton<IAdminAuthService, AdminAuthService>();
        services.AddHttpClient();

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
            services.AddDistributedRedisCache(options =>
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
        services.AddCors(options =>
        {
            options.AddPolicy("Dashboard", policy =>
            {
                policy.WithOrigins(
                    "http://localhost:3000",
                    "http://localhost:5173",
                    configuration.GetValue<string>("Dashboard:Url") ?? "http://localhost:3000"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            });
        });

        services.AddControllers();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Ensure database directory and database are created
        using (var scope = app.ApplicationServices.CreateScope())
        {
            var dbPath = scope.ServiceProvider.GetRequiredService<IConfiguration>()
                .GetValue<string>("Database:Path") ?? "webradio.db";
            var dir = System.IO.Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(dir) && !System.IO.Directory.Exists(dir))
                System.IO.Directory.CreateDirectory(dir);

            var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<WebradioDbContext>>();
            using var context = contextFactory.CreateDbContext();
            context.Database.EnsureCreated();
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
