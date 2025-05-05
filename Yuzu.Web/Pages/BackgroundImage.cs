namespace Yuzu.Web.Pages
{
    /// <summary>
    /// Represents a background image for use in the application
    /// </summary>
    public class BackgroundImage
    {
        /// <summary>
        /// Base name of the image (without extension or suffixes)
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// Display title of the image
        /// </summary>
        public string Title { get; set; } = string.Empty;
        
        /// <summary>
        /// Optional description of the background image
        /// </summary>
        public string Description { get; set; } = string.Empty;
        
        /// <summary>
        /// URL to the thumbnail version of the image
        /// </summary>
        public string ThumbnailUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// URL to the full-size version of the image
        /// </summary>
        public string FullImageUrl { get; set; } = string.Empty;
    }
}