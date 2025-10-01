using System.Text.Encodings.Web;

namespace Yuzu.Web.Services
{
    /// <summary>
    /// Provides HTML email templates for various email scenarios.
    /// All templates use a consistent design with responsive layout.
    /// </summary>
    public static class EmailTemplates
    {
        /// <summary>
        /// Email sent to the NEW email address to confirm the email change.
        /// </summary>
        public static string EmailChangeConfirmation(string confirmationUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Confirm Your Email Change</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }}
        .button:hover {{
            opacity: 0.9;
        }}
        .info-box {{
            background-color: #e8f4fd;
            border-left: 4px solid #1d72aa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }}
        .security-note {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎯 breakscreen</h1>
        </div>
        <div class=""content"">
            <h2>Confirm Your Email Change</h2>
            <p>Hello,</p>
            <p>You're receiving this email because a request was made to change your breakscreen account email address to this email.</p>

            <p>To complete the email change, please click the button below:</p>

            <div style=""text-align: center;"">
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" class=""button"">Confirm Email Change</a>
            </div>

            <div class=""info-box"">
                <strong>📋 What happens next:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>Click the button above to confirm this email address</li>
                    <li>Your account email will be updated immediately</li>
                    <li>You'll use this new email to log in</li>
                    <li>Your username will also update to match this email</li>
                </ul>
            </div>

            <div class=""security-note"">
                <strong>🔒 Security Information:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>This confirmation link will expire in 24 hours</li>
                    <li>If you didn't request this change, you can safely ignore this email</li>
                    <li>Your current email address will remain active until you confirm</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" style=""color: #667eea; word-break: break-all;"">{HtmlEncoder.Default.Encode(confirmationUrl)}</a>
            </p>
        </div>
        <div class=""footer"">
            <p>This is an automated message from breakscreen.<br>
            Please do not reply to this email.</p>
            <p>&copy; {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// Email sent to the OLD email address as a security notification.
        /// </summary>
        public static string EmailChangeSecurityNotification(string maskedNewEmail)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Email Change Request</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px;
        }}
        .alert-box {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .info-box {{
            background-color: #e8f4fd;
            border-left: 4px solid #1d72aa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .danger-box {{
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }}
        .new-email {{
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 16px;
            text-align: center;
            margin: 10px 0;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎯 breakscreen</h1>
        </div>
        <div class=""content"">
            <h2>🔔 Email Change Request</h2>
            <p>Hello,</p>
            <p>This is a security notification for your breakscreen account.</p>

            <div class=""alert-box"">
                <strong>📧 Email Change Requested</strong>
                <p style=""margin: 10px 0;"">A request was made to change your account email address to:</p>
                <div class=""new-email"">
                    {HtmlEncoder.Default.Encode(maskedNewEmail)}
                </div>
            </div>

            <div class=""info-box"">
                <strong>✅ If you made this request:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>No action is needed from you</li>
                    <li>The change will be completed once the new email is confirmed</li>
                    <li>This email address (your current one) will remain active until then</li>
                    <li>You can continue using it to log in</li>
                </ul>
            </div>

            <div class=""danger-box"">
                <strong>⚠️ If you did NOT request this change:</strong>
                <ul style=""margin: 10px 0;"">
                    <li><strong>Your current email is still active</strong> - the change hasn't happened yet</li>
                    <li><strong>Change your password immediately</strong> - someone may have accessed your account</li>
                    <li><strong>Review your recent account activity</strong></li>
                    <li><strong>Contact our support team</strong> if you need assistance</li>
                </ul>
            </div>

            <p style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;"">
                <strong>Account Security Tips:</strong>
            </p>
            <ul style=""color: #6c757d; font-size: 14px;"">
                <li>Use a strong, unique password for your breakscreen account</li>
                <li>Never share your password with anyone</li>
                <li>Be cautious of phishing emails asking for your credentials</li>
                <li>Keep your account information up to date</li>
            </ul>
        </div>
        <div class=""footer"">
            <p>This is an automated security notification from breakscreen.<br>
            Please do not reply to this email.</p>
            <p>If you have questions, please contact our support team.</p>
            <p>&copy; {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// Email sent to verify an existing (unconfirmed) email address.
        /// </summary>
        public static string EmailVerification(string confirmationUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Verify Your Email</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }}
        .button:hover {{
            opacity: 0.9;
        }}
        .info-box {{
            background-color: #e8f4fd;
            border-left: 4px solid #1d72aa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎯 breakscreen</h1>
        </div>
        <div class=""content"">
            <h2>Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for using breakscreen! To ensure you can receive important account notifications, please verify your email address.</p>

            <div style=""text-align: center;"">
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" class=""button"">Verify Email Address</a>
            </div>

            <div class=""info-box"">
                <strong>✓ Why verify your email?</strong>
                <ul style=""margin: 10px 0;"">
                    <li>Secure your account with email notifications</li>
                    <li>Receive important updates about your subscription</li>
                    <li>Enable password recovery if needed</li>
                    <li>Get the most out of your breakscreen account</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" style=""color: #667eea; word-break: break-all;"">{HtmlEncoder.Default.Encode(confirmationUrl)}</a>
            </p>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 20px;"">
                If you didn't create a breakscreen account, you can safely ignore this email.
            </p>
        </div>
        <div class=""footer"">
            <p>This is an automated message from breakscreen.<br>
            Please do not reply to this email.</p>
            <p>&copy; {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// Welcome email sent when a new user registers an account.
        /// Includes email confirmation link.
        /// </summary>
        public static string WelcomeAndConfirmation(string confirmationUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Welcome to breakscreen</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }}
        .button:hover {{
            opacity: 0.9;
        }}
        .info-box {{
            background-color: #e8f4fd;
            border-left: 4px solid #1d72aa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .success-box {{
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎯 breakscreen</h1>
        </div>
        <div class=""content"">
            <h2>Welcome to breakscreen!</h2>
            <p>Hello,</p>
            <p>Thank you for creating a breakscreen account! We're excited to help you take healthy breaks throughout your day.</p>

            <p>To get started, please confirm your email address by clicking the button below:</p>

            <div style=""text-align: center;"">
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" class=""button"">Confirm Email Address</a>
            </div>

            <div class=""success-box"">
                <strong>🎉 What's next?</strong>
                <ul style=""margin: 10px 0;"">
                    <li>Confirm your email address (click the button above)</li>
                    <li>Customize your break types and schedules</li>
                    <li>Set up your time zone preferences</li>
                    <li>Start taking healthier breaks today!</li>
                </ul>
            </div>

            <div class=""info-box"">
                <strong>💡 Getting Started Tips:</strong>
                <ul style=""margin: 10px 0;"">
                    <li><strong>Break Types:</strong> Choose from short breaks, long breaks, or custom schedules</li>
                    <li><strong>Backgrounds:</strong> Personalize your break screens with beautiful images</li>
                    <li><strong>Time Zones:</strong> Automatically adjust breaks for your location</li>
                    <li><strong>Countdown Timer:</strong> See exactly when your next break is coming</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" style=""color: #667eea; word-break: break-all;"">{HtmlEncoder.Default.Encode(confirmationUrl)}</a>
            </p>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 20px;"">
                If you didn't create a breakscreen account, you can safely ignore this email.
            </p>
        </div>
        <div class=""footer"">
            <p>This is an automated message from breakscreen.<br>
            Please do not reply to this email.</p>
            <p>&copy; {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// Email sent when user requests a password reset.
        /// </summary>
        public static string PasswordResetRequest(string resetUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Reset Your Password</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }}
        .button:hover {{
            opacity: 0.9;
        }}
        .security-note {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .danger-box {{
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎯 breakscreen</h1>
        </div>
        <div class=""content"">
            <h2>🔑 Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your breakscreen account.</p>

            <p>To reset your password, click the button below:</p>

            <div style=""text-align: center;"">
                <a href=""{HtmlEncoder.Default.Encode(resetUrl)}"" class=""button"">Reset Password</a>
            </div>

            <div class=""security-note"">
                <strong>🔒 Security Information:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>This password reset link will expire in 24 hours</li>
                    <li>After resetting, you'll need to log in with your new password</li>
                    <li>Your old password will no longer work</li>
                </ul>
            </div>

            <div class=""danger-box"">
                <strong>⚠️ If you didn't request this:</strong>
                <ul style=""margin: 10px 0;"">
                    <li><strong>You can safely ignore this email</strong> - your password will not be changed</li>
                    <li><strong>Your account may be at risk</strong> - someone may be trying to access it</li>
                    <li><strong>Consider changing your password</strong> if you're concerned about security</li>
                    <li><strong>Contact support</strong> if you need assistance</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(resetUrl)}"" style=""color: #667eea; word-break: break-all;"">{HtmlEncoder.Default.Encode(resetUrl)}</a>
            </p>
        </div>
        <div class=""footer"">
            <p>This is an automated message from breakscreen.<br>
            Please do not reply to this email.</p>
            <p>&copy; {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// Security notification sent when a password is successfully changed.
        /// </summary>
        public static string PasswordChangedNotification()
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Password Changed</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px;
        }}
        .success-box {{
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .danger-box {{
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎯 breakscreen</h1>
        </div>
        <div class=""content"">
            <h2>🔐 Password Changed Successfully</h2>
            <p>Hello,</p>
            <p>This is a security notification to confirm that your breakscreen account password was changed on {DateTime.UtcNow:MMMM d, yyyy} at {DateTime.UtcNow:h:mm tt} UTC.</p>

            <div class=""success-box"">
                <strong>✅ Password Updated</strong>
                <p style=""margin: 10px 0;"">Your password has been successfully changed. You can now log in using your new password.</p>
            </div>

            <div class=""danger-box"">
                <strong>⚠️ If you didn't make this change:</strong>
                <ul style=""margin: 10px 0;"">
                    <li><strong>Someone else may have accessed your account</strong></li>
                    <li><strong>Reset your password immediately</strong> using the ""Forgot Password"" link on the login page</li>
                    <li><strong>Review your account activity</strong> for any unauthorized changes</li>
                    <li><strong>Contact our support team</strong> for immediate assistance</li>
                </ul>
            </div>

            <p style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;"">
                <strong>Account Security Tips:</strong>
            </p>
            <ul style=""color: #6c757d; font-size: 14px;"">
                <li>Use a strong, unique password for your breakscreen account</li>
                <li>Never share your password with anyone</li>
                <li>Be cautious of phishing emails asking for your credentials</li>
                <li>Change your password regularly for better security</li>
            </ul>
        </div>
        <div class=""footer"">
            <p>This is an automated security notification from breakscreen.<br>
            Please do not reply to this email.</p>
            <p>If you have questions, please contact our support team.</p>
            <p>&copy; {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }
    }
}
