using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;

namespace Yuzu.Web.Tools.StorageServices
{
    /// <summary>
    /// Factory for creating storage service instances
    /// </summary>
    public class StorageServiceFactory : IStorageServiceFactory
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly S3Settings _s3Settings;
        private readonly ILogger<StorageServiceFactory> _logger;

        public StorageServiceFactory(
            IServiceProvider serviceProvider, 
            IOptions<Yuzu.Configuration.S3.S3Settings> s3Options,
            ILogger<StorageServiceFactory> logger)
        {
            _serviceProvider = serviceProvider;
            _s3Settings = s3Options.Value;
            _logger = logger;
            
            // Debug logging to check S3Settings
            _logger.LogInformation("StorageServiceFactory initialized with S3Settings:");
            _logger.LogInformation($"  ServiceUrl: {_s3Settings.ServiceUrl}");
            _logger.LogInformation($"  BucketName: {_s3Settings.BucketName}");
            _logger.LogInformation($"  BackgroundsContainer: {_s3Settings.BackgroundsContainer}");
            _logger.LogInformation($"  AccessKey: {_s3Settings.AccessKey}");
            _logger.LogInformation($"  Secret Key exists: {!string.IsNullOrEmpty(_s3Settings.SecretKey)}");
        }

        public IStorageService CreateStorageService()
        {
            _logger.LogInformation("Creating S3 storage service");
            return _serviceProvider.GetRequiredService<S3StorageService>();
        }
        

        public string GetBackgroundsUrl()
        {
            string serviceUrl = _s3Settings.ServiceUrl;
            string bucketName = _s3Settings.BucketName;
            string backgroundsContainer = _s3Settings.BackgroundsContainer;
            
            // Construct the backgrounds URL from S3Settings (serviceUrl + bucketName + container)
            string url = $"{serviceUrl}/{bucketName}/{backgroundsContainer}";
            
            // Remove trailing slash if present
            return url.TrimEnd('/');
        }
        
    }

    /// <summary>
    /// Interface for storage service factory
    /// </summary>
    public interface IStorageServiceFactory
    {
        IStorageService CreateStorageService();
        string GetBackgroundsUrl();
    }
}