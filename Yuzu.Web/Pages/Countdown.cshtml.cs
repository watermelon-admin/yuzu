using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;
using Yuzu.Web.Tools;

namespace Yuzu.Web.Pages
{
    // Classes to represent the new canvas data format from the Designer
    public class CanvasData
    {
        public List<WidgetData> widgets { get; set; } = new();
        public int nextZIndex { get; set; }
    }

    public class WidgetData
    {
        public string id { get; set; } = string.Empty;
        public PositionData position { get; set; } = new();
        public SizeData size { get; set; } = new();
        public int zIndex { get; set; }
        public string type { get; set; } = string.Empty;
        public PropertiesData properties { get; set; } = new();
    }

    public class PositionData
    {
        public double x { get; set; }
        public double y { get; set; }
    }

    public class SizeData
    {
        public double width { get; set; }
        public double height { get; set; }
    }

    public class PropertiesData
    {
        // Common properties
        public string backgroundColor { get; set; } = string.Empty;
        public int borderRadius { get; set; }
        
        // Text widget properties
        public string text { get; set; } = string.Empty;
        public string fontFamily { get; set; } = string.Empty;
        public int fontSize { get; set; }
        public string fontColor { get; set; } = string.Empty;
        public string textAlign { get; set; } = string.Empty;
        public bool hasPlaceholders { get; set; }
        public bool showRawPlaceholders { get; set; }
        public string fontWeight { get; set; } = string.Empty;
        
