using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using DeezNET;

namespace DeezerService;

public sealed class Startup
{
    private IConfiguration Configuration { get; }

    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public void ConfigureServices(IServiceCollection services)
    {
        // Register DeezerClient as singleton - ARL will be set on first use
        services.AddSingleton<DeezerClient>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<Startup>>();
            var client = new DeezerClient();
            var arl = Configuration["Arl"];
            
            if (!string.IsNullOrEmpty(arl) && arl != "YOUR_DEEZER_ARL_TOKEN_HERE")
            {
                var arlPreview = arl.Length > 8 
                    ? $"{arl[..4]}...{arl[^4..]} (length: {arl.Length})" 
                    : $"(length: {arl.Length})";
                logger.LogInformation("Setting ARL: {ArlPreview}", arlPreview);
                
                try 
                {
                    client.SetARL(arl).GetAwaiter().GetResult();
                    logger.LogInformation("Deezer ARL configured successfully");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to set ARL - downloads will not work! Error: {Message}", ex.Message);
                }
            }
            else
            {
                logger.LogWarning("No Deezer ARL configured - downloads will not work!");
            }
            
            return client;
        });
        
        // Register cache cleanup background service
        services.AddHostedService<CacheCleanupService>();
        
        services.AddGrpc();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env, ILogger<Startup> logger, IHostApplicationLifetime lifetime)
    {
        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseRouting();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapGrpcService<DeezerService>();
            
            // Add a simple health check endpoint
            endpoints.MapGet("/", async context =>
            {
                await context.Response.WriteAsync("Deezer Service is running");
            });
        });

        // Log startup message
        lifetime.ApplicationStarted.Register(() =>
        {
            var urls = Configuration["urls"] ?? Configuration["ASPNETCORE_URLS"] ?? "http://localhost:5002";
            logger.LogInformation("==============================================");
            logger.LogInformation("  Deezer Service Started");
            logger.LogInformation("  Listening on: {Urls}", urls);
            logger.LogInformation("  Environment: {Env}", env.EnvironmentName);
            logger.LogInformation("==============================================");
        });
    }
}
