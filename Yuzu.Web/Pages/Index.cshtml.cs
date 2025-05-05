using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Web.Pages
{
    [AllowAnonymous]
    public class IndexModel(ILogger<IndexModel> logger, IUserDataService userDataService) : PageModel
    {
        private readonly ILogger<IndexModel> _logger = logger;
        private readonly IUserDataService _userDataService = userDataService;

        public void OnGet()
        {
            _logger.Log(LogLevel.Information, "Entering Start page");
        }
    }
}
