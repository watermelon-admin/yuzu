using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Implementation of IStorageService using Amazon S3 SDK optimized for Scaleway Object Storage
    /// </summary>
    public class ScalewayS3StorageService : IStorageService
    {
        private readonly ILogger<ScalewayS3StorageService> _logger;
        private readonly IAmazonS3 _s3Client;
        private readonly S3Settings _s3Settings;
        private readonly string _bucketName;
        private readonly string _serviceUrl;
        private readonly string _backgroundsContainer;
        
        /// <summary>
        /// Creates a new instance of ScalewayS3StorageService
        /// </summary>
        public ScalewayS3StorageService(ILogger<ScalewayS3StorageService> logger, IOptions<S3Settings> s3Options)
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
            
            // Store settings
            _serviceUrl = _s3Settings.ServiceUrl;
            _bucketName = _s3Settings.BucketName;
            _backgroundsContainer = _s3Settings.BackgroundsContainer;
            
            // Log configuration (without sensitive data)
            _logger.LogInformation("Initializing Scaleway S3 Storage Service");
            _logger.LogInformation("Service URL: {ServiceUrl}", _serviceUrl);
            _logger.LogInformation("Bucket: {BucketName}", _bucketName);
            _logger.LogInformation("Backgrounds Container: {Container}", _backgroundsContainer);
            _logger.LogInformation("Access Key: {KeyPrefix}...", _s3Settings.AccessKey.Substring(0, 5));
            
            // Create AWS credentials
            var credentials = new Amazon.Runtime.BasicAWSCredentials(_s3Settings.AccessKey, _s3Settings.SecretKey);
            
            // Configure S3 client based on our test results
            // IMPORTANT: For Scaleway, DO NOT set the region endpoint
            var config = new AmazonS3Config
            {
                ServiceURL = _serviceUrl,
                ForcePathStyle = false, // Use virtual-hosted style for Scaleway
                UseHttp = _serviceUrl.StartsWith("http://"),
                Timeout = TimeSpan.FromSeconds(30),
                MaxErrorRetry = 3,
                LogResponse = true
            };
            
            _logger.LogInformation("Creating S3 client with optimized Scaleway configuration");
            _s3Client = new AmazonS3Client(credentials, config);
        }
        
        /// <summary>
        /// Gets the base URL for a container
        /// </summary>
        public string GetBaseUrl(string containerName)
        {
            // Extract region from service URL (e.g., fr-par from https://s3.fr-par.scw.cloud)
            string region = "";
            var match = System.Text.RegularExpressions.Regex.Match(_serviceUrl, @"s3\.([^.]+)\.scw\.cloud");
            if (match.Success && match.Groups.Count > 1)
            {
                region = match.Groups[1].Value;
            }
            
            // Generate URL in Scaleway-compatible format
            string baseUrl;
            if (!string.IsNullOrEmpty(region))
            {
                // Use virtual-hosted style URL (bucket in hostname)
                baseUrl = $"https://{_bucketName}.s3.{region}.scw.cloud/{containerName}";
                _logger.LogDebug("Generated Scaleway virtual-hosted URL: {BaseUrl}", baseUrl);
            }
            else
            {
                // Fallback to standard URL format
                baseUrl = $"{_serviceUrl}/{_bucketName}/{containerName}";
                _logger.LogDebug("Generated standard URL: {BaseUrl}", baseUrl);
            }
            
            return baseUrl;
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
                // Construct the full prefix
                string fullPrefix = string.IsNullOrEmpty(prefix) 
                    ? $"{containerName}/" 
                    : $"{containerName}/{prefix}";
                
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
                        // Extract the name without the container prefix
                        string name = s3Object.Key.StartsWith(containerName + "/")
                            ? s3Object.Key.Substring(containerName.Length + 1) // +1 for the slash
                            : s3Object.Key;
                            
                        items.Add(new StorageItem
                        {
                            Name = name,
                            Key = s3Object.Key,
                            Size = s3Object.Size,
                            LastModified = s3Object.LastModified
                        });
                    }
                    
                    request.ContinuationToken = response.NextContinuationToken;
                } while (response.IsTruncated);
                
                _logger.LogInformation("Found {Count} objects in container {Container}", 
                    items.Count, containerName);
            }
            catch (AmazonS3Exception s3Ex)
            {
                _logger.LogError(s3Ex, 
                    "S3 error listing objects in {Container}: Status={Status}, ErrorCode={ErrorCode}", 
                    containerName, s3Ex.StatusCode, s3Ex.ErrorCode);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing objects in container {Container}", containerName);
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
                    Key = $"{containerName}/{objectName}"
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
                _logger.LogError(ex, "Error checking if object {ObjectName} exists in {Container}", 
                    objectName, containerName);
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
                    Key = $"{containerName}/{objectName}",
                    InputStream = content,
                    ContentType = contentType
                };
                
                // Set public access if requested
                if (isPublic)
                {
                    request.CannedACL = S3CannedACL.PublicRead;
                }
                
                // Add metadata
                foreach (var item in metadata)
                {
                    request.Metadata.Add(item.Key, item.Value);
                }
                
                await _s3Client.PutObjectAsync(request);
                _logger.LogInformation("Uploaded object {ObjectName} to {Container}", objectName, containerName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading object {ObjectName} to {Container}", 
                    objectName, containerName);
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
                    Key = $"{containerName}/{objectName}"
                };
                
                await _s3Client.DeleteObjectAsync(request);
                _logger.LogInformation("Deleted object {ObjectName} from {Container}", objectName, containerName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting object {ObjectName} from {Container}", 
                    objectName, containerName);
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
                    Key = $"{containerName}/{objectName}"
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
                _logger.LogError(ex, "Error getting metadata for {ObjectName} in {Container}", 
                    objectName, containerName);
                throw;
            }
        }
    }
}