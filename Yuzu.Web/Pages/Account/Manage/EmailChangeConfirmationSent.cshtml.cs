using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages.Account.Manage
{
    /// <summary>
    /// Page model for the email change confirmation sent page.
    /// Displays a "check your email" message after user requests email change.
    /// </summary>
    public class EmailChangeConfirmationSentModel : PageModel
    {
        /// <summary>
        /// The new email address where the confirmation link was sent.
        /// </summary>
        public string NewEmail { get; set; } = string.Empty;

        /// <summary>
        /// Handles GET requests to display the confirmation sent page.
        /// </summary>
        /// <param name="email">The new email address (passed as query parameter)</param>
        public IActionResult OnGet(string? email)
        {
            if (string.IsNullOrEmpty(email))
            {
                // If no email provided, redirect back to email management page
                return RedirectToPage("/Account/Manage/Email");
            }

            NewEmail = email;
            return Page();
        }
    }
}
