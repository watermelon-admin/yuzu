using System.ComponentModel.DataAnnotations;

namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Configuration settings for email functionality
    /// </summary>
    public class MailSettings
    {
        /// <summary>
        /// SMTP server hostname or IP address
        /// </summary>
        [Required]
        public string SmtpServer { get; set; } = string.Empty;

        /// <summary>
        /// Host name for confirmation emails
        /// </summary>
        public string ConfirmationHost { get; set; } = string.Empty;

        /// <summary>
        /// Sender name for standard emails
        /// </summary>
        [Required]
        public string SenderName { get; set; } = string.Empty;

        /// <summary>
        /// Sender email address for standard emails
        /// </summary>
        [Required]
        [EmailAddress]
        public string SenderEmail { get; set; } = string.Empty;

        /// <summary>
        /// SMTP password for standard emails
        /// </summary>
        public string SmtpPassword { get; set; } = string.Empty;

        /// <summary>
        /// SMTP username for standard emails
        /// </summary>
        public string SmtpUsername { get; set; } = string.Empty;

        /// <summary>
        /// Sender name for automated no-reply emails
        /// </summary>
        [Required]
        public string NoReplySenderName { get; set; } = string.Empty;

        /// <summary>
        /// Sender email address for automated no-reply emails
        /// </summary>
        [Required]
        [EmailAddress]
        public string NoReplySenderEmail { get; set; } = string.Empty;

        /// <summary>
        /// SMTP username for no-reply emails
        /// </summary>
        public string SmtpNoReplyUsername { get; set; } = string.Empty;

        /// <summary>
        /// SMTP password for no-reply emails
        /// </summary>
        public string SmtpNoReplyPassword { get; set; } = string.Empty;

        /// <summary>
        /// SMTP port number
        /// </summary>
        [Range(1, 65535)]
        public int SmtpPort { get; set; } = 25;
    }
}