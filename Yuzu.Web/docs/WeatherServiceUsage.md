# Weather Service Usage Guide

The `WeatherService` class provides weather information for locations based on IANA time zones. It uses Open Meteo for weather data and a static geolocation database for timezone coordinates.

## Overview

The weather service has been designed with the following features:
- Uses static geolocation data for time zones to avoid external geocoding API calls
- Integrates with Open Meteo API for weather forecasts 
- Provides caching to reduce API requests and improve performance
- Returns simple weather strings in the format: "12°C / 54°F, partly cloudy"

## Basic Usage

The most efficient way to get weather information is by providing an IANA time zone ID:

```csharp
public class WeatherDemoModel : PageModel
{
    private readonly WeatherService _weatherService;
    
    public WeatherDemoModel(WeatherService weatherService)
    {
        _weatherService = weatherService;
    }
    
    public string BerlinWeather { get; private set; } = "Loading...";
    
    public async Task OnGetAsync()
    {
        // Get weather for Berlin using its IANA time zone
        BerlinWeather = await _weatherService.GetWeatherStringAsync("Europe/Berlin");
    }
}
```

## Using with Time Zone Cards

For displaying weather with time zone cards:

```csharp
public class TimeZoneCardsModel : PageModel
{
    private readonly WeatherService _weatherService;
    private readonly IUserDataService _userDataService;
    
    public TimeZoneCardsModel(
        WeatherService weatherService,
        IUserDataService userDataService)
    {
        _weatherService = weatherService;
        _userDataService = userDataService;
    }
    
    public class TimeZoneViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string WeatherInfo { get; set; } = string.Empty;
        public bool IsHome { get; set; }
    }
    
    public List<TimeZoneViewModel> UserTimeZones { get; set; } = new();
    
    public async Task OnGetAsync()
    {
        // Get the user ID
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Get user's time zones from the database
        var timeZoneIds = await _userDataService.GetUserTimeZonesAsync(userId);
        var homeTimeZone = await _userDataService.GetHomeTimeZoneAsync(userId);
        
        // Get weather for all time zones in parallel
        var weatherInfo = await _weatherService.GetWeatherForTimeZonesAsync(timeZoneIds);
        
        // Build view models with city names and weather info
        foreach (var zoneId in timeZoneIds)
        {
            var displayName = Time.GetCityCountryFromZoneId(zoneId);
            
            UserTimeZones.Add(new TimeZoneViewModel
            {
                Id = zoneId,
                DisplayName = displayName,
                WeatherInfo = weatherInfo.TryGetValue(zoneId, out var weather) ? 
                    weather : "Weather unavailable",
                IsHome = zoneId == homeTimeZone
            });
        }
    }
}
```

## Automatic Caching

Weather data is automatically cached for 10 minutes to reduce API calls:

```csharp
// First call will hit the Open Meteo API:
var weather1 = await _weatherService.GetWeatherStringAsync("Europe/Berlin");

// Second call within 10 minutes will use cached data:
var weather2 = await _weatherService.GetWeatherStringAsync("Europe/Berlin");

// You can specify a custom cache duration:
var weather3 = await _weatherService.GetWeatherStringAsync(
    "Europe/Berlin",
    cacheDuration: TimeSpan.FromMinutes(30)); // Cache for 30 minutes
```

## How It Works

1. **Static Geolocation Data**: At application startup, the `TimeZoneGeolocator` generates a static JSON file with coordinates for all IANA time zones.

2. **Weather Request Flow**:
   - When you request weather for a time zone, the service looks up its coordinates in the static file
   - It then calls the Open Meteo API with these coordinates
   - The result is formatted into a simple weather string and cached

3. **Caching**: The system caches results for 10 minutes (by default) to reduce API calls and improve performance.

## Weather Description

The weather description is derived from the WMO Weather Codes provided by Open Meteo:

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Cloudy |
| ... | ... |
| 95 | Thunderstorm |

Complete mapping is available in the `GetWeatherDescription` method in the `WeatherService` class.