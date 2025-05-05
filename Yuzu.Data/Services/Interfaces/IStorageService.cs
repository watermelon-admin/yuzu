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
        /// Lists all objects in a container with optional prefix
        /// </summary>
        Task<IEnumerable<StorageItem>> ListObjectsAsync(string containerName, string? prefix = null);

        /// <summary>
        /// Checks if an object exists
        /// </summary>
        Task<bool> ObjectExistsAsync(string containerName, string objectName);
    }

    /// <summary>
    /// Interface for storage service factory in the Data layer
    /// </summary>
    public interface IStorageServiceFactory
    {
        /// <summary>
        /// Creates a storage service
        /// </summary>
        IStorageService CreateStorageService();
        
        /// <summary>
        /// Gets the base URL for backgrounds
        /// </summary>
        string GetBackgroundsUrl();
    }

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