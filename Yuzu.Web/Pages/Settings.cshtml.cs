using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Net;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;
using Yuzu.Web.Tools;
using Yuzu.Web; // Add the ApplicationUser namespace
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Yuzu.Time;
using Microsoft.AspNetCore.Mvc.Authorization;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

// Extension method for controller or page model to check if user is authenticated
public static class ControllerExtensions
{
    public static IActionResult? EnsureAuthenticated(this PageModel pageModel, UserManager<ApplicationUser> userManager)
    {
        if (!pageModel.User.Identity?.IsAuthenticated == true)
        {
            return ErrorHandling.JsonError("User is not authenticated", StatusCodes.Status401Unauthorized);
        }

        var userId = userManager.GetUserId(pageModel.User);
        if (userId == null)
        {
            return ErrorHandling.JsonError("User ID not found", StatusCodes.Status401Unauthorized);
        }

        return null; // Return null if authentication check passed
    }
}

namespace Yuzu.Web.Pages
{
    // Set file upload limits at the class level
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)] // 10MB limit
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB limit
    public class SettingsModel(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        StripeTools stripeTools,
        IUserDataCleanupService userDataCleanupService,
        IBreakTypeService breakTypeService,
        IConfiguration configuration,
        ILogger<SettingsModel> logger,
        Yuzu.Web.Tools.StorageServices.IStorageServiceFactory storageServiceFactory,
        Yuzu.Time.CachedTimeZoneService timeZoneService,
        IUserDataService userDataService,
        Yuzu.Payments.StripeService stripeService,
        Yuzu.Data.Services.Interfaces.IBackgroundImageService backgroundImageService
        ) : PageModel
    {
        private readonly UserManager<ApplicationUser> _userManager = userManager;
        private readonly SignInManager<ApplicationUser> _signInManager = signInManager;
        private readonly StripeTools _stripeTools = stripeTools;
        private readonly IUserDataCleanupService _userDataCleanupService = userDataCleanupService;
        private readonly IBreakTypeService _breakTypeService = breakTypeService;
        private readonly IConfiguration _configuration = configuration;
        private readonly ILogger<SettingsModel> _logger = logger;
        private readonly Yuzu.Web.Tools.StorageServices.IStorageServiceFactory _storageServiceFactory = storageServiceFactory;
        private readonly Yuzu.Time.CachedTimeZoneService _timeZoneService = timeZoneService;
        private readonly IUserDataService _userDataService = userDataService;
        private readonly Yuzu.Payments.StripeService _stripeService = stripeService;
        private readonly Yuzu.Data.Services.Interfaces.IBackgroundImageService _backgroundImageService = backgroundImageService;
        
        [BindProperty]
        public InputModel Input { get; set; } = new();

        public bool IsSubscribed { get; set; } = false;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string HomeTimeZoneCode { get; set; } = "UTC";
        public string ImagePath { get; set; } = string.Empty;
        
        // Membership-specific properties
        public SubscriptionInfo? Subscription { get; set; }
        public List<InvoiceInfo> Invoices { get; set; } = [];
        
        [TempData]
        public string StatusMessage { get; set; } = string.Empty;
        
        public class InputModel
        {
            [StringLength(50, ErrorMessage = "First name cannot exceed {1} characters.")]
            [Display(Name = "First name")]
            public string FirstName { get; set; } = string.Empty;
            
            [StringLength(50, ErrorMessage = "Last name cannot exceed {1} characters.")]
            [Display(Name = "Last name")]
            public string LastName { get; set; } = string.Empty;
        }
        
        public class UpdateNameRequest
        {
            [StringLength(50, ErrorMessage = "First name cannot exceed {1} characters.")]
            [JsonPropertyName("firstName")]
            public string FirstName { get; set; } = string.Empty;
            
            [StringLength(50, ErrorMessage = "Last name cannot exceed {1} characters.")]
            [JsonPropertyName("lastName")]
            public string LastName { get; set; } = string.Empty;
        }

        public async Task OnGetAsync()
        {
            // Get user ID
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                return;
            }

            // Get first name, last name, and email
            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                FirstName = user.FirstName ?? string.Empty;
                LastName = user.LastName ?? string.Empty;
                Email = user.Email ?? string.Empty;
                
                // Set the input model values
                Input.FirstName = FirstName;
                Input.LastName = LastName;

                // Determine if user has an active subscription
                IsSubscribed = await _stripeTools.IsSubscribedAsync(userId);
                
                // Set default values for other sections
                HomeTimeZoneCode = "UTC"; // This should be loaded from user preferences
                
                // Get backgrounds URL from the storage service factory
                ImagePath = _storageServiceFactory.GetBackgroundsUrl();
                
                // Initialize break types if user doesn't have any
                try
                {
                    // Check if user has any break types
                    var breakTypes = await _breakTypeService.GetAllAsync(userId);
                    var count = breakTypes.Count;
                    _logger.LogInformation("User {UserId} has {Count} break types", userId, count);
                    
                    // If the user doesn't have any break types yet, initialize the default ones
                    if (count == 0)
                    {
                        _logger.LogInformation("Initializing default break types for user {UserId}", userId);
                        await _breakTypeService.InitializeDefaultsAsync(userId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking or initializing break types for user {UserId}", userId);
                    // Continue with page load even if break types initialization fails
                }
                
                // Get subscription and billing data if user is subscribed
                if (IsSubscribed)
                {
                    try
                    {
                        // Get Stripe customer Id
                        var stripeCustomerId = user.StripeUserID;

                        if (!string.IsNullOrEmpty(stripeCustomerId))
                        {
                            _logger.LogInformation("Getting subscription and billing data from Stripe");
                            
                            // Get active subscription
                            var activeSubscription = await _stripeService.GetActiveSubscriptionAsync(stripeCustomerId);
                            
                            if (activeSubscription != null)
                            {
                                _logger.LogInformation("Active subscription found with ID: {SubscriptionId}", activeSubscription.Id);
                                
                                // Populate Subscription info
                                Subscription = new SubscriptionInfo
                                {
                                    Id = activeSubscription.Id ?? string.Empty,
                                    Status = !string.IsNullOrEmpty(activeSubscription.Status)
                                        ? char.ToUpper(activeSubscription.Status[0]) + activeSubscription.Status[1..]
                                        : string.Empty,
                                    Name = "Pro Membership",
                                    Interval = activeSubscription.Items?.Data?.Count > 0 && !string.IsNullOrEmpty(activeSubscription.Items.Data[0].Price.Recurring.Interval)
                                        ? $"Per {char.ToUpper(activeSubscription.Items.Data[0].Price.Recurring.Interval[0])}{activeSubscription.Items.Data[0].Price.Recurring.Interval[1..]}"
                                        : string.Empty,
                                    ValidUntil = $"{activeSubscription.CurrentPeriodEnd.ToShortDateString()} {activeSubscription.CurrentPeriodEnd.ToShortTimeString()}"
                                };
                                
                                // Get billing history
                                var billingHistory = await _stripeService.GetBillingHistoryAsync(stripeCustomerId);
                                
                                // Populate Invoices list
                                if (billingHistory != null)
                                {
                                    Invoices = billingHistory
                                        .OrderByDescending(invoice => invoice.Created)
                                        .Select(invoice => new InvoiceInfo
                                        {
                                            Id = invoice.Id ?? string.Empty,
                                            Total = invoice.Total.ToString(),
                                            Currency = invoice.Currency?.ToUpper() ?? string.Empty,
                                            Date = invoice.Created.ToShortDateString(),
                                            Status = !string.IsNullOrEmpty(invoice.Status) 
                                                ? char.ToUpper(invoice.Status[0]) + invoice.Status[1..] 
                                                : string.Empty
                                        })
                                        .ToList();
                                }
                            }
                            else
                            {
                                _logger.LogInformation("No active subscription found.");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error loading subscription data for user {UserId}", userId);
                        // Continue with page load even if subscription data can't be loaded
                    }
                }
            }
        }
        
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                await OnGetAsync();
                return Page();
            }
            
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                return NotFound("Unable to load user.");
            }
            
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{userId}'.");
            }
            
            var firstName = Input.FirstName;
            var lastName = Input.LastName;
            
            // Only update if values have changed
            if (user.FirstName != firstName || user.LastName != lastName)
            {
                user.FirstName = firstName;
                user.LastName = lastName;
                
                var result = await _userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    foreach (var error in result.Errors)
                    {
                        ModelState.AddModelError(string.Empty, error.Description);
                    }
                    await OnGetAsync();
                    return Page();
                }
                
                StatusMessage = "Your profile has been updated";
            }
            
            // Refresh data
            await OnGetAsync();
            return Page();
        }
        
        public async Task<IActionResult> OnPostUpdateName([FromBody] UpdateNameRequest request)
        {
            // Process the JSON request to update user's name
            
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Processing name update request");
                
                // Check if user is authenticated
                var userId = _userManager.GetUserId(User);
                if (userId == null)
                {
                    _logger.LogWarning("Name update attempted without authentication");
                    // Return JSON error response instead of throwing exception
                    return ErrorHandling.JsonError("User is not authenticated", StatusCodes.Status401Unauthorized);
                }
                
                _logger.LogDebug("Name update request for user {UserId}", userId);
                
                // Validate request
                if (request == null)
                {
                    _logger.LogWarning("Empty request body received from user {UserId}", userId);
                    // Return JSON error response instead of throwing exception
                    return ErrorHandling.JsonError("Request body is required", StatusCodes.Status400BadRequest);
                }
                
                _logger.LogDebug("Name update request data: FirstName='{FirstName}', LastName='{LastName}'", 
                    request.FirstName ?? "(empty)", 
                    request.LastName ?? "(empty)");
                
                // Manual validation for string length
                if (request.FirstName?.Length > 50)
                {
                    _logger.LogWarning("FirstName exceeds maximum length (Length: {Length})", request.FirstName?.Length);
                    ModelState.AddModelError("firstName", "First name cannot exceed 50 characters.");
                }
                
                if (request.LastName?.Length > 50)
                {
                    _logger.LogWarning("LastName exceeds maximum length (Length: {Length})", request.LastName?.Length);
                    ModelState.AddModelError("lastName", "Last name cannot exceed 50 characters.");
                }
                
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Validation failed for name update: {ValidationErrors}", 
                        string.Join(", ", ModelState.Values
                            .SelectMany(v => v.Errors)
                            .Select(e => e.ErrorMessage)));
                    return ErrorHandling.ValidationError(ModelState, "The form data is invalid");
                }
                
                // Get the user
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogError("User {UserId} found in claims but not in database", userId);
                    throw new InvalidOperationException($"Unable to load user with ID '{userId}'.");
                }
                
                // Only update if values have changed
                bool hasChanges = false;
                
                if (user.FirstName != request.FirstName)
                {
                    _logger.LogDebug("Updating FirstName from '{OldValue}' to '{NewValue}'", 
                        user.FirstName ?? "(empty)", 
                        request.FirstName ?? "(empty)");
                    user.FirstName = request.FirstName ?? string.Empty;
                    hasChanges = true;
                }
                
                if (user.LastName != request.LastName)
                {
                    _logger.LogDebug("Updating LastName from '{OldValue}' to '{NewValue}'", 
                        user.LastName ?? "(empty)", 
                        request.LastName ?? "(empty)");
                    user.LastName = request.LastName ?? string.Empty; 
                    hasChanges = true;
                }
                
                if (hasChanges)
                {
                    _logger.LogInformation("Saving name changes for user {UserId}", userId);
                    var result = await _userManager.UpdateAsync(user);
                    if (!result.Succeeded)
                    {
                        var errorMessages = string.Join(", ", result.Errors.Select(e => e.Description));
                        _logger.LogError("Failed to update user {UserId}: {Errors}", userId, errorMessages);
                        
                        var errors = result.Errors.ToDictionary(e => e.Code, e => e.Description);
                        return ErrorHandling.JsonError("Failed to update profile", StatusCodes.Status500InternalServerError, errors);
                    }
                    _logger.LogInformation("Successfully updated name for user {UserId}", userId);
                }
                else
                {
                    _logger.LogInformation("No changes detected for user {UserId}, skipping update", userId);
                }
                
                return ErrorHandling.JsonSuccess("Your profile has been updated", new 
                { 
                    firstName = user.FirstName,
                    lastName = user.LastName
                });
            }, _logger);
        }
        
        public async Task<IActionResult> OnPostDeleteAsync()
        {
            _logger.LogInformation("Account deletion process initiated");
            
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                _logger.LogWarning("Account deletion attempted without authentication");
                return NotFound($"Unable to load user.");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("Account deletion attempted for non-existent user ID: {UserId}", userId);
                return NotFound($"Unable to load user with ID '{userId}'.");
            }

            _logger.LogInformation("Processing account deletion for user {UserId}, Email: {Email}", userId, user.Email);
            
            try
            {
                // Store email for confirmation page
                string userEmail = user.Email ?? "your account";
                
                // Check if user has subscription
                bool hasSubscription = await _stripeTools.IsSubscribedAsync(userId);
                
                if (hasSubscription)
                {
                    _logger.LogInformation("User {UserId} has an active subscription. Subscription will remain until the end of the billing period.", userId);
                    // Note: We're not canceling the subscription yet as requested
                    // This will be implemented later with proper planning and testing
                }
                
                // Delete all user data from repositories before deleting the user account
                _logger.LogInformation("Deleting all data for user {UserId}", userId);
                try
                {
                    await _userDataCleanupService.DeleteAllUserDataAsync(userId);
                    _logger.LogInformation("Successfully deleted all user data for user {UserId}", userId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting user data for user {UserId}. Will continue with account deletion.", userId);
                    // We continue with account deletion even if data deletion fails
                }
                
                // Delete the user account
                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    var errorMessages = string.Join(", ", result.Errors.Select(e => e.Description));
                    _logger.LogError("Failed to delete user {UserId}: {Errors}", userId, errorMessages);
                    throw new InvalidOperationException($"Unexpected error occurred deleting user: {errorMessages}");
                }

                // Sign the user out
                await _signInManager.SignOutAsync();
                
                _logger.LogInformation("User {UserId} successfully deleted their account", userId);
                
                // Redirect to confirmation page
                return RedirectToPage("/Account/AccountDeleted", new { email = userEmail, hasSubscription = hasSubscription });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", userId);
                StatusMessage = "Error: An error occurred while deleting your account.";
                return Page();
            }
        }
        // Break Type API Handlers
        
        public async Task<IActionResult> OnGetBreakTypesAsync(int pageNumber = 1, int pageSize = 10, string? continuationToken = null)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                // Check if user is authenticated and get the user ID
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);

                // Get all break types
                var breakTypes = await _breakTypeService.GetAllAsync(userId);
                
                // Apply pagination manually
                int skip = string.IsNullOrEmpty(continuationToken) ? 0 : int.Parse(continuationToken);
                var pagedBreakTypes = breakTypes.Skip(skip).Take(pageSize).ToList();
                
                // Create continuation token for next page
                string? newContinuationToken = (skip + pageSize < breakTypes.Count) ? (skip + pageSize).ToString() : null;
                
                // Get total count of break types
                var totalBreakTypes = breakTypes.Count;

                // Use the standard JsonSuccess response format with message and data
                return ErrorHandling.JsonSuccess("Break types retrieved successfully", new
                {
                    data = pagedBreakTypes,
                    totalItems = totalBreakTypes,
                    currentPage = pageNumber,
                    pageSize = pageSize,
                    continuationToken = newContinuationToken
                });
            }, _logger);
        }

        public async Task<IActionResult> OnGetBackgroundImagesAsync()
        {
            return await this.SafeExecuteAsync(async () =>
            {
                // Check if user is authenticated
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                _logger.LogInformation("Fetching background images for user {UserId}", userId);

                // Get all user-uploaded and system background images from database
                var backgrounds = await _backgroundImageService.GetForUserWithSystemAsync(userId);
                
                // If there are no background images in the database, try to load from S3 as fallback
                if (backgrounds == null || backgrounds.Count == 0)
                {
                    _logger.LogInformation("No backgrounds in database, loading from S3 storage");
                    
                    // Use the utility service to load background images from S3
                    var s3Backgrounds = await BackgroundImageService.LoadBackgroundImagesAsync(
                        _storageServiceFactory, 
                        _configuration,
                        _logger);
                    
                    // Return in the standard response format
                    return ErrorHandling.JsonSuccess("Backgrounds retrieved from S3 successfully", new { 
                        backgrounds = s3Backgrounds 
                    });
                }

                // Map to DTO objects
                var backgroundDtos = backgrounds.Select(bg => new
                {
                    name = bg.FileName,
                    title = bg.Title,
                    thumbnailUrl = bg.ThumbnailUrl,
                    fullImageUrl = bg.FullImageUrl
                }).ToList();
                
                // Return in the standard response format
                return ErrorHandling.JsonSuccess("Backgrounds retrieved successfully", new { 
                    backgrounds = backgroundDtos 
                });
            }, _logger);
        }

        public async Task<IActionResult> OnPostSaveBreakType([FromBody] SaveBreakTypeRequest request)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("OnPostSaveBreakType called");
                
                _logger.LogInformation("Headers: {Headers}", string.Join(", ", 
                    Request.Headers.Select(h => $"{h.Key}={string.Join(",", h.Value.ToArray())}")));
                
                // Check if user is authenticated
                var userId = _userManager.GetUserId(User);
                if (userId == null)
                {
                    _logger.LogWarning("Break type update attempted without authentication");
                    return ErrorHandling.JsonError("User is not authenticated", StatusCodes.Status401Unauthorized);
                }
                
                // Validate request
                if (request == null)
                {
                    _logger.LogWarning("Empty request body received from user {UserId}", userId);
                    return ErrorHandling.JsonError("Request body is required", StatusCodes.Status400BadRequest);
                }
                
                _logger.LogInformation("Break type request data: Id={Id}, Name={Name}", 
                    request.BreakId, request.Name);
                
                try
                {
                    // Parse the break ID and determine if this is a create or update operation
                    int breakTypeId = 0;
                    bool isUpdate = !string.IsNullOrEmpty(request.BreakId) &&
                                    int.TryParse(request.BreakId, out breakTypeId) &&
                                    breakTypeId > 0;
                    
                    if (isUpdate)
                    {
                        // This is an update to an existing break type
                        _logger.LogInformation("Updating existing break type with ID {Id}", breakTypeId);
                        
                        // Get the existing break type from the database
                        var existingBreakType = await _breakTypeService.GetAsync(userId, breakTypeId);
                        if (existingBreakType == null)
                        {
                            _logger.LogWarning("Break type with ID {Id} not found for user {UserId}", breakTypeId, userId);
                            return ErrorHandling.JsonError($"Break type with ID {breakTypeId} not found");
                        }
                        
                        // Update the existing break type properties
                        existingBreakType.Name = request.Name;
                        existingBreakType.DefaultDurationMinutes = request.DefaultDurationMinutes;
                        existingBreakType.BreakTimeStepMinutes = request.BreakTimeStepMinutes;
                        existingBreakType.CountdownMessage = request.CountdownMessage;
                        existingBreakType.CountdownEndMessage = request.CountdownEndMessage;
                        existingBreakType.EndTimeTitle = request.EndTimeTitle;
                        existingBreakType.IconName = request.IconName;
                        existingBreakType.ImageTitle = request.ImageTitle?.ToLowerInvariant(); // Convert to lowercase
                        existingBreakType.UpdatedAt = DateTime.UtcNow;
                        
                        // Save the changes to the database
                        var updatedBreakType = await _breakTypeService.UpdateAsync(existingBreakType);
                        
                        _logger.LogInformation("Break type with ID {Id} updated successfully", breakTypeId);
                        return ErrorHandling.JsonSuccess("Break type updated successfully", new { 
                            id = updatedBreakType.Id.ToString(),
                            name = updatedBreakType.Name
                        });
                    }
                    else
                    {
                        // This is a creation of a new break type
                        _logger.LogInformation("Creating new break type for user {UserId}", userId);
                        
                        // Get the total count for sort order
                        var allBreakTypes = await _breakTypeService.GetAllAsync(userId);
                        
                        // Define the standard template JSON string for the Components property
                        string jsonString = @"{""widgets"":[{""id"":""widget-17417003489207-008"",""type"":""box"",""position"":{""x"":65,""y"":50},""size"":{""width"":320,""height"":320},""zIndex"":1,""properties"":{""backgroundColor"":""#ffffff"",""borderRadius"":15}},{""id"":""widget-1741693003499-869"",""position"":{""x"":65,""y"":68},""size"":{""width"":320,""height"":68},""zIndex"":3,""type"":""text"",""properties"":{""text"":""{break-name}"",""fontFamily"":""Arial"",""fontSize"":40,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-0041700289207-818"",""type"":""text"",""position"":{""x"":109.5,""y"":146},""size"":{""width"":231,""height"":114},""zIndex"":2,""properties"":{""text"":""{timer}"",""fontFamily"":""Arial"",""fontSize"":72,""fontColor"":""#000000"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-1741693032103-445"",""position"":{""x"":65,""y"":261},""size"":{""width"":320,""height"":45},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{time-unit}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-1741693062657-689"",""position"":{""x"":65,""y"":298},""size"":{""width"":320,""height"":49},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{countdown-message}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":true,""showRawPlaceholders"":false}},{""id"":""widget-1741693222393-854"",""position"":{""x"":457.5,""y"":50},""size"":{""width"":320,""height"":320},""zIndex"":1,""type"":""box"",""properties"":{""backgroundColor"":""#ffffff"",""borderRadius"":15}},{""id"":""widget-1741693222393-915"",""position"":{""x"":457.5,""y"":68},""size"":{""width"":320,""height"":68},""zIndex"":3,""type"":""text"",""properties"":{""text"":""Scan Me"",""fontFamily"":""Arial"",""fontSize"":40,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741700289207-888"",""position"":{""x"":540,""y"":134},""size"":{""width"":155,""height"":155},""zIndex"":259,""type"":""qr"",""properties"":{""imageUrl"":""img/general/dummy-qr.svg""}},{""id"":""widget-1741693222393-5"",""position"":{""x"":457.5,""y"":298},""size"":{""width"":320,""height"":49},""zIndex"":4,""type"":""text"",""properties"":{""text"":""for a mobile timer"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741693229226-128"",""position"":{""x"":852,""y"":50},""size"":{""width"":320,""height"":320},""zIndex"":1,""type"":""box"",""properties"":{""backgroundColor"":""#ffffff"",""borderRadius"":15}},{""id"":""widget-1741693229226-897"",""position"":{""x"":850,""y"":68},""size"":{""width"":320,""height"":68},""zIndex"":3,""type"":""text"",""properties"":{""text"":""Break ends at"",""fontFamily"":""Arial"",""fontSize"":40,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741700106106-830"",""position"":{""x"":850,""y"":246},""size"":{""width"":320,""height"":55},""zIndex"":68,""type"":""text"",""properties"":{""text"":""{end-time-home}"",""fontFamily"":""Arial"",""fontSize"":39,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""fontWeight"":""bold""}},{""id"":""widget-1741693229226-791"",""position"":{""x"":850,""y"":192},""size"":{""width"":320,""height"":45},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{time-name-home}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}},{""id"":""widget-1741700068706-505"",""position"":{""x"":850,""y"":136},""size"":{""width"":320,""height"":55},""zIndex"":68,""type"":""text"",""properties"":{""text"":""{end-time-additional}"",""fontFamily"":""Arial"",""fontSize"":39,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""fontWeight"":""bold""}},{""id"":""widget-1741700106106-491"",""position"":{""x"":850,""y"":302},""size"":{""width"":320,""height"":45},""zIndex"":4,""type"":""text"",""properties"":{""text"":""{time-name-additional}"",""fontFamily"":""Arial"",""fontSize"":29,""fontColor"":""#333333"",""textAlign"":""center"",""hasPlaceholders"":false,""showRawPlaceholders"":false}}],""nextZIndex"":420}";
                        
                        // Create a new break type
                        var newBreakType = new BreakType
                        {
                            UserId = userId,
                            Name = request.Name,
                            DefaultDurationMinutes = request.DefaultDurationMinutes,
                            BreakTimeStepMinutes = request.BreakTimeStepMinutes,
                            CountdownMessage = request.CountdownMessage,
                            CountdownEndMessage = request.CountdownEndMessage,
                            EndTimeTitle = request.EndTimeTitle,
                            ImageTitle = request.ImageTitle?.ToLowerInvariant(), // Convert to lowercase
                            IconName = request.IconName,
                            Components = jsonString,
                            UsageCount = 0,
                            SortOrder = allBreakTypes.Count + 1,
                            IsLocked = false,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        
                        // Save to database
                        var createdBreakType = await _breakTypeService.CreateAsync(newBreakType);
                        
                        _logger.LogInformation("New break type created with ID {Id} for user {UserId}", createdBreakType.Id, userId);
                        return ErrorHandling.JsonSuccess("Break type created successfully", new { 
                            id = createdBreakType.Id.ToString(),
                            name = createdBreakType.Name
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error saving break type for user {UserId}", userId);
                    return ErrorHandling.JsonError($"Failed to save break type: {ex.Message}");
                }
            }, _logger);
        }
        
        public async Task<IActionResult> OnPostDeleteBreakType(int id)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("OnPostDeleteBreakType called for ID {Id}", id);
                
                // Check if user is authenticated
                var userId = _userManager.GetUserId(User);
                if (userId == null)
                {
                    _logger.LogWarning("Break type deletion attempted without authentication");
                    return ErrorHandling.JsonError("User is not authenticated", StatusCodes.Status401Unauthorized);
                }
                
                try
                {
                    // Get the break type to check if it's locked
                    var breakType = await _breakTypeService.GetAsync(userId, id);
                    
                    if (breakType == null)
                    {
                        _logger.LogWarning("Break type with ID {Id} not found for user {UserId}", id, userId);
                        return ErrorHandling.JsonError($"Break type with ID {id} not found");
                    }
                    
                    // Check if user is subscribed - only pro users can delete break types
                    var isSubscribed = await _stripeTools.IsSubscribedAsync(userId);
                    if (!isSubscribed)
                    {
                        _logger.LogWarning("Break type deletion attempted by non-subscribed user {UserId}", userId);
                        return ErrorHandling.JsonError("Only premium users can delete break types", StatusCodes.Status403Forbidden);
                    }
                    
                    // Check if break type is locked (system default)
                    if (breakType.IsLocked)
                    {
                        _logger.LogWarning("Attempted to delete locked break type with ID {Id} by user {UserId}", id, userId);
                        return ErrorHandling.JsonError("System break types cannot be deleted", StatusCodes.Status403Forbidden);
                    }
                    
                    // Delete the break type
                    await _breakTypeService.DeleteAsync(userId, id);
                    
                    _logger.LogInformation("Break type with ID {Id} successfully deleted by user {UserId}", id, userId);
                    return ErrorHandling.JsonSuccess($"Break type '{breakType.Name}' has been deleted");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting break type {Id} for user {UserId}", id, userId);
                    return ErrorHandling.JsonError($"Failed to delete break type: {ex.Message}");
                }
            }, _logger);
        }
        
        // Time Zone API Handlers
        
        /// <summary>
        /// Gets all available time zones
        /// </summary>
        public IActionResult OnGetAvailableTimeZones()
        {
            return this.SafeExecute(() =>
            {
                _logger.LogInformation("Getting available time zones");
                
                var now = DateTimeOffset.UtcNow;
                var timeZones = _timeZoneService.GetAllTimeZones()
                    .Select(tz =>
                    {
                        var systemTimeZone = System.TimeZoneInfo.FindSystemTimeZoneById(tz.IanaId);
                        if (systemTimeZone == null)
                        {
                            // Handle the null case - create a default object with 0 offset
                            return new
                            {
                                zoneId = tz.IanaId,
                                cities = new[] { tz.City },
                                countryName = tz.Country,
                                continent = tz.Continent,
                                utcOffset = 0.0,
                                utcOffsetHours = 0,
                                utcOffsetMinutes = 0
                            };
                        }
                        
                        var offset = systemTimeZone.GetUtcOffset(now);
                        return new
                        {
                            zoneId = tz.IanaId,
                            cities = new[] { tz.City },
                            countryName = tz.Country,
                            continent = tz.Continent,
                            utcOffset = offset.TotalMinutes / 60.0,     // For sorting
                            utcOffsetHours = offset.Hours,              // For display
                            utcOffsetMinutes = offset.Minutes           // For display
                        };
                    })
                    .OrderBy(tz => tz.utcOffset);  // Sort by UTC offset

                return ErrorHandling.JsonSuccess("Time zones retrieved successfully", timeZones);
            }, _logger);
        }

        /// <summary>
        /// Gets the user's selected time zones
        /// </summary>
        public async Task<IActionResult> OnGetUserTimeZones(int pageNumber = 1, int pageSize = 10, bool includeWeather = false)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Getting user time zones");
                
                // Check authentication
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                // Get the user's time zones
                var userTimeZones = await GetUserTimeZonesAsync(userId);
                var totalCount = userTimeZones.Count;
                
                // Get the user's home time zone
                var homeTimeZone = await GetHomeTimeZoneAsync(userId);
                
                // Apply pagination
                var pagedTimeZones = userTimeZones.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
                
                // Get weather data if requested
                Dictionary<string, string> weatherInfoData = new();
                if (includeWeather)
                {
                    try
                    {
                        var weatherService = HttpContext.RequestServices.GetRequiredService<WeatherService>();
                        weatherInfoData = await weatherService.GetWeatherForTimeZonesAsync(pagedTimeZones);
                        _logger.LogInformation("Weather data retrieved for {Count} time zones", weatherInfoData.Count);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error retrieving weather data");
                    }
                }
                
                var now = DateTimeOffset.UtcNow;
                var timeZones = pagedTimeZones
                    .Select(id => _timeZoneService.GetTimeZoneById(id))
                    .Where(tz => tz != null)
                    .Select(tz =>
                    {
                        // Get the current UTC offset for this timezone
                        var systemTimeZone = System.TimeZoneInfo.FindSystemTimeZoneById(tz!.IanaId);
                        
                        if (systemTimeZone == null)
                        {
                            // Handle the null case - create a default object with 0 offset
                            return new
                            {
                                zoneId = tz.IanaId,
                                cities = new[] { tz.City },
                                countryName = tz.Country,
                                continent = tz.Continent,
                                isHome = tz.IanaId == homeTimeZone,
                                utcOffset = 0.0,
                                utcOffsetHours = 0,
                                utcOffsetMinutes = 0,
                                weatherInfo = includeWeather ? (weatherInfoData.TryGetValue(tz.IanaId, out var currentWeather) ? currentWeather : "Weather data unavailable") : null
                            };
                        }
                        
                        var offset = systemTimeZone.GetUtcOffset(now);

                        // Create an object with all timezone information
                        return new
                        {
                            zoneId = tz.IanaId,
                            cities = new[] { tz.City },
                            countryName = tz.Country,
                            continent = tz.Continent,
                            isHome = tz.IanaId == homeTimeZone,

                            // Store offset in three formats:
                            utcOffset = offset.TotalMinutes / 60.0,     // Decimal hours (e.g., 5.5) - used for sorting
                            utcOffsetHours = offset.Hours,              // Full hours (e.g., 5) - for display
                            utcOffsetMinutes = offset.Minutes,          // Minutes part (e.g., 30) - for display
                            
                            // Weather information (if requested)
                            weatherInfo = includeWeather ? (weatherInfoData.TryGetValue(tz.IanaId, out var locationWeather) ? locationWeather : "Weather data unavailable") : null
                        };
                    })
                    // Sort timezones from west to east (negative UTC offsets to positive)
                    .OrderBy(tz => tz.utcOffset)
                    .ToList();

                return ErrorHandling.JsonSuccess("User time zones retrieved successfully", new
                {
                    data = timeZones,
                    totalItems = totalCount,
                    homeTimeZoneId = homeTimeZone,
                    currentPage = pageNumber,
                    pageSize = pageSize
                });
            }, _logger);
        }
        
        /// <summary>
        /// Adds a new time zone to the user's list
        /// </summary>
        public class SelectTimeZoneRequest
        {
            [JsonPropertyName("selectedTimeZoneId")]
            public string SelectedTimeZoneId { get; set; } = string.Empty;
        }
        
        /// <summary>
        /// Sets a time zone as the user's home time zone
        /// </summary>
        public class SetHomeTimeZoneRequest
        {
            [JsonPropertyName("timeZoneId")]
            public string TimeZoneId { get; set; } = string.Empty;
        }
        
        /// <summary>
        /// Adds a time zone to the user's list
        /// </summary>
        public async Task<IActionResult> OnPostSelectTimeZone([FromBody] SelectTimeZoneRequest? request)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Adding time zone to user's list");
                
                // Check authentication
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                if (request == null || string.IsNullOrEmpty(request.SelectedTimeZoneId))
                {
                    _logger.LogWarning("No time zone selected");
                    return ErrorHandling.JsonError("No time zone selected", StatusCodes.Status400BadRequest);
                }
                
                // Validate the time zone
                var timeZone = _timeZoneService.GetTimeZoneById(request.SelectedTimeZoneId);
                if (timeZone == null)
                {
                    _logger.LogWarning("Selected time zone not found: {TimeZoneId}", request.SelectedTimeZoneId);
                    return ErrorHandling.JsonError("Selected time zone not found", StatusCodes.Status404NotFound);
                }
                
                // Get the user's time zones
                var userTimeZones = await GetUserTimeZonesAsync(userId);
                
                // Add the time zone if it's not already in the list
                if (!userTimeZones.Contains(request.SelectedTimeZoneId))
                {
                    userTimeZones.Add(request.SelectedTimeZoneId);
                    await SaveUserTimeZonesAsync(userId, userTimeZones);
                    _logger.LogInformation("Added time zone {TimeZoneId} to user's list", request.SelectedTimeZoneId);
                }
                else
                {
                    _logger.LogInformation("Time zone {TimeZoneId} already in user's list", request.SelectedTimeZoneId);
                }
                
                return ErrorHandling.JsonSuccess("Time zone added successfully");
            }, _logger);
        }
        
        /// <summary>
        /// Sets a time zone as the user's home time zone
        /// </summary>
        public async Task<IActionResult> OnPostSetHomeTimeZone([FromBody] SetHomeTimeZoneRequest? request)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Setting home time zone");
                
                // Check authentication
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                if (request == null || string.IsNullOrEmpty(request.TimeZoneId))
                {
                    _logger.LogWarning("No time zone selected");
                    return ErrorHandling.JsonError("No time zone selected", StatusCodes.Status400BadRequest);
                }
                
                // Validate the time zone
                var timeZone = _timeZoneService.GetTimeZoneById(request.TimeZoneId);
                if (timeZone == null)
                {
                    _logger.LogWarning("Selected time zone not found: {TimeZoneId}", request.TimeZoneId);
                    return ErrorHandling.JsonError("Selected time zone not found", StatusCodes.Status404NotFound);
                }
                
                // Update the user's home time zone
                await SetHomeTimeZoneAsync(userId, request.TimeZoneId);
                _logger.LogInformation("Set home time zone to {TimeZoneId}", request.TimeZoneId);
                
                return ErrorHandling.JsonSuccess("Home time zone updated successfully");
            }, _logger);
        }
        
        /// <summary>
        /// Deletes a time zone from the user's list
        /// </summary>
        public async Task<IActionResult> OnPostDeleteTimeZone([FromBody] string? timeZoneId)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Deleting time zone from user's list");
                
                // Check authentication
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                if (string.IsNullOrEmpty(timeZoneId))
                {
                    _logger.LogWarning("No time zone specified");
                    return ErrorHandling.JsonError("No time zone specified", StatusCodes.Status400BadRequest);
                }
                
                // Get the user's time zones
                var userTimeZones = await GetUserTimeZonesAsync(userId);
                
                // Remove the time zone if it exists
                bool removed = userTimeZones.Remove(timeZoneId);
                if (removed)
                {
                    // If we just deleted the home time zone, set the first remaining time zone as home
                    var homeTimeZone = await GetHomeTimeZoneAsync(userId);
                    if (timeZoneId == homeTimeZone && userTimeZones.Count > 0)
                    {
                        var newHomeTimeZone = userTimeZones.First();
                        await SetHomeTimeZoneAsync(userId, newHomeTimeZone);
                        _logger.LogInformation("Home time zone changed to {NewHomeTimeZone} after deleting {OldHomeTimeZone}", 
                            newHomeTimeZone, timeZoneId);
                    }
                    
                    await SaveUserTimeZonesAsync(userId, userTimeZones);
                    _logger.LogInformation("Deleted time zone {TimeZoneId} from user's list", timeZoneId);
                    
                    return ErrorHandling.JsonSuccess("Time zone deleted successfully", new
                    {
                        newHomeTimeZoneId = (timeZoneId == homeTimeZone && userTimeZones.Count > 0) 
                            ? userTimeZones.First() 
                            : null
                    });
                }
                
                _logger.LogInformation("Time zone {TimeZoneId} was not in the user's list", timeZoneId);
                return ErrorHandling.JsonSuccess("Time zone was not in the list");
            }, _logger);
        }
        
        /// <summary>
        /// Handles background image upload
        /// </summary>
        public async Task<IActionResult> OnPostUploadImage()
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Processing background image upload");
                
                // Check if user is authenticated
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                // Check if user is subscribed - only pro users can upload backgrounds
                var isSubscribed = await _stripeTools.IsSubscribedAsync(userId);
                if (!isSubscribed)
                {
                    _logger.LogWarning("Background image upload attempted by non-subscribed user {UserId}", userId);
                    return ErrorHandling.JsonError("Only premium users can upload custom backgrounds", StatusCodes.Status403Forbidden);
                }
                
                // Get the image title from form
                var imageTitle = Request.Form["imageTitle"].ToString();
                if (string.IsNullOrWhiteSpace(imageTitle))
                {
                    _logger.LogWarning("No image title provided for background upload");
                    return ErrorHandling.JsonError("Image title is required", StatusCodes.Status400BadRequest);
                }
                
                // Validate title length
                if (imageTitle.Length > 50)
                {
                    _logger.LogWarning("Image title too long: {Length} characters", imageTitle.Length);
                    return ErrorHandling.JsonError("Image title must be 50 characters or less", StatusCodes.Status400BadRequest);
                }
                
                // Get the uploaded file
                var file = Request.Form.Files.GetFile("file");
                if (file == null || file.Length == 0)
                {
                    _logger.LogWarning("No file uploaded for background image");
                    return ErrorHandling.JsonError("No file uploaded", StatusCodes.Status400BadRequest);
                }
                
                // Validate file size (max 5MB)
                if (file.Length > 5 * 1024 * 1024)
                {
                    _logger.LogWarning("Uploaded file too large: {Size} bytes", file.Length);
                    return ErrorHandling.JsonError("File size must be 5MB or less", StatusCodes.Status400BadRequest);
                }
                
                // Validate file type (JPG or PNG only)
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(fileExtension))
                {
                    _logger.LogWarning("Invalid file type uploaded: {FileExtension}", fileExtension);
                    return ErrorHandling.JsonError("Only JPG and PNG images are allowed", StatusCodes.Status400BadRequest);
                }
                
                try
                {
                    // Get the storage service
                    var storageService = _storageServiceFactory.CreateStorageService();
                    string containerName = _configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";
                    
                    // Create a unique filename based on user ID and a GUID
                    string fileNameWithoutExtension = $"user-{userId}-{Guid.NewGuid()}";
                    
                    // Create filenames for thumbnail and full-size versions
                    string thumbnailFileName = $"{fileNameWithoutExtension}-thumb{fileExtension}";
                    string fullSizeFileName = $"{fileNameWithoutExtension}-fhd{fileExtension}";
                    
                    // Read the file into memory
                    using var memoryStream = new MemoryStream();
                    await file.CopyToAsync(memoryStream);
                    memoryStream.Position = 0;
                    
                    // Create an image from the uploaded file
                    using var originalImage = Image.Load(memoryStream.ToArray());
                    
                    // Process full-size version (resize if needed)
                    int maxWidth = 1920;
                    int maxHeight = 1080;
                    
                    // Resize the original image to fit within maxWidth x maxHeight while maintaining aspect ratio
                    originalImage.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Mode = ResizeMode.Max,
                        Size = new Size(maxWidth, maxHeight)
                    }));
                    
                    // Save the full-size image
                    using var fullSizeStream = new MemoryStream();
                    await originalImage.SaveAsync(fullSizeStream, new JpegEncoder());
                    fullSizeStream.Position = 0;
                    
                    // Upload the full-size image
                    var metadata = new Dictionary<string, string>
                    {
                        ["title"] = imageTitle,
                        ["userId"] = userId
                    };
                    
                    await storageService.UploadObjectAsync(
                        containerName,
                        fullSizeFileName,
                        fullSizeStream,
                        "image/jpeg",
                        metadata);
                    
                    // Create thumbnail (150x150)
                    using var thumbnailImage = Image.Load(memoryStream.ToArray());
                    thumbnailImage.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Mode = ResizeMode.Crop,
                        Size = new Size(150, 150)
                    }));
                    
                    // Save the thumbnail
                    using var thumbnailStream = new MemoryStream();
                    await thumbnailImage.SaveAsync(thumbnailStream, new JpegEncoder());
                    thumbnailStream.Position = 0;
                    
                    // Upload the thumbnail
                    await storageService.UploadObjectAsync(
                        containerName,
                        thumbnailFileName,
                        thumbnailStream,
                        "image/jpeg",
                        metadata);
                    
                    // Get the base URL for the container
                    var baseUrl = storageService.GetBaseUrl(containerName);
                    
                    // Create URLs for the uploaded images
                    string thumbnailUrl = $"{baseUrl}/{thumbnailFileName}";
                    string fullImageUrl = $"{baseUrl}/{fullSizeFileName}";
                    
                    // Create a background image entity to store in the database
                    var backgroundImage = new Yuzu.Data.Models.BackgroundImage
                    {
                        UserId = userId,
                        FileName = fileNameWithoutExtension,
                        Title = imageTitle,
                        ThumbnailUrl = thumbnailUrl,
                        FullImageUrl = fullImageUrl,
                        ThumbnailPath = thumbnailFileName,
                        FullImagePath = fullSizeFileName,
                        IsSystem = false,
                        UploadedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    // Save the background image to the database
                    await _backgroundImageService.CreateAsync(backgroundImage);
                    
                    _logger.LogInformation("Successfully uploaded background image for user {UserId}: {FileName} and saved to database", userId, fileNameWithoutExtension);
                    
                    // Return success with the image details
                    return ErrorHandling.JsonSuccess("Background image uploaded successfully", new
                    {
                        name = fileNameWithoutExtension,
                        title = imageTitle,
                        thumbnailUrl = thumbnailUrl,
                        fullImageUrl = fullImageUrl
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error uploading background image for user {UserId}", userId);
                    return ErrorHandling.JsonError($"Error uploading image: {ex.Message}");
                }
            }, _logger);
        }
        
        /// <summary>
        /// Handles background image deletion
        /// </summary>
        public async Task<IActionResult> OnPostDeleteImage([FromBody] DeleteImageRequest request)
        {
            return await this.SafeExecuteAsync(async () =>
            {
                _logger.LogInformation("Processing background image deletion");
                
                // Check if user is authenticated
                var authResult = this.EnsureAuthenticated(_userManager);
                if (authResult != null)
                {
                    return authResult;
                }
                
                // Get the user ID, now we know it's not null
                var userId = Users.GetUserIdOrThrow(_userManager, User);
                
                // Check if user is subscribed - only pro users can delete custom backgrounds
                var isSubscribed = await _stripeTools.IsSubscribedAsync(userId);
                if (!isSubscribed)
                {
                    _logger.LogWarning("Background image deletion attempted by non-subscribed user {UserId}", userId);
                    return ErrorHandling.JsonError("Only premium users can delete custom backgrounds", StatusCodes.Status403Forbidden);
                }
                
                // Get the image name from request
                if (request == null || string.IsNullOrEmpty(request.ImageName))
                {
                    _logger.LogWarning("No image name provided for background deletion");
                    return ErrorHandling.JsonError("Image name is required", StatusCodes.Status400BadRequest);
                }
                
                string imageName = request.ImageName;
                
                // Verify this is a user-uploaded image and belongs to this user
                if (!imageName.StartsWith($"user-{userId}"))
                {
                    _logger.LogWarning("User {UserId} attempted to delete image {ImageName} that doesn't belong to them", userId, imageName);
                    return ErrorHandling.JsonError("You can only delete your own custom backgrounds", StatusCodes.Status403Forbidden);
                }
                
                try
                {
                    // Get the storage service
                    var storageService = _storageServiceFactory.CreateStorageService();
                    string containerName = _configuration["S3Settings:BackgroundsContainer"] ?? "backgrounds";
                    
                    // Get file extension by checking if the thumbnail exists (.jpg or .png)
                    string? fileExtension = null;
                    var extensions = new[] { ".jpg", ".jpeg", ".png" };
                    
                    foreach (var ext in extensions)
                    {
                        string thumbnailName = $"{imageName}-thumb{ext}";
                        if (await storageService.ObjectExistsAsync(containerName, thumbnailName))
                        {
                            fileExtension = ext;
                            break;
                        }
                    }
                    
                    if (fileExtension == null)
                    {
                        _logger.LogWarning("Image {ImageName} not found for deletion", imageName);
                        return ErrorHandling.JsonError("Image not found", StatusCodes.Status404NotFound);
                    }
                    
                    // Delete the thumbnail
                    string thumbnailFileName = $"{imageName}-thumb{fileExtension}";
                    await storageService.DeleteObjectAsync(containerName, thumbnailFileName);
                    
                    // Delete the full-size image
                    string fullSizeFileName = $"{imageName}-fhd{fileExtension}";
                    await storageService.DeleteObjectAsync(containerName, fullSizeFileName);
                    
                    // Delete the image from the database
                    bool dbDeleteResult = await _backgroundImageService.DeleteByFileNameAsync(imageName, userId);
                    
                    _logger.LogInformation("Successfully deleted background image {ImageName} for user {UserId} (Database record deleted: {DbDeleted})", 
                        imageName, userId, dbDeleteResult);
                    
                    // Return success
                    return ErrorHandling.JsonSuccess("Background image deleted successfully");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting background image {ImageName} for user {UserId}", imageName, userId);
                    return ErrorHandling.JsonError($"Error deleting image: {ex.Message}");
                }
            }, _logger);
        }
        
        /// <summary>
        /// Gets information about a specific time zone
        /// </summary>
        public IActionResult OnGetGetTimeZoneInfo(string timeZoneId)
        {
            return this.SafeExecute(() =>
            {
                _logger.LogInformation("Getting information for time zone {TimeZoneId}", timeZoneId);
                
                // Validate the time zone
                var timeZone = _timeZoneService.GetTimeZoneById(timeZoneId);
                if (timeZone == null)
                {
                    _logger.LogWarning("Time zone not found: {TimeZoneId}", timeZoneId);
                    return ErrorHandling.JsonError("Time zone not found", StatusCodes.Status404NotFound);
                }
                
                var now = DateTimeOffset.UtcNow;
                var systemTimeZone = System.TimeZoneInfo.FindSystemTimeZoneById(timeZone.IanaId);
                
                if (systemTimeZone == null)
                {
                    _logger.LogWarning("System time zone not found for {TimeZoneId}", timeZoneId);
                    return ErrorHandling.JsonError("System time zone not found", StatusCodes.Status404NotFound);
                }
                
                var offset = systemTimeZone.GetUtcOffset(now);
                
                // Create a response object with all the time zone information
                var tzInfo = new
                {
                    zoneId = timeZone.IanaId,
                    cities = new[] { timeZone.City },
                    countryName = timeZone.Country,
                    continent = timeZone.Continent,
                    utcOffset = offset.TotalMinutes / 60.0,
                    utcOffsetHours = offset.Hours,
                    utcOffsetMinutes = offset.Minutes
                };
                
                return ErrorHandling.JsonSuccess("Time zone information retrieved successfully", tzInfo);
            }, _logger);
        }
        
        // Placeholder for future membership API handlers
