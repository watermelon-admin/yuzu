using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Stripe;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Yuzu.Web.Configuration;

namespace Yuzu.Payments
{
    public class StripeService
    {
        private readonly SubscriptionService _subscriptionService;
        private readonly InvoiceService _invoiceService;
        private readonly PaymentSettings _paymentSettings;
        private readonly ILogger<StripeService> _logger;

        public StripeService(
            IOptions<PaymentSettings> paymentOptions, 
            ILogger<StripeService> logger
            )
        {
            _paymentSettings = paymentOptions.Value;
            _logger = logger;

            // Initialize Stripe API key
            StripeConfiguration.ApiKey = _paymentSettings.Stripe.SecretKey;

            // Initialize services
            _subscriptionService = new SubscriptionService();
            _invoiceService = new InvoiceService();
        }


        public async Task<Subscription?> GetActiveSubscriptionAsync(string stripeCustomerId)
        {
            try
            {
                var options = new SubscriptionListOptions
                {
                    Customer = stripeCustomerId,
                    Status = "active",
                    Limit = 1
                };

                var subscriptions = await _subscriptionService.ListAsync(options);
                var activeSubscription = subscriptions.FirstOrDefault();

                if (activeSubscription == null)
                {
                    _logger.LogInformation("No active subscription found.");
                    return null;
                }

                return activeSubscription;
            }
            catch (StripeException ex)
            {
                _logger.LogError($"Stripe API Error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Gets the billing history for a given Stripe customer ID.
        /// </summary>
        /// <param name="stripeCustomerId">The Stripe customer ID.</param>
        /// <returns>A list of invoices, or an empty list if an error occurs.</returns>
        public async Task<List<Invoice>> GetBillingHistoryAsync(string stripeCustomerId)
        {
            try
            {
                var options = new InvoiceListOptions
                {
                    Customer = stripeCustomerId,
                    Limit = 10, // Fetch last 10 invoices (adjust as needed)
                };

                var invoices = await _invoiceService.ListAsync(options);
                return invoices.ToList();
            }
            catch (StripeException ex)
            {
                _logger.LogError($"Stripe API Error: {ex.Message}");
                return new List<Invoice>();
            }
        }
    }
}