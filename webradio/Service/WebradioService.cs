#nullable enable
using System;
using Microsoft.Extensions.Logging;
using static Webradio.Service.Webradio;

namespace Webradio.Service;

public class WebradioService
{
    public WebradioClient Client { get; }
    
    private Configuration? _configuration;
    private readonly ILogger<WebradioService>? _logger;

    public Configuration Configuration 
    { 
        get
        {
            if (_configuration == null)
            {
                try
                {
                    _configuration = Client.GetConfiguration(new ConfigurationRequest());
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to get configuration from service, using defaults");
                    _configuration = new Configuration
                    {
                        SearchExpirationInSeconds = 604800, // 7 days
                        StreamExpirationInSeconds = 1800    // 30 minutes
                    };
                }
            }
            return _configuration;
        }
    }

    public WebradioService(WebradioClient client, ILogger<WebradioService>? logger = null)
    {
        Client = client;
        _logger = logger;
    }
}
