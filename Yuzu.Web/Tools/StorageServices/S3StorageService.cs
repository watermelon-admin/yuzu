using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;

namespace Yuzu.Web.Tools.StorageServices
{
    /// <summary>
    /// Implementation of IStorageService using Amazon S3
    /// </summary>
    public class S3StorageService : IStorageService
    {
        private readonly ILogger<S3StorageService> _logger;
        private readonly IAmazonS3 _s3Client;
        private readonly S3Settings _s3Settings;
        private readonly string _bucketName;
        private readonly string _serviceUrl;

        public S3StorageService(ILogger<S3StorageService> logger, IOptions<Yuzu.Configuration.S3.S3Settings> s3Options)
        {
            _logger = logger;
            
            if (s3Options == null)
            {
                _logger.LogError("S3Options is null");
                throw new ArgumentNullException(nameof(s3Options));
            }
            
            _s3Settings = s3Options.Value;
            
            if (_s3Settings == null)
            {
                _logger.LogError("S3Settings Value is null");
                throw new ArgumentNullException(nameof(s3Options.Value));
            }
            
            // Validate required values
            if (string.IsNullOrEmpty(_s3Settings.ServiceUrl))
            {
                _logger.LogError("S3Settings.ServiceUrl is null or empty");
                throw new InvalidOperationException("S3Settings.ServiceUrl is required but was not configured");
            }
            
            if (string.IsNullOrEmpty(_s3Settings.BucketName))
            {
                _logger.LogError("S3Settings.BucketName is null or empty");
                throw new InvalidOperationException("S3Settings.BucketName is required but was not configured");
            }
            
            if (string.IsNullOrEmpty(_s3Settings.AccessKey))
            {
                _logger.LogError("S3Settings.AccessKey is null or empty");
                throw new InvalidOperationException("S3Settings.AccessKey is required but was not configured");
            }
            
            if (string.IsNullOrEmpty(_s3Settings.SecretKey))
            {
                _logger.LogError("S3Settings.SecretKey is null or empty");
                throw new InvalidOperationException("S3Settings.SecretKey is required but was not configured");
            }
            
            // Get required values
            _serviceUrl = _s3Settings.ServiceUrl;
            _bucketName = _s3Settings.BucketName;
            var accessKey = _s3Settings.AccessKey;
            var secretKey = _s3Settings.SecretKey;

            _logger.LogInformation("Initializing S3 storage with service URL: {ServiceUrl} and bucket: {BucketName}", 
                _serviceUrl, _bucketName);

            // Create credentials and S3 client
            var credentials = new Amazon.Runtime.BasicAWSCredentials(accessKey, secretKey);
            _s3Client = new AmazonS3Client(credentials, new AmazonS3Config
            {
                ServiceURL = _serviceUrl,
                ForcePathStyle = true
            });
        }

        public string GetBaseUrl(string containerName)
        {
            // Format is: https://s3.region.scw.cloud/bucket-name/container-name
            return $"{_serviceUrl}/{_bucketName}/{containerName}";
        }
        

        public async Task<IEnumerable<StorageItem>> ListObjectsAsync(string containerName, string? prefix = null)
        {
            List<StorageItem> items = new List<StorageItem>();
            
            try
            {
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                _logger.LogInformation("S3 ListObjects starting for container {ContainerName} with prefix {Prefix}", 
                    containerName, prefix ?? "(none)");
                
                // Construct the full prefix (container/prefix)
                string fullPrefix = string.IsNullOrEmpty(prefix) 
                    ? $"{containerName}/" 
                    : $"{containerName}/{prefix}";
                
                var request = new ListObjectsV2Request
                {
                    BucketName = _bucketName,
                    Prefix = fullPrefix,
                    MaxKeys = 1000
                };

                int pageCount = 0;
                int objectCount = 0;
                ListObjectsV2Response response;
                do
                {
                    var pageStopwatch = System.Diagnostics.Stopwatch.StartNew();
                    response = await _s3Client.ListObjectsV2Async(request);
                    pageCount++;
                    
                    _logger.LogInformation("S3 ListObjects page {PageNumber} received in {PageElapsedMs}ms with {ObjectCount} objects", 
                        pageCount, pageStopwatch.ElapsedMilliseconds, response.S3Objects.Count);
                    
                    foreach (var s3Object in response.S3Objects)
                    {
                        objectCount++;
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
                
                stopwatch.Stop();
                _logger.LogInformation("S3 ListObjects completed in {ElapsedMilliseconds}ms for container {ContainerName}, " +
                                      "retrieved {ObjectCount} objects in {PageCount} pages", 
                    stopwatch.ElapsedMilliseconds, containerName, objectCount, pageCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing objects in container {ContainerName}", containerName);
                throw;
            }

            return items;
        }

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
                
                // Convert S3 metadata to dictionary
                Dictionary<string, string> metadata = new Dictionary<string, string>();
                foreach (var key in response.Metadata.Keys)
                {
                    metadata.Add(key, response.Metadata[key]);
                }

                return metadata;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return new Dictionary<string, string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting metadata for object {ObjectName} in container {ContainerName}", objectName, containerName);
                throw;
            }
        }

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
                _logger.LogError(ex, "Error checking if object {ObjectName} exists in container {ContainerName}", objectName, containerName);
                throw;
            }
        }
        

        public async Task UploadObjectAsync(string containerName, string objectName, Stream content, string contentType, IDictionary<string, string> metadata, bool isPublic = true)
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
                
                // Set the CannedACL to make the object publicly readable if requested
                if (isPublic)
                {
                    request.CannedACL = S3CannedACL.PublicRead;
                    _logger.LogInformation("Setting public access for object {ObjectName} in container {ContainerName}", objectName, containerName);
                }

                // Add metadata to the request
                foreach (var item in metadata)
                {
                    request.Metadata.Add(item.Key, item.Value);
                }

                await _s3Client.PutObjectAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading object {ObjectName} to container {ContainerName}", objectName, containerName);
                throw;
            }
        }

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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting object {ObjectName} from container {ContainerName}", objectName, containerName);
                throw;
            }
        }
    }
}