// These will be implemented when the Stripe service is extended with additional methods

        #region Time Zone Helper Methods
        
        /// <summary>
        /// Gets the user's list of time zones
        /// </summary>
        private async Task<List<string>> GetUserTimeZonesAsync(string userId)
        {
            try
            {
                var timezonesData = await _userDataService.GetAsync(userId, UserDataKey.AdditionalTimeZones.ToString());
                
                if (timezonesData == null || string.IsNullOrEmpty(timezonesData.Value))
                {
                    // Initialize with default time zones if no data exists
                    var defaultTimezones = new List<string> { "Europe/Berlin", "Europe/London", "America/New_York", "Asia/Tokyo" };
                    await SaveUserTimeZonesAsync(userId, defaultTimezones);
                    return defaultTimezones;
                }
                
                var timezones = new List<string>(timezonesData.Value.Split(','));
                
                return timezones;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user time zones for user {UserId}", userId);
                
                // Initialize with default time zones if an error occurred
                var defaultTimezones = new List<string> { "Europe/Berlin", "Europe/London", "America/New_York", "Asia/Tokyo" };
                await SaveUserTimeZonesAsync(userId, defaultTimezones);
                return defaultTimezones;
            }
        }
        
        /// <summary>
        /// Saves the user's list of time zones
        /// </summary>
        private async Task SaveUserTimeZonesAsync(string userId, List<string> timezones)
        {
            var timezonesData = new UserDataItem
            {
                UserId = userId,
                DataKey = UserDataKey.AdditionalTimeZones.ToString(),
                Value = string.Join(",", timezones),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await _userDataService.UpsertAsync(timezonesData);
        }
        
        /// <summary>
        /// Gets the user's home time zone
        /// </summary>
        private async Task<string> GetHomeTimeZoneAsync(string userId)
        {
            try
            {
                var homeTimeZoneData = await _userDataService.GetAsync(userId, UserDataKey.HomeTimeZone.ToString());
                return homeTimeZoneData?.Value ?? "UTC";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting home time zone for user {UserId}", userId);
                return "UTC";
            }
        }
        
        /// <summary>
        /// Sets the user's home time zone
        /// </summary>
        private async Task SetHomeTimeZoneAsync(string userId, string timeZoneId)
        {
            var homeTimeZoneData = new UserDataItem
            {
                UserId = userId,
                DataKey = UserDataKey.HomeTimeZone.ToString(),
                Value = timeZoneId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await _userDataService.UpsertAsync(homeTimeZoneData);
        }
        
        #endregion
    }

    // Break type wizard default values - centralized for easier maintenance
    public static class BreakTypeDefaults
    {
        // Text fields
        public const string BreakName = "New Break";
        public const string CountdownMessage = "until break ends.";
        public const string CountdownEndMessage = "Break has ended.";
        public const string EndTimeTitle = "Break ends at:";
        
        // Numeric values
        public const int DefaultDuration = 15; // minutes
        public const int TimeStep = 5; // minutes
        
        // Default icon
        public const string DefaultIcon = "bx-coffee-togo";
    }
    
    // Request model for saving break types with data annotations for validation
    public class SaveBreakTypeRequest
    {
        [JsonPropertyName("BreakId")]
        public string? BreakId { get; set; }
        
        [Required(ErrorMessage = "Please provide a Display Name.")]
        [StringLength(100, ErrorMessage = "The Display Name is too long. It should be 100 characters or fewer.")]
        [JsonPropertyName("Name")]
        public string Name { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Please specify the Default Duration.")]
        [Range(1, 1440, ErrorMessage = "The Duration should be between 1 and 1440 minutes.")]
        [JsonPropertyName("DefaultDurationMinutes")]
        public int DefaultDurationMinutes { get; set; }
        
        [Required(ErrorMessage = "Please specify the Break Time Step.")]
        [Range(1, 60, ErrorMessage = "The Time Step should be between 1 and 60 minutes.")]
        [JsonPropertyName("BreakTimeStepMinutes")]
        public int BreakTimeStepMinutes { get; set; }
        
        [Required(ErrorMessage = "Please enter a Countdown Message.")]
        [StringLength(200, ErrorMessage = "The Countdown Message is too long. It should be 200 characters or fewer.")]
        [JsonPropertyName("CountdownMessage")]
        public string CountdownMessage { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Please enter a Countdown End Message.")]
        [StringLength(200, ErrorMessage = "The Countdown End Message is too long. It should be 200 characters or fewer.")]
        [JsonPropertyName("CountdownEndMessage")]
        public string CountdownEndMessage { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Please provide an End Time Title.")]
        [StringLength(100, ErrorMessage = "The End Time Title is too long. It should be 100 characters or fewer.")]
        [JsonPropertyName("EndTimeTitle")]
        public string EndTimeTitle { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Background image is required.")]
        [JsonPropertyName("ImageTitle")]
        public string ImageTitle { get; set; } = string.Empty;
        
        [JsonPropertyName("ImageUrl")]
        public string ImageUrl { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Icon is required.")]
        [JsonPropertyName("IconName")]
        public string IconName { get; set; } = string.Empty;
    }
    
    // Models for Membership section
    public class SubscriptionInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Interval { get; set; } = string.Empty;
        public string ValidUntil { get; set; } = string.Empty;
    }

    public class InvoiceInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Total { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
    
    // Request model for deleting background images
    public class DeleteImageRequest
    {
        [JsonPropertyName("imageName")]
        public string ImageName { get; set; } = string.Empty;
    }

    // Using the shared BackgroundImage class from Pages namespace
}