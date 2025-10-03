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

        /// <summary>
        /// When true, shows debug information panel and logs download button in the break designer.
        /// This displays real-time debugging metrics, performance data, and allows downloading debug logs.
        /// </summary>
        /// <remarks>
        /// <para><strong>Usage in appsettings.Development.json:</strong></para>
        /// <code>
        /// {
        ///   "DebugSettings": {
        ///     "ShowDesignerDebugInfo": true
        ///   }
        /// }
        /// </code>
        /// <para>When enabled, the following debug features are available:</para>
        /// <list type="bullet">
        ///   <item>Debug info panel at the bottom of the designer canvas showing widget count, selection state, drag state, etc.</item>
        ///   <item>Logs download button in the toolbar to export performance and debug logs</item>
        ///   <item>Real-time memory usage and performance metrics</item>
        /// </list>
        /// <para><strong>⚠️ NOTE:</strong> This should typically be disabled in production to avoid cluttering the designer UI.</para>
        /// </remarks>
        /// <value>
        /// Default value is <c>false</c>. Set to <c>true</c> to enable debug features in the designer.
        /// </value>
        public bool ShowDesignerDebugInfo { get; set; } = false;
    }
}