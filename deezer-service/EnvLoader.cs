#nullable enable
using System;
using System.Collections;
using System.IO;

namespace DeezerService;

public static class EnvLoader
{
    public static void Load()
    {
        // Search for .env file starting from AppDomain.CurrentDomain.BaseDirectory upwards
        var dir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        string? envPath = null;
        while (dir != null)
        {
            var testPath = Path.Combine(dir.FullName, ".env");
            if (File.Exists(testPath))
            {
                envPath = testPath;
                break;
            }
            dir = dir.Parent;
        }

        if (envPath != null)
        {
            foreach (var line in File.ReadAllLines(envPath))
            {
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    continue;

                var idx = line.IndexOf('=');
                if (idx <= 0)
                    continue;

                var key = line[..idx].Trim();
                var value = line[(idx + 1)..].Trim();

                if ((value.StartsWith("\"") && value.EndsWith("\"")) || (value.StartsWith("'") && value.EndsWith("'")))
                {
                    value = value[1..^1];
                }

                // System/Docker environment variables take precedence over .env file
                if (Environment.GetEnvironmentVariable(key) == null)
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
        }

        // Apply Development overrides if environment is Development
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
        if (env.Equals("Development", StringComparison.OrdinalIgnoreCase))
        {
            var vars = Environment.GetEnvironmentVariables();
            foreach (DictionaryEntry entry in vars)
            {
                var key = entry.Key?.ToString();
                if (key != null && key.StartsWith("DEV_", StringComparison.OrdinalIgnoreCase))
                {
                    var targetKey = key[4..];
                    var value = entry.Value?.ToString();
                    if (value != null)
                    {
                        Environment.SetEnvironmentVariable(targetKey, value);
                    }
                }
            }
        }

        // Map service-specific URLs to ASPNETCORE_URLS
        var specificUrls = Environment.GetEnvironmentVariable("deezer_ASPNETCORE_URLS");
        if (!string.IsNullOrEmpty(specificUrls))
        {
            Environment.SetEnvironmentVariable("ASPNETCORE_URLS", specificUrls);
        }
    }
}
