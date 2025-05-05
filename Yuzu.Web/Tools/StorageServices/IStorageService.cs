using Microsoft.AspNetCore.Http;

namespace Yuzu.Web.Tools.StorageServices
{
    /// <summary>
    /// Interface for cloud storage services used by the application
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
        /// Gets object metadata
        /// </summary>
        Task<IDictionary<string, string>> GetObjectMetadataAsync(string containerName, string objectName);
        
        /// <summary>
        /// Checks if an object exists
        /// </summary>
        Task<bool> ObjectExistsAsync(string containerName, string objectName);
        
        /// <summary>
        /// Uploads an object with metadata
        /// </summary>
        /// <param name="containerName">The container name</param>
        /// <param name="objectName">The object name</param>
        /// <param name="content">The content stream</param>
        /// <param name="contentType">The content type</param>
        /// <param name="metadata">The metadata dictionary</param>
        /// <param name="isPublic">Whether the object should be publicly accessible (default: true)</param>
        Task UploadObjectAsync(string containerName, string objectName, Stream content, string contentType, IDictionary<string, string> metadata, bool isPublic = true);
        
        /// <summary>
        /// Deletes an object
        /// </summary>
        Task DeleteObjectAsync(string containerName, string objectName);
    }

    /// <summary>
    /// Represents a storage item
    /// </summary>
    public class StorageItem
    {
        public string Name { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public long Size { get; set; }
        public DateTimeOffset LastModified { get; set; }
    }
}