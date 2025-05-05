using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;
using Yuzu.Web.Configuration;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Service for initializing system background images
    /// </summary>
    public class SystemBackgroundImageInitializer
    {
        private readonly IBackgroundImageService _backgroundImageService;
        private readonly IStorageService _storageService;
        private readonly S3Settings _s3Settings;
        private readonly ILogger<SystemBackgroundImageInitializer> _logger;
        private readonly string _backgroundsContainer;
        
        private static readonly Regex _fileNamePattern = new Regex(@"^([\w-]+)-fhd\.jpg$", RegexOptions.Compiled);

        /// <summary>
        /// Initializes a new instance of the SystemBackgroundImageInitializer class
        /// </summary>
        /// <param name="backgroundImageService">The background image service</param>
        /// <param name="storageServiceFactory">The storage service factory</param>
        /// <param name="s3Options">S3 configuration options</param>
        /// <param name="logger">The logger</param>
        public SystemBackgroundImageInitializer(
            IBackgroundImageService backgroundImageService,
            IStorageServiceFactory storageServiceFactory,
            IOptions<S3Settings> s3Options,
            ILogger<SystemBackgroundImageInitializer> logger)
        {
            _backgroundImageService = backgroundImageService ?? throw new ArgumentNullException(nameof(backgroundImageService));
            _s3Settings = s3Options.Value ?? throw new ArgumentNullException(nameof(s3Options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            
            // Get storage service from factory
            if (storageServiceFactory == null)
            {
                throw new ArgumentNullException(nameof(storageServiceFactory));
            }
            _storageService = storageServiceFactory.CreateStorageService();
            
            // Get backgrounds container name from configuration
            _backgroundsContainer = _s3Settings.BackgroundsContainer;
        }

        /// <summary>
        /// Initializes the system background images by populating the database with data from S3
        /// </summary>
        public async Task InitializeAsync()
        {
            try
            {
                _logger.LogInformation("Starting to seed system background images");
                
                // Get base URL for the backgrounds container
                string baseUrl = _storageService.GetBaseUrl(_backgroundsContainer);
                _logger.LogInformation("Using backgrounds base URL: {BaseUrl}", baseUrl);

                // Get existing system background images from database
                var existingImages = await _backgroundImageService.GetSystemImagesAsync();
                var existingFileNames = existingImages.Select(i => i.FileName).ToHashSet();
                _logger.LogInformation("Found {Count} existing system background images in database", existingImages.Count);

                // Exit early if we already have background images
                if (existingImages.Count > 0)
                {
                    _logger.LogInformation("System background images already exist in the database. Skipping initialization.");
                    return;
                }

                // List objects in the backgrounds container
                var s3Objects = await _storageService.ListObjectsAsync(_backgroundsContainer);
                _logger.LogInformation("Found {Count} objects in S3 {Container} container", s3Objects.Count(), _backgroundsContainer);
                
                // Process full-size images (-fhd.jpg) and find corresponding thumbnails
                int addedCount = 0;
                
                foreach (var obj in s3Objects)
                {
                    // Skip user images
                    if (obj.Name.StartsWith("user-") || obj.Name.StartsWith("zzz_"))
                    {
                        continue;
                    }
                    
                    // Look for full-size images
                    var match = _fileNamePattern.Match(obj.Name);
                    if (!match.Success)
                    {
                        continue; // Not a full-size image
                    }

                    string baseFileName = match.Groups[1].Value;
                    string fullFileName = obj.Name;
                    string thumbnailName = $"{baseFileName}-thumb.jpg";
                    
                    // Skip if we already have this image in the database
                    if (existingFileNames.Contains(fullFileName))
                    {
                        _logger.LogInformation("Background image {FileName} already exists in database", fullFileName);
                        continue;
                    }
                    
                    // Verify thumbnail exists
                    bool thumbnailExists = s3Objects.Any(o => o.Name == thumbnailName);
                    if (!thumbnailExists)
                    {
                        _logger.LogWarning("Thumbnail not found for {FileName}, skipping", fullFileName);
                        continue;
                    }

                    try
                    {
                        // Create a new background image entry
                        var backgroundImage = new BackgroundImage
                        {
                            UserId = string.Empty, // System image
                            FileName = fullFileName,
                            Title = FormatTitle(baseFileName),
                            ThumbnailPath = $"{_backgroundsContainer}/{thumbnailName}",
                            FullImagePath = $"{_backgroundsContainer}/{fullFileName}",
                            ThumbnailUrl = $"{baseUrl}/{thumbnailName}",
                            FullImageUrl = $"{baseUrl}/{fullFileName}",
                            IsSystem = true,
                            UploadedAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        // Add to database
                        await _backgroundImageService.CreateAsync(backgroundImage);
                        addedCount++;
                        _logger.LogInformation("Added background image to database: {Title}", backgroundImage.Title);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to add background image {FileName}", fullFileName);
                    }
                }

                _logger.LogInformation("Background image initialization completed. Added {AddedCount} new images.", addedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing system background images");
                throw;
            }
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