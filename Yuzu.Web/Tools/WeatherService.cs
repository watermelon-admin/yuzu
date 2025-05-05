using System.Text.Json;
using System.Text.Json.Serialization;
using System.Globalization;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Service for retrieving weather information from Open Meteo using static geolocation data
    /// </summary>
    public class WeatherService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<WeatherService> _logger;
        private readonly TimeZoneGeolocator _geolocator;
        private readonly string _openMeteoBaseUrl = "https://api.open-meteo.com/v1/forecast";
        
        public WeatherService(
            HttpClient httpClient,
            ILogger<WeatherService> logger,
            TimeZoneGeolocator geolocator)
        {
            _httpClient = httpClient;
            _logger = logger;
            _geolocator = geolocator;
        }
        
        /// <summary>
        /// Gets a basic weather description for a given time zone
        /// </summary>
        /// <param name="ianaTimeZone">IANA time zone code</param>
        /// <returns>A simple weather description string</returns>
        public async Task<string> GetBasicWeatherInfoAsync(string ianaTimeZone)
        {
            try
            {
                // Get the geolocation data for this time zone
                var geoData = _geolocator.GetTimeZoneGeoData(ianaTimeZone);
                
                if (geoData == null)
                {
                    _logger.LogWarning("No geolocation data found for time zone: {TimeZone}", ianaTimeZone);
                    return "Weather data unavailable";
                }
                
                var (latitude, longitude, city, country) = geoData.Value;
                
                // Log the coordinates we're using for debugging
                _logger.LogInformation("Getting weather for time zone {TimeZone} using coordinates: ({Lat}, {Lon}) - {City}, {Country}",
                    ianaTimeZone, latitude, longitude, city, country);
                    
                // Get weather data from Open Meteo
                var weatherData = await GetWeatherDataAsync(latitude, longitude, ianaTimeZone);
                
                // Format the weather info into a simple string
                string temperatureC = $"{weatherData.CurrentWeather.Temperature:F1}°C";
                string temperatureF = $"{CelsiusToFahrenheit(weatherData.CurrentWeather.Temperature):F0}°F";
                string weatherDesc = GetWeatherDescription(weatherData.CurrentWeather.WeatherCode, weatherData.CurrentWeather.IsDay);
                
                // Log the result for debugging
                _logger.LogInformation("Weather for {TimeZone} ({City}, {Country}): {Weather}", 
                    ianaTimeZone, city, country, $"{temperatureC} / {temperatureF}, {weatherDesc}");
                
                return $"{temperatureC} / {temperatureF}, {weatherDesc}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting weather info for time zone: {TimeZone}", ianaTimeZone);
                return "Weather data unavailable";
            }
        }
        
        /// <summary>
        /// Gets a basic weather description for a given location
        /// </summary>
        /// <param name="city">City name</param>
        /// <param name="country">Country name</param>
        /// <param name="ianaTimeZone">IANA time zone code (optional)</param>
        /// <returns>A simple weather description string</returns>
        public async Task<string> GetBasicWeatherInfoAsync(string city, string country, string? ianaTimeZone = null)
        {
            try
            {
                // If time zone is provided, try to use it first
                if (!string.IsNullOrEmpty(ianaTimeZone))
                {
                    return await GetBasicWeatherInfoAsync(ianaTimeZone);
                }
                
                // Try to find a time zone that matches the city and country
                var allTimeZones = Time.GetIanaTimezoneInfos()
                    .Where(tz => tz.City.Equals(city, StringComparison.OrdinalIgnoreCase) && 
                                 tz.Country.Equals(country, StringComparison.OrdinalIgnoreCase))
                    .ToList();
                
                if (allTimeZones.Count > 0)
                {
                    // Use the first matching time zone
                    var timeZone = allTimeZones[0];
                    return await GetBasicWeatherInfoAsync(timeZone.ZoneId);
                }
                
                _logger.LogWarning("No time zone found for {City}, {Country}", city, country);
                return "Weather data unavailable";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting weather info for {City}, {Country}", city, country);
                return "Weather data unavailable";
            }
        }
        
        /// <summary>
        /// Gets weather data from Open Meteo API
        /// </summary>
        private async Task<WeatherResponse> GetWeatherDataAsync(double latitude, double longitude, string? timezone = null)
        {
            // Set timezone to GMT if not provided
            timezone = string.IsNullOrEmpty(timezone) ? "GMT" : timezone;
            
            // Format API URL - use invariant culture with period as decimal separator
            string url = string.Format(CultureInfo.InvariantCulture, 
                "{0}?latitude={1:F6}&longitude={2:F6}&current_weather=true&timezone={3}", 
                _openMeteoBaseUrl, latitude, longitude, timezone);
            
            _logger.LogInformation("Calling Open Meteo API: {Url}", url);
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync();
            _logger.LogDebug("Open Meteo API response: {Response}", content);
            
            var weatherData = JsonSerializer.Deserialize<WeatherResponse>(content);
            
            if (weatherData == null)
            {
                throw new Exception("Failed to parse weather data");
            }
            
            return weatherData;
        }
        
        /// <summary>
        /// Convert Celsius to Fahrenheit
        /// </summary>
        private double CelsiusToFahrenheit(double celsius)
        {
            return (celsius * 9 / 5) + 32;
        }
        
        /// <summary>
        /// Get a description of the weather based on the WMO weather code
        /// </summary>
        private string GetWeatherDescription(int weatherCode, int isDay)
        {
            // Weather descriptions based on WMO codes: https://open-meteo.com/en/docs
            return weatherCode switch
            {
                0 => isDay == 1 ? "clear sky" : "clear night",
                1 => "mainly clear",
                2 => "partly cloudy",
                3 => "cloudy",
                45 => "foggy",
                48 => "depositing rime fog",
                51 => "light drizzle",
                53 => "moderate drizzle",
                55 => "heavy drizzle",
                56 => "light freezing drizzle",
                57 => "heavy freezing drizzle",
                61 => "light rain",
                63 => "moderate rain",
                65 => "heavy rain",
                66 => "light freezing rain",
                67 => "heavy freezing rain",
                71 => "light snow",
                73 => "moderate snow",
                75 => "heavy snow",
                77 => "snow grains",
                80 => "light rain showers",
                81 => "moderate rain showers",
                82 => "heavy rain showers",
                85 => "light snow showers",
                86 => "heavy snow showers",
                95 => "thunderstorm",
                96 => "thunderstorm with light hail",
                99 => "thunderstorm with heavy hail",
                _ => "unknown weather"
            };
        }
    }
    
    /// <summary>
    /// Data classes for Open Meteo API response
    /// </summary>
    public class WeatherResponse
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }
        
        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }
        
        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = string.Empty;
        
        [JsonPropertyName("timezone_abbreviation")]
        public string TimezoneAbbreviation { get; set; } = string.Empty;
        
        [JsonPropertyName("elevation")]
        public double Elevation { get; set; }
        
        [JsonPropertyName("current_weather")]
        public CurrentWeather CurrentWeather { get; set; } = new CurrentWeather();
    }
    
    public class CurrentWeather
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;
        
        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }
        
        [JsonPropertyName("windspeed")]
        public double WindSpeed { get; set; }
        
        [JsonPropertyName("winddirection")]
        public double WindDirection { get; set; }
        
        [JsonPropertyName("is_day")]
        public int IsDay { get; set; }
        
        [JsonPropertyName("weathercode")]
        public int WeatherCode { get; set; }
    }
}