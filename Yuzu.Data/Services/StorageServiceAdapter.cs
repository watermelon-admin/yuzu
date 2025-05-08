using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Direct implementation of IStorageService that uses ScalewayS3StorageService
    /// </summary>
    public class StorageServiceAdapter : Interfaces.IStorageService
    {
        private readonly IStorageService _storageService;

        /// <summary>
        /// Initializes a new instance of the StorageServiceAdapter class
        /// </summary>
        public StorageServiceAdapter(IStorageService storageService)
        {
            _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));
        }

        /// <inheritdoc />
        public string GetBaseUrl(string containerName)
        {
            return _storageService.GetBaseUrl(containerName);
        }

        /// <inheritdoc />
        public string GetBackgroundsUrl()
        {
            return _storageService.GetBackgroundsUrl();
        }

        /// <inheritdoc />
        public Task<IEnumerable<StorageItem>> ListObjectsAsync(string containerName, string? prefix = null)
        {
            return _storageService.ListObjectsAsync(containerName, prefix);
        }

        /// <inheritdoc />
        public Task<bool> ObjectExistsAsync(string containerName, string objectName)
        {
            return _storageService.ObjectExistsAsync(containerName, objectName);
        }
        
        /// <inheritdoc />
        public Task<IDictionary<string, string>> GetObjectMetadataAsync(string containerName, string objectName)
        {
            return _storageService.GetObjectMetadataAsync(containerName, objectName);
        }
        
        /// <inheritdoc />
        public Task UploadObjectAsync(string containerName, string objectName, Stream content, 
            string contentType, IDictionary<string, string> metadata, bool isPublic = true)
        {
            return _storageService.UploadObjectAsync(containerName, objectName, content,
                contentType, metadata, isPublic);
        }
        
        /// <inheritdoc />
        public Task DeleteObjectAsync(string containerName, string objectName)
        {
            return _storageService.DeleteObjectAsync(containerName, objectName);
        }
    }
}