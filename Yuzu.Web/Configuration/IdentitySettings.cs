namespace Yuzu.Web.Configuration
{
    /// <summary>
    /// Configuration settings for ASP.NET Core Identity
    /// </summary>
    public class IdentitySettings
    {
        /// <summary>
        /// Whether to use PostgreSQL for Identity storage
        /// </summary>
        public bool UsePostgreSql { get; set; } = true;
    }
}