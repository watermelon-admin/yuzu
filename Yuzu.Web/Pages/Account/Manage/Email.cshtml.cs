// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;

namespace Yuzu.Web.Pages.Account.Manage
{
    public class EmailModel(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        Yuzu.Mail.IEmailSender emailSender,
        Yuzu.Web.Services.EmailChangeRateLimiter rateLimiter) : PageModel
    {
        private readonly UserManager<ApplicationUser> _userManager = userManager;
        private readonly SignInManager<ApplicationUser> _signInManager = signInManager;
        private readonly Yuzu.Mail.IEmailSender _emailSender = emailSender;
        private readonly Yuzu.Web.Services.EmailChangeRateLimiter _rateLimiter = rateLimiter;

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        public bool IsEmailConfirmed { get; set; }

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        [BindProperty]
        public InputModel Input { get; set; } = new();

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        public class InputModel
        {
            /// <summary>
            ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
            ///     directly from your code. This API may change or be removed in future releases.
            /// </summary>
            [Required]
            [RegularExpression(@"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,63}$",ErrorMessage = "Please enter a valid email address.")]
            [Display(Name = "New email")]
            public string NewEmail { get; set; } = string.Empty;

            /// <summary>
            /// Current password required for security verification before email change.
            /// </summary>
            [Required]
            [DataType(DataType.Password)]
            [Display(Name = "Current password")]
            public string CurrentPassword { get; set; } = string.Empty;
        }

        private async Task LoadAsync(ApplicationUser user)
        {
            var email = await _userManager.GetEmailAsync(user);
            Email = email ?? string.Empty;

            Input = new InputModel
            {
                NewEmail = email ?? string.Empty,
            };

            IsEmailConfirmed = await _userManager.IsEmailConfirmedAsync(user);
        }

        /// <summary>
        /// Masks an email address for security notifications.
        /// Example: john.doe@example.com -> j***e@example.com
        /// </summary>
        private static string MaskEmail(string email)
        {
            if (string.IsNullOrEmpty(email))
                return email;

            var parts = email.Split('@');
            if (parts.Length != 2)
                return email;

            var localPart = parts[0];
            var domain = parts[1];

            if (localPart.Length <= 2)
                return $"{localPart[0]}***@{domain}";

            return $"{localPart[0]}***{localPart[^1]}@{domain}";
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            await LoadAsync(user);
            return Page();
        }

        public async Task<IActionResult> OnPostChangeEmailAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            if (!ModelState.IsValid)
            {
                await LoadAsync(user);
                return Page();
            }

            // Check rate limit to prevent abuse
            var userId = await _userManager.GetUserIdAsync(user);
            if (!_rateLimiter.IsAllowed(userId))
            {
                var retryAfter = _rateLimiter.GetRetryAfter(userId);
                var minutes = (int)Math.Ceiling(retryAfter.TotalMinutes);
                ModelState.AddModelError(string.Empty,
                    $"Too many email change requests. Please try again in {minutes} minute{(minutes != 1 ? "s" : "")}.");
                await LoadAsync(user);
                return Page();
            }

            // Verify current password before allowing email change
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, Input.CurrentPassword);
            if (!isPasswordValid)
            {
                ModelState.AddModelError(string.Empty, "Incorrect password. Please enter your current password to change your email.");
                await LoadAsync(user);
                return Page();
            }

            var email = await _userManager.GetEmailAsync(user);
            if (Input.NewEmail != email)
            {
                var userId = await _userManager.GetUserIdAsync(user);
                var code = await _userManager.GenerateChangeEmailTokenAsync(user, Input.NewEmail);
                code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                var callbackUrl = Url.Page(
                    "/Account/ConfirmEmailChange",
                    pageHandler: null,
                    values: new { userId = userId, email = Input.NewEmail, code = code },
                    protocol: Request.Scheme) ?? string.Empty;

                // Send confirmation email to NEW address
                await _emailSender.SendEmailAsync(
                    Input.NewEmail,
                    "Confirm your email change",
                    $"Please confirm your email change by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");

                // Send security notification to OLD address
                var maskedNewEmail = MaskEmail(Input.NewEmail);
                await _emailSender.SendEmailAsync(
                    email!,
                    "Email change request",
                    $@"<p>Hello,</p>
                    <p>A request was made to change the email address for your account to <strong>{HtmlEncoder.Default.Encode(maskedNewEmail)}</strong>.</p>
                    <p>If you made this request, no action is needed. The change will be completed once the new email address is confirmed.</p>
                    <p><strong>If you did NOT request this change:</strong></p>
                    <ul>
                        <li>Your current email address is still active and has not been changed</li>
                        <li>Change your password immediately</li>
                        <li>Contact our support team</li>
                    </ul>
                    <p>This is an automated security notification.</p>");

                // Store new email in TempData to avoid exposing in URL (security best practice)
                TempData["NewEmail"] = Input.NewEmail;

                // Redirect to dedicated "check your email" page
                return RedirectToPage("/Account/Manage/EmailChangeConfirmationSent");
            }

            StatusMessage = "Your email is unchanged.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostSendVerificationEmailAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            if (!ModelState.IsValid)
            {
                await LoadAsync(user);
                return Page();
            }

            var userId = await _userManager.GetUserIdAsync(user);
            var email = await _userManager.GetEmailAsync(user);
            var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
            var callbackUrl = Url.Page(
                "/Account/ConfirmEmail",
                pageHandler: null,
                values: new { userId, code },
                protocol: Request.Scheme) ?? string.Empty;
            await _emailSender.SendEmailAsync(
                email ?? string.Empty,
                "Confirm your email",
                $"Please confirm your account by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");

            StatusMessage = "Verification email sent. Please check your email.";
            return RedirectToPage();
        }
    }
}