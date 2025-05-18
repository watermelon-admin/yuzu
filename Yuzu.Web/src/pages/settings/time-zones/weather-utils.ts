// src/pages/settings/time-zones/weather-utils.ts

import { TimeZoneInfo, DetailedWeatherInfo } from './types.js';

/**
 * Maps weather codes to background image filenames
 * @param weatherCode The WMO weather code
 * @param isDay Whether it's day (1) or night (0)
 * @returns The image filename to use for the background
 */
export function getWeatherBackgroundImage(weatherCode: number, isDay: number): string {
    // Currently we only have clouds.jpg, so we'll return that for all weather codes
    // In the future, this can be expanded with more images for different weather conditions
    return '/img/weather/clouds.jpg';
    
    /* 
    // Example of how this could be expanded in the future:
    if (isDay === 0) {
        // Night backgrounds
        switch (weatherCode) {
            case 0: // Clear sky
                return '/img/weather/clear-night.jpg';
            case 3: // Cloudy
                return '/img/weather/cloudy-night.jpg';
            // Add more cases for other weather codes at night
            default:
                return '/img/weather/clouds.jpg';
        }
    } else {
        // Day backgrounds
        switch (weatherCode) {
            case 0: // Clear sky
                return '/img/weather/clear-day.jpg';
            case 1: // Mainly clear
            case 2: // Partly cloudy
                return '/img/weather/partly-cloudy.jpg';
            case 3: // Cloudy
                return '/img/weather/clouds.jpg';
            case 51: // Light drizzle
            case 53: // Moderate drizzle
            case 55: // Heavy drizzle
            case 61: // Light rain
            case 63: // Moderate rain
            case 65: // Heavy rain
                return '/img/weather/rain.jpg';
            case 71: // Light snow
            case 73: // Moderate snow
            case 75: // Heavy snow
                return '/img/weather/snow.jpg';
            case 95: // Thunderstorm
            case 96: // Thunderstorm with light hail
            case 99: // Thunderstorm with heavy hail
                return '/img/weather/storm.jpg';
            default:
                return '/img/weather/clouds.jpg';
        }
    }
    */
}

/**
 * Updates weather information on a time zone card with the appropriate weather icon
 * Key fix: This method ensures weather information is shown correctly on time zone cards
 * @param timeZone The time zone data with weather information
 * @param cardElement The element containing the card (could be the card itself, card body, or a wrapper)
 */
export function updateWeatherInfoOnCard(timeZone: TimeZoneInfo, cardElement: Element): void {
    // Get the card element data attribute to verify we're operating on the right card
    const cardId = cardElement.getAttribute ? cardElement.getAttribute('data-timezone-id') : null;

    // When using templates with DocumentFragment, we need to find the proper container
    let targetElement = cardElement;

    // If this element doesn't have data-timezone-id, try to find the parent that does
    if (cardId !== timeZone.zoneId) {

        // First, if it's the card content, try to find its parent with data-timezone-id
        let parent = cardElement.closest('[data-timezone-id]');
        if (parent && parent.getAttribute('data-timezone-id') === timeZone.zoneId) {
            targetElement = parent;
        } else {
            // If the element has children, check if any of them have the right data-timezone-id
            const child = cardElement.querySelector(`[data-timezone-id="${timeZone.zoneId}"]`);
            if (child) {
                targetElement = child;
            }
        }
    }

    // Re-check the card ID after finding the target element
    const targetId = targetElement.getAttribute ? targetElement.getAttribute('data-timezone-id') : null;
    const cardPath = targetId === timeZone.zoneId ? 'correct-card' : 'WRONG-CARD';

    // First, try to find the weather info element
    const weatherInfoElement = targetElement.querySelector('.card-weather-info');
    if (!weatherInfoElement) {

        // Try looking for it in the child elements (especially for DocumentFragment)
        const card = targetElement.querySelector('.card');
        if (card) {
            const weatherInCard = card.querySelector('.card-weather-info');
            if (weatherInCard) {
                updateWeatherContent(timeZone, weatherInCard, cardPath);
                return;
            }
        }

        return;
    }

    updateWeatherContent(timeZone, weatherInfoElement, cardPath);
}

