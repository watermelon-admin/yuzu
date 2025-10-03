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
                
                // Update the Components and ImageTitle fields
                breakType.Components = designData.CanvasData;
                
                if (!string.IsNullOrEmpty(designData.BackgroundImageTitle))
                {
                    // Normalize the image title to lowercase to ensure consistency
                    breakType.ImageTitle = designData.BackgroundImageTitle.ToLowerInvariant();
                }
                
                // Save the updated break type
                await breakTypeService.UpdateAsync(breakType);
                
                _logger.LogInformation($"Design saved successfully with ID: {designData.Id}");
                return new JsonResult(new { success = true, message = "Design saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving design data");
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
    }

    public class DesignData
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string BackgroundImageTitle { get; set; } = "Default Background";
        public string BackgroundImageUrl { get; set; } = "";
        public string CanvasData { get; set; } = "";
    }

    // Removed BackgroundImage class - now using the shared model in Yuzu.Web.Pages namespace
}
