using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages
{
    [AllowAnonymous]
    public class TutorialsModel : PageModel
    {
        public void OnGet()
        {
        }
    }
}