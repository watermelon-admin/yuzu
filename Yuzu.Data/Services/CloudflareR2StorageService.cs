using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Implementation of IStorageService using Amazon S3 SDK optimized for Cloudflare R2 Storage
    /// </summary>
    public class CloudflareR2StorageService : IStorageService
    {
        private readonly ILogger<CloudflareR2StorageService> _logger;
        private readonly IAmazonS3 _s3Client;
        private readonly S3Settings _s3Settings;
        private readonly string _bucketName;
        private readonly string _serviceUrl;
        private readonly string _backgroundsContainer;
        private readonly string? _customDomain;
        
        /// <summary>
        /// Creates a new instance of CloudflareR2StorageService
        /// </summary>
        public CloudflareR2StorageService(ILogger<CloudflareR2StorageService> logger, IOptions<S3Settings> s3Options)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            
            if (s3Options == null)
            {
                _logger.LogError("S3Options is null");
                throw new ArgumentNullException(nameof(s3Options));
            }
            
            _s3Settings = s3Options.Value ?? throw new ArgumentNullException(nameof(s3Options.Value));
            
            // Validate required settings
            if (string.IsNullOrEmpty(_s3Settings.ServiceUrl))
                throw new InvalidOperationException("S3Settings.ServiceUrl is required");
                
            if (string.IsNullOrEmpty(_s3Settings.BucketName))
                throw new InvalidOperationException("S3Settings.BucketName is required");
                
            if (string.IsNullOrEmpty(_s3Settings.AccessKey))
                throw new InvalidOperationException("S3Settings.AccessKey is required");
                
            if (string.IsNullOrEmpty(_s3Settings.SecretKey))
                throw new InvalidOperationException("S3Settings.SecretKey is required");
            
            if (string.IsNullOrEmpty(_s3Settings.BackgroundsContainer))
                throw new InvalidOperationException("S3Settings.BackgroundsContainer is required");

            if (_s3Settings.Provider == S3Settings.ProviderType.CloudflareR2 && string.IsNullOrEmpty(_s3Settings.AccountId))
                throw new InvalidOperationException("S3Settings.AccountId is required for Cloudflare R2");
            
            // Store settings
            _serviceUrl = _s3Settings.ServiceUrl;
            _bucketName = _s3Settings.BucketName;
            _backgroundsContainer = _s3Settings.BackgroundsContainer;
            _customDomain = _s3Settings.CustomDomain;
            
            // Log configuration (without sensitive data)
            _logger.LogInformation("Initializing Cloudflare R2 Storage Service");
            _logger.LogInformation("Service URL: {ServiceUrl}", _serviceUrl);
            _logger.LogInformation("Bucket: {BucketName}", _bucketName);
            _logger.LogInformation("Backgrounds Container: {Container}", _backgroundsContainer);
            
            if (!string.IsNullOrEmpty(_customDomain))
            {
                _logger.LogInformation("Custom Domain: {CustomDomain}", _customDomain);
            }
            
            _logger.LogInformation("Access Key: {KeyPrefix}...", _s3Settings.AccessKey.Substring(0, Math.Min(5, _s3Settings.AccessKey.Length)));
            
            // Create AWS credentials
            var credentials = new Amazon.Runtime.BasicAWSCredentials(_s3Settings.AccessKey, _s3Settings.SecretKey);
            
            // Configure S3 client for R2
            var config = new AmazonS3Config
            {
                ServiceURL = _serviceUrl,
                // For Cloudflare R2, don't set RegionEndpoint as it overrides ServiceURL
                // R2 handles region automatically through the service URL
                ForcePathStyle = _s3Settings.ForcePathStyle, // Use setting value
                UseHttp = _serviceUrl.StartsWith("http://"),
                Timeout = TimeSpan.FromSeconds(30),
                MaxErrorRetry = 3
            };
            
            _logger.LogInformation("Creating S3 client with Cloudflare R2 configuration");
            _s3Client = new AmazonS3Client(credentials, config);
        }
        
        /// <summary>
        /// Gets the base URL for a container
        /// </summary>
        public string GetBaseUrl(string containerName)
        {
            // If custom domain is configured, use it
            if (!string.IsNullOrEmpty(_customDomain))
            {
                // If the custom domain already contains the bucket name (e.g., backgrounds.breakscreen.com)
                // we don't need to add the bucket name
                string baseUrl = _customDomain;
                
                // Ensure proper format with https:// prefix
                if (!baseUrl.StartsWith("http"))
                {
                    baseUrl = $"https://{baseUrl}";
                }
                
                // Remove trailing slash if present
                if (baseUrl.EndsWith("/"))
                {
                    baseUrl = baseUrl.TrimEnd('/');
                }
                
                _logger.LogDebug("Generated custom domain URL: {BaseUrl}", baseUrl);
                return baseUrl;
            }

            // Use standard R2 URL format with account ID
            string accountId = _s3Settings.AccountId ?? string.Empty;
            string url = $"https://{accountId}.r2.cloudflarestorage.com/{_bucketName}";
            
            _logger.LogDebug("Generated standard R2 URL: {BaseUrl}", url);
            return url;
        }
        
        /// <summary>
        /// Gets the base URL for backgrounds
        /// </summary>
        public string GetBackgroundsUrl()
        {
            return GetBaseUrl(_backgroundsContainer);
        }
        
        /// <summary>
        /// Lists objects in a container
        /// </summary>
        public async Task<IEnumerable<StorageItem>> ListObjectsAsync(string containerName, string? prefix = null)
        {
            var items = new List<StorageItem>();
            
            try
            {
                // In R2 with CustomDomain, we're not using container prefixes anymore
                // We list objects directly from the bucket
                string fullPrefix = !string.IsNullOrEmpty(prefix) ? prefix : "";
                
                _logger.LogDebug("Listing objects with prefix: {Prefix}", fullPrefix);
                
                // Create request
                var request = new ListObjectsV2Request
                {
                    BucketName = _bucketName,
                    Prefix = fullPrefix,
                    MaxKeys = 1000
                };
                
                // Process paginated results
                ListObjectsV2Response response;
                do
                {
                    response = await _s3Client.ListObjectsV2Async(request);
                    
                    foreach (var s3Object in response.S3Objects)
                    {
                        items.Add(new StorageItem
                        {
                            Name = s3Object.Key,
                            Key = s3Object.Key,
                            Size = s3Object.Size,
                            LastModified = s3Object.LastModified
                        });
                    }
                    
                    request.ContinuationToken = response.NextContinuationToken;
                } while (response.IsTruncated);
                
                _logger.LogInformation("Found {Count} objects with prefix {Prefix}", 
                    items.Count, fullPrefix);
            }
            catch (AmazonS3Exception s3Ex)
            {
                _logger.LogError(s3Ex, 
                    "R2 error listing objects with prefix {Prefix}: Status={Status}, ErrorCode={ErrorCode}", 
                    prefix, s3Ex.StatusCode, s3Ex.ErrorCode);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing objects with prefix {Prefix}", prefix);
                throw;
            }
            
            return items;
        }
        
        /// <summary>
        /// Checks if an object exists
        /// </summary>
        public async Task<bool> ObjectExistsAsync(string containerName, string objectName)
        {
            try
            {
                var request = new GetObjectMetadataRequest
                {
                    BucketName = _bucketName,
                    Key = objectName  // In R2, we're using flat structure without container prefixes
                };
                
                await _s3Client.GetObjectMetadataAsync(request);
                return true;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if object {ObjectName} exists", objectName);
                throw;
            }
        }
        
        /// <summary>
        /// Uploads an object to the specified container
        /// </summary>
        public async Task UploadObjectAsync(string containerName, string objectName, Stream content, 
            string contentType, IDictionary<string, string> metadata, bool isPublic = true)
        {
            try
            {
                var request = new PutObjectRequest
                {
                    BucketName = _bucketName,
                    Key = objectName,  // In R2, we're using flat structure without container prefixes
                    InputStream = content,
                    ContentType = contentType,
                    DisablePayloadSigning = _s3Settings.DisablePayloadSigning // Required for R2 compatibility
                };
                
                // Note: Cloudflare R2 does not support ACLs
                // Public access is managed through custom domains or R2 public URLs
                // The isPublic parameter is noted but not enforced via ACL
                if (isPublic)
                {
                    _logger.LogDebug("Object {ObjectName} requested as public, but R2 doesn't support ACLs. Ensure bucket is configured for public access via custom domain.", objectName);
                }
                
                // Add metadata
                foreach (var item in metadata)
                {
                    request.Metadata.Add(item.Key, item.Value);
                }
                
                await _s3Client.PutObjectAsync(request);
                _logger.LogInformation("Uploaded object {ObjectName}", objectName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading object {ObjectName}", objectName);
                throw;
            }
        }
        
        /// <summary>
        /// Deletes an object from the specified container
        /// </summary>
        public async Task DeleteObjectAsync(string containerName, string objectName)
        {
            try
            {
                var request = new DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = objectName  // In R2, we're using flat structure without container prefixes
                };
                
                await _s3Client.DeleteObjectAsync(request);
                _logger.LogInformation("Deleted object {ObjectName}", objectName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting object {ObjectName}", objectName);
                throw;
            }
        }
        
        /// <summary>
        /// Gets object metadata
        /// </summary>
        public async Task<IDictionary<string, string>> GetObjectMetadataAsync(string containerName, string objectName)
        {
            try
            {
                var request = new GetObjectMetadataRequest
                {
                    BucketName = _bucketName,
                    Key = objectName  // In R2, we're using flat structure without container prefixes
                };
                
                var response = await _s3Client.GetObjectMetadataAsync(request);
                
                // Convert metadata to dictionary
                var metadata = new Dictionary<string, string>();
                foreach (var key in response.Metadata.Keys)
                {
                    metadata[key] = response.Metadata[key];
                }
                
                return metadata;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return new Dictionary<string, string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting metadata for {ObjectName}", objectName);
                throw;
            }
        }
    }
}