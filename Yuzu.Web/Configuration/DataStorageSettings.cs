using System.ComponentModel.DataAnnotations;

namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Configuration settings for data storage
    /// </summary>
    public class DataStorageSettings
    {
        /// <summary>
        /// Type of storage to use (PostgreSQL, etc.)
        /// </summary>
        [Required]
        public string StorageType { get; set; } = "PostgreSQL";

        /// <summary>
        /// Whether to use development storage
        /// </summary>
        public bool UseDevelopmentStorage { get; set; } = false;

        /// <summary>
        /// Storage account name
        /// </summary>
        public string StorageAccountName { get; set; } = string.Empty;

        /// <summary>
        /// Database connection string
        /// </summary>
        [Required]
        public string ConnectionString { get; set; } = string.Empty;
    }
}