using Microsoft.AspNetCore.Identity;
using Yuzu.Web.Data;

namespace Yuzu.Web
{
    /// <summary>
    /// Wrapper to adapt the Yuzu.Mail.IEmailSender to work with ASP.NET Core Identity IEmailSender<TUser>
    /// </summary>
    public class IdentityEmailSenderWrapper : IEmailSender<ApplicationUser>
    {
        private readonly Yuzu.Mail.IEmailSender _emailSender;

        public IdentityEmailSenderWrapper(Yuzu.Mail.IEmailSender emailSender)
        {
            _emailSender = emailSender;
        }

        public Task SendConfirmationLinkAsync(ApplicationUser user, string email, string confirmationLink)
        {
            var subject = "Confirm your email - Yuzu Break Timer";
            var message = $@"
                <h2>Welcome to Yuzu Break Timer!</h2>
                <p>Hi {user.UserName},</p>
                <p>Please confirm your account by <a href='{confirmationLink}'>clicking here</a>.</p>
                <p>Best regards,<br>The Yuzu Team</p>";

            return _emailSender.SendEmailAsync(email, subject, message);
        }

        public Task SendPasswordResetLinkAsync(ApplicationUser user, string email, string resetLink)
        {
            var subject = "Reset your password - Yuzu Break Timer";
            var message = $@"
                <h2>Reset Your Password</h2>
                <p>Hi {user.UserName},</p>
                <p>Please reset your password by <a href='{resetLink}'>clicking here</a>.</p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <p>Best regards,<br>The Yuzu Team</p>";

            return _emailSender.SendEmailAsync(email, subject, message);
        }

        public Task SendPasswordResetCodeAsync(ApplicationUser user, string email, string resetCode)
        {
            var subject = "Your password reset code - Yuzu Break Timer";
            var message = $@"
                <h2>Password Reset Code</h2>
                <p>Hi {user.UserName},</p>
                <p>Your password reset code is: <strong>{resetCode}</strong></p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <p>Best regards,<br>The Yuzu Team</p>";

            return _emailSender.SendEmailAsync(email, subject, message);
        }
    }
}