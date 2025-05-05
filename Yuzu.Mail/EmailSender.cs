using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Logging;

namespace Yuzu.Mail
{
    /// <summary>
    /// Provides methods to send emails using SMTP.
    /// </summary>
    public class EmailSender : IEmailSender
    {
        private readonly string _smtpServer;
        private readonly string _senderName;
        private readonly string _senderEmail;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _noReplySenderName;
        private readonly string _noReplySenderEmail;
        private readonly string _smtpNoReplyUsername;
        private readonly string _smtpNoReplyPassword;
        private readonly int _smtpPort;
        private readonly ILogger<EmailSender> _logger;

        /// <summary>
        /// Gets the SMTP username for regular emails.
        /// </summary>
        public string MailUsername => _smtpUsername;

        /// <summary>
        /// Gets the SMTP password for regular emails.
        /// </summary>
        public string MailPassword => _smtpPassword;

        /// <summary>
        /// Gets the SMTP username for no-reply emails.
        /// </summary>
        public string NoReplyMailUsername => _smtpNoReplyUsername;

        /// <summary>
        /// Gets the SMTP password for no-reply emails.
        /// </summary>
        public string NoReplyMailPassword => _smtpNoReplyPassword;

        /// <summary>
        /// Initializes a new instance of the <see cref="EmailSender"/> class.
        /// </summary>
        /// <param name="smtpServer">The SMTP server address.</param>
        /// <param name="senderName">The display name of the sender.</param>
        /// <param name="senderEmail">The email address of the sender.</param>
        /// <param name="smtpUsername">The SMTP username for authentication.</param>
        /// <param name="smtpPassword">The SMTP password for authentication.</param>
        /// <param name="noReplySenderName">The display name for no-reply emails.</param>
        /// <param name="noReplySenderEmail">The email address for no-reply emails.</param>
        /// <param name="smtpNoReplyUsername">The SMTP username for no-reply emails.</param>
        /// <param name="smtpNoReplyPassword">The SMTP password for no-reply emails.</param>
        /// <param name="smtpPort">The SMTP server port.</param>
        /// <param name="logger">The logger instance.</param>
        public EmailSender(
            string smtpServer,
            string senderName,
            string senderEmail,
            string smtpUsername,
            string smtpPassword,
            string noReplySenderName,
            string noReplySenderEmail,
            string smtpNoReplyUsername,
            string smtpNoReplyPassword,
            int smtpPort,
            ILogger<EmailSender> logger)
        {
            _smtpServer = smtpServer;
            _senderName = senderName;
            _senderEmail = senderEmail;
            _smtpUsername = smtpUsername;
            _smtpPassword = smtpPassword;
            _noReplySenderName = noReplySenderName;
            _noReplySenderEmail = noReplySenderEmail;
            _smtpNoReplyUsername = smtpNoReplyUsername;
            _smtpNoReplyPassword = smtpNoReplyPassword;
            _smtpPort = smtpPort;
            _logger = logger;
        }

        /// <summary>
        /// Sends an email asynchronously.
        /// </summary>
        /// <param name="toEmail">The recipient's email address.</param>
        /// <param name="mailSubject">The subject of the email.</param>
        /// <param name="mailMessage">The body of the email.</param>
        public async Task SendEmailAsync(string toEmail, string mailSubject, string mailMessage)
        {
            _logger.LogInformation("Sending email to {ToEmail} with subject {Subject}", toEmail, mailSubject);
            await Execute(
                _smtpServer,
                _smtpUsername,
                _smtpPassword,
                _smtpPort,
                _senderName,
                _senderEmail,
                string.Empty,
                toEmail,
                mailSubject,
                mailMessage);
        }

