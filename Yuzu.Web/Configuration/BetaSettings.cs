namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Settings for controlling beta access mode to the application
    /// </summary>
    public class BetaSettings
    {
        /// <summary>
        /// Determines if beta mode is enabled
        /// </summary>
        public bool Enabled { get; set; }

        /// <summary>
        /// Secret code required to access the application in beta mode
        /// </summary>
        public string BetaCode { get; set; } = string.Empty;
    }
}