/**
 * Helper method to update weather content with temperature in both Celsius and Fahrenheit
 * This is extracted from updateWeatherInfoOnCard to avoid code duplication
 */
export function updateWeatherContent(timeZone: TimeZoneInfo, weatherInfoElement: Element, cardPath: string): void {
    // Cast to HTMLElement to access style properties
    const htmlElement = weatherInfoElement as HTMLElement;

    // Only use the new detailed weather information
    if (timeZone.detailedWeather) {
        // Make sure the element is visible
        htmlElement.classList.remove('d-none');
        
        // Format temperatures in both Celsius and Fahrenheit
        const tempC = Math.round(timeZone.detailedWeather.temperatureC);
        const tempF = Math.round(timeZone.detailedWeather.temperatureF);
        const temp = `${tempC}°C / ${tempF}°F`;
        
        // Use solid thermometer icon for temperature (bxs- prefix for solid icons)
        const weatherIcon = '<i class="bx bxs-thermometer me-1"></i>';

        // Set the HTML with only the temperature and icon
        const newContent = `${weatherIcon} ${temp}`;
        htmlElement.innerHTML = newContent;
    } 
    else {
        // If no detailed weather data, hide the element
        htmlElement.classList.add('d-none');
    }
    
    // Always add these styles and classes if we have detailed weather info
    if (timeZone.detailedWeather) {
        // Add animation class if not already present
        htmlElement.classList.add('animate-in');
        
        // Ensure visibility
        htmlElement.style.display = 'block';
        htmlElement.style.visibility = 'visible';
    } else {
        htmlElement.classList.add('d-none');
    }
}

/**
 * Gets the appropriate weather icon class based on the weather code
 * @param weatherCode The WMO weather code
 * @param isDay Whether it's day (1) or night (0)
 * @returns The Boxicons class name for the weather icon
 */
export function getWeatherIconClass(weatherCode: number, isDay: number): string {
    // Weather icon classes based on WMO codes: https://open-meteo.com/en/docs
    if (isDay === 0) {
        // Night icons
        return weatherCode === 0 ? 'bx-moon' : 'bx-thermometer';
    }
    
    // Day icons
    switch (weatherCode) {
        case 0: // Clear sky
            return 'bx-sun';
        case 1: // Mainly clear
        case 2: // Partly cloudy
            return 'bx-cloud-light-rain';
        case 3: // Cloudy
            return 'bx-cloud';
        case 45: // Fog
        case 48: // Depositing rime fog
            return 'bx-cloud-fog';
        case 51: // Light drizzle
        case 53: // Moderate drizzle
        case 55: // Heavy drizzle
        case 56: // Light freezing drizzle
        case 57: // Heavy freezing drizzle
        case 61: // Light rain
        case 63: // Moderate rain
        case 80: // Light rain showers
        case 81: // Moderate rain showers
            return 'bx-cloud-light-rain';
        case 65: // Heavy rain
        case 66: // Light freezing rain
        case 67: // Heavy freezing rain
        case 82: // Heavy rain showers
            return 'bx-cloud-rain';
        case 71: // Light snow
        case 73: // Moderate snow
        case 75: // Heavy snow
        case 77: // Snow grains
        case 85: // Light snow showers
        case 86: // Heavy snow showers
            return 'bx-cloud-snow';
        case 95: // Thunderstorm
        case 96: // Thunderstorm with light hail
        case 99: // Thunderstorm with heavy hail
            return 'bx-cloud-lightning';
        default:
            // Default icon for unknown weather codes
            return 'bx-thermometer';
    }
}

/**
 * This function has been removed as it's no longer needed.
 * We're now handling weather display directly in the updateWeatherContent function.
 */
export function setupWeatherDisplayObserver(): void {
    // Empty function - no longer using mutation observer
    // This keeps backward compatibility with any code that might call this function
}