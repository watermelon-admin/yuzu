using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Yuzu.Web.Pages;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Service for loading and managing background images from cloud storage
    /// </summary>
    public static class BackgroundImageService
    {
        private const string CacheKey = "BackgroundImages_Cache";
        private static readonly TimeSpan CacheExpiration = TimeSpan.FromMinutes(15);

        // In-memory cache for background images to avoid repeated S3 calls
        private static readonly Lazy<MemoryCache> _cache = new Lazy<MemoryCache>(() =>
            new MemoryCache(new MemoryCacheOptions())
        );

        private static MemoryCache Cache => _cache.Value;
        /// <summary>
        /// Loads background images from S3 storage with caching
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
            // Try to get from cache first
            if (Cache.TryGetValue(CacheKey, out List<BackgroundImage>? cachedBackgrounds) && cachedBackgrounds != null)
            {
                logger.LogInformation("Returning {Count} background images from cache", cachedBackgrounds.Count);
                return cachedBackgrounds;
            }

            logger.LogInformation("Cache miss - loading background images from S3");

            // Get the container name
            string containerName = configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";

            // Create a list to hold the background images
            List<BackgroundImage> backgrounds = new List<BackgroundImage>();

            try
            {
                logger.LogInformation("Listing objects from S3 container: {Container}", containerName);

                // List all objects in the container
                var items = await storageService.ListObjectsAsync(containerName);
                logger.LogInformation("Retrieved {Count} objects from S3", items?.Count() ?? 0);

                if (items == null || !items.Any())
                {
                    logger.LogWarning("No objects found in S3 container: {Container}", containerName);
                    return backgrounds;
                }

                // Regex pattern to identify thumbnail images
                Regex thumbnailPattern = new Regex(@"(.+)-thumb\.(jpe?g|png|gif|webp|svg)$", RegexOptions.IgnoreCase);

                // Get the base URL for the container
                var baseUrl = storageService.GetBaseUrl(containerName);
                logger.LogInformation("Using base URL: {BaseUrl}", baseUrl);

                // Create a set of all filenames for quick lookup
                var allFiles = new HashSet<string>(items.Select(i => i.Name), StringComparer.OrdinalIgnoreCase);
                logger.LogInformation("Created lookup set with {Count} files", allFiles.Count);

                // Process each item
                foreach (var item in items)
                {
                    try
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

                            // Check if the full-size image exists in our set (no S3 call needed)
                            if (allFiles.Contains(fullImageName))
                            {
                                // Generate the URLs
                                string thumbnailUrl = $"{baseUrl}/{fileName}";
                                string fullImageUrl = $"{baseUrl}/{fullImageName}";

                                // Try to get title from metadata if available
                                // Note: S3 metadata is not available in ListObjects, only in GetObjectMetadata
                                // For performance, we'll derive title from filename
                                string title = baseFileName.Replace("-", " ");
                                title = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(title);

                                // Add to the list
                                backgrounds.Add(new BackgroundImage
                                {
                                    Name = baseFileName,
                                    Title = title,
                                    ThumbnailUrl = thumbnailUrl,
                                    FullImageUrl = fullImageUrl
                                });

                                logger.LogDebug("Added background: {Name} - {Title}", baseFileName, title);
                            }
                        }
                    }
                    catch (Exception itemEx)
                    {
                        // Log but continue processing other items
                        logger.LogWarning(itemEx, "Error processing background item: {ItemName}", item?.Name ?? "unknown");
                    }
                }

                logger.LogInformation("Found {Count} background images", backgrounds.Count);

                // Store in cache with expiration
                Cache.Set(CacheKey, backgrounds, CacheExpiration);
                logger.LogInformation("Cached {Count} background images for {Minutes} minutes", backgrounds.Count, CacheExpiration.TotalMinutes);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error fetching background images from S3 storage");
                // Don't throw - return empty list to allow page to render
                logger.LogWarning("Returning empty background list due to S3 error");
                return new List<BackgroundImage>();
            }

            return backgrounds;
        }

        /// <summary>
        /// Clears the background images cache - useful when backgrounds are added/removed
        /// </summary>
        public static void ClearCache(ILogger logger)
        {
            Cache.Remove(CacheKey);
            logger.LogInformation("Background images cache cleared");
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