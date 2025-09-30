using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Models
{
    /// <summary>
    /// Model class for background images
    /// </summary>
    [Table("background_images")]
    public class BackgroundImage : BaseEntity
    {
        /// <summary>
        /// Primary key for the background image (GUID)
        /// </summary>
        [Key]
        [Column("id")]
        public string Id { get; set; } = string.Empty;
        
        /// <summary>
        /// User ID who uploaded/owns this image, or null for system images
        /// </summary>
        [Column("user_id")]
        public string? UserId { get; set; }
        
        /// <summary>
        /// File name used in storage
        /// </summary>
        [Column("file_name")]
        [Required]
        [StringLength(200)]
        public string FileName { get; set; } = string.Empty;
        
        /// <summary>
        /// Display title for the image
        /// </summary>
        [Column("title")]
        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;
        
        /// <summary>
        /// URL to the thumbnail image
        /// </summary>
        [Column("thumbnail_url")]
        [Required]
        [Url]
        public string ThumbnailUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// URL to the full-size image
        /// </summary>
        [Column("full_image_url")]
        [Required]
        [Url]
        public string FullImageUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// Path to the thumbnail image
        /// </summary>
        [Column("thumbnail_path")]
        [Required]
        [StringLength(255)]
        public string ThumbnailPath { get; set; } = string.Empty;
        
        /// <summary>
        /// Path to the full-size image
        /// </summary>
        [Column("full_image_path")]
        [Required]
        [StringLength(255)]
        public string FullImagePath { get; set; } = string.Empty;
        
        /// <summary>
        /// Whether this is a system image (true) or user-uploaded image (false)
        /// </summary>
        [Column("is_system")]
        [Required]
        public bool IsSystem { get; set; } = false;
        
        /// <summary>
        /// When the image was uploaded
        /// </summary>
        [Column("uploaded_at")]
        [Required]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}