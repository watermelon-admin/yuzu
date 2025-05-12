namespace Yuzu.Web
{
    /// <summary>
    /// Contains build information that is replaced during the build process
    /// </summary>
    public static class BuildInfo
    {
        /// <summary>
        /// The major version number
        /// </summary>
        public const string Major = "1";

        /// <summary>
        /// The minor version number
        /// </summary>
        public const string Minor = "0";

        /// <summary>
        /// The revision number
        /// </summary>
        public const string Revision = "0";

        /// <summary>
        /// The build number, typically from CI/CD system
        /// </summary>
        public const string Build = "#{BUILD_BUILDNUMBER}#";

        /// <summary>
        /// The date and time of the build, formatted as ISO 8601
        /// </summary>
        public const string BuildDate = "#{BUILD_DATE}#";

        /// <summary>
        /// The Git commit hash (short format)
        /// </summary>
        public const string GitCommit = "#{GIT_COMMIT}#";

        /// <summary>
        /// The full version string
        /// </summary>
        public static string VersionString => $"{Major}.{Minor}.{Revision}.{Build}";

        /// <summary>
        /// Gets a user-friendly version string including build info
        /// </summary>
        public static string GetVersionInfo()
        {
            return $"v{VersionString} ({BuildDate})";
        }

        /// <summary>
        /// Gets extended version information including build date and git commit
        /// </summary>
        public static string GetDetailedVersionInfo()
        {
            return $"Version {VersionString}\nBuild: {BuildDate}\nCommit: {GitCommit}";
        }
    }
}
