using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Primitives;
using System.Collections.Generic;
using System.Linq;

namespace Yuzu.Web.Pages.Debug
{
    /// <summary>
    /// Represents the model for the Headers page.
    /// </summary>
    [AllowAnonymous]
    [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
    public class HeadersModel : PageModel
    {
        /// <summary>
        /// Gets the HTTP request headers.
        /// </summary>
        public IDictionary<string, StringValues> Headers { get; private set; } = new Dictionary<string, StringValues>();

        /// <summary>
        /// Handles GET requests to the Headers page.
        /// </summary>
        public void OnGet()
        {
            // Get the HTTP request headers
            Headers = Request.Headers.ToDictionary(h => h.Key, h => h.Value);
        }
    }
}
