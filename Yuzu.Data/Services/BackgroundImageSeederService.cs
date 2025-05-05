using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Service for seeding system background images from S3 storage into the database
    /// </summary>
    public class BackgroundImageSeederService
    {
        private readonly IBackgroundImageService _backgroundImageService;
        private readonly Interfaces.IStorageService _storageService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BackgroundImageSeederService> _logger;
        private readonly string _backgroundsContainer;

        private static readonly Regex _fileNamePattern = new Regex(@"^([\w-]+)-fhd\.jpg$", RegexOptions.Compiled);

        /// <summary>
        /// Initializes a new instance of the BackgroundImageSeederService class
        /// </summary>
        /// <param name="backgroundImageService">The background image service</param>
        /// <param name="storageServiceFactory">The storage service factory (Data interfaces)</param>
        /// <param name="configuration">The application configuration</param>
        /// <param name="logger">The logger</param>
        public BackgroundImageSeederService(
            IBackgroundImageService backgroundImageService,
            Interfaces.IStorageServiceFactory storageServiceFactory,
            IConfiguration configuration,
            ILogger<BackgroundImageSeederService> logger)
        {
            _backgroundImageService = backgroundImageService ?? throw new ArgumentNullException(nameof(backgroundImageService));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            
            // Get storage service from factory
            if (storageServiceFactory == null)
            {
                throw new ArgumentNullException(nameof(storageServiceFactory));
            }
            _storageService = storageServiceFactory.CreateStorageService();
            
            // Get backgrounds container name from configuration
            _backgroundsContainer = _configuration.GetSection("S3Settings")["BackgroundsContainer"] ?? 
                throw new InvalidOperationException("S3Settings:BackgroundsContainer is not configured");
        }

        /// <summary>
        /// Seeds system background images from S3 storage into the database
        /// </summary>
        public async Task SeedBackgroundImagesAsync()
        {
            try
            {
                _logger.LogInformation("===> Starting to seed system background images <===");
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();

                // Get base URL for the backgrounds container
                string baseUrl = _storageService.GetBaseUrl(_backgroundsContainer);
                _logger.LogInformation("Using backgrounds base URL: {BaseUrl}", baseUrl);

                // Get existing system background images from database
                var existingImages = await _backgroundImageService.GetSystemImagesAsync();
                var existingFileNames = existingImages.Select(i => i.FileName).ToHashSet();
                _logger.LogInformation("Found {Count} existing system background images in database", existingImages.Count);

                // List objects in the backgrounds container
                var s3Objects = await _storageService.ListObjectsAsync(_backgroundsContainer);
                _logger.LogInformation("Found {Count} objects in S3 {Container} container", s3Objects.Count(), _backgroundsContainer);
                
                // Log all object names for debugging
                foreach (var obj in s3Objects)
                {
                    _logger.LogDebug("S3 object: {Name}", obj.Name);
                }

                // Group objects by base name (e.g., "blackboard" from "blackboard-fhd.jpg")
                var imageGroups = GroupBackgroundImages(s3Objects.ToList());
                _logger.LogInformation("Identified {Count} background image groups", imageGroups.Count);
                
                // Log image groups for debugging
                foreach (var group in imageGroups)
                {
                    _logger.LogDebug("Image group: {BaseName} with {Count} files", group.Key, group.Value.Count);
                }

                // Create background image entries for each group
                int addedCount = 0;
                foreach (var group in imageGroups)
                {
                    string baseFileName = group.Key;
                    string fullFileName = $"{baseFileName}-fhd.jpg";
                    
                    // Skip if this image already exists in the database
                    if (existingFileNames.Contains(fullFileName))
                    {
                        _logger.LogDebug("Skipping existing background image: {FileName}", fullFileName);
                        continue;
                    }

                    // Verify that both the full image and thumbnail exist in S3
                    string fullImagePath = $"{_backgroundsContainer}/{fullFileName}";
                    string thumbnailPath = $"{_backgroundsContainer}/{baseFileName}-thumb.jpg";
                    
                    bool fullImageExists = await _storageService.ObjectExistsAsync(_backgroundsContainer, fullFileName);
                    bool thumbnailExists = await _storageService.ObjectExistsAsync(_backgroundsContainer, $"{baseFileName}-thumb.jpg");
                    
                    _logger.LogDebug("Full image exists? {Exists} at {Path}", fullImageExists, fullImagePath);
                    _logger.LogDebug("Thumbnail exists? {Exists} at {Path}", thumbnailExists, thumbnailPath);
                    
                    if (!fullImageExists || !thumbnailExists)
                    {
                        _logger.LogWarning("Skipping image {FileName} because either the full image or thumbnail is missing", fullFileName);
                        continue;
                    }

                    // Create a new background image record
                    var backgroundImage = new BackgroundImage
                    {
                        UserId = string.Empty, // System image
                        FileName = fullFileName,
                        Title = FormatTitle(baseFileName),
                        ThumbnailPath = thumbnailPath,
                        FullImagePath = fullImagePath,
                        ThumbnailUrl = $"{baseUrl}/{baseFileName}-thumb.jpg",
                        FullImageUrl = $"{baseUrl}/{fullFileName}",
                        IsSystem = true,
                        UploadedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    // Add to database
                    try
                    {
                        await _backgroundImageService.CreateAsync(backgroundImage);
                        addedCount++;
                        _logger.LogInformation("Added background image to database: {Title}", backgroundImage.Title);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to add background image {Title} to database", backgroundImage.Title);
                    }
                }

                stopwatch.Stop();
                _logger.LogInformation(
                    "Background image seeding completed in {ElapsedMilliseconds}ms. Added {AddedCount} new images.",
                    stopwatch.ElapsedMilliseconds, addedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding background images");
                throw;
            }
        }

        /// <summary>
        /// Groups background images by their base name
        /// </summary>
        /// <param name="s3Objects">List of S3 objects</param>
        /// <returns>Dictionary of base name to list of objects</returns>
        private Dictionary<string, List<Interfaces.StorageItem>> GroupBackgroundImages(List<Interfaces.StorageItem> s3Objects)
        {
            var result = new Dictionary<string, List<Interfaces.StorageItem>>();

            foreach (var obj in s3Objects)
            {
                // Skip system user images (they have user- prefix)
                if (obj.Name.StartsWith("user-"))
                {
                    continue;
                }

                // Extract base name from full-sized images
                var match = _fileNamePattern.Match(obj.Name);
                if (match.Success)
                {
                    string baseName = match.Groups[1].Value;
                    
                    // Skip test/debug images that start with zzz_
                    if (baseName.StartsWith("zzz_"))
                    {
                        continue;
                    }
                    
                    if (!result.ContainsKey(baseName))
                    {
                        result[baseName] = new List<StorageItem>();
                    }
                    
                    result[baseName].Add(obj);
                }
            }

            // Validate that each group has both -fhd.jpg and -thumb.jpg files
            // Log all identified base names
            foreach (var key in result.Keys)
            {
                _logger.LogDebug("Base name identified: {BaseName}", key);
                bool hasThumb = s3Objects.Any(o => o.Name == $"{key}-thumb.jpg");
                _logger.LogDebug("Has thumbnail? {HasThumb} for {BaseName}", hasThumb, key);
            }
            
            // Filter and return only groups that have both FHD and thumbnail files
            var filteredResult = result.Where(g => 
                s3Objects.Any(o => o.Name == $"{g.Key}-thumb.jpg"))
                .ToDictionary(g => g.Key, g => g.Value);
                
            _logger.LogDebug("After filtering, {Count} groups remain with both FHD and thumbnail", filteredResult.Count);
            return filteredResult;
        }

        /// <summary>
        /// Formats a file base name as a title
        /// </summary>
        /// <param name="baseName">Base file name (e.g., "blackboard")</param>
        /// <returns>Formatted title (e.g., "Blackboard")</returns>
        private string FormatTitle(string baseName)
        {
            if (string.IsNullOrEmpty(baseName))
            {
                return string.Empty;
            }

            // Replace hyphens with spaces
            string title = baseName.Replace('-', ' ');
            
            // Capitalize first letter of each word
            title = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(title);
            
            return title;
        }
    }
}