using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Antiforgery;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;
using Yuzu.Web.Tools;

namespace Yuzu.Web.Pages
{
    [ValidateAntiForgeryToken]
    public class DesignerModel : PageModel
    {
        private readonly ILogger<DesignerModel> _logger;
        private readonly IAntiforgery _antiforgery;
        private readonly UserManager<ApplicationUser> _userManager;

        // Current design ID (for saving/loading)
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // Initial canvas data (populated when loading an existing design)
        public string InitialCanvasData { get; set; } = "";

        // Background image title (populated when loading existing design)
        public string BackgroundImageTitle { get; set; } = "Default Background";

        // Background image URL (populated when loading existing design)
        public string BackgroundImageUrl { get; set; } = string.Empty;

        // Background image proxy URL (for CORS-safe access in html2canvas)
        public string BackgroundImageProxyUrl => GetProxyUrl(BackgroundImageUrl);

        // Flag to indicate if we're loading an existing design
        public bool IsLoadingExistingDesign { get; set; } = false;

        // Path to background images
        public string ImagePath { get; set; } = string.Empty;

        // Debug settings flag for showing debug info panel and logs download
        public bool ShowDesignerDebugInfo { get; set; } = false;

        // Sample test data for demonstration purposes
        private static readonly Dictionary<string, DesignData> TestDesigns = new Dictionary<string, DesignData>
        {
            {
                "test123",
                new DesignData
                {
                    Id = "test123",
                    BackgroundImageTitle = "Test Background",
                    // Use a clean string manually with guaranteed no BOM or invisible characters
                    CanvasData = @"{""widgets"":[{""id"":""widget-17417003489207-008"",""type"":""box"",""position"":{""x"":65,""y"":50},""size"":{""width"":320,""height"":320},""zIndex"":1,""properties"":{""backgroundColor"":""#ffffff"",""borderRadius"":15}},{""id"":""widget-1741693003499-869"",""position"":{""x"":65,""y"":68},""size"":{""width"":320,""height"":68},""zIndex"":3,""type"":""text"",""properties"":{""text"":""{break-name}"",""fontFamily"":""Arial"",""fontSize"":40,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-0041700289207-818"",""type"":""text"",""position"":{""x"":109.5,""y"":146},""size"":{""width"":231,""height"":114},""zIndex"":2,""properties"":{""text"":""{timer}"",""fontFamily"":""Arial"",""fontSize"":72,""fontColor"":""#000000"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-1741693032103-445"",""position"":{""x"":65,""y"":261},""size"":{""width"":320,""height"":45},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{time-unit}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-1741693062657-689"",""position"":{""x"":65,""y"":298},""size"":{""width"":320,""height"":49},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{countdown-message}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-1741693222393-854"",""position"":{""x"":457.5,""y"":50},""size"":{""width"":320,""height"":320},""zIndex"":1,""type"":""box"",""properties"":{""backgroundColor"":""#ffffff"",""borderRadius"":15}},{""id"":""widget-1741693222393-915"",""position"":{""x"":457.5,""y"":68},""size"":{""width"":320,""height"":68},""zIndex"":3,""type"":""text"",""properties"":{""text"":""Scan Me"",""fontFamily"":""Arial"",""fontSize"":40,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741700289207-888"",""position"":{""x"":540,""y"":134},""size"":{""width"":155,""height"":155},""zIndex"":259,""type"":""qr"",""properties"":{""imageUrl"":""img/general/dummy-qr.svg""}},{""id"":""widget-1741693222393-5"",""position"":{""x"":457.5,""y"":298},""size"":{""width"":320,""height"":49},""zIndex"":4,""type"":""text"",""properties"":{""text"":""for a mobile timer"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741693229226-128"",""position"":{""x"":852,""y"":50},""size"":{""width"":320,""height"":320},""zIndex"":1,""type"":""box"",""properties"":{""backgroundColor"":""#ffffff"",""borderRadius"":15}},{""id"":""widget-1741693229226-897"",""position"":{""x"":850,""y"":68},""size"":{""width"":320,""height"":68},""zIndex"":3,""type"":""text"",""properties"":{""text"":""Break ends at"",""fontFamily"":""Arial"",""fontSize"":40,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741700106106-830"",""position"":{""x"":850,""y"":246},""size"":{""width"":320,""height"":55},""zIndex"":68,""type"":""text"",""properties"":{""text"":""{end-time-home}"",""fontFamily"":""Arial"",""fontSize"":39,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""fontWeight"":""bold""}},{""id"":""widget-1741693229226-791"",""position"":{""x"":850,""y"":192},""size"":{""width"":320,""height"":45},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{time-name-home}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741700068706-505"",""position"":{""x"":850,""y"":136},""size"":{""width"":320,""height"":55},""zIndex"":68,""type"":""text"",""properties"":{""text"":""{end-time-additional}"",""fontFamily"":""Arial"",""fontSize"":39,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""fontWeight"":""bold""}},{""id"":""widget-1741700106106-491"",""position"":{""x"":850,""y"":302},""size"":{""width"":320,""height"":45},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{time-name-additional}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}}],""nextZIndex"":420}"
                }
            }
        };

        public DesignerModel(ILogger<DesignerModel> logger, IAntiforgery antiforgery, UserManager<ApplicationUser> userManager)
        {
            _logger = logger;
            _antiforgery = antiforgery;
            _userManager = userManager;
        }

        /// <summary>
        /// Converts an external background URL to a proxy URL for CORS-safe access
        /// </summary>
        private string GetProxyUrl(string imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl))
                return string.Empty;

