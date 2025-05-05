using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Models
{
    /// <summary>
    /// Model class for user data items
    /// </summary>
    public class UserDataItem : BaseEntity
    {
        /// <summary>
        /// Gets or sets the user data item ID
        /// </summary>
        [Key]
        public int Id { get; set; }
        
        /// <summary>
        /// Gets or sets the user ID
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the data key
        /// </summary>
        [Required]
        public string DataKey { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the value
        /// </summary>
        [Required]
        public string Value { get; set; } = string.Empty;
    }
    
    /// <summary>
    /// Enumeration representing keys for user data.
    /// </summary>
    public enum UserDataKey
    {
        HomeTimeZone,
        ConfirmBreakScreenExit,
        AdditionalTimeZones
    }
}