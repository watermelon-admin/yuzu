using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;

// Simplified S3StorageService for testing
class S3StorageService
{
    private readonly ILogger<S3StorageService> _logger;
    private readonly S3Settings _s3Settings;
    private readonly string _bucketName;
    private readonly string _serviceUrl;

    public S3StorageService(ILogger<S3StorageService> logger, IOptions<S3Settings> s3Options)
    {
        Console.WriteLine("S3StorageService constructor called");
        
        _logger = logger;
        _s3Settings = s3Options.Value;
        
        // These lines would fail if S3Settings is not properly bound
        _serviceUrl = _s3Settings.ServiceUrl;
        _bucketName = _s3Settings.BucketName;
        var accessKey = _s3Settings.AccessKey;
        var secretKey = _s3Settings.SecretKey;

        Console.WriteLine($"Initializing S3 storage with service URL: {_serviceUrl} and bucket: {_bucketName}");
        Console.WriteLine($"Access Key: {accessKey}");
        Console.WriteLine($"Secret Key length: {secretKey.Length}");
        
        // In a real scenario, this would be where the Amazon S3 client is created
    }
    
    public string GetBaseUrl(string containerName)
    {
        return $"{_serviceUrl}/{_bucketName}/{containerName}";
    }
}

class Program
{
    static void Main(string[] args)
    {
        // Setup configuration
        var configValues = new Dictionary<string, string>
        {
            {"S3Settings:ServiceUrl", "http://localhost:9000"},
            {"S3Settings:BucketName", "static"},
            {"S3Settings:BackgroundsContainer", "backgrounds"},
            {"S3Settings:AccessKey", "minioadmin"},
            {"S3Settings:SecretKey", "minioadmin"}
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();

        // Setup services
        var services = new ServiceCollection();
        
        // Add logging
        services.AddLogging(builder => builder.AddConsole());
        
        // Add configuration
        services.Configure<S3Settings>(configuration.GetSection("S3Settings"));
        
        // Add S3StorageService
        services.AddScoped<S3StorageService>();
        
        // Build service provider
        var serviceProvider = services.BuildServiceProvider();
        
        // Test S3StorageService initialization
        try
        {
            var storageService = serviceProvider.GetRequiredService<S3StorageService>();
            Console.WriteLine("S3StorageService initialized successfully");
            
            // Test GetBaseUrl method
            var baseUrl = storageService.GetBaseUrl("testcontainer");
            Console.WriteLine($"Base URL: {baseUrl}");
            
            Console.WriteLine("SUCCESS: S3StorageService is working correctly");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.GetType().Name}: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
            }
            Environment.Exit(1);
        }
    }
}