namespace Yuzu.Data.Services.Interfaces
{
    /// <summary>
    /// Interface for storage services in the Data layer
    /// </summary>
    public interface IStorageService
    {
        /// <summary>
        /// Gets the base URL for the storage container
        /// </summary>
        string GetBaseUrl(string containerName);
        
        /// <summary>
        /// Gets the base URL for the backgrounds container
        /// </summary>
        string GetBackgroundsUrl();

        /// <summary>
        /// Lists all objects in a container with optional prefix
        /// </summary>
        Task<IEnumerable<StorageItem>> ListObjectsAsync(string containerName, string? prefix = null);

        /// <summary>
        /// Checks if an object exists
        /// </summary>
        Task<bool> ObjectExistsAsync(string containerName, string objectName);
        
        /// <summary>
        /// Uploads an object to the specified container
        /// </summary>
        Task UploadObjectAsync(string containerName, string objectName, Stream content, 
            string contentType, IDictionary<string, string> metadata, bool isPublic = true);
            
        /// <summary>
        /// Deletes an object from the specified container
        /// </summary>
        Task DeleteObjectAsync(string containerName, string objectName);
        
        /// <summary>
        /// Gets object metadata
        /// </summary>
        Task<IDictionary<string, string>> GetObjectMetadataAsync(string containerName, string objectName);

        /// <summary>
        /// Downloads an object from the specified container
        /// </summary>
        Task<Stream> DownloadObjectAsync(string containerName, string objectName);
    }

    // The IStorageServiceFactory interface has been removed - use IStorageService directly

    /// <summary>
    /// Represents a storage item in the Data layer
    /// </summary>
    public class StorageItem
    {
        /// <summary>
        /// The name of the item
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// The key of the item
        /// </summary>
        public string Key { get; set; } = string.Empty;
        
        /// <summary>
        /// The size of the item
        /// </summary>
        public long Size { get; set; }
        
        /// <summary>
        /// When the item was last modified
        /// </summary>
        public DateTimeOffset LastModified { get; set; }
    }
}