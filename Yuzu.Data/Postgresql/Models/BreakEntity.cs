using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Postgresql.Models
{
    /// <summary>
    /// Represents a break entity stored in PostgreSQL
    /// </summary>
    public class BreakEntity
    {
        /// <summary>
        /// Primary key for the break
        /// </summary>
        [Key]
        public int Id { get; set; }
        
        /// <summary>
        /// The user ID who owns this break
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        /// <summary>
        /// The break type ID
        /// </summary>
        public int BreakTypeId { get; set; }
        
        /// <summary>
        /// The break start time
        /// </summary>
        public DateTime StartTime { get; set; }
        
        /// <summary>
        /// The break end time
        /// </summary>
        public DateTime EndTime { get; set; }
        
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
        
        /// <summary>
        /// Navigation property to the related break type
        /// </summary>
        [ForeignKey("BreakTypeId")]
        public virtual BreakTypeEntity? BreakType { get; set; }
    }
}