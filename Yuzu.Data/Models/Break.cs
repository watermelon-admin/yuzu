using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Models
{
    /// <summary>
    /// Model class for breaks
    /// </summary>
    public class Break : BaseEntity
    {
        /// <summary>
        /// Gets or sets the break ID (GUID)
        /// </summary>
        [Key]
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the user ID
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the break type ID (GUID)
        /// </summary>
        [Required]
        [ForeignKey("BreakType")]
        public string BreakTypeId { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the break start time
        /// </summary>
        [Required]
        public DateTime StartTime { get; set; }
        
        /// <summary>
        /// Gets or sets the break end time
        /// </summary>
        [Required]
        public DateTime EndTime { get; set; }
        
        /// <summary>
        /// Gets or sets the associated break type
        /// </summary>
        public BreakType? BreakType { get; set; }
    }
}