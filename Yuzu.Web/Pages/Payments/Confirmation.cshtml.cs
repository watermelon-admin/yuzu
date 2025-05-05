using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages.Payment
{
    [AllowAnonymous]
    public class ConfirmationModel : PageModel
    {
        public void OnGet()
        {
        }
    }
}
