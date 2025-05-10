// src/pages/settings/time-zones/card-creator.ts
import { formatUtcOffset } from './time-utils.js';
import { updateWeatherInfoOnCard } from './weather-utils.js';
/**
 * Creates a time zone card element based on the given time zone information
 * @param timeZone - The time zone information to create a card for
 * @param onSetHomeTimeZone - Callback for when the 'Set as Home' button is clicked
 * @param onShowTimeZoneInfoModal - Callback for when the 'Info' button is clicked
 * @param onDeleteTimeZone - Callback for when the 'Delete' button is clicked
 * @returns HTMLElement - The created card element
 */
export function createTimeZoneCard(timeZone, onSetHomeTimeZone, onShowTimeZoneInfoModal, onDeleteTimeZone) {
    // Format the UTC offset string
    const utcOffsetStr = formatUtcOffset(timeZone);
    let cardElement;
    if (timeZone.isHome) {
        // Get the template for home time zone cards
        const homeTemplate = document.getElementById('home-time-zone-card-template');
        if (!homeTemplate) {
            // Create element without template
            cardElement = document.createElement('div');
            cardElement.className = 'col pb-lg-2 mb-4';
            cardElement.setAttribute('data-timezone-id', timeZone.zoneId);
            // Set inner HTML manually as fallback
            // This is a fallback for when the home template isn't available
            // Determine weather visibility class and create weather HTML with icon if needed
            const weatherVisibilityClass = !timeZone.weatherInfo ? 'd-none' : '';
            const weatherText = timeZone.weatherInfo || '';
            let weatherHTML = weatherText;
            // Add icon if we have weather info
            if (timeZone.weatherInfo) {
                const weatherLower = timeZone.weatherInfo.toLowerCase();
                let weatherIcon = '<i class="bx bx-cloud me-1"></i>'; // Default icon
                if (weatherLower.includes('clear') || weatherLower.includes('sunny')) {
                    weatherIcon = '<i class="bx bx-sun me-1"></i>';
                }
                else if (weatherLower.includes('cloud')) {
                    weatherIcon = '<i class="bx bx-cloud me-1"></i>';
                }
                else if (weatherLower.includes('rain') || weatherLower.includes('drizzle')) {
                    weatherIcon = '<i class="bx bx-cloud-rain me-1"></i>';
                }
                weatherHTML = `${weatherIcon} ${weatherText}`;
            }
            cardElement.innerHTML = `
                <article class="card settings-card h-100 border-primary">
                    <div class="card-body">
                        <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                            <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                            <span class="badge bg-primary ms-2">Home</span>
                        </h5>
                        <p class="card-text card-continent mb-0">${timeZone.continent}</p>
                        <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                        <p class="card-text text-primary small card-weather-info mt-1 ${weatherVisibilityClass}" style="${!weatherVisibilityClass ? 'display:block;visibility:visible;opacity:1;' : ''}">${weatherHTML}</p>
                    </div>
                    <div class="card-footer d-flex align-items-center py-3">
                        <div class="d-flex">
                            <button type="button" class="card-info-button btn btn-sm btn-outline-primary">
                                <i class="bx bx-info-circle fs-xl me-1"></i>
                                <span class="d-none d-md-inline">Info</span>
                            </button>
                        </div>
                    </div>
                </article>
            `;
            // Verify that the weather HTML was applied correctly
            const weatherElement = cardElement.querySelector('.card-weather-info');
            if (weatherElement) {
            }
        }
        else {
            // Use the home template
            const templateClone = homeTemplate.content.cloneNode(true);
            // Get the wrapper element
            const wrapper = templateClone.querySelector('.col');
            if (wrapper) {
                wrapper.setAttribute('data-timezone-id', timeZone.zoneId);
                // Use the wrapper as our card element
                cardElement = wrapper;
            }
            else {
                // Fallback if wrapper is not found
                cardElement = document.createElement('div');
                cardElement.className = 'col pb-lg-2 mb-4';
                cardElement.setAttribute('data-timezone-id', timeZone.zoneId);
                // Copy the template content
                while (templateClone.firstChild) {
                    cardElement.appendChild(templateClone.firstChild);
                }
            }
            // Fill in the data
            const cityCountry = cardElement.querySelector('.card-city-country');
            if (cityCountry) {
                cityCountry.textContent = `${timeZone.cities[0]}, ${timeZone.countryName}`;
            }
            const continent = cardElement.querySelector('.card-continent');
            if (continent) {
                continent.textContent = timeZone.continent;
            }
            const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
            if (utcOffsetEl) {
                utcOffsetEl.textContent = utcOffsetStr;
            }
        }
        // Add event handler for info button
        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            infoButton.addEventListener('click', () => onShowTimeZoneInfoModal(timeZone.zoneId));
        }
    }
    else {
        // Get the template for regular time zone cards
        const regularTemplate = document.getElementById('time-zone-card-template');
        if (!regularTemplate) {
            // Create element without template
            cardElement = document.createElement('div');
            cardElement.className = 'col pb-lg-2 mb-4';
            cardElement.setAttribute('data-timezone-id', timeZone.zoneId);
            // Set inner HTML manually as fallback
            // This is a fallback for when the template isn't available
            // Determine weather visibility class and create weather HTML with icon if needed
            const weatherVisibilityClass = !timeZone.weatherInfo ? 'd-none' : '';
            const weatherText = timeZone.weatherInfo || '';
            let weatherHTML = weatherText;
            // Add icon if we have weather info
            if (timeZone.weatherInfo) {
                const weatherLower = timeZone.weatherInfo.toLowerCase();
                let weatherIcon = '<i class="bx bx-cloud me-1"></i>'; // Default icon
                if (weatherLower.includes('clear') || weatherLower.includes('sunny')) {
                    weatherIcon = '<i class="bx bx-sun me-1"></i>';
                }
                else if (weatherLower.includes('cloud')) {
                    weatherIcon = '<i class="bx bx-cloud me-1"></i>';
                }
                else if (weatherLower.includes('rain') || weatherLower.includes('drizzle')) {
                    weatherIcon = '<i class="bx bx-cloud-rain me-1"></i>';
                }
                weatherHTML = `${weatherIcon} ${weatherText}`;
            }
            cardElement.innerHTML = `
                <article class="card settings-card h-100">
                    <div class="card-body">
                        <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                            <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                        </h5>
                        <p class="card-text card-continent mb-0">${timeZone.continent}</p>
                        <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                        <p class="card-text text-primary small card-weather-info mt-1 ${weatherVisibilityClass}" style="${!weatherVisibilityClass ? 'display:block;visibility:visible;opacity:1;' : ''}">${weatherHTML}</p>
                    </div>
                    <div class="card-footer d-flex align-items-center py-3">
                        <div class="d-flex">
                            <button type="button" class="card-home-button btn btn-sm btn-outline-primary me-2">
                                <i class="bx bx-home fs-xl me-1"></i>
                                <span class="d-none d-md-inline">Set as Home</span>
                            </button>
                            <button type="button" class="card-info-button btn btn-sm btn-outline-primary me-2">
                                <i class="bx bx-info-circle fs-xl me-1"></i>
                                <span class="d-none d-md-inline">Info</span>
                            </button>
                            <button type="button" class="card-delete-button btn btn-sm btn-outline-danger">
                                <i class="bx bx-trash-alt fs-xl me-1"></i>
                                <span class="d-none d-md-inline">Delete</span>
                            </button>
                        </div>
                    </div>
                </article>
            `;
            // Verify that the weather HTML was applied correctly
            const weatherElement = cardElement.querySelector('.card-weather-info');
            if (weatherElement) {
            }
        }
        else {
            // Use the regular template
            const templateClone = regularTemplate.content.cloneNode(true);
            // Set timezone ID on the wrapper div
            const wrapper = templateClone.querySelector('.col');
            if (wrapper) {
                wrapper.setAttribute('data-timezone-id', timeZone.zoneId);
                // Use the wrapper as our card element
                cardElement = wrapper;
            }
            else {
                // Fallback if wrapper is not found
                cardElement = document.createElement('div');
                cardElement.className = 'col pb-lg-2 mb-4';
                cardElement.setAttribute('data-timezone-id', timeZone.zoneId);
                // Copy the template content
                while (templateClone.firstChild) {
                    cardElement.appendChild(templateClone.firstChild);
                }
            }
            // Fill in the data
            const cityCountry = cardElement.querySelector('.card-city-country');
            if (cityCountry) {
                cityCountry.textContent = `${timeZone.cities[0]}, ${timeZone.countryName}`;
            }
            const continent = cardElement.querySelector('.card-continent');
            if (continent) {
                continent.textContent = timeZone.continent;
            }
            const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
            if (utcOffsetEl) {
                utcOffsetEl.textContent = utcOffsetStr;
            }
        }
        // Add event handlers for buttons
        const homeButton = cardElement.querySelector('.card-home-button');
        if (homeButton) {
            homeButton.addEventListener('click', () => onSetHomeTimeZone(timeZone.zoneId));
        }
        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            infoButton.addEventListener('click', () => onShowTimeZoneInfoModal(timeZone.zoneId));
        }
        const deleteButton = cardElement.querySelector('.card-delete-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => onDeleteTimeZone(timeZone.zoneId));
        }
    }
    // Apply weather information with icons for all card types
    if (timeZone.weatherInfo) {
        // Force explicit display of weather info on the card
        const weatherInfo = cardElement.querySelector('.card-weather-info');
        if (weatherInfo) {
            // Remove d-none class to ensure visibility
            weatherInfo.classList.remove('d-none');
            weatherInfo.style.display = 'block';
            weatherInfo.style.visibility = 'visible';
            weatherInfo.style.opacity = '1';
        }
        // Now update with icon and text
        updateWeatherInfoOnCard(timeZone, cardElement);
    }
    return cardElement;
}
//# sourceMappingURL=card-creator.js.map