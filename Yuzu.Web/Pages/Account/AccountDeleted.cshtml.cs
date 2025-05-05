using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages.Account
{
    [AllowAnonymous]
    public class AccountDeletedModel : PageModel
    {
        [BindProperty(SupportsGet = true)]
        public string Email { get; set; } = string.Empty;
        
        [BindProperty(SupportsGet = true)]
        public bool HasSubscription { get; set; } = false;
        
        public void OnGet()
        {
            // The parameters are already bound from the query string
            if (string.IsNullOrEmpty(Email))
            {
                Email = "your account";
            }
        }
    }
}