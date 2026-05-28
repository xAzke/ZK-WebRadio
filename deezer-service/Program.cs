using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace DeezerService;

public sealed class Program
{
    public static void Main(string[] args)
    {
        EnvLoader.Load();
        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
            {
                webBuilder.UseStartup<Startup>();
            });
}
