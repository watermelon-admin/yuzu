namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Configuration settings for debugging and development.
    /// </summary>
    /// <remarks>
    /// These settings should only be used in development environments and never in production.
    /// Configure these settings in appsettings.Development.json or user secrets.
    /// </remarks>
    public class DebugSettings
    {
        /// <summary>
        /// When true, bypasses all subscription checks and treats every user as having an active PRO subscription.
        /// This allows testing PRO features during development without setting up Stripe subscriptions.
        /// </summary>
        /// <remarks>
        /// <para><strong>Usage in appsettings.Development.json:</strong></para>
        /// <code>
        /// {
        ///   "DebugSettings": {
        ///     "TreatAllUsersAsSubscribed": true
        ///   }
        /// }
        /// </code>
        /// <para>When enabled, the following behaviors change:</para>
        /// <list type="bullet">
        ///   <item>All users can create custom break types</item>
        ///   <item>All users can upload custom background images</item>
        ///   <item>All users can access the advanced break screen designer</item>
        ///   <item>All users can delete custom break types</item>
        ///   <item>Fake subscription data is returned from StripeTools.GetSubscriptionDataAsync()</item>
        /// </list>
        /// <para><strong>⚠️ WARNING:</strong> Never set this to true in production! This completely bypasses payment enforcement.</para>
        /// </remarks>
        /// <value>
        /// Default value is <c>false</c>. Set to <c>true</c> only in development environments.
        /// </value>
        public bool TreatAllUsersAsSubscribed { get; set; } = false;
    }
}