        // QR widget properties
        public string imageUrl { get; set; } = string.Empty;
    }

#pragma warning disable CS9113 // Parameter is unread
    public class CountdownModel(
                UserManager<ApplicationUser> userManager,
                IBreakService breakService,
                IBreakTypeService breakTypeService,
                IUserDataService userDataService,
                ILogger<CountdownModel> logger,
                IConfiguration _) : PageModel // Using pragma to disable unused parameter warning
#pragma warning restore CS9113
    {
        private static readonly JsonSerializerOptions JsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        [BindProperty(SupportsGet = true)]
        public string BreakId { get; set; } = string.Empty;
        public Break? BreakDetails { get; set; }
        public BreakType? BreakTypeDetails { get; set; }
        public string BackgroundImageUrl { get; set; } = string.Empty;
        public string UserHomeTZID { get; set; } = string.Empty;
        public string UserAdditionalTZIDList { get; set; } = string.Empty;
        public string UserHomeTimezoneName { get; set; } = string.Empty;
        public string UserAdditionalTimezoneNameList { get; set; } = string.Empty;
        public string MobileCounterUrl { get; set; } = string.Empty;
        

        public async Task OnGetAsync(string id)
        {
            // Get the user ID
            var userId = await Users.GetUserId(userManager, User, logger);
            if (userId == null)
            {
                logger.LogWarning("User ID is null in OnGetAsync");
                return;
            }

            BreakId = id;
            logger.LogInformation("Received request to fetch break details for BreakId: {BreakId}", BreakId);

            // Get the user's home timezone ID using the UserDataRepository
            try
            {
                logger.LogInformation("Fetching user home timezone ID for UserId: {UserId}", userId);
                var homeTZIDItem = await userDataService.GetAsync(userId, "HomeTimeZone");

                if (homeTZIDItem == null || string.IsNullOrEmpty(homeTZIDItem.Value))
                {
                    logger.LogWarning("Home timezone ID not found for UserId: {UserId}", userId);
                    UserHomeTZID = "UTC"; // Default to UTC if not found
                }
                else
                {
                    UserHomeTZID = homeTZIDItem.Value;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error fetching home timezone ID for UserId: {UserId}", userId);
                UserHomeTZID = "UTC"; // Default to UTC in case of error
            }

            // Get the user's secondary time zone IDs using the UserDataRepository
            try
            {
                logger.LogInformation("Fetching additional time zone IDs for UserId: {UserId}", userId);

                // Get the user's additional timezone IDs using the UserDataService
                var additionalTZIDItem = await userDataService.GetAsync(userId, "AdditionalTimeZones");
                if (additionalTZIDItem == null || string.IsNullOrEmpty(additionalTZIDItem.Value))
                {
                    logger.LogWarning("Additional timezone IDs not found for UserId: {UserId}", userId);
                    return;
                }

                // Split the comma separated values into a list
                var additionalTZIDList = additionalTZIDItem.Value.Split(",");

                // Get the users home timezone ID using the UserDataService
                var homeTZIDItem = await userDataService.GetAsync(userId, "HomeTimeZone");
                if (homeTZIDItem == null || string.IsNullOrEmpty(homeTZIDItem.Value))
                {
                    logger.LogWarning("Home timezone ID not found for UserId: {UserId}", userId);
                    return;
                }
                var homeTZID = homeTZIDItem.Value;

                // Remove the home timezone ID from the list
                additionalTZIDList = additionalTZIDList.Where(tz => tz != homeTZID).ToArray();

                // Loop through the comma separated values and get the human-readable timezone string using GetCityCountryFromZoneId
                foreach (var tz in additionalTZIDList)
                {
                    // The strings returned from GetCityCountryFromZoneId are in the format "City, Country" so we need separate them by semicolons                 
                    UserAdditionalTimezoneNameList += Yuzu.Web.Tools.Time.GetCityCountryFromZoneId(tz) + ";";
                    UserAdditionalTZIDList += tz + ",";
                }

                // Remove the trailing comma
                UserAdditionalTZIDList = UserAdditionalTZIDList.TrimEnd(',');
                // Remove the trailing semicolon
                UserAdditionalTimezoneNameList = UserAdditionalTimezoneNameList.TrimEnd(';');
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error fetching home timezone ID for UserId: {UserId}", userId);
                UserHomeTZID = "UTC"; // Default to UTC in case of error
            }

            // Get the human-readable timezone string using GetCityCountryFromZoneId
            UserHomeTimezoneName = Yuzu.Web.Tools.Time.GetCityCountryFromZoneId(UserHomeTZID);
            logger.LogInformation("User home timezone ID for UserId: {UserId} is {HomeTZID} ({HomeTimezoneName})", userId, UserHomeTZID, UserHomeTimezoneName);

            logger.LogInformation("Fetching break details for UserId: {UserId}, BreakId: {BreakId}", userId, BreakId);
            // Convert string ID to int
            int breakId;
            if (!int.TryParse(BreakId, out breakId))
            {
                logger.LogError("Invalid break ID format: {BreakId}", BreakId);
                return;
            }
            
            BreakDetails = await breakService.GetByIdAsync(breakId);

            if (BreakDetails == null)
            {
                logger.LogError("Break not found for UserId: {UserId}, BreakId: {BreakId}", userId, BreakId);
                return;
            }

            logger.LogInformation("Successfully fetched break details for UserId: {UserId}, BreakId: {BreakId}", userId, BreakId);

            logger.LogInformation("Fetching break type details for BreakTypeId: {BreakTypeId}", BreakDetails.BreakTypeId);
            BreakTypeDetails = await breakTypeService.GetByIdAsync(BreakDetails.BreakTypeId);

            if (BreakTypeDetails == null)
            {
                logger.LogError("Break type not found for BreakTypeId: {BreakTypeId}", BreakDetails.BreakTypeId);
                return;
            }

            logger.LogInformation("Successfully fetched break type details for BreakTypeId: {BreakTypeId}", BreakDetails.BreakTypeId);

            // Get the backgrounds URL from the storage service factory
            var storageServiceFactory = HttpContext.RequestServices.GetRequiredService<Yuzu.Web.Tools.StorageServices.IStorageServiceFactory>();
            string backgroundImagesPath = storageServiceFactory.GetBackgroundsUrl();
            
            if (BreakTypeDetails != null && !string.IsNullOrEmpty(BreakTypeDetails.ImageTitle))
            {
                BackgroundImageUrl = $"{backgroundImagesPath}/{BreakTypeDetails.ImageTitle}-fhd.jpg";
            }
            else
            {
                BackgroundImageUrl = $"{backgroundImagesPath}/default-fhd.jpg";
            }

            // Construct the mobile counter URL from hostname
            MobileCounterUrl = $"https://{Request.Host}/mobile?id={BreakId}";

            // Parse the Components JSON with case-insensitive property name matching
            if (BreakTypeDetails != null && !string.IsNullOrEmpty(BreakTypeDetails.Components))
            {
                try
                {
                    // Deserialize to canvas data format
                    var canvasData = JsonSerializer.Deserialize<CanvasData>(BreakTypeDetails.Components, JsonSerializerOptions);
                    
                    if (canvasData != null && canvasData.widgets != null && canvasData.widgets.Count > 0)
                    {
                        // Use the canvas data directly
                        ViewData["CanvasData"] = canvasData;
                        logger.LogInformation("Successfully deserialized canvas data for BreakTypeId: {BreakTypeId}", BreakDetails?.BreakTypeId);
                    }
                    else
                    {
                        logger.LogWarning("No widgets found in canvas data for BreakTypeId: {BreakTypeId}", BreakDetails?.BreakTypeId);
                    }
                }
                catch (JsonException ex)
                {
                    logger.LogError(ex, "Error deserializing Components JSON for BreakTypeId: {BreakTypeId}", BreakDetails?.BreakTypeId);
                }
            }
        }
    }
}
