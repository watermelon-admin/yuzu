using System.Collections.Concurrent;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Extension methods for weather service to make it easier to get weather information
    /// </summary>
    public static class WeatherExtensions
    {
        // In-memory cache to store weather results (timezone -> weather string)
        private static readonly ConcurrentDictionary<string, (string Weather, DateTime Expiry)> _weatherCache = new();
        
        // In-memory cache to store detailed weather results (timezone -> detailed weather info)
        private static readonly ConcurrentDictionary<string, (WeatherService.DetailedWeatherInfo Info, DateTime Expiry)> _detailedWeatherCache = new();
        
        // Default cache duration (10 minutes)
        private static readonly TimeSpan DefaultCacheDuration = TimeSpan.FromMinutes(10);
        
        /// <summary>
        /// Gets a basic weather description for a time zone with caching
        /// </summary>
        /// <param name="weatherService">The weather service instance</param>
        /// <param name="ianaTimeZone">The IANA timezone code</param>
        /// <param name="cacheDuration">How long to cache results (optional, defaults to 10 minutes)</param>
        /// <returns>A formatted weather string</returns>
        public static async Task<string> GetWeatherStringAsync(
            this WeatherService weatherService,
            string ianaTimeZone,
            TimeSpan? cacheDuration = null)
        {
            // Create cache key from the time zone
            string cacheKey = ianaTimeZone;
            
            // Set cache duration (default 10 minutes)
            TimeSpan duration = cacheDuration ?? DefaultCacheDuration;
            
            // Check if value exists in cache and is not expired
            if (_weatherCache.TryGetValue(cacheKey, out var cachedValue) && 
                cachedValue.Expiry > DateTime.UtcNow)
            {
                return cachedValue.Weather;
            }
            
            // Get fresh weather data
            string weatherInfo = await weatherService.GetBasicWeatherInfoAsync(ianaTimeZone);
            
            // Cache the result with expiry time
            _weatherCache[cacheKey] = (weatherInfo, DateTime.UtcNow.Add(duration));
            
            return weatherInfo;
        }
        
        /// <summary>
        /// Gets weather information for all time zones in a single operation
        /// </summary>
        /// <param name="weatherService">The weather service instance</param>
        /// <param name="timeZoneIds">List of IANA timezone IDs</param>
        /// <returns>Dictionary of timezone IDs to weather descriptions</returns>
        public static async Task<Dictionary<string, string>> GetWeatherForTimeZonesAsync(
            this WeatherService weatherService,
            IEnumerable<string> timeZoneIds)
        {
            var results = new Dictionary<string, string>();
            var tasks = new List<Task>();
            
            foreach (var timezoneId in timeZoneIds)
            {
                tasks.Add(Task.Run(async () => 
                {
                    try
                    {
                        var weather = await weatherService.GetWeatherStringAsync(timezoneId);
                            
                        lock (results)
                        {
                            results[timezoneId] = weather;
                        }
                    }
                    catch (Exception)
                    {
                        // If weather data fails for a location, use a placeholder
                        lock (results)
                        {
                            results[timezoneId] = "Weather unavailable";
                        }
                    }
                }));
            }
            
            // Wait for all weather data to be retrieved
            await Task.WhenAll(tasks);
            
            return results;
        }
        
        /// <summary>
        /// Gets detailed weather information for a time zone with caching
        /// </summary>
        /// <param name="weatherService">The weather service instance</param>
        /// <param name="ianaTimeZone">The IANA timezone code</param>
        /// <param name="cacheDuration">How long to cache results (optional, defaults to 10 minutes)</param>
        /// <returns>Detailed weather information including temperature and weather code</returns>
        public static async Task<WeatherService.DetailedWeatherInfo?> GetDetailedWeatherInfoAsync(
            this WeatherService weatherService,
            string ianaTimeZone,
            TimeSpan? cacheDuration = null)
        {
            // Create cache key from the time zone
            string cacheKey = ianaTimeZone;
            
            // Set cache duration (default 10 minutes)
            TimeSpan duration = cacheDuration ?? DefaultCacheDuration;
            
            // Check if value exists in cache and is not expired
            if (_detailedWeatherCache.TryGetValue(cacheKey, out var cachedValue) && 
                cachedValue.Expiry > DateTime.UtcNow)
            {
                return cachedValue.Info;
            }
            
            // Get fresh weather data
            var weatherInfo = await weatherService.GetDetailedWeatherInfoAsync(ianaTimeZone);
            
            if (weatherInfo != null)
            {
                // Cache the result with expiry time
                _detailedWeatherCache[cacheKey] = (weatherInfo, DateTime.UtcNow.Add(duration));
            }
            
            return weatherInfo;
        }
        
        /// <summary>
        /// Gets detailed weather information for all time zones in a single operation
        /// </summary>
        /// <param name="weatherService">The weather service instance</param>
        /// <param name="timeZoneIds">List of IANA timezone IDs</param>
        /// <returns>Dictionary of timezone IDs to detailed weather information</returns>
        public static async Task<Dictionary<string, WeatherService.DetailedWeatherInfo>> GetDetailedWeatherForTimeZonesAsync(
            this WeatherService weatherService,
            IEnumerable<string> timeZoneIds)
        {
            var results = new Dictionary<string, WeatherService.DetailedWeatherInfo>();
            var tasks = new List<Task>();
            
            foreach (var timezoneId in timeZoneIds)
            {
                tasks.Add(Task.Run(async () => 
                {
                    try
                    {
                        var weatherInfo = await weatherService.GetDetailedWeatherInfoAsync(timezoneId);
                        
                        if (weatherInfo != null)
                        {
                            lock (results)
                            {
                                results[timezoneId] = weatherInfo;
                            }
                        }
                    }
                    catch (Exception)
                    {
                        // If weather data fails for a location, skip it
                    }
                }));
            }
            
            // Wait for all weather data to be retrieved
            await Task.WhenAll(tasks);
            
            return results;
        }
    }
}