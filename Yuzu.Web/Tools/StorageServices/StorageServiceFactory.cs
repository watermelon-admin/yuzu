using Microsoft.Extensions.Options;
using Yuzu.Web.Configuration;

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
            IOptions<S3Settings> s3Options,
            ILogger<StorageServiceFactory> logger)
        {
            _serviceProvider = serviceProvider;
            _s3Settings = s3Options.Value;
            _logger = logger;
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