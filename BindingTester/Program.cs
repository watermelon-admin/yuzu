using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;

class TestBinding
{
    static void Main(string[] args)
    {
        // Create a config dictionary
        var configValues = new Dictionary<string, string>
        {
            {"S3Settings:ServiceUrl", "http://localhost:9000"},
            {"S3Settings:BucketName", "static"},
            {"S3Settings:BackgroundsContainer", "backgrounds"},
            {"S3Settings:AccessKey", "minioadmin"},
            {"S3Settings:SecretKey", "minioadmin"}
        };

        // Build configuration from dictionary
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();

        // Create service collection
        var services = new ServiceCollection();

        // Add options configuration
        services.Configure<S3Settings>(configuration.GetSection("S3Settings"));

        // Build service provider
        var serviceProvider = services.BuildServiceProvider();

        // Get the options
        var s3Settings = serviceProvider.GetRequiredService<IOptions<S3Settings>>().Value;

        // Check if configuration values are bound correctly
        Console.WriteLine("S3Settings:");
        Console.WriteLine($"  ServiceUrl: {s3Settings.ServiceUrl}");
        Console.WriteLine($"  BucketName: {s3Settings.BucketName}");
        Console.WriteLine($"  BackgroundsContainer: {s3Settings.BackgroundsContainer}");
        Console.WriteLine($"  AccessKey: {s3Settings.AccessKey}");
        Console.WriteLine($"  SecretKey: {s3Settings.SecretKey}");

        // Check if any value is empty
        if (string.IsNullOrEmpty(s3Settings.ServiceUrl) ||
            string.IsNullOrEmpty(s3Settings.BucketName) ||
            string.IsNullOrEmpty(s3Settings.BackgroundsContainer) ||
            string.IsNullOrEmpty(s3Settings.AccessKey) ||
            string.IsNullOrEmpty(s3Settings.SecretKey))
        {
            Console.WriteLine("ERROR: One or more S3Settings properties are empty!");
            Environment.Exit(1);
        }
        else
        {
            Console.WriteLine("SUCCESS: All S3Settings properties are populated.");
        }
    }
}