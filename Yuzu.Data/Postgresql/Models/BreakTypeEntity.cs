using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Postgresql.Models
{
    /// <summary>
    /// Represents a break type entity stored in PostgreSQL
    /// </summary>
    public class BreakTypeEntity
    {
        /// <summary>
        /// Primary key for the break type
        /// </summary>
        [Key]
        public int Id { get; set; }
        
        /// <summary>
        /// The user ID who owns this break type
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        /// <summary>
        /// The sort order
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// The display name
        /// </summary>
        [Required(ErrorMessage = "Please provide a Display Name.")]
        [StringLength(100, ErrorMessage = "The Display Name is too long. It should be 100 characters or fewer.")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The default duration in minutes
        /// </summary>
        [Required(ErrorMessage = "Please specify the Default Duration.")]
        [Range(1, 1440, ErrorMessage = "The Duration should be between 1 and 1440 minutes.")]
        public int DefaultDurationMinutes { get; set; }

        /// <summary>
        /// The countdown message
        /// </summary>
        [Required(ErrorMessage = "Please enter a Countdown Message.")]
        [StringLength(200, ErrorMessage = "The Countdown Message is too long. It should be 200 characters or fewer.")]
        public string CountdownMessage { get; set; } = string.Empty;

        /// <summary>
        /// The countdown end message
        /// </summary>
        [Required(ErrorMessage = "Please enter a Countdown End Message.")]
        [StringLength(200, ErrorMessage = "The Countdown End Message is too long. It should be 200 characters or fewer.")]
        public string CountdownEndMessage { get; set; } = string.Empty;

        /// <summary>
        /// The end time title
        /// </summary>
        [Required(ErrorMessage = "Please provide an End Time Title.")]
        [StringLength(100, ErrorMessage = "The End Time Title is too long. It should be 100 characters or fewer.")]
        public string EndTimeTitle { get; set; } = string.Empty;

        /// <summary>
        /// The break time step in minutes
        /// </summary>
        [Required(ErrorMessage = "Please specify the Break Start Interval.")]
        [Range(1, 60, ErrorMessage = "The Start Interval should be between 1 and 60 minutes.")]
        public int BreakTimeStepMinutes { get; set; }
        
        /// <summary>
        /// The background image choices
        /// </summary>
        public string? BackgroundImageChoices { get; set; }
        
        /// <summary>
        /// The image title
        /// </summary>
        public string? ImageTitle { get; set; }
        
        /// <summary>
        /// The usage count
        /// </summary>
        public long UsageCount { get; set; }

        /// <summary>
        /// The icon name
        /// </summary>
        public string? IconName { get; set; }
        
        /// <summary>
        /// The components
        /// </summary>
        public string? Components { get; set; }
        
        /// <summary>
        /// Indicates whether the break type is locked
        /// </summary>
        public bool IsLocked { get; set; }
        
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
        /// Navigation property for related breaks
        /// </summary>
        public virtual ICollection<BreakEntity> Breaks { get; set; } = new List<BreakEntity>();
    }
}