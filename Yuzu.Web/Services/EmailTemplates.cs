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
        /// Provides plain text versions of email templates for text-only email clients.
        /// </summary>
        public static class PlainText
        {
            /// <summary>
            /// Plain text version of email change confirmation email.
            /// </summary>
            public static string EmailChangeConfirmation(string confirmationUrl)
            {
                return $@"breakscreen

CONFIRM YOUR EMAIL CHANGE

Hello,

You're receiving this email because a request was made to change your breakscreen account email address to this email.

To complete the email change, please click the link below or copy it into your browser:

{confirmationUrl}

WHAT HAPPENS NEXT:
• Click the link above to confirm this email address
• Your account email will be updated immediately
• You'll use this new email to log in
• Your username will also update to match this email

SECURITY INFORMATION:
• This confirmation link will expire in 24 hours
• If you didn't request this change, you can safely ignore this email
• Your current email address will remain active until you confirm

---
This is an automated message from breakscreen.
Please do not reply to this email.

© {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.";
            }

            /// <summary>
            /// Plain text version of email change security notification.
            /// </summary>
            public static string EmailChangeSecurityNotification(string maskedNewEmail)
            {
                return $@"breakscreen

EMAIL CHANGE REQUEST

Hello,

This is a security notification for your breakscreen account.

EMAIL CHANGE REQUESTED
A request was made to change your account email address to:
{maskedNewEmail}

IF YOU MADE THIS REQUEST:
• No action is needed from you
• The change will be completed once the new email is confirmed
• This email address (your current one) will remain active until then
• You can continue using it to log in

IF YOU DID NOT REQUEST THIS CHANGE:
• Your current email is still active - the change hasn't happened yet
• Change your password immediately - someone may have accessed your account
• Review your recent account activity
• Contact our support team if you need assistance

ACCOUNT SECURITY TIPS:
• Use a strong, unique password for your breakscreen account
• Never share your password with anyone
• Be cautious of phishing emails asking for your credentials
• Keep your account information up to date

---
This is an automated security notification from breakscreen.
Please do not reply to this email.

If you have questions, please contact our support team.

© {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.";
            }

            /// <summary>
            /// Plain text version of email verification email.
            /// </summary>
            public static string EmailVerification(string confirmationUrl)
            {
                return $@"breakscreen

VERIFY YOUR EMAIL ADDRESS

Hello,

Thank you for using breakscreen! To ensure you can receive important account notifications, please verify your email address.

To verify your email, click the link below or copy it into your browser:

{confirmationUrl}

WHY VERIFY YOUR EMAIL?
• Secure your account with email notifications
• Receive important updates about your subscription
• Enable password recovery if needed
• Get the most out of your breakscreen account

If you didn't create a breakscreen account, you can safely ignore this email.

---
This is an automated message from breakscreen.
Please do not reply to this email.

© {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.";
            }

            /// <summary>
            /// Plain text version of welcome and confirmation email.
            /// </summary>
            public static string WelcomeAndConfirmation(string confirmationUrl)
            {
                return $@"breakscreen

WELCOME TO BREAKSCREEN!

Hello,

Thank you for creating a breakscreen account! We're excited to help you take healthy breaks throughout your day.

To get started, please confirm your email address by clicking the link below or copying it into your browser:

{confirmationUrl}

WHAT'S NEXT?
• Confirm your email address (click the link above)
• Customize your break types and schedules
• Set up your time zone preferences
• Start taking healthier breaks today!

GETTING STARTED TIPS:
• Break Types: Choose from short breaks, long breaks, or custom schedules
• Backgrounds: Personalize your break screens with beautiful images
• Time Zones: Automatically adjust breaks for your location
• Countdown Timer: See exactly when your next break is coming

If you didn't create a breakscreen account, you can safely ignore this email.

---
This is an automated message from breakscreen.
Please do not reply to this email.

© {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.";
            }

            /// <summary>
            /// Plain text version of password reset request email.
            /// </summary>
            public static string PasswordResetRequest(string resetUrl)
            {
                return $@"breakscreen

PASSWORD RESET REQUEST

Hello,

We received a request to reset the password for your breakscreen account.

To reset your password, click the link below or copy it into your browser:

{resetUrl}

SECURITY INFORMATION:
• This password reset link will expire in 24 hours
• After resetting, you'll need to log in with your new password
• Your old password will no longer work

IF YOU DIDN'T REQUEST THIS:
• You can safely ignore this email - your password will not be changed
• Your account may be at risk - someone may be trying to access it
• Consider changing your password if you're concerned about security
• Contact support if you need assistance

---
This is an automated message from breakscreen.
Please do not reply to this email.

© {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.";
            }

            /// <summary>
            /// Plain text version of password changed notification email.
            /// </summary>
            public static string PasswordChangedNotification()
            {
                return $@"breakscreen

PASSWORD CHANGED SUCCESSFULLY

Hello,

This is a security notification to confirm that your breakscreen account password was changed on {DateTime.UtcNow:MMMM d, yyyy} at {DateTime.UtcNow:h:mm tt} UTC.

PASSWORD UPDATED
Your password has been successfully changed. You can now log in using your new password.

IF YOU DIDN'T MAKE THIS CHANGE:
• Someone else may have accessed your account
• Reset your password immediately using the ""Forgot Password"" link on the login page
• Review your account activity for any unauthorized changes
• Contact our support team for immediate assistance

ACCOUNT SECURITY TIPS:
• Use a strong, unique password for your breakscreen account
• Never share your password with anyone
• Be cautious of phishing emails asking for your credentials
• Change your password regularly for better security

---
This is an automated security notification from breakscreen.
Please do not reply to this email.

If you have questions, please contact our support team.

© {DateTime.UtcNow.Year} Watermelon Software. All rights reserved.";
            }
        }


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
    <link rel=""stylesheet"" href=""https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"">
    <style>
        body {{
            font-family: Arial, sans-serif;
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
            background-color: #f8f9fa;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e2e5f1;
        }}
        .header .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0;
        }}
        .header .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
            color: #6366f1;
        }}
        .header .logo-text-purple {{
            font-weight: 700;
            color: #6366f1;
        }}
        .header .logo-text-black {{
            font-weight: 700;
            color: #333;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background-color: #6366f1;
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
            <div class=""logo"">
                <i class=""bx bx-coffee-togo logo-icon""></i>
                <span><span class=""logo-text-purple"">break</span><span class=""logo-text-black"">screen</span></span>
            </div>
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
                <strong>What happens next:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>Click the button above to confirm this email address</li>
                    <li>Your account email will be updated immediately</li>
                    <li>You'll use this new email to log in</li>
                    <li>Your username will also update to match this email</li>
                </ul>
            </div>

            <div class=""security-note"">
                <strong>Security Information:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>This confirmation link will expire in 24 hours</li>
                    <li>If you didn't request this change, you can safely ignore this email</li>
                    <li>Your current email address will remain active until you confirm</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" style=""color: #6366f1; word-break: break-all;"">{HtmlEncoder.Default.Encode(confirmationUrl)}</a>
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
    <link rel=""stylesheet"" href=""https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"">
    <style>
        body {{
            font-family: Arial, sans-serif;
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
            background-color: #f8f9fa;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e2e5f1;
        }}
        .header .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0;
        }}
        .header .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
            color: #6366f1;
        }}
        .header .logo-text-purple {{
            font-weight: 700;
            color: #6366f1;
        }}
        .header .logo-text-black {{
            font-weight: 700;
            color: #333;
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
            <div class=""logo"">
                <i class=""bx bx-coffee-togo logo-icon""></i>
                <span><span class=""logo-text-purple"">break</span><span class=""logo-text-black"">screen</span></span>
            </div>
        </div>
        <div class=""content"">
            <h2>Email Change Request</h2>
            <p>Hello,</p>
            <p>This is a security notification for your breakscreen account.</p>

            <div class=""alert-box"">
                <strong>Email Change Requested</strong>
                <p style=""margin: 10px 0;"">A request was made to change your account email address to:</p>
                <div class=""new-email"">
                    {HtmlEncoder.Default.Encode(maskedNewEmail)}
                </div>
            </div>

            <div class=""info-box"">
                <strong>If you made this request:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>No action is needed from you</li>
                    <li>The change will be completed once the new email is confirmed</li>
                    <li>This email address (your current one) will remain active until then</li>
                    <li>You can continue using it to log in</li>
                </ul>
            </div>

            <div class=""danger-box"">
                <strong>If you did NOT request this change:</strong>
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
    <link rel=""stylesheet"" href=""https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"">
    <style>
        body {{
            font-family: Arial, sans-serif;
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
            background-color: #f8f9fa;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e2e5f1;
        }}
        .header .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0;
        }}
        .header .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
            color: #6366f1;
        }}
        .header .logo-text-purple {{
            font-weight: 700;
            color: #6366f1;
        }}
        .header .logo-text-black {{
            font-weight: 700;
            color: #333;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background-color: #6366f1;
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
            <div class=""logo"">
                <i class=""bx bx-coffee-togo logo-icon""></i>
                <span><span class=""logo-text-purple"">break</span><span class=""logo-text-black"">screen</span></span>
            </div>
        </div>
        <div class=""content"">
            <h2>Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for using breakscreen! To ensure you can receive important account notifications, please verify your email address.</p>

            <div style=""text-align: center;"">
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" class=""button"">Verify Email Address</a>
            </div>

            <div class=""info-box"">
                <strong>Why verify your email?</strong>
                <ul style=""margin: 10px 0;"">
                    <li>Secure your account with email notifications</li>
                    <li>Receive important updates about your subscription</li>
                    <li>Enable password recovery if needed</li>
                    <li>Get the most out of your breakscreen account</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" style=""color: #6366f1; word-break: break-all;"">{HtmlEncoder.Default.Encode(confirmationUrl)}</a>
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
    <link rel=""stylesheet"" href=""https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"">
    <style>
        body {{
            font-family: Arial, sans-serif;
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
            background-color: #f8f9fa;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e2e5f1;
        }}
        .header .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0;
        }}
        .header .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
            color: #6366f1;
        }}
        .header .logo-text-purple {{
            font-weight: 700;
            color: #6366f1;
        }}
        .header .logo-text-black {{
            font-weight: 700;
            color: #333;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background-color: #6366f1;
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
            <div class=""logo"">
                <i class=""bx bx-coffee-togo logo-icon""></i>
                <span><span class=""logo-text-purple"">break</span><span class=""logo-text-black"">screen</span></span>
            </div>
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
                <strong>What's next?</strong>
                <ul style=""margin: 10px 0;"">
                    <li>Confirm your email address (click the button above)</li>
                    <li>Customize your break types and schedules</li>
                    <li>Set up your time zone preferences</li>
                    <li>Start taking healthier breaks today!</li>
                </ul>
            </div>

            <div class=""info-box"">
                <strong>Getting Started Tips:</strong>
                <ul style=""margin: 10px 0;"">
                    <li><strong>Break Types:</strong> Choose from short breaks, long breaks, or custom schedules</li>
                    <li><strong>Backgrounds:</strong> Personalize your break screens with beautiful images</li>
                    <li><strong>Time Zones:</strong> Automatically adjust breaks for your location</li>
                    <li><strong>Countdown Timer:</strong> See exactly when your next break is coming</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(confirmationUrl)}"" style=""color: #6366f1; word-break: break-all;"">{HtmlEncoder.Default.Encode(confirmationUrl)}</a>
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
    <link rel=""stylesheet"" href=""https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"">
    <style>
        body {{
            font-family: Arial, sans-serif;
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
            background-color: #f8f9fa;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e2e5f1;
        }}
        .header .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0;
        }}
        .header .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
            color: #6366f1;
        }}
        .header .logo-text-purple {{
            font-weight: 700;
            color: #6366f1;
        }}
        .header .logo-text-black {{
            font-weight: 700;
            color: #333;
        }}
        .content {{
            padding: 30px;
        }}
        .button {{
            display: inline-block;
            background-color: #6366f1;
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
            <div class=""logo"">
                <i class=""bx bx-coffee-togo logo-icon""></i>
                <span><span class=""logo-text-purple"">break</span><span class=""logo-text-black"">screen</span></span>
            </div>
        </div>
        <div class=""content"">
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your breakscreen account.</p>

            <p>To reset your password, click the button below:</p>

            <div style=""text-align: center;"">
                <a href=""{HtmlEncoder.Default.Encode(resetUrl)}"" class=""button"">Reset Password</a>
            </div>

            <div class=""security-note"">
                <strong>Security Information:</strong>
                <ul style=""margin: 10px 0;"">
                    <li>This password reset link will expire in 24 hours</li>
                    <li>After resetting, you'll need to log in with your new password</li>
                    <li>Your old password will no longer work</li>
                </ul>
            </div>

            <div class=""danger-box"">
                <strong>If you didn't request this:</strong>
                <ul style=""margin: 10px 0;"">
                    <li><strong>You can safely ignore this email</strong> - your password will not be changed</li>
                    <li><strong>Your account may be at risk</strong> - someone may be trying to access it</li>
                    <li><strong>Consider changing your password</strong> if you're concerned about security</li>
                    <li><strong>Contact support</strong> if you need assistance</li>
                </ul>
            </div>

            <p style=""color: #6c757d; font-size: 14px; margin-top: 30px;"">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href=""{HtmlEncoder.Default.Encode(resetUrl)}"" style=""color: #6366f1; word-break: break-all;"">{HtmlEncoder.Default.Encode(resetUrl)}</a>
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
    <link rel=""stylesheet"" href=""https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"">
    <style>
        body {{
            font-family: Arial, sans-serif;
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
            background-color: #f8f9fa;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e2e5f1;
        }}
        .header .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0;
        }}
        .header .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
            color: #6366f1;
        }}
        .header .logo-text-purple {{
            font-weight: 700;
            color: #6366f1;
        }}
        .header .logo-text-black {{
            font-weight: 700;
            color: #333;
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
            <div class=""logo"">
                <i class=""bx bx-coffee-togo logo-icon""></i>
                <span><span class=""logo-text-purple"">break</span><span class=""logo-text-black"">screen</span></span>
            </div>
        </div>
        <div class=""content"">
            <h2>Password Changed Successfully</h2>
            <p>Hello,</p>
            <p>This is a security notification to confirm that your breakscreen account password was changed on {DateTime.UtcNow:MMMM d, yyyy} at {DateTime.UtcNow:h:mm tt} UTC.</p>

            <div class=""success-box"">
                <strong>Password Updated</strong>
                <p style=""margin: 10px 0;"">Your password has been successfully changed. You can now log in using your new password.</p>
            </div>

            <div class=""danger-box"">
                <strong>If you didn't make this change:</strong>
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
