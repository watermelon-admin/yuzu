#nullable enable

using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Yuzu.Web.Configuration;

namespace Yuzu.Web.Pages.Payments
{
    public class BuyModel : PageModel
    {
        readonly UserManager<ApplicationUser> _userManager;
        readonly PaymentSettings _paymentSettings;

        public BuyModel(IOptions<PaymentSettings> paymentOptions, UserManager<ApplicationUser> userManager)
        {
            _paymentSettings = paymentOptions.Value;
            _userManager = userManager;
        }

        public void OnGet(string product)
        {
            // Get user ID
            var userId = _userManager.GetUserId(User);

            // Create Payment links
            var clientReferenceId = $"?client_reference_id={userId}";
            var pro_m_v1 = $"{_paymentSettings.Stripe.PaymentLinks.Pro_m_v1}{clientReferenceId}";
            var pro_y_v1 = $"{_paymentSettings.Stripe.PaymentLinks.Pro_y_v1}{clientReferenceId}";

            switch (product)
            {
                // Monthly subscription
                case "pro_m_v1":
                    Response.Redirect(pro_m_v1);
                    break;
                // Yearly subscription
                case "pro_y_v1":
                    Response.Redirect(pro_y_v1);
                    break;
                // Product not found
                default:
                    // Send bad request
                    Response.StatusCode = StatusCodes.Status400BadRequest;
                    break;
            }
        }
    }
}