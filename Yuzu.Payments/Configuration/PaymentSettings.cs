using System.ComponentModel.DataAnnotations;

namespace Yuzu.Payments.Configuration
{
    /// <summary>
    /// Configuration settings for payment processing
    /// </summary>
    public class PaymentSettings
    {
        /// <summary>
        /// Stripe-specific configuration settings
        /// </summary>
        [Required]
        public StripeSettings Stripe { get; set; } = new StripeSettings();
    }

    /// <summary>
    /// Configuration settings for Stripe payment processing
    /// </summary>
    public class StripeSettings
    {
        /// <summary>
        /// Stripe secret key (starts with sk_)
        /// </summary>
        [Required]
        [RegularExpression(@"^sk_\w+$", ErrorMessage = "Stripe secret key must start with 'sk_'")]
        public string SecretKey { get; set; } = string.Empty;

        /// <summary>
        /// Stripe publishable key (starts with pk_)
        /// </summary>
        [Required]
        [RegularExpression(@"^pk_\w+$", ErrorMessage = "Stripe publishable key must start with 'pk_'")]
        public string PublishableKey { get; set; } = string.Empty;

        /// <summary>
        /// Stripe payment links
        /// </summary>
        [Required]
        public PaymentLinks PaymentLinks { get; set; } = new PaymentLinks();
    }

    /// <summary>
    /// Configuration settings for Stripe payment links
    /// </summary>
    public class PaymentLinks
    {
        /// <summary>
        /// Payment link for monthly pro subscription
        /// </summary>
        [Required]
        [Url]
        public string Pro_m_v1 { get; set; } = string.Empty;

        /// <summary>
        /// Payment link for yearly pro subscription
        /// </summary>
        [Required]
        [Url]
        public string Pro_y_v1 { get; set; } = string.Empty;
    }
}