using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Models
{
    /// <summary>
    /// Model class for break types
    /// </summary>
    public class BreakType : BaseEntity
    {
        /// <summary>
        /// Gets or sets the break type ID (GUID)
        /// </summary>
        [Key]
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the user ID
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the display name
        /// </summary>
        [Required(ErrorMessage = "Please provide a Display Name.")]
        [StringLength(100, ErrorMessage = "The Display Name is too long. It should be 100 characters or fewer.")]
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the default duration in minutes
        /// </summary>
        [Required(ErrorMessage = "Please specify the Default Duration.")]
        [Range(1, 1440, ErrorMessage = "The Duration should be between 1 and 1440 minutes.")]
        public int DefaultDurationMinutes { get; set; }
        
        /// <summary>
        /// Gets or sets the countdown message
        /// </summary>
        [Required(ErrorMessage = "Please enter a Countdown Message.")]
        [StringLength(200, ErrorMessage = "The Countdown Message is too long. It should be 200 characters or fewer.")]
        public string CountdownMessage { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the countdown end message
        /// </summary>
        [Required(ErrorMessage = "Please enter a Countdown End Message.")]
        [StringLength(200, ErrorMessage = "The Countdown End Message is too long. It should be 200 characters or fewer.")]
        public string CountdownEndMessage { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the end time title
        /// </summary>
        [Required(ErrorMessage = "Please provide an End Time Title.")]
        [StringLength(100, ErrorMessage = "The End Time Title is too long. It should be 100 characters or fewer.")]
        public string EndTimeTitle { get; set; } = string.Empty;
        
        /// <summary>
        /// Gets or sets the break time step in minutes
        /// </summary>
        [Required(ErrorMessage = "Please specify the Break Start Interval.")]
        [Range(1, 60, ErrorMessage = "The Start Interval should be between 1 and 60 minutes.")]
        public int BreakTimeStepMinutes { get; set; }
        
        /// <summary>
        /// Gets or sets the background image choices
        /// </summary>
        public string? BackgroundImageChoices { get; set; }
        
        /// <summary>
        /// Gets or sets the image title
        /// </summary>
        public string? ImageTitle { get; set; }
        
        /// <summary>
        /// Gets or sets the usage count
        /// </summary>
        public long UsageCount { get; set; }
        
        /// <summary>
        /// Gets or sets the icon name
        /// </summary>
        public string? IconName { get; set; }
        
        /// <summary>
        /// Gets or sets the components
        /// </summary>
        public string? Components { get; set; }
        
        /// <summary>
        /// Gets or sets whether the break type is locked
        /// </summary>
        public bool IsLocked { get; set; }
        
        /// <summary>
        /// Gets or sets the sort order
        /// </summary>
        public int SortOrder { get; set; }
        
        /// <summary>
        /// Gets or sets the associated breaks
        /// </summary>
        public ICollection<Break> Breaks { get; set; } = new List<Break>();
        
    }
}