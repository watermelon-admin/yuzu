using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Yuzu.Data.Postgresql.Models
{
    /// <summary>
    /// Entity class for background images
    /// </summary>
    [Table("background_images")]
    public class BackgroundImageEntity
    {
        /// <summary>
        /// Primary key for the background image
        /// </summary>
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        /// <summary>
        /// User ID who uploaded/owns this image, or null for system images
        /// </summary>
        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;
        
        /// <summary>
        /// File name used in storage
        /// </summary>
        [Column("file_name")]
        public string FileName { get; set; } = string.Empty;
        
        /// <summary>
        /// Display title for the image
        /// </summary>
        [Column("title")]
        public string Title { get; set; } = string.Empty;
        
        /// <summary>
        /// Path to the thumbnail image
        /// </summary>
        [Column("thumbnail_path")]
        public string ThumbnailPath { get; set; } = string.Empty;
        
        /// <summary>
        /// Path to the full-size image
        /// </summary>
        [Column("full_image_path")]
        public string FullImagePath { get; set; } = string.Empty;
        
        /// <summary>
        /// URL to the thumbnail image (used for web display)
        /// </summary>
        [Column("thumbnail_url")]
        public string ThumbnailUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// URL to the full-size image (used for web display)
        /// </summary>
        [Column("full_image_url")]
        public string FullImageUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// When the image was uploaded
        /// </summary>
        [Column("uploaded_at")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Whether this is a system image (true) or user-uploaded image (false)
        /// </summary>
        [Column("is_system")]
        public bool IsSystem { get; set; } = false;
        
        /// <summary>
        /// Gets or sets the creation date and time
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Gets or sets the last update date and time
        /// </summary>
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}