            try
            {
                var uri = new Uri(imageUrl);
                var filename = uri.Segments[^1]; // Get last segment (filename)
                return $"/Designer?handler=BackgroundProxy&filename={Uri.EscapeDataString(filename)}";
            }
            catch
            {
                return imageUrl; // Return original if parsing fails
            }
        }

        public async Task OnGetAsync([FromServices] IBreakTypeService breakTypeService, [FromServices] IConfiguration configuration)
        {
            // Set up the image path from the storage service factory
            var storageService = HttpContext.RequestServices.GetRequiredService<Yuzu.Data.Services.Interfaces.IStorageService>();
            ImagePath = storageService.GetBackgroundsUrl();

            // Get debug settings from configuration
            ShowDesignerDebugInfo = configuration.GetValue<bool>("DebugSettings:ShowDesignerDebugInfo", false);

            // Allow override via query parameter for production debugging (e.g., ?debug=true)
            if (Request.Query.ContainsKey("debug") && bool.TryParse(Request.Query["debug"], out bool debugParam))
            {
                ShowDesignerDebugInfo = debugParam;
                _logger.LogInformation("Debug info override via query parameter: {DebugEnabled}", debugParam);
            }

            // Check if an ID was provided in the query string
            string designId = Request.Query["id"].ToString();

            if (string.IsNullOrEmpty(designId))
            {
                _logger.LogWarning("No break type ID provided");
                return;
            }

            _logger.LogInformation($"Attempting to load design with ID: {designId}");

            // Get current logged in user ID
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                _logger.LogWarning("User ID is null in OnGetAsync");
                return;
            }
            
            // Use the designId directly as it's already a string GUID
            _logger.LogInformation("Loading break type with ID: {BreakTypeId}", designId);

