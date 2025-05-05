using System.Text.Json;
using System.Text.Json.Serialization;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Helper class for creating and accessing time zone geolocation data
    /// </summary>
    public class TimeZoneGeolocator
    {
        private readonly string _geoDataFilePath;
        private readonly ILogger<TimeZoneGeolocator> _logger;
        
        // In-memory cache of timezone geolocation data
        private static Dictionary<string, (double Latitude, double Longitude, string City, string Country)>? _timeZoneGeoData;
        
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        public TimeZoneGeolocator(IWebHostEnvironment environment, ILogger<TimeZoneGeolocator> logger)
        {
            _geoDataFilePath = Path.Combine(environment.ContentRootPath, "wwwroot", "data", "timezone-geo-data.json");
            _logger = logger;
            
            // Ensure the data directory exists
            var dataDirectory = Path.GetDirectoryName(_geoDataFilePath);
            if (!Directory.Exists(dataDirectory) && dataDirectory != null)
            {
                Directory.CreateDirectory(dataDirectory);
            }
            
            // Load cached data if available
            LoadGeoData();
        }
        
        /// <summary>
        /// Creates a static file with time zone geolocation data
        /// </summary>
        public void GenerateTimeZoneGeoData()
        {
            try
            {
                var timeZones = Time.GetIanaTimezoneInfos();
                
                // Create a new dictionary to hold the geolocation data
                var geoData = new Dictionary<string, TimeZoneGeoDataEntry>();
                
                foreach (var tz in timeZones)
                {
                    // Skip if no city information
                    if (string.IsNullOrEmpty(tz.City))
                    {
                        continue;
                    }
                    
                    // Create an entry for this time zone
                    geoData[tz.ZoneId] = new TimeZoneGeoDataEntry
                    {
                        ZoneId = tz.ZoneId,
                        City = tz.City,
                        Country = tz.Country,
                        Continent = tz.Continent,
                        Latitude = tz.Latitude,
                        Longitude = tz.Longitude
                    };
                }
                
                // Serialize to JSON
                var json = JsonSerializer.Serialize(geoData, _jsonOptions);
                File.WriteAllText(_geoDataFilePath, json);
                
                // Update the in-memory cache
                _timeZoneGeoData = geoData.ToDictionary(
                    x => x.Key,
                    x => (x.Value.Latitude, x.Value.Longitude, x.Value.City, x.Value.Country));
                
                _logger.LogInformation("Generated time zone geolocation data for {Count} time zones", geoData.Count);
                
                // Log some sample entries for debugging
                _logger.LogInformation("Geolocation data sample entries:");
                int i = 0;
                foreach (var entry in geoData.Take(5))
                {
                    _logger.LogInformation("  {Index}. {ZoneId}: ({Lat}, {Lon}) - {City}, {Country}", 
                        ++i, 
                        entry.Key, 
                        entry.Value.Latitude, 
                        entry.Value.Longitude,
                        entry.Value.City,
                        entry.Value.Country);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating time zone geolocation data");
            }
        }
        
        /// <summary>
        /// Loads the geolocation data from the static file
        /// </summary>
        private void LoadGeoData()
        {
            if (_timeZoneGeoData != null)
            {
                // Data already loaded
                return;
            }
            
            try
            {
                if (File.Exists(_geoDataFilePath))
                {
                    _logger.LogInformation("Loading time zone geolocation data from file: {FilePath}", _geoDataFilePath);
                    var json = File.ReadAllText(_geoDataFilePath);
                    _logger.LogDebug("Read {Length} bytes from geolocation data file", json.Length);
                    
                    var geoData = JsonSerializer.Deserialize<Dictionary<string, TimeZoneGeoDataEntry>>(json, _jsonOptions);
                    
                    if (geoData != null)
                    {
                        _timeZoneGeoData = geoData.ToDictionary(
                            x => x.Key,
                            x => (x.Value.Latitude, x.Value.Longitude, x.Value.City, x.Value.Country));
                        
                        _logger.LogInformation("Loaded time zone geolocation data for {Count} time zones", geoData.Count);
                        
                        // Log some sample entries for debugging
                        _logger.LogInformation("Loaded geolocation data sample entries:");
                        int i = 0;
                        foreach (var entry in geoData.Take(5))
                        {
                            _logger.LogInformation("  {Index}. {ZoneId}: ({Lat}, {Lon}) - {City}, {Country}", 
                                ++i, 
                                entry.Key, 
                                entry.Value.Latitude, 
                                entry.Value.Longitude,
                                entry.Value.City,
                                entry.Value.Country);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Failed to deserialize geolocation data from file. Will regenerate.");
                        GenerateTimeZoneGeoData();
                    }
                }
                else
                {
                    // File doesn't exist, so generate it
                    _logger.LogInformation("Geolocation data file not found at: {FilePath}. Will generate new file.", _geoDataFilePath);
                    GenerateTimeZoneGeoData();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading time zone geolocation data");
                
                // Regenerate the data if loading failed
                GenerateTimeZoneGeoData();
            }
        }
        
        /// <summary>
        /// Gets the geolocation data for a time zone
        /// </summary>
        /// <param name="zoneId">The IANA time zone ID</param>
        /// <returns>The geolocation data (latitude, longitude, city, country)</returns>
        public (double Latitude, double Longitude, string City, string Country)? GetTimeZoneGeoData(string zoneId)
        {
            if (_timeZoneGeoData == null)
            {
                LoadGeoData();
            }
            
            if (_timeZoneGeoData != null && _timeZoneGeoData.TryGetValue(zoneId, out var geoData))
            {
                return geoData;
            }
            
            _logger.LogWarning("No geolocation data found for time zone ID: {ZoneId}", zoneId);
            return null;
        }
        
        /// <summary>
        /// Logs information about a specific time zone for debugging purposes
        /// </summary>
        public void LogTimeZoneData(string zoneId)
        {
            // Try to get geolocation data
            var geoData = GetTimeZoneGeoData(zoneId);
            
            if (geoData.HasValue)
            {
                var (latitude, longitude, city, country) = geoData.Value;
                _logger.LogInformation("Time zone data for {ZoneId}:", zoneId);
                _logger.LogInformation("  City: {City}", city);
                _logger.LogInformation("  Country: {Country}", country);
                _logger.LogInformation("  Coordinates: ({Latitude}, {Longitude})", latitude, longitude);
            }
            else
            {
                // Try to get time zone information from the system
                var timeZoneInfo = Time.GetIanaTimeZoneInfoFromId(zoneId);
                
                if (timeZoneInfo != null)
                {
                    _logger.LogInformation("Time zone found in system but not in geo data: {ZoneId}", zoneId);
                    _logger.LogInformation("  City: {City}", timeZoneInfo.City);
                    _logger.LogInformation("  Country: {Country}", timeZoneInfo.Country);
                    _logger.LogInformation("  Coordinates: ({Latitude}, {Longitude})", 
                        timeZoneInfo.Latitude, timeZoneInfo.Longitude);
                }
                else
                {
                    _logger.LogWarning("Time zone {ZoneId} not found in system", zoneId);
                }
            }
        }
    }
    
    /// <summary>
    /// Data structure for serializing time zone geolocation data
    /// </summary>
    public class TimeZoneGeoDataEntry
    {
        [JsonPropertyName("zoneId")]
        public string ZoneId { get; set; } = string.Empty;
        
        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;
        
        [JsonPropertyName("country")]
        public string Country { get; set; } = string.Empty;
        
        [JsonPropertyName("continent")]
        public string Continent { get; set; } = string.Empty;
        
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }
        
        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }
    }
}