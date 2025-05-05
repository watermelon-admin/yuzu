namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Configuration settings for debugging and development
    /// </summary>
    public class DebugSettings
    {
        /// <summary>
        /// Whether to treat all users as having an active subscription
        /// </summary>
        public bool TreatAllUsersAsSubscribed { get; set; } = false;
    }
}