            // Fetch the break type from the service
            var breakType = await breakTypeService.GetAsync(userId, designId);
            if (breakType != null)
            {
                // Set the ID, canvas data, and background title to be used in the view
                Id = designId;
                
                // Get the canvas data from the Components field
                if (!string.IsNullOrEmpty(breakType.Components))
                {
                    InitialCanvasData = breakType.Components;
                    IsLoadingExistingDesign = true;
                    _logger.LogInformation($"Successfully loaded design with ID: {designId}");
                }
                else
                {
                    _logger.LogWarning($"Break type with ID {designId} has no canvas data");
                }
                
                // Set background title and construct URL directly
                if (!string.IsNullOrEmpty(breakType.ImageTitle))
                {
                    BackgroundImageTitle = breakType.ImageTitle;

                    // Construct the background URL directly from the title
                    // Pattern: {baseUrl}/{title}-fhd.jpg
                    // This avoids expensive S3 enumeration
                    try
                    {
                        var baseUrl = storageService.GetBackgroundsUrl();

                        // ImageTitle is already lowercase from the database (normalized on save)
                        // Construct URL with -fhd suffix and .jpg extension
                        BackgroundImageUrl = $"{baseUrl}/{breakType.ImageTitle}-fhd.jpg";

                        _logger.LogInformation($"Constructed background URL for title '{BackgroundImageTitle}': {BackgroundImageUrl}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error constructing background image URL - continuing without background");
                        // Don't fail the page load if URL construction fails
                    }
                }
            }
            else
            {
                _logger.LogWarning($"Break type with ID {designId} not found");
            }
        }

        public IActionResult OnGetLoadDesign(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                {
                    _logger.LogWarning("Design ID was null or empty");
                    return BadRequest(new { success = false, message = "No design ID received" });
                }

                _logger.LogInformation($"Loading design with ID: {id}");

                // In a real application, this would fetch from a database
                // For demo purposes, we'll use our test data
                if (TestDesigns.TryGetValue(id, out var designData))
                {
                    return new JsonResult(new
                    {
                        success = true,
                        message = "Design loaded successfully",
                        data = designData
                    });
                }
                else
                {
                    _logger.LogWarning($"Design with ID {id} not found");
                    return NotFound(new { success = false, message = $"Design with ID {id} not found" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading design data");
                return new JsonResult(new { success = false, message = ex.Message }) { StatusCode = 500 };
            }
        }

        public async Task<IActionResult> OnPostSaveDesign([FromBody] DesignData designData, [FromServices] IBreakTypeService breakTypeService)
        {
            try
            {
                if (designData == null)
                {
                    _logger.LogWarning("Design data was null");
                    return BadRequest(new { success = false, message = "No design data received" });
                }

                _logger.LogInformation($"Attempting to save design with ID: {designData.Id}");
                _logger.LogInformation($"Received thumbnailUrl: {designData.ThumbnailUrl}");

                // Get current logged in user ID
                var userId = _userManager.GetUserId(User);
                if (userId == null)
                {
                    _logger.LogWarning("User ID is null in OnPostSaveDesign");
                    return new JsonResult(new { success = false, message = "User authentication error. Please try logging in again." }) { StatusCode = 401 };
                }

                // Use the ID directly as it's already a string GUID
                _logger.LogInformation("Updating break type with ID: {BreakTypeId}", designData.Id);

                // Fetch the existing break type
                var breakType = await breakTypeService.GetAsync(userId, designData.Id);
                if (breakType == null)
                {
                    _logger.LogWarning($"Break type with ID {designData.Id} not found");
                    return NotFound(new { success = false, message = "Break type not found" });
                }
                
                // Update the Components, ImageTitle, and ThumbnailUrl fields
                breakType.Components = designData.CanvasData;

                if (!string.IsNullOrEmpty(designData.BackgroundImageTitle))
                {
                    // Normalize the image title to lowercase to ensure consistency
                    breakType.ImageTitle = designData.BackgroundImageTitle.ToLowerInvariant();
                }

                if (!string.IsNullOrEmpty(designData.ThumbnailUrl))
                {
                    // Remove query parameters (like ?v=timestamp) before saving to database
                    var cleanThumbnailUrl = designData.ThumbnailUrl.Split('?')[0];

                    // Update thumbnail URL (without query params)
                    breakType.ThumbnailUrl = cleanThumbnailUrl;

                    // Extract path from URL (e.g., "https://example.com/thumbnails/break-123.jpg" -> "thumbnails/break-123.jpg")
                    try
                    {
                        var uri = new Uri(cleanThumbnailUrl);
                        breakType.ThumbnailPath = uri.AbsolutePath.TrimStart('/');
                    }
                    catch
                    {
                        // If URL parsing fails, just use the URL as-is
                        breakType.ThumbnailPath = cleanThumbnailUrl;
                    }
                }

                // Save the updated break type
                await breakTypeService.UpdateAsync(breakType);

                _logger.LogInformation($"Design saved successfully with ID: {designData.Id}, ThumbnailUrl: {breakType.ThumbnailUrl}");
                return new JsonResult(new { success = true, message = "Design saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving design data");
                return new JsonResult(new { success = false, message = ex.Message }) { StatusCode = 500 };
            }
        }

        public async Task<IActionResult> OnPostUploadThumbnail(
            IFormFile thumbnail,
            string breakTypeId,
            [FromServices] Yuzu.Data.Services.Interfaces.IStorageService storageService,
            [FromServices] IConfiguration configuration)
        {
            try
            {
                if (thumbnail == null || thumbnail.Length == 0)
                {
                    _logger.LogWarning("No thumbnail file provided");
                    return BadRequest(new { success = false, message = "No thumbnail provided" });
                }

                if (string.IsNullOrEmpty(breakTypeId))
                {
                    _logger.LogWarning("No break type ID provided");
                    return BadRequest(new { success = false, message = "Break type ID required" });
                }

                var userId = _userManager.GetUserId(User);
                if (userId == null)
                {
                    _logger.LogWarning("User ID is null in OnPostUploadThumbnail");
                    return new JsonResult(new { success = false, message = "User not authenticated" }) { StatusCode = 401 };
                }

                _logger.LogInformation($"Uploading thumbnail for break type {breakTypeId}, size: {thumbnail.Length} bytes");

                // Get container name from configuration
                string containerName = configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";

                // Create storage path for thumbnail
                var fileName = $"thumbnails/break-{breakTypeId}.jpg";

                // Prepare metadata
                var metadata = new Dictionary<string, string>
                {
                    ["breakTypeId"] = breakTypeId,
                    ["userId"] = userId
                };

                // Upload to storage
                using var stream = thumbnail.OpenReadStream();
                await storageService.UploadObjectAsync(
                    containerName,
                    fileName,
                    stream,
                    "image/jpeg",
                    metadata
                );

                // Get the base URL and construct the full thumbnail URL with cache-busting timestamp
                var baseUrl = storageService.GetBaseUrl(containerName);
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var thumbnailUrl = $"{baseUrl}/{fileName}?v={timestamp}";

                _logger.LogInformation($"Thumbnail uploaded successfully to: {thumbnailUrl}");

                return new JsonResult(new
                {
                    success = true,
                    thumbnailUrl = thumbnailUrl,
                    message = "Thumbnail uploaded successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading thumbnail");
                return new JsonResult(new { success = false, message = ex.Message }) { StatusCode = 500 };
            }
        }

        public async Task<IActionResult> OnGetBackgroundsAsync()
        {
            _logger.LogInformation("OnGetBackgroundsAsync method called");
            try
            {
                // Get dependencies
                var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
                var storageService = HttpContext.RequestServices.GetRequiredService<Yuzu.Data.Services.Interfaces.IStorageService>();

                _logger.LogInformation("Fetching background images from S3 storage");

                // Use the utility service to load background images
                var backgrounds = await BackgroundImageService.LoadBackgroundImagesAsync(
                    storageService,
                    configuration,
                    _logger);

                _logger.LogInformation($"Found {backgrounds.Count} background images");

                // Return the list of backgrounds
                return new JsonResult(new
                {
                    success = true,
                    message = "Backgrounds retrieved successfully",
                    backgrounds = backgrounds
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching background images");
                return new JsonResult(new { success = false, message = ex.Message }) { StatusCode = 500 };
            }
        }

        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> OnGetBackgroundProxy(
            string filename,
            [FromServices] Yuzu.Data.Services.Interfaces.IStorageService storageService,
            [FromServices] IConfiguration configuration)
        {
            try
            {
                if (string.IsNullOrEmpty(filename))
                {
                    return BadRequest("Filename is required");
                }

                // Validate filename to prevent path traversal attacks
                if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                {
                    return BadRequest("Invalid filename");
                }

                _logger.LogInformation($"Proxying background image: {filename}");

                // Get container name from configuration
                string containerName = configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";

                // Download the image from storage
                var stream = await storageService.DownloadObjectAsync(containerName, filename);

                // Set CORS headers to allow html2canvas to access the image
                Response.Headers.Append("Access-Control-Allow-Origin", "*");
                Response.Headers.Append("Access-Control-Allow-Methods", "GET");
                Response.Headers.Append("Cross-Origin-Resource-Policy", "cross-origin");

                // Return the image with appropriate content type
                var contentType = filename.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg";
                return File(stream, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error proxying background image: {filename}");
                return NotFound();
            }
        }

        /// <summary>
        /// Proxies widget images through the server to enable CORS for html2canvas thumbnail generation
        /// </summary>
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> OnGetWidgetImageProxy(
            string filename,
            [FromServices] Yuzu.Data.Services.Interfaces.IStorageService storageService,
            [FromServices] IConfiguration configuration)
        {
            try
            {
                if (string.IsNullOrEmpty(filename))
                {
                    return BadRequest("Filename is required");
                }

                // Validate filename to prevent path traversal attacks
                if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                {
                    return BadRequest("Invalid filename");
                }

                // Validate that filename starts with "user-" for security
                if (!filename.StartsWith("user-", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Invalid widget image filename");
                }

                _logger.LogInformation($"Proxying widget image: {filename}");

                // Get container name from configuration
                string containerName = configuration["S3Settings:WidgetImagesContainer"] ?? "widget-images";

                // Download the image from storage
                var stream = await storageService.DownloadObjectAsync(containerName, filename);

                // Set CORS headers to allow html2canvas to access the image
                Response.Headers.Append("Access-Control-Allow-Origin", "*");
                Response.Headers.Append("Access-Control-Allow-Methods", "GET");
                Response.Headers.Append("Cross-Origin-Resource-Policy", "cross-origin");

                // Return the image with appropriate content type
                var contentType = filename.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg";
                return File(stream, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error proxying widget image: {filename}");
                return NotFound();
            }
        }

        /// <summary>
        /// Uploads a widget image for the current user and break type
        /// </summary>
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit
        public async Task<IActionResult> OnPostUploadWidgetImageAsync([FromForm] IFormFile file, [FromForm] string title, [FromForm] string userId, [FromForm] string breakTypeId, [FromServices] IStorageService storageService, [FromServices] IConfiguration configuration)
        {
            try
            {
                // Validate authentication
                var currentUserId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return new JsonResult(new { success = false, message = "User is not authenticated" }) { StatusCode = 401 };
                }

                // Ensure the userId from the form matches the authenticated user
                if (currentUserId != userId)
                {
                    return new JsonResult(new { success = false, message = "Unauthorized" }) { StatusCode = 403 };
                }

                // Validate file
                if (file == null || file.Length == 0)
                {
                    return new JsonResult(new { success = false, message = "No file was uploaded" }) { StatusCode = 400 };
                }

                // Validate file type
                var allowedContentTypes = new[] { "image/jpeg", "image/png", "image/jpg" };
                if (!allowedContentTypes.Contains(file.ContentType.ToLower()))
                {
                    return new JsonResult(new { success = false, message = "Only JPG and PNG files are allowed" }) { StatusCode = 400 };
                }

                // Validate file size (5MB)
                if (file.Length > 5 * 1024 * 1024)
                {
                    return new JsonResult(new { success = false, message = "File size must be less than 5MB" }) { StatusCode = 400 };
                }

                // Generate GUID for the image
                var imageGuid = Guid.NewGuid().ToString();
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (string.IsNullOrEmpty(extension))
                {
                    extension = file.ContentType == "image/png" ? ".png" : ".jpg";
                }

                // Create filename: user-{userId}-{breakTypeId}-{guid}{ext}
                var imageName = $"user-{userId}-{breakTypeId}-{imageGuid}{extension}";
                var thumbnailName = $"user-{userId}-{breakTypeId}-{imageGuid}-thumb{extension}";

                // Get container name from configuration
                string containerName = configuration["S3Settings:WidgetImagesContainer"] ?? "widget-images";

                _logger.LogInformation($"Uploading widget image: {imageName}");

                // Metadata for the image
                var metadata = new Dictionary<string, string>
                {
                    ["userId"] = userId,
                    ["breakTypeId"] = breakTypeId,
                    ["title"] = title ?? ""
                };

                // Upload the original image
                using (var stream = file.OpenReadStream())
                {
                    await storageService.UploadObjectAsync(containerName, imageName, stream, file.ContentType, metadata);
                }

                // TODO: Generate and upload thumbnail using ImageSharp
                // For now, we'll use the same image as thumbnail
                using (var stream = file.OpenReadStream())
                {
                    await storageService.UploadObjectAsync(containerName, thumbnailName, stream, file.ContentType, metadata);
                }

                // Get URLs
                var baseUrl = storageService.GetBaseUrl(containerName);
                var imageUrl = $"{baseUrl}/{imageName}";
                var thumbnailUrl = $"{baseUrl}/{thumbnailName}";

                _logger.LogInformation($"Widget image uploaded successfully: {imageName}");

                return new JsonResult(new
                {
                    success = true,
                    message = "Image uploaded successfully",
                    data = new
                    {
                        imageName,
                        imageUrl,
                        thumbnailUrl
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading widget image");
                return new JsonResult(new { success = false, message = "An error occurred while uploading the image" }) { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Deletes a widget image for the current user
        /// </summary>
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> OnPostDeleteWidgetImageAsync([FromBody] DeleteWidgetImageRequest request, [FromServices] IStorageService storageService, [FromServices] IConfiguration configuration)
        {
            try
            {
                // Validate authentication
                var currentUserId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return new JsonResult(new { success = false, message = "User is not authenticated" }) { StatusCode = 401 };
                }

                // Validate ownership - imageName must start with user-{userId}-
                if (!request.ImageName.StartsWith($"user-{currentUserId}-"))
                {
                    return new JsonResult(new { success = false, message = "Unauthorized" }) { StatusCode = 403 };
                }

                // Get container name from configuration
                string containerName = configuration["S3Settings:WidgetImagesContainer"] ?? "widget-images";

                _logger.LogInformation($"Deleting widget image: {request.ImageName}");

                // Delete both the image and thumbnail
                await storageService.DeleteObjectAsync(containerName, request.ImageName);

                // Try to delete thumbnail (may not exist)
                var thumbnailName = request.ImageName.Replace(Path.GetExtension(request.ImageName), $"-thumb{Path.GetExtension(request.ImageName)}");
                try
                {
                    await storageService.DeleteObjectAsync(containerName, thumbnailName);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Could not delete thumbnail: {thumbnailName}");
                }

                _logger.LogInformation($"Widget image deleted successfully: {request.ImageName}");

                return new JsonResult(new { success = true, message = "Image deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting widget image");
                return new JsonResult(new { success = false, message = "An error occurred while deleting the image" }) { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Gets all widget images for the current user and break type
        /// </summary>
        public async Task<IActionResult> OnGetWidgetImagesAsync([FromQuery] string userId, [FromQuery] string breakTypeId, [FromServices] IStorageService storageService, [FromServices] IConfiguration configuration)
        {
            try
            {
                // Validate authentication
                var currentUserId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return new JsonResult(new { success = false, message = "User is not authenticated" }) { StatusCode = 401 };
                }

                // Ensure the userId from the query matches the authenticated user
                if (currentUserId != userId)
                {
                    return new JsonResult(new { success = false, message = "Unauthorized" }) { StatusCode = 403 };
                }

                // Get container name from configuration
                string containerName = configuration["S3Settings:WidgetImagesContainer"] ?? "widget-images";

                _logger.LogInformation($"Listing widget images for user: {userId}, breakType: {breakTypeId}");

                // List all objects in the container
                var items = await storageService.ListObjectsAsync(containerName);

                // Filter for user's images for this break type
                var userImagePattern = new Regex($@"^user-{userId}-{breakTypeId}-(.+?)(?:-thumb)?\.(jpe?g|png)$", RegexOptions.IgnoreCase);
                var thumbnailPattern = new Regex(@"-thumb\.(jpe?g|png)$", RegexOptions.IgnoreCase);

                var images = new List<object>();
                var processedGuids = new HashSet<string>();
                long totalSize = 0;

                var baseUrl = storageService.GetBaseUrl(containerName);

                foreach (var item in items)
                {
                    var match = userImagePattern.Match(item.Name);
                    if (match.Success && !thumbnailPattern.IsMatch(item.Name))
                    {
                        var guid = match.Groups[1].Value;
                        if (!processedGuids.Contains(guid))
                        {
                            processedGuids.Add(guid);

                            var extension = match.Groups[2].Value;
                            var thumbnailName = $"user-{userId}-{breakTypeId}-{guid}-thumb.{extension}";

                            images.Add(new
                            {
                                name = item.Name,
                                url = $"{baseUrl}/{item.Name}",
                                thumbnailUrl = $"{baseUrl}/{thumbnailName}",
                                size = item.Size,
                                uploadDate = item.LastModified.ToString("o")
                            });

                            totalSize += item.Size;
                        }
                    }
                }

                _logger.LogInformation($"Found {images.Count} widget images for user {userId}");

                return new JsonResult(new
                {
                    success = true,
                    message = "Images loaded successfully",
                    data = new
                    {
                        images,
                        count = images.Count,
                        totalSize
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing widget images");
                return new JsonResult(new { success = false, message = "An error occurred while loading images" }) { StatusCode = 500 };
            }
        }
    }

    public class DeleteWidgetImageRequest
    {
        public string ImageName { get; set; } = string.Empty;
    }

    public class DesignData
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string BackgroundImageTitle { get; set; } = "Default Background";
        public string BackgroundImageUrl { get; set; } = "";
        public string CanvasData { get; set; } = "";
        public string? ThumbnailUrl { get; set; }
    }

    // Removed BackgroundImage class - now using the shared model in Yuzu.Web.Pages namespace
}
