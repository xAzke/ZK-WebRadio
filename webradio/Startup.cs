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
        
        // PostgreSQL Database (Supabase)
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        
        if (string.IsNullOrEmpty(connectionString))
        {
            // Fallback to individual components (useful for Docker/Env vars)
            var host = configuration["DB_HOST"] ?? "aws-1-us-east-2.pooler.supabase.com";
            var db = configuration["DB_NAME"] ?? "postgres";
            var user = configuration["DB_USER"] ?? "postgres.puhmoxdpjwdjtldrmblq";
            var pass = configuration["DB_PASS"];
            
            if (!string.IsNullOrEmpty(pass))
            {
                // Optimization: Add pooling and timeout settings for Supabase
                connectionString = $"Host={host};Database={db};Username={user};Password={pass};Maximum Pool Size=10;Minimum Pool Size=0;Connection Idle Lifetime=300;SSL Mode=Require;Trust Server Certificate=true";
            }
        }

        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContextFactory<WebradioDbContext>(options =>
                options.UseNpgsql(connectionString, npgsqlOptions => 
                {
                    npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                }));
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
        // Database availability check
        using (var scope = app.ApplicationServices.CreateScope())
        {
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Startup>>();
            try 
            {
                var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<WebradioDbContext>>();
                using var context = contextFactory.CreateDbContext();
                
                if (context.Database.CanConnect())
                {
                    var databaseCreator = context.Database.GetService<IDatabaseCreator>();
                    if (databaseCreator is RelationalDatabaseCreator relationalDatabaseCreator && !relationalDatabaseCreator.HasTables())
                    {
                        logger.LogWarning("ATENCIÓN: La base de datos está conectada pero no tiene tablas. Recuerde ejecutar el script schema.sql manualmente en Supabase.");
                    }

                    // Ensure DeezerAccounts table exists
                    try
                    {
                        using (var cmd = context.Database.GetDbConnection().CreateCommand())
                        {
                            cmd.CommandText = @"
                                CREATE TABLE IF NOT EXISTS ""DeezerAccounts"" (
                                    ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                                    ""Arl"" text NOT NULL,
                                    ""Username"" varchar(150) NOT NULL,
                                    ""UserId"" varchar(50) NOT NULL UNIQUE,
                                    ""AvatarUrl"" varchar(500),
                                    ""IsPremium"" boolean DEFAULT false,
                                    ""IsActive"" boolean DEFAULT true,
                                    ""CreatedAt"" timestamptz DEFAULT now(),
                                    ""LastUsedAt"" timestamptz,
                                    ""RequestCount"" integer DEFAULT 0
                                );
                                ALTER TABLE ""DeezerAccounts"" ENABLE ROW LEVEL SECURITY;
                                DO $$ 
                                BEGIN
                                    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a roles de servicio' AND tablename = 'DeezerAccounts') THEN
                                        CREATE POLICY ""Permitir todo a roles de servicio"" ON ""DeezerAccounts"" FOR ALL TO service_role USING (true) WITH CHECK (true);
                                    END IF;
                                END $$;
                            ";
                            context.Database.OpenConnection();
                            cmd.ExecuteNonQuery();
                        }
                        logger.LogInformation("Tabla DeezerAccounts verificada/creada exitosamente.");
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Error al verificar o crear la tabla DeezerAccounts de forma automática.");
                    }
                }
                else 
                {
                    logger.LogError("No se puede conectar a la base de datos de Supabase. Verifique las credenciales.");
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error al verificar el estado de la base de datos.");
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
