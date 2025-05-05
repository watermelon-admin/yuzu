using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Yuzu.Configuration.S3;

class Program
{
    static void Main(string[] args)
    {
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();

        // Create service collection
        var services = new ServiceCollection();

        // Register S3Settings in options
        services.Configure<S3Settings>(configuration.GetSection("S3Settings"));

        // Build service provider
        var serviceProvider = services.BuildServiceProvider();

        // Get S3Settings
        var s3Settings = serviceProvider.GetRequiredService<IOptions<S3Settings>>().Value;

        // Print S3Settings to verify they're not empty
        Console.WriteLine("S3Settings:");
        Console.WriteLine($"  ServiceUrl: {s3Settings.ServiceUrl}");
        Console.WriteLine($"  BucketName: {s3Settings.BucketName}");
        Console.WriteLine($"  BackgroundsContainer: {s3Settings.BackgroundsContainer}");
        Console.WriteLine($"  AccessKey: {s3Settings.AccessKey}");
        Console.WriteLine($"  SecretKey: {s3Settings.SecretKey}");

        if (string.IsNullOrEmpty(s3Settings.ServiceUrl) || 
            string.IsNullOrEmpty(s3Settings.BucketName) || 
            string.IsNullOrEmpty(s3Settings.BackgroundsContainer) || 
            string.IsNullOrEmpty(s3Settings.AccessKey) || 
            string.IsNullOrEmpty(s3Settings.SecretKey))
        {
            Console.WriteLine("ERROR: One or more S3Settings properties are empty!");
        }
        else
        {
            Console.WriteLine("SUCCESS: All S3Settings properties are populated.");
        }
    }
}