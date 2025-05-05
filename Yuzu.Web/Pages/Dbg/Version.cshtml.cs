using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages.Dbg
{
    /// <summary>
    /// Represents the model for the Version page.
    /// </summary>
    [AllowAnonymous]
    [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
    public class VersionModel : PageModel
    {
        /// <summary>
        /// Handles GET requests to the Version page.
        /// </summary>
        /// <returns>The build number as a content result.</returns>
        public IActionResult OnGet()
        {
            return Content(BuildInfo.BuildNumber);
        }
    }
}
