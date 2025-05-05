using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Yuzu.Web.Pages;
using Yuzu.Web.Tools.StorageServices;

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
        /// <param name="storageServiceFactory">Storage service factory</param>
        /// <param name="configuration">Application configuration</param>
        /// <param name="logger">Logger for the service</param>
        /// <returns>A list of background images</returns>
        public static async Task<List<BackgroundImage>> LoadBackgroundImagesAsync(
            Yuzu.Web.Tools.StorageServices.IStorageServiceFactory storageServiceFactory,
            IConfiguration configuration,
            ILogger logger)
        {
            // Get the S3 storage service
            var storageService = storageServiceFactory.CreateStorageService();
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
    }
}