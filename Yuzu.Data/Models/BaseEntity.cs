using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Models
{
    /// <summary>
    /// Base class for all entities
    /// </summary>
    public abstract class BaseEntity
    {
        /// <summary>
        /// Gets or sets the creation date and time
        /// </summary>
        [Required]
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Gets or sets the last update date and time
        /// </summary>
        [Required]
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}