namespace Yuzu.Data
{
    /// <summary>
    /// Helper methods for DateTime and Unix timestamp conversion
    /// </summary>
    public static class DateTimeHelper
    {
        private static readonly DateTime UnixEpoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        
        /// <summary>
        /// Converts a Unix timestamp to a DateTime
        /// </summary>
        /// <param name="unixTimeStamp">The Unix timestamp (seconds since Unix epoch)</param>
        /// <returns>The equivalent DateTime</returns>
        public static DateTime FromUnixTimeStamp(long unixTimeStamp)
        {
            return UnixEpoch.AddSeconds(unixTimeStamp);
        }
        
        /// <summary>
        /// Converts a DateTime to a Unix timestamp
        /// </summary>
        /// <param name="dateTime">The DateTime to convert</param>
        /// <returns>The equivalent Unix timestamp (seconds since Unix epoch)</returns>
        public static long ToUnixTimeStamp(DateTime dateTime)
        {
            return (long)(dateTime - UnixEpoch).TotalSeconds;
        }
    }
}