        /// <summary>
        /// Sends an email asynchronously with custom sender and recipient details.
        /// </summary>
        /// <param name="fromName">The sender's display name.</param>
        /// <param name="fromEmail">The sender's email address.</param>
        /// <param name="toName">The recipient's display name.</param>
        /// <param name="toEmail">The recipient's email address.</param>
        /// <param name="mailSubject">The subject of the email.</param>
        /// <param name="mailMessage">The body of the email.</param>
        public async Task SendEmailAsync(
            string fromName,
            string fromEmail,
            string toName,
            string toEmail,
            string mailSubject,
            string mailMessage)
        {
            _logger.LogInformation("Sending email from {FromEmail} to {ToEmail} with subject {Subject}", fromEmail, toEmail, mailSubject);
            await Execute(
                _smtpServer,
                _smtpUsername,
                _smtpPassword,
                _smtpPort,
                fromName,
                fromEmail,
                toName,
                toEmail,
                mailSubject,
                mailMessage);
        }

        /// <summary>
        /// Sends a no-reply email asynchronously.
        /// </summary>
        /// <param name="toName">The recipient's display name.</param>
        /// <param name="toEmail">The recipient's email address.</param>
        /// <param name="mailSubject">The subject of the email.</param>
        /// <param name="mailMessage">The body of the email.</param>
        public async Task SendNoReplyEmailAsync(
            string toName,
            string toEmail,
            string mailSubject,
            string mailMessage)
        {
            _logger.LogInformation("Sending no-reply email to {ToEmail} with subject {Subject}", toEmail, mailSubject);
            await Execute(
                _smtpServer,
                _smtpNoReplyUsername,
                _smtpNoReplyPassword,
                _smtpPort,
                _noReplySenderName,
                _noReplySenderEmail,
                toName,
                toEmail,
                mailSubject,
                mailMessage);
        }

        /// <summary>
        /// Executes the email sending process using the provided SMTP details.
        /// </summary>
        /// <param name="smtpServer">The SMTP server address.</param>
        /// <param name="smtpUsername">The SMTP username for authentication.</param>
        /// <param name="smtpPassword">The SMTP password for authentication.</param>
        /// <param name="smtpPort">The SMTP server port. If the port is not 25, SSL will be used.</param>
        /// <param name="fromName">The sender's display name.</param>
        /// <param name="fromEmail">The sender's email address.</param>
        /// <param name="toName">The recipient's display name.</param>
        /// <param name="toEmail">The recipient's email address.</param>
        /// <param name="subject">The subject of the email.</param>
        /// <param name="message">The body of the email.</param>
        private async Task Execute(
            string smtpServer,
            string smtpUsername,
            string smtpPassword,
            int smtpPort,
            string fromName,
            string fromEmail,
            string toName,
            string toEmail,
            string subject,
            string message)
        {
            var mimeMessage = new MimeMessage
            {
                Subject = subject,
                Body = new TextPart("html") { Text = message }
            };

            mimeMessage.From.Add(new MailboxAddress(fromName, fromEmail));
            mimeMessage.To.Add(new MailboxAddress(toName, toEmail));

            using var mailClient = new SmtpClient();

            bool useSSL = (smtpPort != 25); // Allow for unencrypted port in development

            try
            {
                _logger.LogInformation("Connecting to SMTP server {SmtpServer} on port {SmtpPort}", smtpServer, smtpPort);
                await mailClient.ConnectAsync(smtpServer, smtpPort, useSSL);
                _logger.LogInformation("Connected to SMTP server {SmtpServer}", smtpServer);

                _logger.LogInformation("Authenticating with SMTP server {SmtpServer} using username {SmtpUsername}", smtpServer, smtpUsername);
                await mailClient.AuthenticateAsync(smtpUsername, smtpPassword);
                _logger.LogInformation("Authenticated with SMTP server {SmtpServer}", smtpServer);

                _logger.LogInformation("Sending email to {ToEmail} with subject {Subject}", toEmail, subject);
                await mailClient.SendAsync(mimeMessage);
                _logger.LogInformation("Email sent to {ToEmail} with subject {Subject}", toEmail, subject);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {ToEmail} with subject {Subject}", toEmail, subject);
                throw;
            }
            finally
            {
                _logger.LogInformation("Disconnecting from SMTP server {SmtpServer}", smtpServer);
                await mailClient.DisconnectAsync(true);
                _logger.LogInformation("Disconnected from SMTP server {SmtpServer}", smtpServer);
            }
        }
    }
}

