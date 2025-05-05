using Microsoft.AspNetCore.Identity;

namespace Yuzu.Web
{
    /// <summary>
    /// Custom application user with additional profile and subscription properties
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? StripeUserID { get; set; }
        public string? StripeSubscriptionID { get; set; }
        public long StripeCurrentPeriodEndTimestamp { get; set; }
    }
}
