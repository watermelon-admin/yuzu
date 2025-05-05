using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Yuzu.Data.Models;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Web.Pages
{
    /// <summary>
    /// Represents the model for the Mobile page.
    /// </summary>
    [AllowAnonymous]
    [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
    public class MobileModel : PageModel
    {
        private readonly IBreakService _breakService;
        private readonly IBreakTypeService _breakTypeService;
        private readonly ILogger<MobileModel> _logger;

        private static readonly JsonSerializerOptions JsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="MobileModel"/> class.
        /// </summary>
        /// <param name="breakService">The break service.</param>
        /// <param name="breakTypeService">The break type service.</param>
        /// <param name="logger">The logger instance.</param>
        public MobileModel(
            IBreakService breakService,
            IBreakTypeService breakTypeService,
            ILogger<MobileModel> logger)
        {
            _breakService = breakService;
            _breakTypeService = breakTypeService;
            _logger = logger;
        }

        /// <summary>
        /// Gets or sets the break ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string BreakId { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the break details.
        /// </summary>
        public Break? BreakDetails { get; set; }

        /// <summary>
        /// Gets or sets the break type details.
        /// </summary>
        public BreakType? BreakTypeDetails { get; set; }

        /// <summary>
        /// Handles GET requests to fetch break and break type details.
        /// </summary>
        /// <param name="id">The break ID.</param>
        public async Task<IActionResult> OnGetAsync(string id)
        {
            // Fetch break details
            BreakId = id;
            _logger.LogInformation("Received request to fetch break details for BreakId: {BreakId}", BreakId);
            _logger.LogInformation("Fetching break details for BreakId: {BreakId}", BreakId);
            
            // Convert string ID to int
            if (!int.TryParse(BreakId, out int breakId))
            {
                _logger.LogError("Invalid break ID format: {BreakId}", BreakId);
                return NotFound();
            }
            
            BreakDetails = await _breakService.GetByIdAsync(breakId);
            if (BreakDetails == null)
            {
                _logger.LogError("Break not found for BreakId: {BreakId}", BreakId);
                return NotFound();
            }
            
            string userId = BreakDetails.UserId;
            _logger.LogInformation("Successfully fetched break details for BreakId: {BreakId}, UserId: {UserId}", breakId, userId);

            // Fetch break type details
            _logger.LogInformation("Fetching break type details for BreakTypeId: {BreakTypeId}", BreakDetails.BreakTypeId);
            BreakTypeDetails = await _breakTypeService.GetByIdAsync(BreakDetails.BreakTypeId);
            if (BreakTypeDetails == null)
            {
                _logger.LogError("Break type not found for BreakTypeId: {BreakTypeId}", BreakDetails.BreakTypeId);
                return NotFound();
            }
            _logger.LogInformation("Successfully fetched break type details for BreakTypeId: {BreakTypeId}", BreakDetails.BreakTypeId);

            return Page();
        }
    }
}

