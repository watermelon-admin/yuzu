using ElCamino.AspNetCore.Identity.AzureTable.Model;

namespace Yuzu.Web
{
    /// <summary>
    /// Custom application user with additional profile and subscription properties
    /// Note: ElCamino's IdentityUser for Azure Tables already includes many properties
    /// Custom properties are stored in the same table entity
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