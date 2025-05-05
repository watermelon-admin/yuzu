using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Yuzu.Web.Tools;

namespace Yuzu.Web.Pages
{
    [AllowAnonymous]
    public class PricingModel(
        UserManager<ApplicationUser> userManager,
        StripeTools stripeTools
        ) : PageModel
    {
        readonly UserManager<ApplicationUser> _userManager = userManager;
        readonly StripeTools _stripeTools = stripeTools;
        public bool HasActiveSubscription { get; set; }

        public async Task OnGetAsync()
        {
            // Get user ID
            var userId = _userManager.GetUserId(User);
            
            // Determine if user has an active subscription (only if authenticated)
            if (userId != null)
            {
                HasActiveSubscription = await _stripeTools.IsSubscribedAsync(userId);
            }
        }
    }
}