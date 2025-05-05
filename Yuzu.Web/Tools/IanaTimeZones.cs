public class IanaTimeZoneInfo
{
    public string ZoneId { get; set; } = string.Empty;
    public string OfficialZoneId { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Continent { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string UtcOffsetText { get; set; } = string.Empty;
    public float UtcOffsetValue { get; set; }
    public bool IsDaylightSavingTime { get; set; }
    public string Comments { get; set; } = string.Empty;
}
