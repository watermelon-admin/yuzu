namespace Yuzu.Time
{
    public class TimeZoneInfo
    {
        public string ZoneId { get; set; } = string.Empty;
        public string[] Cities { get; set; } = Array.Empty<string>();
        public string CountryName { get; set; } = string.Empty;
        public string Continent { get; set; } = string.Empty;
        public double? UTCOffset { get; set; }
        public string? Alias { get; set; }
    }
}
