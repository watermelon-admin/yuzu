using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages
{
    [AllowAnonymous]
    public class HelpModel : PageModel
    {
        public void OnGet()
        {
        }
    }
}