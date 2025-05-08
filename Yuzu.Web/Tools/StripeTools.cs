using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Provides utility methods for working with Stripe subscriptions.
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="StripeTools"/> class.
    /// </remarks>
    /// <param name="userManager">The user manager to use for retrieving user information.</param>
    /// <param name="configuration">The configuration for application settings.</param>
    public class StripeTools(UserManager<ApplicationUser> userManager, IConfiguration configuration)
    {
        private readonly UserManager<ApplicationUser> _userManager = userManager;
        private readonly IConfiguration _configuration = configuration;
        
        private bool TreatAllUsersAsSubscribed => _configuration.GetValue<bool>("DebugSettings:TreatAllUsersAsSubscribed");

        /// <summary>
        /// Determines whether the user has a valid subscription.
        /// </summary>
        /// <param name="userId">The ID of the user to check.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains a boolean value indicating whether the user has a valid subscription.</returns>
        public async Task<bool> IsSubscribedAsync(string userId)
        {
            // If debug flag is enabled, always return true
            if (TreatAllUsersAsSubscribed)
            {
                return true;
            }
            
            if (userId.IsNullOrEmpty())
            {
                return false;
            }

            // Get user
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return false;
            }

            // Check if user has a subscription
            if (string.IsNullOrEmpty(user.StripeSubscriptionID))
            {
                return false;
            }

            // Check if subscription is active
            if (user.StripeCurrentPeriodEndTimestamp > DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Determines whether the current user has a valid subscription.
        /// </summary>
        /// <param name="User">The current user's claims principal.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains a boolean value indicating whether the user has a valid subscription.</returns>
        public async Task<bool> IsCurrentUserSubscribedAsync(ClaimsPrincipal User)
        {
            // If debug flag is enabled, always return true
            if (TreatAllUsersAsSubscribed)
            {
                return true;
            }
            
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                return false;
            }

            return await IsSubscribedAsync(userId);
        }

        /// <summary>
        /// Sets the IsSubscribed property on a PageModel and returns an action result if the user is unauthorized.
        /// </summary>
        /// <param name="page">The page model to update.</param>
        /// <param name="User">The current user's claims principal.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains an IActionResult if the user is unauthorized, or null if the user is authorized.</returns>
        public async Task<IActionResult?> SetSubscriptionStatusAsync(dynamic page, ClaimsPrincipal User)
        {
            // Check if user is authenticated
            var userId = _userManager.GetUserId(User);
            if (userId == null)
            {
                return new UnauthorizedResult();
            }

            // Set the IsSubscribed property
            page.IsSubscribed = await IsSubscribedAsync(userId);
            return null;
        }
        
        /// <summary>
        /// Cancels the subscription for the specified user.
        /// </summary>
        /// <param name="userId">The ID of the user whose subscription should be canceled.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        public async Task CancelSubscriptionAsync(string userId)
        {
            // This method will be implemented later
            await Task.CompletedTask;
        }
        
        /// <summary>
        /// Gets subscription data for the specified user.
        /// </summary>
        /// <param name="userId">The ID of the user whose subscription data should be retrieved.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the subscription data.</returns>
        public async Task<object?> GetSubscriptionDataAsync(string userId)
        {
            // If debug flag is enabled, return fake subscription data
            if (TreatAllUsersAsSubscribed)
            {
                return new 
                {
                    Id = "sub_fakeid123456789",
                    Status = "active",
                    CurrentPeriodStart = DateTimeOffset.UtcNow.AddDays(-15).ToUnixTimeSeconds(),
                    CurrentPeriodEnd = DateTimeOffset.UtcNow.AddDays(15).ToUnixTimeSeconds(),
                    CustomerEmail = "test@example.com",
                    CustomerName = "Test User",
                    Plan = new 
                    {
                        Id = "plan_premium_monthly",
                        Nickname = "Premium Monthly",
                        Amount = 1000,
                        Currency = "usd",
                        Interval = "month"
                    },
                    IsCanceled = false,
                    CanceledAt = (long?)null
                };
            }
            
            // Get user
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.StripeSubscriptionID))
            {
                return new 
                { 
                    Status = "inactive",
                    CurrentPeriodEnd = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    IsCanceled = true
                };
            }
            
            // TODO: Implement actual subscription data retrieval from Stripe API
            // For now, return a placeholder subscription
            return new 
            {
                Status = "active",
                CurrentPeriodEnd = DateTimeOffset.UtcNow.AddDays(30).ToUnixTimeSeconds(),
                IsCanceled = false
            };
        }
    }
}

