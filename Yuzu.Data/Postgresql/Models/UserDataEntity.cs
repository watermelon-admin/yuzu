using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Postgresql.Models
{
    /// <summary>
    /// Represents a user data entity stored in PostgreSQL
    /// </summary>
    public class UserDataEntity
    {
        /// <summary>
        /// Primary key for the user data item
        /// </summary>
        [Key]
        public int Id { get; set; }
        
        /// <summary>
        /// The user ID who owns this data item
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        /// <summary>
        /// The data key
        /// </summary>
        [Required]
        public string DataKey { get; set; } = string.Empty;
        
        /// <summary>
        /// The data value
        /// </summary>
        public string Value { get; set; } = string.Empty;
        
        /// <summary>
        /// Creation date and time
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Last updated date and time
        /// </summary>
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}