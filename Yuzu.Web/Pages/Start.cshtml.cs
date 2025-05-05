using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;
using NodaTime;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;
using Yuzu.Web.Tools;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;

namespace Yuzu.Web.Pages;

[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true, Duration = 0)]
public class StartModel : PageModel
{
    [BindProperty]
    public InputModel Input { get; set; } = new InputModel();

    public List<BreakType> BreakTypes { get; set; } = new List<BreakType>();
    public string HomeTimeZoneCode { get; set; } = string.Empty;
    public string HomeTimeZoneCity { get; set; } = string.Empty;
    public string HomeTimeZoneCountry { get; set; } = string.Empty;
    public string HomeTimeZoneOffset { get; set; } = string.Empty;
    public string BackgroundImagesURL { get; set; } = string.Empty;

    private const int PageSize = 10;
    private readonly IBreakTypeService _breakTypeService;
    private readonly IUserDataService _userDataService;
    private readonly IConfiguration _configuration;
    private readonly IBreakService _breakService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<StartModel> _logger;

    public class InputModel
    {
        [Required]
        public long BreakEndTimeUnixTimestamp { get; set; }
        [Required]
        public int BreakTypeId { get; set; }
    }

    public StartModel(
        IBreakTypeService breakTypeService,
        IUserDataService userDataService,
        IConfiguration configuration,
        IBreakService breakService,
        UserManager<ApplicationUser> userManager,
        ILogger<StartModel> logger)
    {
        _breakTypeService = breakTypeService;
        _userDataService = userDataService;
        _configuration = configuration;
        _breakService = breakService;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        _logger.LogInformation("HTTP Post for new break re2ceived.");

        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Model state is invalid.");
            return Page();
        }

        try
        {
            // Get current logged in user ID
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                _logger.LogWarning("User ID is null in OnPost");
                ModelState.AddModelError(string.Empty, "User authentication error. Please try logging in again.");
                return Page();
            }

            var startTime = DateTimeOffset.UtcNow;
            var endTime = DateTimeOffset.FromUnixTimeSeconds(Input.BreakEndTimeUnixTimestamp);

            var breakInstance = new Break
            {
                UserId = userId,
                BreakTypeId = Input.BreakTypeId,
                StartTime = startTime.UtcDateTime,
                EndTime = endTime.UtcDateTime
            };

            // Save the break instance to the repository
            await _breakService.CreateAsync(breakInstance);

            _logger.LogInformation("Break created successfully with ID: {BreakId} for user: {UserId}", breakInstance.Id, userId);

            return RedirectToPage("Countdown", new { id = breakInstance.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating a break.");
            ModelState.AddModelError(string.Empty, "An error occurred while creating a break. Please try again later.");
            return Page();
        }
    }

    public async Task<IActionResult> OnGetAsync()
    {
        // Get current logged in user ID
        var userId = _userManager.GetUserId(User);
        if (userId == null)
        {
            _logger.LogWarning("User ID is null in OnGetAsync");
            ModelState.AddModelError(string.Empty, "User authentication error. Please try logging in again.");
            return Page();
        }

        try
        {
            // Get the backgrounds URL from the storage service factory
            var storageServiceFactory = HttpContext.RequestServices.GetRequiredService<Yuzu.Web.Tools.StorageServices.IStorageServiceFactory>();
            BackgroundImagesURL = storageServiceFactory.GetBackgroundsUrl();

            // Retrieve the break types from the database
            BreakTypes = await _breakTypeService.GetAllAsync(userId);

            // Retrieve the home time zone code from the database, defaulting to UTC if not found
            var homeTimeZoneData = await _userDataService.GetAsync(userId, UserDataKey.HomeTimeZone.ToString());
            HomeTimeZoneCode = homeTimeZoneData?.Value ?? "UTC";

            // Retrieve the city and country of the home time zone
            var timeZoneInfo = Yuzu.Web.Tools.Time.GetIanaTimeZoneInfoFromId(HomeTimeZoneCode);
            HomeTimeZoneCity = timeZoneInfo?.City ?? "Unknown";
            HomeTimeZoneCountry = timeZoneInfo?.Country ?? "Unknown";
            // Retrieve the UTC Offset of the home time zone
            HomeTimeZoneOffset = timeZoneInfo?.UtcOffsetText ?? "Unknown";

            _logger.LogInformation("Successfully retrieved break types and time zone information for user: {UserId}", userId);

            return Page();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving break types and time zone information for user: {UserId}", userId);
            ModelState.AddModelError(string.Empty, "An error occurred while loading the page. Please try again later.");
            return Page();
        }
    }

    public LocalDateTime ConvertUnixTimeToLocalDateTime(long unixTime)
    {
        var instant = Instant.FromUnixTimeSeconds(unixTime); // or .FromUnixTimeMilliseconds() for milliseconds  
        var zone = DateTimeZoneProviders.Tzdb.GetSystemDefault(); // get the current system timezone  
        var localDateTime = instant.InZone(zone).LocalDateTime;

        return localDateTime;
    }
}
