using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Stripe;
using Stripe.Checkout;
using System.Net;
using Yuzu.Payments;

namespace Yuzu.Web.Pages.Payments
{
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public class WebhookModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<WebhookModel> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly StripeService _stripeService;

        // public StripeSubscription? Subscription { get; set; }

        public WebhookModel(
            IConfiguration configuration,
            ILogger<WebhookModel> logger,
            UserManager<ApplicationUser> userManager,
            StripeService stripeService)
        {
            _configuration = configuration;
            _logger = logger;
            _userManager = userManager;
            _stripeService = stripeService;
        }

        public async Task<IActionResult> OnPostAsync()
        {

            _logger.LogInformation("*** Processing Stripe Events ***");
            var requestBodyJson = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();

            try
            {
                // Verify the event by fetching it from Stripe
                var stripeEvent = EventUtility.ParseEvent(requestBodyJson);
                _logger.LogInformation("Parsed Stripe event: {EventId}, Type: {EventType}", stripeEvent.Id, stripeEvent.Type);

                // Handle the event
                // If on SDK version < 46, use class Events instead of EventTypes
                if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
                {
                    // Handle the Checkout Session Completed Event
                    var session = stripeEvent.Data.Object as Session;
                    if (session == null)
                    {
                        _logger.LogError("Invalid session object in Checkout Session Completed event");
                        return new ContentResult { Content = "Invalid session data", StatusCode = (int)HttpStatusCode.BadRequest };
                    }
                    
                    _logger.LogInformation("Checkout session completed: {SessionId}", session.Id);
                    
                    // Validate required session data
                    if (string.IsNullOrEmpty(session.ClientReferenceId))
                    {
                        _logger.LogError("Missing client reference ID in checkout session");
                        return new ContentResult { Content = "Missing client reference ID", StatusCode = (int)HttpStatusCode.BadRequest };
                    }
                    
                    if (string.IsNullOrEmpty(session.CustomerId))
                    {
                        _logger.LogError("Missing customer ID in checkout session");
                        return new ContentResult { Content = "Missing customer ID", StatusCode = (int)HttpStatusCode.BadRequest };
                    }
                    
                    if (string.IsNullOrEmpty(session.SubscriptionId))
                    {
                        _logger.LogError("Missing subscription ID in checkout session");
                        return new ContentResult { Content = "Missing subscription ID", StatusCode = (int)HttpStatusCode.BadRequest };
                    }
                    
                    // Log these values: session.ClientReferenceId. session.CustomerId, session.SubscriptionId
                    _logger.LogInformation("Yuzu User ID: {UserId}", session.ClientReferenceId);
                    _logger.LogInformation("Stripe Customer ID: {SessionId}", session.CustomerId);
                    _logger.LogInformation("Stripe Subscription ID: {SubscriptionId}", session.SubscriptionId);

                    // Update the user's subscription details
                    var currentUser = await _userManager.FindByIdAsync(session.ClientReferenceId);
                    if (currentUser == null)
                    {
                        _logger.LogError("User not found: {UserId}", session.ClientReferenceId);
                        return new ContentResult { Content = "User not found", StatusCode = (int)HttpStatusCode.BadRequest };
                    }

                    // Get the Stripe customer ID and subscription ID
                    currentUser.StripeSubscriptionID = session.SubscriptionId;
                    currentUser.StripeUserID = session.CustomerId;

                    // Get the active subscription details
                    var subscription = await _stripeService.GetActiveSubscriptionAsync(session.CustomerId);
                    if (subscription == null)
                    {
                        _logger.LogError("No active subscription found for user: {UserId}", session.ClientReferenceId);
                        return new ContentResult { Content = "No active subscription found", StatusCode = (int)HttpStatusCode.BadRequest };
                    }                   
                    currentUser.StripeCurrentPeriodEndTimestamp = ((DateTimeOffset)subscription.CurrentPeriodEnd).ToUnixTimeSeconds();

                    // Update the user's subscription details in the database
                    var updateResult = await _userManager.UpdateAsync(currentUser);
                    if (updateResult.Succeeded)
                    {
                        _logger.LogInformation("User subscription details updated: {UserId}", session.ClientReferenceId);
                    }
                    else
                    {
                        _logger.LogError("Error updating user subscription details: {UserId}", session.ClientReferenceId);
                        return new ContentResult { Content = "Error updating user subscription details", StatusCode = (int)HttpStatusCode.BadRequest };
                    }
                }
                else if (stripeEvent.Type == EventTypes.ChargeUpdated)
                {
                    // Handle the Charge Updated event
                    var charge = stripeEvent.Data.Object as Charge;
                    if (charge == null)
                    {
                        _logger.LogError("Invalid charge object in Charge Updated event");
                        return new ContentResult { Content = "Invalid charge data", StatusCode = (int)HttpStatusCode.BadRequest };
                    }
                    _logger.LogInformation("Charge updated: {ChargeId}, Status: {ChargeStatus}", charge.Id, charge.Status);
                }
                else
                {
                    // Event type not yet handled
                    _logger.LogWarning("Unhandled event type: {EventType}", stripeEvent.Type);
                }

                _logger.LogInformation("Returning 200 OK response");
                return new ContentResult { Content = "Stripe event processed sucessfully", StatusCode = (int)HttpStatusCode.OK };
            }
            catch (StripeException ex)
            {
                // Log the exception details
                _logger.LogError(ex, "StripeException occurred while processing the event");
                // Something went wrong, return a 400 response
                _logger.LogInformation("Returning 400 Bad Request response");
                return new ContentResult { Content = "Error processing Stripe event:" + ex.Message, StatusCode = (int)HttpStatusCode.BadRequest };
            }
        }


    }
}
