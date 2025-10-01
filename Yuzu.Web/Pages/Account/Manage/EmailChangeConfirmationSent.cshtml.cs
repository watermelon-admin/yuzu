using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Yuzu.Web.Pages.Account.Manage
{
    /// <summary>
    /// Page model for the email change confirmation sent page.
    /// Displays a "check your email" message after user requests email change.
    /// Requires authentication to prevent information leakage.
    /// </summary>
    [Authorize]
    public class EmailChangeConfirmationSentModel : PageModel
    {
        /// <summary>
        /// The new email address where the confirmation link was sent.
        /// Stored in TempData to avoid exposing in URL.
        /// </summary>
        [TempData]
        public string? NewEmail { get; set; }

        /// <summary>
        /// Handles GET requests to display the confirmation sent page.
        /// Email is retrieved from TempData (not URL) to prevent information leakage.
        /// </summary>
        public IActionResult OnGet()
        {
            if (string.IsNullOrEmpty(NewEmail))
            {
                // If no email in TempData, redirect back to email management page
                return RedirectToPage("/Account/Manage/Email");
            }

            return Page();
        }
    }
}
