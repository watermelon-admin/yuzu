namespace Yuzu.Web
{
    /// <summary>
    /// Centralized constants for PRO (subscription-required) features.
    /// Used to maintain consistency across UI indicators and backend enforcement.
    /// </summary>
    public static class ProFeatures
    {
        /// <summary>
        /// Standard HTML class for PRO feature badge icons.
        /// Uses Font Awesome's rectangle-pro icon.
        /// </summary>
        public const string BadgeIconClass = "fa-solid fa-rectangle-pro fs-sm text-warning";

        /// <summary>
        /// Feature: Create custom break types beyond the system defaults.
        /// </summary>
        public const string CreateCustomBreakTypes = "Create Custom Break Types";

        /// <summary>
        /// Feature: Upload custom background images (up to 500MB storage).
        /// </summary>
        public const string UploadCustomBackgrounds = "Upload Custom Backgrounds";

        /// <summary>
        /// Feature: Access to the advanced graphical break screen designer.
        /// </summary>
        public const string AdvancedDesigner = "Advanced Break Screen Designer";

        /// <summary>
        /// Feature: Delete user-created custom break types.
        /// </summary>
        public const string DeleteCustomBreakTypes = "Delete Custom Break Types";

        /// <summary>
        /// Feature: Priority email support with same-day response.
        /// </summary>
        public const string PrioritySupport = "Priority Support";

        /// <summary>
        /// Gets the HTML markup for a PRO feature badge icon.
        /// </summary>
        /// <param name="additionalClasses">Optional additional CSS classes to apply</param>
        /// <returns>HTML string for the PRO badge icon</returns>
        public static string GetBadgeHtml(string additionalClasses = "")
        {
            var classes = string.IsNullOrEmpty(additionalClasses)
                ? BadgeIconClass
                : $"{BadgeIconClass} {additionalClasses}";

            return $"<i class=\"{classes}\"></i>";
        }
    }
}
