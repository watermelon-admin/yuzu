using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Yuzu.Web.Pages;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Service for loading and managing background images from cloud storage
    /// </summary>
    public static class BackgroundImageService
    {
        /// <summary>
        /// Loads background images from S3 storage
        /// </summary>
        /// <param name="storageService">Storage service</param>
        /// <param name="configuration">Application configuration</param>
        /// <param name="logger">Logger for the service</param>
        /// <returns>A list of background images</returns>
        public static async Task<List<BackgroundImage>> LoadBackgroundImagesAsync(
            Yuzu.Data.Services.Interfaces.IStorageService storageService,
            IConfiguration configuration,
            ILogger logger)
        {
            // Get the container name
            string containerName = configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";

            // Create a list to hold the background images
            List<BackgroundImage> backgrounds = new List<BackgroundImage>();

            try
            {
                // List all objects in the container
                var items = await storageService.ListObjectsAsync(containerName);

                // Regex pattern to identify thumbnail images
                Regex thumbnailPattern = new Regex(@"(.+)-thumb\.(jpe?g|png|gif|webp|svg)$", RegexOptions.IgnoreCase);

                // Get the base URL for the container
                var baseUrl = storageService.GetBaseUrl(containerName);

                // Process each item
                foreach (var item in items)
                {
                    // Get just the filename without the container prefix
                    string fileName = item.Name;

                    // Check if this is a thumbnail
                    Match match = thumbnailPattern.Match(fileName);
                    if (match.Success)
                    {
                        string baseFileName = match.Groups[1].Value;
                        string extension = match.Groups[2].Value;

                        // Construct the full image name with -fhd suffix
                        string fullImageName = $"{baseFileName}-fhd.{extension}";

                        // Check if the full-size image exists
                        bool fullImageExists = await storageService.ObjectExistsAsync(containerName, fullImageName);

                        if (fullImageExists)
                        {
                            // Generate the URLs
                            string thumbnailUrl = $"{baseUrl}/{fileName}";
                            string fullImageUrl = $"{baseUrl}/{fullImageName}";

                            // Get the object's metadata to retrieve the custom title
                            var metadata = await storageService.GetObjectMetadataAsync(containerName, fileName);
                            
                            // Get title from metadata if it exists, otherwise use a formatted filename
                            string title;
                            if (metadata.TryGetValue("title", out var metadataTitle) && !string.IsNullOrEmpty(metadataTitle))
                            {
                                title = metadataTitle;
                            }
                            else
                            {
                                // Fallback for images without metadata
                                title = baseFileName.Replace("-", " ");
                                title = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(title);
                            }

                            // Add to the list
                            backgrounds.Add(new BackgroundImage
                            {
                                Name = baseFileName,
                                Title = title,
                                ThumbnailUrl = thumbnailUrl,
                                FullImageUrl = fullImageUrl
                            });
                        }
                    }
                }

                logger.LogInformation("Found {Count} background images", backgrounds.Count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error fetching background images from S3 storage");
                throw;
            }

            return backgrounds;
        }
        
        /// <summary>
        /// Gets storage metrics for a user's background images
        /// </summary>
        /// <param name="storageService">Storage service</param>
        /// <param name="configuration">Application configuration</param>
        /// <param name="userId">User ID</param>
        /// <param name="logger">Logger for the service</param>
        /// <returns>Storage metrics for the user's background images</returns>
        public static async Task<BackgroundStorageMetrics> GetStorageMetricsAsync(
            Yuzu.Data.Services.Interfaces.IStorageService storageService,
            IConfiguration configuration,
            string userId,
            ILogger logger)
        {
            // Get the container name
            string containerName = configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";
            
            // Create metrics object
            var metrics = new BackgroundStorageMetrics
            {
                ImageCount = 0,
                TotalSizeBytes = 0
            };
            
            try
            {
                // List all objects in the container
                var items = await storageService.ListObjectsAsync(containerName);
                
                // Filter for user's images and count unique images (not both thumb and full)
                // We're looking for user-{userId}- prefix and -thumb suffix
                var userThumbPattern = new Regex($@"^user-{userId}-(.+)-thumb\.(jpe?g|png|gif|webp|svg)$", RegexOptions.IgnoreCase);
                var userFullPattern = new Regex($@"^user-{userId}-(.+)-fhd\.(jpe?g|png|gif|webp|svg)$", RegexOptions.IgnoreCase);
                
                // Count unique images based on matching thumbnails
                var uniqueImageIds = new HashSet<string>();
                
                foreach (var item in items)
                {
                    // Check if this is a user's image
                    Match thumbMatch = userThumbPattern.Match(item.Name);
                    Match fullMatch = userFullPattern.Match(item.Name);
                    
                    if (thumbMatch.Success)
                    {
                        string imageId = thumbMatch.Groups[1].Value;
                        uniqueImageIds.Add(imageId);
                        metrics.TotalSizeBytes += item.Size;
                    }
                    else if (fullMatch.Success)
                    {
                        metrics.TotalSizeBytes += item.Size;
                    }
                }
                
                // Set final count
                metrics.ImageCount = uniqueImageIds.Count;
                
                logger.LogInformation("User {UserId} has {Count} background images using {SizeBytes} bytes", 
                    userId, metrics.ImageCount, metrics.TotalSizeBytes);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error fetching background image metrics for user {UserId}", userId);
                // Return empty metrics in case of error
                metrics = new BackgroundStorageMetrics
                {
                    ImageCount = 0,
                    TotalSizeBytes = 0
                };
            }
            
            return metrics;
        }
    }
    
    /// <summary>
    /// Storage metrics for background images
    /// </summary>
    public class BackgroundStorageMetrics
    {
        /// <summary>
        /// The number of background images
        /// </summary>
        public int ImageCount { get; set; }
        
        /// <summary>
        /// The total size in bytes
        /// </summary>
        public long TotalSizeBytes { get; set; }
        
        /// <summary>
        /// Gets the size in a human-readable format
        /// </summary>
        public string FormattedSize 
        { 
            get
            {
                return FormatSize(TotalSizeBytes);
            }
        }
        
        /// <summary>
        /// For debugging - always include this string representation
        /// </summary>
        public override string ToString()
        {
            return $"ImageCount: {ImageCount}, TotalSizeBytes: {TotalSizeBytes}, FormattedSize: {FormattedSize}";
        }
        
        /// <summary>
        /// Formats a size in bytes to a human-readable string
        /// </summary>
        private string FormatSize(long bytes)
        {
            if (bytes < 1024)
            {
                return $"{bytes} B";
            }
            else if (bytes < 1024 * 1024)
            {
                return $"{bytes / 1024.0:F1} KB";
            }
            else if (bytes < 1024 * 1024 * 1024)
            {
                return $"{bytes / (1024.0 * 1024):F1} MB";
            }
            else
            {
                return $"{bytes / (1024.0 * 1024 * 1024):F1} GB";
            }
        }
    }
}