using System.ComponentModel.DataAnnotations;

namespace Yuzu.Configuration.S3
{
    /// <summary>
    /// Configuration settings for S3 storage
    /// </summary>
    public class S3Settings : IValidatableObject
    {
        /// <summary>
        /// S3 service provider type
        /// </summary>
        public enum ProviderType
        {
            /// <summary>
            /// Scaleway Object Storage
            /// </summary>
            Scaleway,
            
            /// <summary>
            /// Cloudflare R2 Storage
            /// </summary>
            CloudflareR2
        }

        /// <summary>
        /// The storage provider to use
        /// </summary>
        [Required]
        public ProviderType Provider { get; set; } = ProviderType.Scaleway;

        /// <summary>
        /// Service URL for the S3 service
        /// </summary>
        [Required]
        [Url]
        public string ServiceUrl { get; set; } = string.Empty;

        /// <summary>
        /// Cloudflare account ID (required for R2)
        /// </summary>
        public string? AccountId { get; set; }

        /// <summary>
        /// S3 bucket name
        /// </summary>
        [Required]
        public string BucketName { get; set; } = string.Empty;

        /// <summary>
        /// Container name for background images
        /// </summary>
        [Required]
        public string BackgroundsContainer { get; set; } = string.Empty;

        /// <summary>
        /// Custom domain for direct access to bucket (optional)
        /// </summary>
        public string? CustomDomain { get; set; }

        /// <summary>
        /// Public URL for accessing files (e.g., https://pub-xxx.r2.dev or custom domain)
        /// Used for displaying images to end users
        /// </summary>
        public string? PublicUrl { get; set; }

        /// <summary>
        /// S3 access key
        /// </summary>
        [Required]
        public string AccessKey { get; set; } = string.Empty;

        /// <summary>
        /// S3 secret key
        /// </summary>
        [Required]
        public string SecretKey { get; set; } = string.Empty;

        /// <summary>
        /// Force path style for S3 URLs (default is virtual-hosted style)
        /// </summary>
        public bool ForcePathStyle { get; set; } = false;

        /// <summary>
        /// Disable payload signing (required for some providers like R2)
        /// </summary>
        public bool DisablePayloadSigning { get; set; } = false;

        /// <summary>
        /// Custom validation logic for S3 settings
        /// </summary>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // Ensure ServiceUrl doesn't end with trailing slash
            if (ServiceUrl.EndsWith("/"))
            {
                yield return new ValidationResult(
                    "ServiceUrl should not end with a trailing slash",
                    new[] { nameof(ServiceUrl) });
            }

            // Ensure bucket name is valid (lowercase, no underscores, etc.)
            if (!IsValidBucketName(BucketName))
            {
                yield return new ValidationResult(
                    "BucketName must be between 3 and 63 characters, contain only lowercase letters, numbers, dots, and hyphens, and can't start or end with a dot or hyphen",
                    new[] { nameof(BucketName) });
            }

            // For Cloudflare R2, require AccountId
            if (Provider == ProviderType.CloudflareR2 && string.IsNullOrEmpty(AccountId))
            {
                yield return new ValidationResult(
                    "AccountId is required for Cloudflare R2 storage",
                    new[] { nameof(AccountId) });
            }
        }

        /// <summary>
        /// Validates an S3 bucket name according to AWS naming rules
        /// </summary>
        private bool IsValidBucketName(string bucketName)
        {
            // S3 bucket naming rules:
            // - 3-63 characters long
            // - Can contain lowercase letters, numbers, dots, and hyphens
            // - Can't start or end with a dot or hyphen
            // - Can't have consecutive dots
            // - Can't be formatted as an IP address

            if (string.IsNullOrEmpty(bucketName) || bucketName.Length < 3 || bucketName.Length > 63)
                return false;

            // Check for valid characters (lowercase letters, numbers, dots, hyphens)
            if (!System.Text.RegularExpressions.Regex.IsMatch(bucketName, "^[a-z0-9.-]+$"))
                return false;

            // Can't start or end with a dot or hyphen
            if (bucketName.StartsWith(".") || bucketName.StartsWith("-") ||
                bucketName.EndsWith(".") || bucketName.EndsWith("-"))
                return false;

            // Can't have consecutive dots
            if (bucketName.Contains(".."))
                return false;

            // Can't be formatted as an IP address
            if (System.Text.RegularExpressions.Regex.IsMatch(bucketName, @"^[\d.]+$"))
                return false;

            return true;
        }
    }
}