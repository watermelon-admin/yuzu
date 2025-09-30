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
            
            // For mobile page, we need to get all breaks for all users to find this break
            // This is a simplified approach - in production you might want to add a user parameter
            // For now, we'll return NotFound since we can't lookup without userId
            _logger.LogError("Mobile page requires userId parameter to lookup breaks with GUID: {BreakId}", BreakId);
            return NotFound();

            // TODO: Update mobile page to require userId parameter or implement a different lookup strategy

            // This code is commented out until the lookup strategy is updated
            // return Page();
        }
    }
}

