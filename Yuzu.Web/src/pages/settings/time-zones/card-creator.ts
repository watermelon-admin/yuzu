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
 * @param isNewCard - Whether this is a newly added card (to display NEW tag)
 * @returns HTMLElement - The created card element
 */
export function createTimeZoneCard(
    timeZone: TimeZoneInfo, 
    onSetHomeTimeZone: (id: string) => void,
    onShowTimeZoneInfoModal: (id: string) => void,
    onDeleteTimeZone: (id: string) => void,
    isNewCard: boolean = false
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
                    <!-- Image Container -->
                    <div class="position-relative">
                        <!-- Time zone visual as main image -->
                        <div class="time-zone-image-container position-relative" 
                             style="height: 180px; border-radius: 0.5rem 0.5rem 0 0; overflow: hidden;">
                            <div class="timezone-background d-flex align-items-center justify-content-center w-100 h-100" style="background-color: #f0f7ff;">
                                <i class="bx bx-world display-1 text-primary opacity-25"></i>
                            </div>
                            
                            <!-- Home marker (centered text) -->
                            <div class="position-absolute top-0 start-0 end-0 mt-3 text-center">
                                <h3 class="h5 fw-semibold m-0 text-primary">
                                    <i class="bx bx-home me-1"></i>
                                    Home Time Zone
                                </h3>
                            </div>
                            
                            <!-- Single badge with three lines in bottom center with left-aligned text -->
                            <div class="position-absolute bottom-0 start-50 translate-middle-x mb-2 px-3 py-2 bg-dark bg-opacity-40 rounded text-white fs-sm text-start" style="min-width: 200px;">
                                <!-- Continent line -->
                                <div class="d-flex align-items-center mb-1">
                                    <i class="bx bx-map fs-sm me-1"></i>
                                    <span class="card-continent-sm">${timeZone.continent}</span>
                                </div>
                                
                                <!-- UTC offset line -->
                                <div class="d-flex align-items-center mb-1">
                                    <i class="bx bx-time fs-sm me-1"></i>
                                    <span class="card-utc-offset">${utcOffsetStr}</span>
                                </div>
                                
                                <!-- Weather info line - without static icon -->
                                <div class="d-flex align-items-center card-weather-container ${weatherVisibilityClass}">
                                    <span class="card-weather-info">${weatherHTML}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <h3 class="h5 fw-semibold text-truncate mb-0">
                            <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                            ${isNewCard ? '<span class="badge bg-success ms-2 new-badge">NEW</span>' : ''}
                        </h3>
                    </div>
                    
                    <div class="card-footer d-flex align-items-center justify-content-start py-3">
                        <!-- Dropdown menu for actions (reduced options for home time zone) -->
                        <div class="dropup">
                            <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-offset="0,30" aria-expanded="false">
                                <i class="bx bx-cog fs-sm me-1"></i>
                                Actions
                            </button>
                            <ul class="dropdown-menu">
                                <li>
                                    <a class="dropdown-item card-info-button" href="javascript:;">
                                        <i class="bx bx-info-circle fs-sm me-2"></i>
                                        Info
                                    </a>
                                </li>
                            </ul>
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
            
            // Add NEW badge if this is a new card
            if (isNewCard) {
                const cardTitle = cardElement.querySelector('.card-title');
                if (cardTitle) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success ms-2 new-badge';
                    badge.textContent = 'NEW';
                    cardTitle.appendChild(badge);
                }
            }

            const continent = cardElement.querySelector('.card-continent');
            if (continent) {
                continent.textContent = timeZone.continent;
            }
            
            // Also set the small continent label for the new design
            const continentSm = cardElement.querySelector('.card-continent-sm');
            if (continentSm) {
                continentSm.textContent = timeZone.continent;
            }

            const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
            if (utcOffsetEl) {
                utcOffsetEl.textContent = utcOffsetStr;
            }
        }

        // Add event handler for info button
        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            // Set the onclick attribute directly in HTML
            infoButton.setAttribute('onclick', `window.showTimeZoneInfoModal('${timeZone.zoneId}');`);
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
                    <!-- Image Container -->
                    <div class="position-relative">
                        <!-- Time zone visual as main image -->
                        <div class="time-zone-image-container position-relative" 
                             style="height: 180px; border-radius: 0.5rem 0.5rem 0 0; overflow: hidden;">
                            <div class="timezone-background d-flex align-items-center justify-content-center w-100 h-100 bg-light">
                                <i class="bx bx-world display-1 text-primary opacity-25"></i>
                            </div>
                            
                            <!-- Single badge with three lines in bottom center with left-aligned text -->
                            <div class="position-absolute bottom-0 start-50 translate-middle-x mb-2 px-3 py-2 bg-dark bg-opacity-40 rounded text-white fs-sm text-start" style="min-width: 200px;">
                                <!-- Continent line -->
                                <div class="d-flex align-items-center mb-1">
                                    <i class="bx bx-map fs-sm me-1"></i>
                                    <span class="card-continent-sm">${timeZone.continent}</span>
                                </div>
                                
                                <!-- UTC offset line -->
                                <div class="d-flex align-items-center mb-1">
                                    <i class="bx bx-time fs-sm me-1"></i>
                                    <span class="card-utc-offset">${utcOffsetStr}</span>
                                </div>
                                
                                <!-- Weather info line - without static icon -->
                                <div class="d-flex align-items-center card-weather-container ${weatherVisibilityClass}">
                                    <span class="card-weather-info">${weatherHTML}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <h3 class="h5 fw-semibold text-truncate mb-0">
                            <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                            ${isNewCard ? '<span class="badge bg-success ms-2 new-badge">NEW</span>' : ''}
                        </h3>
                    </div>
                    
                    <div class="card-footer d-flex align-items-center justify-content-start py-3">
                        <!-- Dropdown menu for actions -->
                        <div class="dropup">
                            <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-offset="0,30" aria-expanded="false">
                                <i class="bx bx-cog fs-sm me-1"></i>
                                Actions
                            </button>
                            <ul class="dropdown-menu">
                                <li>
                                    <a class="dropdown-item card-info-button" href="javascript:;">
                                        <i class="bx bx-info-circle fs-sm me-2"></i>
                                        Info
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item card-home-button" href="javascript:;">
                                        <i class="bx bx-home fs-sm me-2"></i>
                                        Set as Home
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item card-delete-button text-danger" href="javascript:;">
                                        <i class="bx bx-trash-alt fs-sm me-2"></i>
                                        Delete
                                    </a>
                                </li>
                            </ul>
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
            
            // Add NEW badge if this is a new card
            if (isNewCard) {
                const cardTitle = cardElement.querySelector('.card-title');
                if (cardTitle) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success ms-2 new-badge';
                    badge.textContent = 'NEW';
                    cardTitle.appendChild(badge);
                }
            }

            const continent = cardElement.querySelector('.card-continent');
            if (continent) {
                continent.textContent = timeZone.continent;
            }
            
            // Also set the small continent label for the new design
            const continentSm = cardElement.querySelector('.card-continent-sm');
            if (continentSm) {
                continentSm.textContent = timeZone.continent;
            }

            const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
            if (utcOffsetEl) {
                utcOffsetEl.textContent = utcOffsetStr;
            }
        }

        // Add event handlers for buttons
        const homeButton = cardElement.querySelector('.card-home-button');
        if (homeButton) {
            // Set the onclick attribute directly in HTML
            homeButton.setAttribute('onclick', `window.setHomeTimeZone('${timeZone.zoneId}');`);
        }

        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            // Set the onclick attribute directly in HTML
            infoButton.setAttribute('onclick', `window.showTimeZoneInfoModal('${timeZone.zoneId}');`);
        }

        const deleteButton = cardElement.querySelector('.card-delete-button');
        if (deleteButton) {
            // Set the onclick attribute directly in HTML
            deleteButton.setAttribute('onclick', `window.deleteTimeZone('${timeZone.zoneId}');`);
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
        
        // Make the weather container visible
        const weatherContainer = cardElement.querySelector('.card-weather-container');
        if (weatherContainer) {
            weatherContainer.classList.remove('d-none');
        }
        
        // Now update with icon and text
        updateWeatherInfoOnCard(timeZone, cardElement);
    }

    return cardElement;
}