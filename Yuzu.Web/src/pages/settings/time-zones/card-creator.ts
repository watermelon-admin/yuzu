// src/pages/settings/time-zones/card-creator.ts

import { TimeZoneInfo } from './types.js';
import { formatUtcOffset } from './time-utils.js';
import { updateWeatherInfoOnCard } from './weather-utils.js';

// Declare global functions on window object for TypeScript
// This ensures we can check for their existence before calling them
declare global {
    interface Window {
        showTimeZoneInfoModal: (id: string) => void; 
        setHomeTimeZone: (id: string) => void;
        deleteTimeZone: (id: string) => void;
    }
}

/**
 * Creates a time zone card element based on the given time zone information
 * @param timeZone - The time zone information to create a card for
 * @param onSetHomeTimeZone - Callback for when the 'Set as Home' button is clicked
 * @param onShowTimeZoneInfoModal - Callback for when the 'Info' button is clicked
 * @param onDeleteTimeZone - Callback for when the 'Delete' button is clicked
 * @returns HTMLElement - The created card element
 */
export function createTimeZoneCard(
    timeZone: TimeZoneInfo, 
    onSetHomeTimeZone: (id: string) => void,
    onShowTimeZoneInfoModal: (id: string) => void,
    onDeleteTimeZone: (id: string) => void
): HTMLElement {
    // Format the UTC offset string
    const utcOffsetStr = formatUtcOffset(timeZone);

    let cardElement: HTMLElement;

    if (timeZone.isHome) {
        // Get the template for home time zone cards
        const homeTemplate = document.getElementById('home-time-zone-card-template') as HTMLTemplateElement;

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
                } else if (weatherLower.includes('cloud')) {
                    weatherIcon = '<i class="bx bx-cloud me-1"></i>';
                } else if (weatherLower.includes('rain') || weatherLower.includes('drizzle')) {
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
        } else {
            // Use the home template
            const templateClone = homeTemplate.content.cloneNode(true) as DocumentFragment;

            // Get the wrapper element
            const wrapper = templateClone.querySelector('.col');
            if (wrapper) {
                wrapper.setAttribute('data-timezone-id', timeZone.zoneId);

                // Use the wrapper as our card element
                cardElement = wrapper as HTMLElement;
            } else {
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

        // Add event handler for info button - use global function to ensure correct 'this' binding
        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            // Use multiple approaches for maximum reliability
            
            // First, create a properly bound event handler
            const infoClickHandler = (e: Event) => {
                e.preventDefault();
                console.log('[TIMEZONE-CARD] Info button clicked for (home card):', timeZone.zoneId);
                
                // Try multiple approaches to call the function
                if (typeof window.showTimeZoneInfoModal === 'function') {
                    console.log('[TIMEZONE-CARD] Calling global window.showTimeZoneInfoModal');
                    window.showTimeZoneInfoModal(timeZone.zoneId);
                } else if (window.Yuzu?.Settings?.TimeZones?.functions?.showTimeZoneInfoModal) {
                    console.log('[TIMEZONE-CARD] Calling via Yuzu.Settings.TimeZones.functions');
                    window.Yuzu.Settings.TimeZones.functions.showTimeZoneInfoModal(timeZone.zoneId);
                } else {
                    console.log('[TIMEZONE-CARD] Using fallback callback for home card');
                    onShowTimeZoneInfoModal(timeZone.zoneId);
                }
            };
            
            // 1. Add the event listener
            infoButton.addEventListener('click', infoClickHandler);
            
            // 2. Also set the onclick property directly
            (infoButton as HTMLElement).onclick = infoClickHandler;
            
            // 3. Also set the HTML attribute for absolute reliability
            (infoButton as HTMLElement).setAttribute('onclick', 
                `event.preventDefault(); 
                console.log('[TIMEZONE-CARD] Info button HTML onclick for (home card): ${timeZone.zoneId}'); 
                if(typeof window.showTimeZoneInfoModal==='function') { 
                    window.showTimeZoneInfoModal('${timeZone.zoneId}'); 
                } else if(window.Yuzu && window.Yuzu.Settings && window.Yuzu.Settings.TimeZones) {
                    const manager = window.Yuzu.Settings.TimeZones.getInstance();
                    if(manager) manager.showTimeZoneInfoModal('${timeZone.zoneId}');
                }`
            );
            
            console.log('[TIMEZONE-CARD] Home card info button handler set up with triple redundancy');
        }

    } else {
        // Get the template for regular time zone cards
        const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;

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
                } else if (weatherLower.includes('cloud')) {
                    weatherIcon = '<i class="bx bx-cloud me-1"></i>';
                } else if (weatherLower.includes('rain') || weatherLower.includes('drizzle')) {
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
        } else {
            // Use the regular template
            const templateClone = regularTemplate.content.cloneNode(true) as DocumentFragment;

            // Set timezone ID on the wrapper div
            const wrapper = templateClone.querySelector('.col');
            if (wrapper) {
                wrapper.setAttribute('data-timezone-id', timeZone.zoneId);

                // Use the wrapper as our card element
                cardElement = wrapper as HTMLElement;
            } else {
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

        // Add event handlers for buttons - use global functions to ensure correct 'this' binding
        const homeButton = cardElement.querySelector('.card-home-button');
        if (homeButton) {
            // We are DIRECTLY binding the click handler for maximum compatibility
            // This is CRITICAL for button functionality
            homeButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[TIMEZONE-CARD] Set Home button clicked for:', timeZone.zoneId);
                
                // Call the GLOBAL window function that was bound in the TimeZonesManager constructor
                // This ensures the correct 'this' context is maintained
                if (typeof window.setHomeTimeZone === 'function') {
                    console.log('[TIMEZONE-CARD] Calling global setHomeTimeZone function');
                    window.setHomeTimeZone(timeZone.zoneId);
                } else {
                    console.warn('[TIMEZONE-CARD] Global setHomeTimeZone function not available, using fallback');
                    // Fallback to passed callback if global function is not available
                    onSetHomeTimeZone(timeZone.zoneId);
                }
            });
            
            // For maximum compatibility, also set the onclick HTML attribute
            // This ensures it works even if addEventListener has issues
            homeButton.setAttribute('onclick', 
                `event.preventDefault(); 
                console.log('[TIMEZONE-CARD] Set Home button HTML onclick for: ${timeZone.zoneId}'); 
                if(typeof window.setHomeTimeZone==='function') { 
                    window.setHomeTimeZone('${timeZone.zoneId}'); 
                }`
            );
        }

        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            // Use multiple approaches for maximum reliability
            
            // First, create a properly bound event handler
            const infoClickHandler = (e: Event) => {
                e.preventDefault();
                console.log('[TIMEZONE-CARD] Info button clicked for:', timeZone.zoneId);
                
                // Try multiple approaches to call the function
                if (typeof window.showTimeZoneInfoModal === 'function') {
                    console.log('[TIMEZONE-CARD] Calling global window.showTimeZoneInfoModal');
                    window.showTimeZoneInfoModal(timeZone.zoneId);
                } else if (window.Yuzu?.Settings?.TimeZones?.functions?.showTimeZoneInfoModal) {
                    console.log('[TIMEZONE-CARD] Calling via Yuzu.Settings.TimeZones.functions');
                    window.Yuzu.Settings.TimeZones.functions.showTimeZoneInfoModal(timeZone.zoneId);
                } else {
                    console.log('[TIMEZONE-CARD] Using fallback callback');
                    onShowTimeZoneInfoModal(timeZone.zoneId);
                }
            };
            
            // 1. Add the event listener
            infoButton.addEventListener('click', infoClickHandler);
            
            // 2. Also set the onclick property directly
            (infoButton as HTMLElement).onclick = infoClickHandler;
            
            // 3. Also set the HTML attribute for absolute reliability
            (infoButton as HTMLElement).setAttribute('onclick', 
                `event.preventDefault(); 
                console.log('[TIMEZONE-CARD] Info button HTML onclick for: ${timeZone.zoneId}'); 
                if(typeof window.showTimeZoneInfoModal==='function') { 
                    window.showTimeZoneInfoModal('${timeZone.zoneId}'); 
                } else if(window.Yuzu && window.Yuzu.Settings && window.Yuzu.Settings.TimeZones) {
                    const manager = window.Yuzu.Settings.TimeZones.getInstance();
                    if(manager) manager.showTimeZoneInfoModal('${timeZone.zoneId}');
                }`
            );
            
            console.log('[TIMEZONE-CARD] Info button handler set up with triple redundancy');
        }

        const deleteButton = cardElement.querySelector('.card-delete-button');
        if (deleteButton) {
            // Use multiple approaches for maximum reliability
            
            // First, create a properly bound event handler
            const deleteClickHandler = (e: Event) => {
                e.preventDefault();
                console.log('[TIMEZONE-CARD] Delete button clicked for:', timeZone.zoneId);
                
                // Try multiple approaches to call the function
                if (typeof window.deleteTimeZone === 'function') {
                    console.log('[TIMEZONE-CARD] Calling global window.deleteTimeZone');
                    window.deleteTimeZone(timeZone.zoneId);
                } else if (window.Yuzu?.Settings?.TimeZones?.functions?.deleteTimeZone) {
                    console.log('[TIMEZONE-CARD] Calling via Yuzu.Settings.TimeZones.functions');
                    window.Yuzu.Settings.TimeZones.functions.deleteTimeZone(timeZone.zoneId);
                } else {
                    console.log('[TIMEZONE-CARD] Using fallback callback');
                    onDeleteTimeZone(timeZone.zoneId);
                }
            };
            
            // 1. Add the event listener
            deleteButton.addEventListener('click', deleteClickHandler);
            
            // 2. Also set the onclick property directly
            (deleteButton as HTMLElement).onclick = deleteClickHandler;
            
            // 3. Also set the HTML attribute for absolute reliability
            (deleteButton as HTMLElement).setAttribute('onclick', 
                `event.preventDefault(); 
                console.log('[TIMEZONE-CARD] Delete button HTML onclick for: ${timeZone.zoneId}'); 
                if(typeof window.deleteTimeZone==='function') { 
                    window.deleteTimeZone('${timeZone.zoneId}'); 
                } else if(window.Yuzu && window.Yuzu.Settings && window.Yuzu.Settings.TimeZones) {
                    const manager = window.Yuzu.Settings.TimeZones.getInstance();
                    if(manager) manager.deleteTimeZone('${timeZone.zoneId}');
                }`
            );
            
            console.log('[TIMEZONE-CARD] Delete button handler set up with triple redundancy');
        }
    }

    // Apply weather information with icons for all card types
    if (timeZone.weatherInfo) {
        // Force explicit display of weather info on the card
        const weatherInfo = cardElement.querySelector('.card-weather-info');
        if (weatherInfo) {
            // Remove d-none class to ensure visibility
            weatherInfo.classList.remove('d-none');
            weatherInfo.classList.add('animate-in'); // Add animation class

            (weatherInfo as HTMLElement).style.display = 'block';
            (weatherInfo as HTMLElement).style.visibility = 'visible';
            (weatherInfo as HTMLElement).style.opacity = '1';
        }
        // Now update with icon and text
        updateWeatherInfoOnCard(timeZone, cardElement);
    }

    return cardElement;
}