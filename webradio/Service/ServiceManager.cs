using System;
using Grpc.Net.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using static Webradio.Service.Webradio;

namespace Webradio.Service;

public class ServiceManager : IServiceManager
{
    private readonly Dictionary<string, WebradioService> services = new Dictionary<string, WebradioService>();
    private readonly ILogger<ServiceManager> logger;
    private readonly ILoggerFactory loggerFactory;

    public ServiceManager(ILogger<ServiceManager> logger, IConfiguration configuration, ILoggerFactory loggerFactory)
    {
        this.logger = logger;
        this.loggerFactory = loggerFactory;

        // Read service URLs from configuration, fallback to Docker service names
        var servicesConfig = configuration.GetSection("Services");
        
        RegisterService("deezer", 
            servicesConfig["Deezer"] ?? "http://webradio-deezer-service/");
    }

    private void RegisterService(string serviceName, string address)
    {
        try
        {
            var options = new GrpcChannelOptions()
            {
                ThrowOperationCanceledOnCancellation = true,
            };

            GrpcChannel channel = GrpcChannel.ForAddress(address, options);
            var client = new WebradioClient(channel);
            var serviceLogger = loggerFactory.CreateLogger<WebradioService>();
            services.Add(serviceName, new WebradioService(client, serviceLogger));

            logger.LogInformation("Service {Name} (address: {Address}) has been registered", serviceName, address);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to register service {Name} at {Address}", serviceName, address);
        }
    }

    public WebradioService GetService(string serviceName)
    {
        services.TryGetValue(serviceName, out var client);
        return client;
    }
}
