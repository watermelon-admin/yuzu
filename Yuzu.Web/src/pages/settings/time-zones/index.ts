// src/pages/settings/time-zones/index.ts

import { createToast } from '../../../common/toast-util.js';

/**
 * Represents information about a time zone.
 */
export interface TimeZoneInfo {
    /** The unique identifier for the time zone. */
    zoneId: string;
    /** An array of city names within the time zone. */
    cities: string[];
    /** The name of the country associated with the time zone. */
    countryName: string;
    /** The continent where the time zone is located. */
    continent: string;
    /** UTC offset as a decimal number in hours (e.g., 5.5 for UTC+5:30) */
    utcOffset: number;
    /** The hours part of the UTC offset (e.g., 5 for UTC+5:30) */
    utcOffsetHours: number;
    /** The minutes part of the UTC offset (e.g., 30 for UTC+5:30) */
    utcOffsetMinutes: number;
    /** Alternative name for the timezone */
    alias?: string;
    /** Indicates whether this timezone is the user's home timezone */
    isHome?: boolean;
    /** Weather information for this timezone location */
    weatherInfo?: string;
}

/**
 * Extends HTMLElement to allow storing event handler references
 * This interface enables us to attach properties to DOM elements without TypeScript errors
 */
interface ExtendedHTMLElement extends HTMLElement {
    _tzinfo_shown_handler?: EventListener;
    _tzinfo_hidden_handler?: EventListener;
    _tzinfo_interval?: number | null;
    _tzinfo_data?: TimeZoneInfo;
    _fixed_tzinfo?: TimeZoneInfo;
}

/**
 * Manages the time zones section of the settings page
 */
export class TimeZonesManager {
    // Time zones properties
    private timeZoneList: TimeZoneInfo[] = [];
    private homeTimeZoneId: string | null = null;
    private timeZonesSearchTerm: string = '';
    private totalTimeZones: number = 0;
    private timeZonesCurrentPage: number = 1;
    private timeZonesPageSize: number = 10; // Increased to 10 cards per page
    private timeZoneModalFocusedRowIndex: number = -1;
    private timeZoneModalSelectedRowIndex: number = -1;
    private selectedTimeZoneId: string | null = null;
    private bootstrap: any = (window as any).bootstrap;
    
    // State tracking
    private isTimeZoneDataLoading: boolean = false;
    private isTimeZoneDataLoaded: boolean = false;
    
    /**
     * Creates a time zone card element based on the given time zone information
     * @param timeZone - The time zone information to create a card for
     * @returns HTMLElement - The created card element
     */
    private createTimeZoneCard(timeZone: TimeZoneInfo): HTMLElement {

        // ALERT BOX: Show when a new card is being created

        // Format the UTC offset string
        const utcOffsetStr = `UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;

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

            // Add event handler for info button
            const infoButton = cardElement.querySelector('.card-info-button');
            if (infoButton) {
                infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
            } else {
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

            // Add event handlers for buttons
            const homeButton = cardElement.querySelector('.card-home-button');
            if (homeButton) {
                homeButton.addEventListener('click', () => this.setHomeTimeZone(timeZone.zoneId));
            } else {
            }

            const infoButton = cardElement.querySelector('.card-info-button');
            if (infoButton) {
                infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
            } else {
            }

            const deleteButton = cardElement.querySelector('.card-delete-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => this.deleteTimeZone(timeZone.zoneId));
            } else {
            }
        }

        // Apply weather information with icons for all card types
        if (timeZone.weatherInfo) {
            // Force explicit display of weather info on the card
            const weatherInfo = cardElement.querySelector('.card-weather-info');
            if (weatherInfo) {
                // Remove d-none class to ensure visibility
                weatherInfo.classList.remove('d-none');

                // CRITICAL FIX: Explicitly set style to ensure visibility
                (weatherInfo as HTMLElement).style.display = 'block';
                (weatherInfo as HTMLElement).style.visibility = 'visible';
                (weatherInfo as HTMLElement).style.opacity = '1';

            }
            // Now update with icon and text
            this.updateWeatherInfoOnCard(timeZone, cardElement);
        } else {
        }

        return cardElement;
    }

    /**
     * Updates or hides weather information on time zone cards
     * @param timeZone The time zone data containing weather information
     * @param cardElement The card element to update
     */
    /**
     * Updates weather information on a time zone card with the appropriate weather icon
     * Key fix: This method ensures weather information is shown correctly on time zone cards
     * @param timeZone The time zone data with weather information
     * @param cardElement The element containing the card (could be the card itself, card body, or a wrapper)
     */
    private updateWeatherInfoOnCard(timeZone: TimeZoneInfo, cardElement: Element): void {
        // CRITICAL: Get the card element data attribute to verify we're operating on the right card
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

        // Extended logging for debugging

        // First, try to find the weather info element
        const weatherInfoElement = targetElement.querySelector('.card-weather-info');
        if (!weatherInfoElement) {

            // Try looking for it in the child elements (especially for DocumentFragment)
            const card = targetElement.querySelector('.card');
            if (card) {
                const weatherInCard = card.querySelector('.card-weather-info');
                if (weatherInCard) {
                    this.updateWeatherContent(timeZone, weatherInCard, cardPath);
                    return;
                }
            }

            return;
        }

        this.updateWeatherContent(timeZone, weatherInfoElement, cardPath);
    }

    /**
     * Helper method to update weather content with appropriate icon
     * This is extracted from updateWeatherInfoOnCard to avoid code duplication
     */
    private updateWeatherContent(timeZone: TimeZoneInfo, weatherInfoElement: Element, cardPath: string): void {

        // CRITICAL: Directly check if we have valid weather information
        if (timeZone.weatherInfo && timeZone.weatherInfo.length > 0) {
            // ALERT BOX: Show when weather is being updated for a card


            // Make sure the element is visible
            weatherInfoElement.classList.remove('d-none');

            // Log the computed style to check if it's actually visible
            try {
                const computedStyle = window.getComputedStyle(weatherInfoElement);
            } catch (error) {
            }

            // Add weather icon based on the weather description
            const weatherText = timeZone.weatherInfo.toLowerCase();
            let weatherIcon = '';

            if (weatherText.includes('clear') || weatherText.includes('sunny')) {
                weatherIcon = '<i class="bx bx-sun me-1"></i>';
            } else if (weatherText.includes('cloud')) {
                weatherIcon = '<i class="bx bx-cloud me-1"></i>';
            } else if (weatherText.includes('rain') || weatherText.includes('drizzle') || weatherText.includes('showers')) {
                weatherIcon = '<i class="bx bx-cloud-rain me-1"></i>';
            } else if (weatherText.includes('snow')) {
                weatherIcon = '<i class="bx bx-cloud-snow me-1"></i>';
            } else if (weatherText.includes('thunder')) {
                weatherIcon = '<i class="bx bx-cloud-lightning me-1"></i>';
            } else if (weatherText.includes('fog')) {
                weatherIcon = '<i class="bx bx-cloud-light-rain me-1"></i>';
            } else {
                weatherIcon = '<i class="bx bx-cloud me-1"></i>';
            }

            // Set the HTML directly with the weather icon
            const newContent = `${weatherIcon} ${timeZone.weatherInfo}`;
            weatherInfoElement.innerHTML = newContent;

            // Verify the content was actually set

            // CRITICAL FIX: Force visibility styles with multiple methods

            // First, remove any display:none that might be from CSS
            (weatherInfoElement as HTMLElement).style.removeProperty('display');

            // Now force visibility with multiple approaches
            (weatherInfoElement as HTMLElement).style.display = 'block';
            (weatherInfoElement as HTMLElement).style.visibility = 'visible';
            (weatherInfoElement as HTMLElement).style.opacity = '1';

            // Use !important to override any conflicting styles
            (weatherInfoElement as HTMLElement).setAttribute('style',
                'display: block !important; visibility: visible !important; opacity: 1 !important');
        } else {
            weatherInfoElement.classList.add('d-none');
        }

    }
    
    /**
     * Initialize the time zones manager
     */
    constructor() {
        // Initialize data and set up event handlers
        this.setupTimeZoneEventHandlers();

        // Export necessary methods to window for access from HTML attributes
        // Critical: These must be bound to the instance to work properly
        (window as any).showTimeZonesModal = this.showTimeZonesModal.bind(this);
        (window as any).showTimeZoneInfoModal = this.showTimeZoneInfoModal.bind(this);
        (window as any).setHomeTimeZone = this.setHomeTimeZone.bind(this);
        (window as any).deleteTimeZone = this.deleteTimeZone.bind(this);
        // This is particularly important for pagination to work
        (window as any).changePage = this.changePage.bind(this);
        (window as any).selectAndConfirmTimeZone = this.selectAndConfirmTimeZone.bind(this);
        (window as any).confirmSelection = this.confirmSelection.bind(this);


        // Set up a mutation observer to ensure weather info is displayed correctly when cards are added
        this.setupWeatherDisplayObserver();
    }


    /**
     * Sets up a mutation observer to ensure weather information is displayed correctly
     * when new time zone cards are added to the DOM
     */
    private setupWeatherDisplayObserver(): void {

        // Function to process newly added cards and ensure weather info is displayed
        const processWeatherElements = (addedNodes: NodeList) => {

            // Check each added node for weather elements
            Array.from(addedNodes).forEach((node) => {
                if (!(node instanceof HTMLElement)) return;

                // If this is a card or contains cards
                const weatherElements = node.querySelectorAll('.card-weather-info');

                weatherElements.forEach(element => {
                    const weatherElement = element as HTMLElement;
                    const content = weatherElement.textContent || '';


                    // If it has weather content but is hidden, make it visible
                    if (content && content.trim() !== '') {

                        // Remove d-none class
                        weatherElement.classList.remove('d-none');

                        // Apply direct styles to ensure visibility
                        weatherElement.style.display = 'block';
                        weatherElement.style.visibility = 'visible';
                        weatherElement.style.opacity = '1';

                        // Add weather icon if not present
                        if (!weatherElement.querySelector('i.bx')) {
                            const weatherText = content.toLowerCase();
                            let iconClass = 'bx-cloud';

                            if (weatherText.includes('clear') || weatherText.includes('sunny')) {
                                iconClass = 'bx-sun';
                            } else if (weatherText.includes('rain') || weatherText.includes('drizzle')) {
                                iconClass = 'bx-cloud-rain';
                            }

                            const icon = document.createElement('i');
                            icon.className = `bx ${iconClass} me-1`;
                            weatherElement.insertBefore(icon, weatherElement.firstChild);
                        }
                    } else {
                        weatherElement.classList.add('d-none');
                    }
                });
            });
        };

        // Create a mutation observer to watch for new cards
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    processWeatherElements(mutation.addedNodes);
                }
            });
        });

        // Start observing the container for added cards
        const container = document.getElementById('time-zone-container');
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        } else {

            // If container doesn't exist yet, wait and try again
            setTimeout(() => {
                const delayedContainer = document.getElementById('time-zone-container');
                if (delayedContainer) {
                    observer.observe(delayedContainer, { childList: true, subtree: true });
                } else {
                }
            }, 1000);
        }
    }
    
    /**
     * Sets up event handlers for search and pagination.
     */
    private setupTimeZoneEventHandlers(): void {
        // Search input handler
        const searchInput = document.getElementById('time-zones-search-term') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.timeZonesCurrentPage = 1;
                    this.loadTimeZones(searchInput.value);
                }
            });
        }

        // Search button handler
        const searchButton = document.getElementById('time-zones-search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const searchTerm = (document.getElementById('time-zones-search-term') as HTMLInputElement).value;
                this.timeZonesCurrentPage = 1;
                this.loadTimeZones(searchTerm);
            });
        }

        // Select button handler
        const selectButton = document.getElementById('time-zones-search-select-button');
        if (selectButton) {
            selectButton.addEventListener('click', async () => {
                if (this.selectedTimeZoneId) {
                    const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
                    if (!antiforgeryInput) return;

                    try {
                        // Use current path for correct routing
                        const url = `${document.location.pathname}?handler=SelectTimeZone`;
                            
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                                'RequestVerificationToken': antiforgeryInput.value
                            },
                            body: JSON.stringify({ selectedTimeZoneId: this.selectedTimeZoneId }),
                            credentials: 'same-origin'
                        });

                        // First, try to read the response as text
                        const responseText = await response.text();
                        
                        // Try to parse as JSON
                        let data;
                        try {
                            data = JSON.parse(responseText);
                        } catch (e) {
                            // Check if we got HTML and the request failed
                            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
                                throw new Error('Server returned HTML instead of JSON - request may have been processed incorrectly');
                            }
                            
                            throw new Error('Failed to parse server response');
                        }
                        
                        if (!response.ok || !data.success) {
                            throw new Error(data.error || data.message || 'Failed to add timezone');
                        }

                        // Close the modal first
                        const modal = this.bootstrap.Modal.getInstance(document.getElementById('time-zones-search-modal'));
                        if (modal) {
                            modal.hide();
                        }

                        // Show success message
                        createToast('Success: Timezone added successfully', true);
                        
                        // Let's manually append this timezone to the DOM
                        // First get the selected timezone info
                        const newTimeZone = this.timeZoneList.find(tz => tz.zoneId === this.selectedTimeZoneId);
                        if (newTimeZone) {
                            // Fetch weather info for this timezone before displaying it
                            try {

                                // Fetch all timezone data with weather
                                const weatherUrl = `${document.location.pathname}?handler=UserTimeZones&pageNumber=1&pageSize=50&includeWeather=true`;

                                const weatherResponse = await fetch(weatherUrl, {
                                    method: 'GET',
                                    headers: {
                                        'X-Requested-With': 'XMLHttpRequest',
                                        'Accept': 'application/json'
                                    },
                                    cache: 'no-store' // Prevent caching
                                });


                                if (weatherResponse.ok) {
                                    const responseText = await weatherResponse.text();

                                    // Parse the response
                                    let weatherData;
                                    try {
                                        weatherData = JSON.parse(responseText);
                                    } catch (parseError) {
                                        throw new Error('Failed to parse weather data response');
                                    }

                                    if (weatherData.success && weatherData.data?.data) {

                                        // Log some of the time zones with weather data for debugging
                                        weatherData.data.data.slice(0, 2).forEach((tz: TimeZoneInfo, index: number) => {
                                        });

                                        // Find our time zone in the data
                                        const tzWithWeather = weatherData.data.data.find(
                                            (tz: TimeZoneInfo) => tz.zoneId === newTimeZone.zoneId
                                        );

                                        if (tzWithWeather) {

                                            if (tzWithWeather.weatherInfo) {
                                                // Add weather info to our time zone object
                                                newTimeZone.weatherInfo = tzWithWeather.weatherInfo;

                                                // Log the full updated object for verification
                                            } else {
                                            }
                                        } else {
                                        }
                                    } else {
                                    }
                                } else {
                                }

                            } catch (error) {
                                // Continue without weather info if there's an error
                            }

                            // CRITICAL: Ensure weather info is kept and used when card is appended

                            // Critical fix: Ensure weather info is available by double checking it's valid
                            if (newTimeZone.weatherInfo && newTimeZone.weatherInfo.length > 0) {
                            } else {
                            }

                            // Append the card - weather info should be carried over if available
                            await this.appendTimeZoneCard(newTimeZone);

                            // Final verification: Find the newly added card and check its weather info
                            setTimeout(() => {
                                const newCard = document.querySelector(`[data-timezone-id="${newTimeZone.zoneId}"]`);
                                if (newCard) {
                                    const weatherEl = newCard.querySelector('.card-weather-info');
                                    if (weatherEl) {

                                        // Ensure visibility with one last check
                                        if (newTimeZone.weatherInfo && newTimeZone.weatherInfo.length > 0) {
                                            weatherEl.classList.remove('d-none');
                                            (weatherEl as HTMLElement).style.display = 'block';
                                            (weatherEl as HTMLElement).style.visibility = 'visible';
                                            (weatherEl as HTMLElement).setAttribute('style', 'display: block !important');
                                        }
                                    } else {
                                    }
                                } else {
                                }
                            }, 100);
                        }

                    } catch (error) {
                        console.error('Error adding timezone:', error);
                        createToast('Error: Failed to add timezone. Please try again.', false);
                    }
                }
            });
        }
    }
    
    /**
     * Loads timezone data with appropriate loading states
     * @param forceRefresh - If true, force a fresh load from server even if already loaded
     */
    public async loadTimeZonesData(forceRefresh: boolean = false): Promise<void> {
        
        // Get the container
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('Time zone container not found: time-zone-container');
            return;
        }
        
        // Check if the container is already loaded using the data-loaded attribute
        // Skip this check if forceRefresh is true
        const isLoaded = container.getAttribute('data-loaded') === 'true';
        if (isLoaded && !forceRefresh) {
            return;
        }
        
        // If data is already being loaded, don't start another load operation
        if (this.isTimeZoneDataLoading) {
            return;
        }
        
        // Mark as loading
        this.isTimeZoneDataLoading = true;
        
        try {
            // Clear the container completely
            container.innerHTML = '';
            
            // Show loading state
            container.innerHTML = `
            <div class="col-12 text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading timezones...</span>
                </div>
                <p class="mt-2">Loading your timezones...</p>
            </div>`;
            
            // Load both user's timezones and all available timezones
            await Promise.all([
                this.loadUserTimeZonesDisplay(),
                this.loadAvailableTimeZones()
            ]);
            
            // Mark as loaded in both our class and the container's data attribute
            this.isTimeZoneDataLoaded = true;
            container.setAttribute('data-loaded', 'true');
        } catch (error) {
            console.error('Failed to load timezone data:', error);
            
            // Show error state in the container
            container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Failed to load timezone data. 
                    <a href="#" onclick="event.preventDefault(); window.location.reload();">Refresh</a> to try again.
                </p>
            </div>`;
            
            // Reset the data-loaded attribute since we failed
            container.setAttribute('data-loaded', 'false');
        } finally {
            this.isTimeZoneDataLoading = false;
        }
    }
    
    /**
     * Shows the time zones modal dialog.
     */
    public async showTimeZonesModal(): Promise<void> {
        const timeZonesModalElement = document.getElementById('time-zones-search-modal');
        if (!timeZonesModalElement) {
            console.error('Modal element not found: time-zones-search-modal');
            return;
        }

        // Reset state when opening modal
        this.timeZonesCurrentPage = 1;
        this.timeZoneModalFocusedRowIndex = -1;
        this.selectedTimeZoneId = null;
        this.timeZonesSearchTerm = '';

        // Initialize select button state
        const selectButton = document.getElementById('time-zones-search-select-button') as HTMLButtonElement;
        if (selectButton) {
            selectButton.setAttribute('disabled', '');
            selectButton.classList.remove('btn-primary');
            selectButton.classList.add('btn-secondary');
        }

        // Load all timezone data first
        try {
            // Load both to ensure we have the latest data
            await this.loadTimeZonesData();
        } catch (error) {
            console.error('Failed to load timezone data:', error);
            return;
        }

        // Create or get the Bootstrap modal instance
        let timeZonesModal: any;
        if (typeof this.bootstrap?.Modal === 'function') {
            // Get existing modal instance or create a new one
            timeZonesModal = this.bootstrap.Modal.getInstance(timeZonesModalElement) || 
                             new this.bootstrap.Modal(timeZonesModalElement, {
                                 keyboard: true
                             });
        } else {
            console.error('Bootstrap Modal not available');
            return;
        }

        // Clean up existing event listener to avoid duplicates
        const newShownListener = () => {
            const searchInput = document.getElementById('time-zones-search-term') as HTMLInputElement;
            if (searchInput) {
                searchInput.value = '';
                // Load all timezones initially with empty search
                this.loadTimeZones('');
                // Set focus after a short delay to ensure the modal is fully rendered
                setTimeout(() => {
                    searchInput.focus();
                }, 50);
            }
        };

        // Store reference to the function for later removal
        const shownEventKey = 'shown.bs.modal.timeZones';
        
        // Remove any existing listener with the same key
        timeZonesModalElement.removeEventListener(shownEventKey, newShownListener);
        
        // Add the new listener
        timeZonesModalElement.addEventListener('shown.bs.modal', newShownListener);

        // Show the modal
        timeZonesModal.show();
    }
    
    /**
     * Loads the list of available timezones from the backend
     */
    private async loadAvailableTimeZones(): Promise<void> {
        try {
            // Use current path for correct routing - exact pattern from working code
            const url = `${document.location.pathname}?handler=AvailableTimeZones`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseData = await response.json();
            
            // Process the standardized response
            if (responseData.success) {
                this.timeZoneList = responseData.data || [];
            } else {
                console.error('API request failed:', responseData.message);
                throw new Error(responseData.message || 'Failed to load available timezones');
            }
        } catch (error) {
            console.error('Error loading available timezones:', error);
            throw error; // Re-throw to handle in calling function
        }
    }
    
    /**
     * Loads and displays user's selected time zones in the main page container.
     */
    private async loadUserTimeZonesDisplay(): Promise<void> {
        const container = document.getElementById('time-zone-container');
        
        if (!container) {
            return;
        }
        
        // LOG CONTAINER STATE BEFORE CLEARING
        if (container.children.length > 0) {
            
            // Log first couple of children types to see what's there
            Array.from(container.children).slice(0, 2).forEach((child, i) => {
            });
        }
        
        // Clear any existing content completely using a more efficient approach
        container.innerHTML = '';
        
        // Show loading state immediately
        container.innerHTML = `
        <div class="col-12 text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading timezones for page ${this.timeZonesCurrentPage}...</span>
            </div>
            <p class="mt-2">Loading your timezones...</p>
        </div>`;
        

        try {
            // Use current path for correct routing and include weather information
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=${this.timeZonesCurrentPage}&pageSize=${this.timeZonesPageSize}&includeWeather=true`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                // Add cache busting to prevent browser caching
                cache: 'no-store'
            });
            
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Log actual response text for debugging
            const responseText = await response.text();
            
            // Parse the JSON
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Failed to parse server response as JSON');
            }
            
            // Process the standardized response
            if (!responseData.success) {
                throw new Error(responseData.message || 'Failed to load user timezones');
            }
            
            const timeZones = responseData.data?.data || [];
            const totalCount = responseData.data?.totalItems || 0;
            this.homeTimeZoneId = responseData.data?.homeTimeZoneId || null;
            
            
            // Log the first timezone if available for debugging
            if (timeZones.length > 0) {
            } else {
            }
            
            // Clear the container again to remove loading indicator
            container.innerHTML = '';
            
            if (timeZones.length > 0) {
                
                // Create a document fragment to batch DOM operations
                const fragment = document.createDocumentFragment();
                
                // Use template elements when possible for better performance
                const homeTemplate = document.getElementById('home-time-zone-card-template') as HTMLTemplateElement;
                const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;
                
                
                timeZones.forEach((timeZone: TimeZoneInfo, index: number) => {
                    try {

                        // Use our reusable helper to create the card
                        const cardElement = this.createTimeZoneCard(timeZone);

                        // Add the card to our fragment
                        fragment.appendChild(cardElement);
                    } catch (err) {
                    }
                });
                
                // Now add all cards to the container at once
                container.appendChild(fragment);
                
                // Mark the container as loaded
                container.setAttribute('data-loaded', 'true');
                
                // Setup pagination
                this.setupUserTimeZonesPagination(totalCount);
                
            } else {
                // Show empty state message
                container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                </div>`;
                
                // Still mark as loaded even though it's empty
                container.setAttribute('data-loaded', 'true');
                
                // Clear pagination
                const paginationContainer = document.getElementById('time-zones-pagination-controls');
                if (paginationContainer) {
                    paginationContainer.innerHTML = '';
                }
            }
        } catch (error) {
            container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">An error occurred while loading your timezones. Please try again.</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                    <i class="bx bx-refresh me-1"></i> Reload Page
                </button>
            </div>`;
            
            // Mark as not loaded so we'll try again next time
            container.setAttribute('data-loaded', 'false');
        }
        
        // Final verification
    }
    
    /**
     * Set up pagination for user time zones list
     */
    private setupUserTimeZonesPagination(totalCount: number): void {
        
        const totalPages = Math.ceil(totalCount / this.timeZonesPageSize);
        
        const paginationContainer = document.getElementById('time-zones-pagination-controls');
        
        // Handle the container - always clear old pagination
        if (!paginationContainer) {
            return;
        }
        
        // Log pagination container state before clearing
        
        // Clear any existing pagination controls
        paginationContainer.innerHTML = '';
        
        // Skip pagination rendering if only one page
        if (totalPages <= 1) {
            return;
        }
        
        // Calculate pagination variables
        
        // Ensure current page is within valid range
        if (this.timeZonesCurrentPage > totalPages) {
            this.timeZonesCurrentPage = totalPages;
        } else if (this.timeZonesCurrentPage < 1) {
            this.timeZonesCurrentPage = 1;
        }
        
        // Generate simple pagination HTML using inline onclick handlers for compatibility
        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
        <li class="page-item ${this.timeZonesCurrentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage(${this.timeZonesCurrentPage - 1}, null)" 
               aria-label="Previous"
               ${this.timeZonesCurrentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>`;
        
        // Calculate page range to display
        let startPage = Math.max(1, this.timeZonesCurrentPage - 2);
        let endPage = Math.min(totalPages, this.timeZonesCurrentPage + 2);
        
        // Adjust the range to show at least 5 pages if possible
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(5, totalPages);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, totalPages - 4);
            }
        }
        
        
        // First page (if not in normal range)
        if (startPage > 1) {
            paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" 
                   onclick="event.preventDefault(); window.changePage(1, null)"
                   aria-label="Page 1">1</a>
            </li>`;
            
            if (startPage > 2) {
                paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
                </li>`;
            }
        }
        
        // Page numbers in the calculated range
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
            <li class="page-item ${i === this.timeZonesCurrentPage ? 'active' : ''}">
                <a class="page-link" href="#" 
                   onclick="event.preventDefault(); window.changePage(${i}, null)"
                   aria-label="Page ${i}"
                   aria-current="${i === this.timeZonesCurrentPage ? 'page' : 'false'}"
                   ${i === this.timeZonesCurrentPage ? 'tabindex="0"' : ''}>
                    ${i}
                </a>
            </li>`;
        }
        
        // Last page (if not in normal range)
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
                </li>`;
            }
            
            paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" 
                   onclick="event.preventDefault(); window.changePage(${totalPages}, null)"
                   aria-label="Page ${totalPages}">${totalPages}</a>
            </li>`;
        }
        
        // Next button
        paginationHtml += `
        <li class="page-item ${this.timeZonesCurrentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage(${this.timeZonesCurrentPage + 1}, null)" 
               aria-label="Next"
               ${this.timeZonesCurrentPage === totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>`;
        
        // Page summary (simple text, not a link)
        paginationHtml += `
        <li class="page-item disabled ms-3">
            <span class="page-link bg-transparent border-0">
                Page ${this.timeZonesCurrentPage} of ${totalPages} (${totalCount} items)
            </span>
        </li>`;
        
        
        // Set the HTML
        paginationContainer.innerHTML = paginationHtml;
        
        // Verify pagination was set
        
        // Validate click handlers by getting all the links
        const pageLinks = paginationContainer.querySelectorAll('a.page-link');
    }
    
    /**
     * Changes the current page and reloads the user timezone list.
     * This function must be exposed to window to work with onclick handlers.
     */
    public changePage(page: number, searchTerm: string | null): void {
        
        if (page < 1) {
            return;
        }
        
        // Update the current page first
        this.timeZonesCurrentPage = page;
        
        // Check if this is a modal search or main page navigation
        if (searchTerm !== null) {
            // This is for the modal search results
            
            // Convert null to empty string if needed
            const term = searchTerm || '';
            this.timeZonesSearchTerm = term;
            this.loadTimeZones(term);
        } else {
            // This is for the user time zones pagination on the main page
            
            // Reset the selection state when changing pages
            this.timeZoneModalFocusedRowIndex = -1;
            this.timeZoneModalSelectedRowIndex = -1;
            
            // Reset the container's data-loaded attribute to false
            // to ensure content refreshes for the new page
            const container = document.getElementById('time-zone-container');
            if (container) {
                container.setAttribute('data-loaded', 'false');
                
                // Log current container state
                if (container.children.length > 0) {
                    // Log first child type for debugging
                }
            } else {
            }
            
            // Load the user display for the selected page
            this.loadUserTimeZonesDisplay();
        }
    }
    
    /**
     * Searches and paginates the time zone list based on the given search term.
     */
    private searchTimeZones(
        searchTerm: string,
        page: number = 1,
        pageSize: number = 10
    ): { pagedResults: TimeZoneInfo[], totalCount: number } {
        const filteredTimeZones = this.timeZoneList.filter(tz =>
            (tz.cities && tz.cities[0] && tz.cities[0].toLowerCase().includes(searchTerm.toLowerCase())) ||
            (tz.countryName && tz.countryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (tz.continent && tz.continent.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (tz.alias && tz.alias.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const startIndex = (page - 1) * pageSize;
        const pagedResults = filteredTimeZones.slice(startIndex, startIndex + pageSize);

        return { pagedResults, totalCount: filteredTimeZones.length };
    }
    
    /**
     * Initializes Bootstrap tooltips for the timezone table.
     */
    private initializeTooltips(): void {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(element => {
            new this.bootstrap.Tooltip(element);
        });
    }
    
    /**
     * Loads and displays time zones based on the current search term and pagination.
     */
    private loadTimeZones(searchTerm: string): void {
        this.timeZonesSearchTerm = searchTerm; // Store the current search term
        const tableBody = document.getElementById('time-zones-search-table-body');
        if (!tableBody) {
            console.error('Table body element not found: time-zones-search-table-body');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        try {
            // Use in-memory search for the modal table (we don't need to hit the server again)
            // This way we avoid additional server round-trips after initial data load
            const { pagedResults, totalCount } = this.searchTimeZones(searchTerm, this.timeZonesCurrentPage, this.timeZonesPageSize);
            this.totalTimeZones = totalCount; // Store the total count

            tableBody.innerHTML = '';

            if (pagedResults.length > 0) {
                pagedResults.forEach((timeZone, index) => {
                    const row = document.createElement('tr');
                    row.setAttribute('role', 'option');
                    row.setAttribute('aria-selected', 'false');
                    row.setAttribute('tabindex', '0');
                    row.setAttribute('data-zone-id', timeZone.zoneId);

                    // Format the UTC offset nicely
                    const utcOffsetFormatted = `UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;

                    row.innerHTML = `
                    <th scope="row">${timeZone.continent}</th>
                    <td>${timeZone.countryName}</td>
                    <td title="${timeZone.cities[0]}" data-bs-toggle="tooltip" data-bs-placement="top">${timeZone.cities[0]}</td>
                    <td>${utcOffsetFormatted}</td>
                    <td>${timeZone.alias !== undefined ? timeZone.alias : ''}</td>`;

                    // If this was the previously selected timezone, restore selection
                    if (timeZone.zoneId === this.selectedTimeZoneId) {
                        // Use the helper method to apply consistent styling
                        this.applySelectedRowStyling(row);
                    }

                    tableBody.appendChild(row);
                });

                this.initializeTooltips();
                this.addRowSelection();

                // Restore focus after pagination
                if (this.timeZoneModalFocusedRowIndex >= 0) {
                    const rows = tableBody.querySelectorAll('tr[role="option"]');
                    if (this.timeZoneModalFocusedRowIndex >= rows.length) {
                        this.timeZoneModalFocusedRowIndex = rows.length - 1;
                    }
                    if (this.timeZoneModalFocusedRowIndex >= 0 && rows[this.timeZoneModalFocusedRowIndex]) {
                        this.updateFocusedRow(rows);
                    }
                }

                this.updateSearchResultsAnnouncement(totalCount, searchTerm);
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Sorry, I could not find any results. Please try again.</td></tr>';
                this.updateSearchResultsAnnouncement(0, searchTerm);
                this.timeZoneModalFocusedRowIndex = -1; // Reset focus when no results
            }

            this.setupPagination(searchTerm, totalCount);
        } catch (error) {
            console.error('Error loading time zones for search:', error);
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">An error occurred while searching. Please try again.</td></tr>';
        }
    }
    
    /**
     * Updates the search results announcement for screen readers.
     */
    private updateSearchResultsAnnouncement(totalCount: number, searchTerm: string = ''): void {
        const searchResults = document.getElementById('time-zones-search-results');
        if (searchResults) {
            const message = searchTerm
                ? `Found ${totalCount} timezone${totalCount !== 1 ? 's' : ''} matching "${searchTerm}"`
                : `Showing all ${totalCount} timezones`;
            searchResults.textContent = message;
        }
    }
    
    /**
     * Sets up pagination controls for the timezone table in the modal.
     */
    private setupPagination(searchTerm: string, totalCount: number): void {
        const totalPages = Math.ceil(totalCount / this.timeZonesPageSize);
        const paginationContainer = document.getElementById('time-zones-search-pagination-controls');
        if (!paginationContainer) {
            console.error('Modal pagination container not found');
            return;
        }

        // Clear existing pagination
        paginationContainer.innerHTML = '';
        
        // Skip pagination if only one page
        if (totalPages <= 1) {
            return;
        }

        let paginationHtml = '';
        
        // Escape the search term for use in onclick handlers
        const escapedSearchTerm = searchTerm.replace(/'/g, "\\'");

        // Previous button
        paginationHtml += `
        <li class="page-item ${this.timeZonesCurrentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage(${this.timeZonesCurrentPage - 1}, '${escapedSearchTerm}')" 
               aria-label="Previous"
               ${this.timeZonesCurrentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>`;

        // Calculate page range to display
        let startPage = Math.max(1, this.timeZonesCurrentPage - 2);
        let endPage = Math.min(totalPages, this.timeZonesCurrentPage + 2);
        
        // Adjust the range to show at least 5 pages if possible
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(5, totalPages);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, totalPages - 4);
            }
        }
        
        // First page (if not in normal range)
        if (startPage > 1) {
            paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" 
                   onclick="event.preventDefault(); window.changePage(1, '${escapedSearchTerm}')"
                   aria-label="Page 1">1</a>
            </li>`;
            
            if (startPage > 2) {
                paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
                </li>`;
            }
        }
        
        // Page numbers in the calculated range
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
            <li class="page-item ${i === this.timeZonesCurrentPage ? 'active' : ''}">
                <a class="page-link" href="#" 
                   onclick="event.preventDefault(); window.changePage(${i}, '${escapedSearchTerm}')"
                   aria-label="Page ${i}"
                   aria-current="${i === this.timeZonesCurrentPage ? 'page' : 'false'}"
                   ${i === this.timeZonesCurrentPage ? 'tabindex="0"' : ''}>
                    ${i}
                </a>
            </li>`;
        }
        
        // Last page (if not in normal range)
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
                </li>`;
            }
            
            paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" 
                   onclick="event.preventDefault(); window.changePage(${totalPages}, '${escapedSearchTerm}')"
                   aria-label="Page ${totalPages}">${totalPages}</a>
            </li>`;
        }

        // Next button
        paginationHtml += `
        <li class="page-item ${this.timeZonesCurrentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage(${this.timeZonesCurrentPage + 1}, '${escapedSearchTerm}')" 
               aria-label="Next"
               ${this.timeZonesCurrentPage === totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>`;
        
        // Add a summary of results
        paginationHtml += `
        <li class="page-item disabled ms-3">
            <span class="page-link bg-transparent border-0">
                ${totalCount} results found
            </span>
        </li>`;

        paginationContainer.innerHTML = paginationHtml;
    }
    
    /**
     * Adds click and keyboard selection behavior to table rows
     */
    private addRowSelection(): void {
        const rows = document.querySelectorAll('#time-zones-search-table-body tr[role="option"]');

        // Handle table container focus
        const tableBody = document.getElementById('time-zones-search-table-body');
        if (tableBody) {
            tableBody.addEventListener('focus', (event) => {
                if (event.target === tableBody) {
                    // When table receives focus, focus the first row if no row is focused
                    if (this.timeZoneModalFocusedRowIndex === -1 && rows.length > 0) {
                        this.timeZoneModalFocusedRowIndex = 0;
                        this.updateFocusedRow(rows);
                    }
                }
            });
        }

        rows.forEach((row, index) => {
            // Click handler
            row.addEventListener('click', () => {
                this.timeZoneModalFocusedRowIndex = index;
                this.updateFocusedRow(rows);
                this.selectTimeZone(row as HTMLElement);
            });

            // Double click handler
            row.addEventListener('dblclick', () => {
                this.selectTimeZone(row as HTMLElement);
                this.confirmSelection();
            });

            // Focus handler
            row.addEventListener('focus', () => {
                if (this.timeZoneModalFocusedRowIndex !== index) {
                    this.timeZoneModalFocusedRowIndex = index;
                    this.updateFocusedRow(rows);
                }
            });

            // Keyboard handler
            row.addEventListener('keydown', (event: KeyboardEvent) => {
                const key = event.key;
                const rowCount = rows.length;

                switch (key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        if (this.timeZoneModalFocusedRowIndex < rowCount - 1) {
                            this.timeZoneModalFocusedRowIndex++;
                            this.updateFocusedRow(rows);
                        }
                        break;

                    case 'ArrowUp':
                        event.preventDefault();
                        if (this.timeZoneModalFocusedRowIndex > 0) {
                            this.timeZoneModalFocusedRowIndex--;
                            this.updateFocusedRow(rows);
                        }
                        break;

                    case 'Home':
                        event.preventDefault();
                        this.timeZoneModalFocusedRowIndex = 0;
                        this.updateFocusedRow(rows);
                        break;

                    case 'End':
                        event.preventDefault();
                        this.timeZoneModalFocusedRowIndex = rowCount - 1;
                        this.updateFocusedRow(rows);
                        break;

                    case 'PageUp':
                        event.preventDefault();
                        if (this.timeZonesCurrentPage > 1) {
                            this.timeZonesCurrentPage--;
                            this.loadTimeZones(this.timeZonesSearchTerm);
                        }
                        break;

                    case 'PageDown':
                        event.preventDefault();
                        const maxPages = Math.ceil(this.totalTimeZones / this.timeZonesPageSize);
                        if (this.timeZonesCurrentPage < maxPages) {
                            this.timeZonesCurrentPage++;
                            this.loadTimeZones(this.timeZonesSearchTerm);
                        }
                        break;

                    case ' ':
                    case 'Enter':
                        event.preventDefault();
                        this.selectTimeZone(row as HTMLElement);
                        if (key === 'Enter') {
                            this.confirmSelection();
                        }
                        break;
                }
            });
        });

        // Set initial focus if not set
        if (this.timeZoneModalFocusedRowIndex === -1 && rows.length > 0) {
            this.timeZoneModalFocusedRowIndex = 0;
            this.updateFocusedRow(rows);
        }
    }
    
    /**
     * Updates the focused row in the timezone table.
     */
    private updateFocusedRow(rows: NodeListOf<Element>): void {
        rows.forEach((row, index) => {
            const element = row as HTMLElement;
            if (index === this.timeZoneModalFocusedRowIndex) {
                element.focus();
                element.classList.add('focused');
                // Ensure the row is visible
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                element.classList.remove('focused');
            }
        });
    }

    /**
     * Helper method to apply selected styling to a row
     */
    private applySelectedRowStyling(row: HTMLElement): void {
        // Add CSS class
        row.classList.add('selected');
        row.setAttribute('aria-selected', 'true');
        
        // Apply direct inline styles
        row.style.backgroundColor = '#343a40';
        row.style.color = 'white';
        
        // Style all cells in the row
        row.querySelectorAll('td, th').forEach(cell => {
            const cellElement = cell as HTMLElement;
            cellElement.style.backgroundColor = '#343a40';
            cellElement.style.color = 'white';
            cellElement.style.borderColor = '#212529';
        });
    }
    
    /**
     * Selects a timezone without confirming
     */
    private selectTimeZone(row: HTMLElement): void {
        const rows = document.querySelectorAll('#time-zones-search-table-body tr[role="option"]');
        rows.forEach(r => {
            r.classList.remove('selected');
            r.setAttribute('aria-selected', 'false');
            
            // Reset any custom background color or text color
            (r as HTMLElement).style.removeProperty('background-color');
            (r as HTMLElement).style.removeProperty('color');
            
            // Reset the text color in all cells of this row
            r.querySelectorAll('td, th').forEach(cell => {
                const cellElement = cell as HTMLElement;
                cellElement.style.removeProperty('background-color');
                cellElement.style.removeProperty('color');
                cellElement.style.removeProperty('border-color');
            });
        });

        // Apply selection styling
        this.applySelectedRowStyling(row);
        
        this.selectedTimeZoneId = row.getAttribute('data-zone-id');

        // Enable/disable select button based on selection
        const selectButton = document.getElementById('time-zones-search-select-button') as HTMLButtonElement;
        if (selectButton) {
            if (this.selectedTimeZoneId) {
                // Enable button and make it stand out
                selectButton.removeAttribute('disabled');
                selectButton.classList.remove('btn-secondary');
                selectButton.classList.add('btn-primary');
                selectButton.innerHTML = `Select &nbsp;<b>${row.querySelector('td:nth-child(3)')?.textContent}</b>`;
            } else {
                // Disable button when nothing selected
                selectButton.setAttribute('disabled', '');
                selectButton.classList.remove('btn-primary');
                selectButton.classList.add('btn-secondary');
                selectButton.innerHTML = 'Select Timezone';
            }
        }

        // Announce selection to screen readers
        const searchResults = document.getElementById('time-zones-search-results');
        if (searchResults && this.selectedTimeZoneId) {
            const timezone = this.timeZoneList.find(tz => tz.zoneId === this.selectedTimeZoneId);
            if (timezone) {
                searchResults.textContent = `Selected ${timezone.cities[0]}, ${timezone.countryName}`;
            }
        }
    }
    
    /**
     * Selects and confirms a timezone from the search results
     */
    public selectAndConfirmTimeZone(row: HTMLElement): void {
        this.selectTimeZone(row);
        this.confirmSelection();
    }
    
    /**
     * Confirms the current selection
     */
    public confirmSelection(): void {
        const selectButton = document.getElementById('time-zones-search-select-button');
        if (selectButton && !selectButton.hasAttribute('disabled')) {
            selectButton.click();
        }
    }

    /**
     * Deletes a timezone from the user's list
     */
    public async deleteTimeZone(timeZoneId: string): Promise<void> {
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!antiforgeryInput) {
            console.error('Antiforgery token not found');
            createToast('Error: Security token not found. Please refresh the page and try again.', false);
            return;
        }

        try {
            // Show a loading state on the card
            const card = document.querySelector(`[data-timezone-id="${timeZoneId}"]`);
            if (card) {
                const cardBody = card.querySelector('.card-body');
                const cardFooter = card.querySelector('.card-footer');
                
                if (cardBody) {
                    // Add overlay with spinner (light color to avoid black flash)
                    const overlay = document.createElement('div');
                    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-50 d-flex align-items-center justify-content-center';
                    overlay.style.zIndex = '1000';
                    overlay.innerHTML = `
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Deleting...</span>
                        </div>`;
                    
                    // Make the card relative positioned
                    (card as HTMLElement).style.position = 'relative';
                    card.appendChild(overlay);
                    
                    // Disable buttons
                    if (cardFooter) {
                        const buttons = cardFooter.querySelectorAll('button');
                        buttons.forEach(button => button.setAttribute('disabled', 'disabled'));
                    }
                }
            }
            
            // Use current path for correct routing
            const url = `${document.location.pathname}?handler=DeleteTimeZone`;
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'RequestVerificationToken': antiforgeryInput.value
                },
                body: JSON.stringify(timeZoneId),
                credentials: 'same-origin',
                // Prevent caching
                cache: 'no-store'
            });

            // First, try to read the response as text
            const responseText = await response.text();
            
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                // Check if we got HTML
                if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
                    throw new Error('Server returned HTML instead of JSON');
                }
                
                throw new Error('Failed to parse server response');
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to delete timezone');
            }
            
            // Show success message
            createToast('Success: Timezone deleted successfully', true);
            
            // Refresh the entire view to maintain pagination integrity
            const container = document.getElementById('time-zone-container');
            if (!container) {
                console.error('Time zone container not found for refreshing');
                return;
            }
            
            try {
                // Fetch the data for current page with weather information
                const dataResponse = await fetch(`${document.location.pathname}?handler=UserTimeZones&pageNumber=${this.timeZonesCurrentPage}&pageSize=${this.timeZonesPageSize}&includeWeather=true`, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    },
                    cache: 'no-store'
                });
                
                if (dataResponse.ok) {
                    const data = await dataResponse.json();
                    if (data.success) {
                        // Clear the container
                        container.innerHTML = '';
                        
                        // If there are time zones for the current page, display them
                        const timeZones = data.data?.data || [];
                        const totalCount = data.data?.totalItems || 0;
                        
                        if (timeZones.length > 0) {
                            // Create a document fragment to batch DOM operations
                            const fragment = document.createDocumentFragment();
                            
                            // Get the templates we'll use to create cards
                            const homeTemplate = document.getElementById('home-time-zone-card-template') as HTMLTemplateElement;
                            const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;
                            
                            
                            // Create elements for each time zone
                            timeZones.forEach((tz: TimeZoneInfo) => {
                                // Format UTC offset string
                                const utcOffsetStr = `UTC ${tz.utcOffsetHours >= 0 ? '+' : ''}${tz.utcOffsetHours}${tz.utcOffsetMinutes ? ':' + tz.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
                                
                                // Determine which template to use based on isHome flag
                                let cardElement: DocumentFragment | HTMLElement;
                                
                                if (tz.isHome && homeTemplate) {
                                    // Use the home template if available
                                    cardElement = homeTemplate.content.cloneNode(true) as DocumentFragment;
                                    
                                    // Set timezone ID on the wrapper div
                                    const wrapper = cardElement.querySelector('.col');
                                    if (wrapper) {
                                        wrapper.setAttribute('data-timezone-id', tz.zoneId);
                                    }
                                    
                                    // Fill in the data
                                    const cityCountry = cardElement.querySelector('.card-city-country');
                                    if (cityCountry) {
                                        cityCountry.textContent = `${tz.cities[0]}, ${tz.countryName}`;
                                    }
                                    
                                    const continent = cardElement.querySelector('.card-continent');
                                    if (continent) {
                                        continent.textContent = tz.continent;
                                    }
                                    
                                    const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
                                    if (utcOffsetEl) {
                                        utcOffsetEl.textContent = utcOffsetStr;
                                    }
                                    
                                    // Add weather information if available
                                    const weatherInfo = cardElement.querySelector('.card-weather-info');
                                    if (weatherInfo && tz.weatherInfo) {
                                        weatherInfo.textContent = tz.weatherInfo;
                                        weatherInfo.classList.remove('d-none');
                                    }
                                    
                                    // Add event handler for info button
                                    const infoButton = cardElement.querySelector('.card-info-button');
                                    if (infoButton) {
                                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                    } else {
                                    }
                                    
                                    // Update weather with icon
                                    const cardBody = cardElement.querySelector('.card-body');
                                    if (cardBody && tz.weatherInfo) {
                                        this.updateWeatherInfoOnCard(tz, cardBody);
                                    }
                                } 
                                else if (!tz.isHome && regularTemplate) {
                                    // Use the regular template if available
                                    cardElement = regularTemplate.content.cloneNode(true) as DocumentFragment;
                                    
                                    // Set timezone ID on the wrapper div
                                    const wrapper = cardElement.querySelector('.col');
                                    if (wrapper) {
                                        wrapper.setAttribute('data-timezone-id', tz.zoneId);
                                    }
                                    
                                    // Fill in the data
                                    const cityCountry = cardElement.querySelector('.card-city-country');
                                    if (cityCountry) {
                                        cityCountry.textContent = `${tz.cities[0]}, ${tz.countryName}`;
                                    }
                                    
                                    const continent = cardElement.querySelector('.card-continent');
                                    if (continent) {
                                        continent.textContent = tz.continent;
                                    }
                                    
                                    const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
                                    if (utcOffsetEl) {
                                        utcOffsetEl.textContent = utcOffsetStr;
                                    }
                                    
                                    // Add weather information if available
                                    const weatherInfo = cardElement.querySelector('.card-weather-info');
                                    if (weatherInfo && tz.weatherInfo) {
                                        weatherInfo.textContent = tz.weatherInfo;
                                        weatherInfo.classList.remove('d-none');
                                    }
                                    
                                    // Update weather with icon
                                    const cardBody = cardElement.querySelector('.card-body');
                                    if (cardBody && tz.weatherInfo) {
                                        this.updateWeatherInfoOnCard(tz, cardBody);
                                    }
                                    
                                    // Add event handlers for buttons
                                    const homeButton = cardElement.querySelector('.card-home-button');
                                    if (homeButton) {
                                        homeButton.addEventListener('click', () => this.setHomeTimeZone(tz.zoneId));
                                    } else {
                                    }
                                    
                                    const infoButton = cardElement.querySelector('.card-info-button');
                                    if (infoButton) {
                                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                    } else {
                                    }
                                    
                                    const deleteButton = cardElement.querySelector('.card-delete-button');
                                    if (deleteButton) {
                                        deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                    } else {
                                    }
                                }
                                else {
                                    // Fallback to manual creation if templates aren't available
                                    const div = document.createElement('div');
                                    div.className = 'col pb-lg-2 mb-4';
                                    div.setAttribute('data-timezone-id', tz.zoneId);
                                    
                                    if (tz.isHome) {
                                        div.innerHTML = `
                                            <article class="card settings-card h-100 border-primary">
                                                <div class="card-body">
                                                    <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                        <span class="card-city-country">${tz.cities[0]}, ${tz.countryName}</span>
                                                        <span class="badge bg-primary ms-2">Home</span>
                                                    </h5>
                                                    <p class="card-text card-continent mb-0">${tz.continent}</p>
                                                    <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                                                    <p class="card-text text-primary small card-weather-info mt-1 ${!tz.weatherInfo ? 'd-none' : ''}">${tz.weatherInfo || ''}</p>
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
                                        
                                        // Add event handlers
                                        const infoButton = div.querySelector('.card-info-button');
                                        if (infoButton) {
                                            infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                        }
                                    } else {
                                        div.innerHTML = `
                                            <article class="card settings-card h-100">
                                                <div class="card-body">
                                                    <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                        <span class="card-city-country">${tz.cities[0]}, ${tz.countryName}</span>
                                                    </h5>
                                                    <p class="card-text card-continent mb-0">${tz.continent}</p>
                                                    <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                                                    <p class="card-text text-primary small card-weather-info mt-1 ${!tz.weatherInfo ? 'd-none' : ''}">${tz.weatherInfo || ''}</p>
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
                                        
                                        // Add event handlers
                                        const homeButton = div.querySelector('.card-home-button');
                                        if (homeButton) {
                                            homeButton.addEventListener('click', () => this.setHomeTimeZone(tz.zoneId));
                                        }
                                        
                                        const infoButton = div.querySelector('.card-info-button');
                                        if (infoButton) {
                                            infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                        }
                                        
                                        const deleteButton = div.querySelector('.card-delete-button');
                                        if (deleteButton) {
                                            deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                        }
                                    }
                                    
                                    // Update weather with icon
                                    this.updateWeatherInfoOnCard(tz, div);
                                    
                                    // Set cardElement to the div we created
                                    cardElement = div;
                                }
                                
                                fragment.appendChild(cardElement);
                            });
                            
                            // Add all cards to the container at once
                            container.appendChild(fragment);
                            
                            // Update pagination
                            this.setupUserTimeZonesPagination(totalCount);
                        } else if (totalCount > 0) {
                            // Current page is empty but there are other pages
                            // If we're not already on page 1, go to previous page
                            if (this.timeZonesCurrentPage > 1) {
                                this.timeZonesCurrentPage = this.timeZonesCurrentPage - 1;
                                // Reload this page
                                this.changePage(this.timeZonesCurrentPage, null);
                                return;
                            } else {
                                // Go to page 1 explicitly since we were already on page 1
                                this.changePage(1, null);
                                return;
                            }
                        } else {
                            // No time zones at all - show empty state
                            container.innerHTML = `
                            <div class="col-12 text-center">
                                <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                            </div>`;
                            
                            // Clear pagination
                            const paginationContainer = document.getElementById('time-zones-pagination-controls');
                            if (paginationContainer) {
                                paginationContainer.innerHTML = '';
                            }
                        }
                    }
                    
                    // Ensure container is marked as loaded
                    container.setAttribute('data-loaded', 'true');
                } else {
                    console.error('Failed to reload time zones after deletion');
                }
            } catch (error) {
                console.error('Error updating time zones after deletion:', error);
                // Not critical, we've already deleted from server
            }
        } catch (error) {
            console.error('Error deleting timezone:', error);
            createToast('Error: Failed to delete timezone. Please try again.', false);
            
            // Remove any loading overlays
            const overlays = document.querySelectorAll('[data-timezone-id] .position-absolute');
            overlays.forEach(overlay => overlay.remove());
            
            // Re-enable any buttons
            const buttons = document.querySelectorAll('[data-timezone-id] button[disabled]');
            buttons.forEach(button => button.removeAttribute('disabled'));
        }
    }

    /**
     * Updates the display when a timezone is set as home
     * @param newHomeTimeZoneId The ID of the new home timezone
     */
    private async updateHomeTimeZoneDisplay(newHomeTimeZoneId: string): Promise<void> {
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('Container not found for updating home timezone');
            return;
        }
        
        // Store the new home timezone ID
        this.homeTimeZoneId = newHomeTimeZoneId;
        
        // Find all timezone cards
        const cards = container.querySelectorAll('[data-timezone-id]');
        cards.forEach(card => {
            const cardId = card.getAttribute('data-timezone-id');
            const article = card.querySelector('article');
            const title = card.querySelector('.card-title');
            const footer = card.querySelector('.card-footer');
            
            if (cardId === newHomeTimeZoneId) {
                // This is the new home timezone
                if (article) {
                    article.classList.add('border-primary');
                }
                
                // Add the home badge if it doesn't exist
                if (title && !title.querySelector('.badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-primary ms-2';
                    badge.textContent = 'Home';
                    title.appendChild(badge);
                }
                
                // Remove the footer with buttons
                if (footer) {
                    footer.remove();
                }
            } else {
                // For all other cards, ensure they're not marked as home
                if (article) {
                    article.classList.remove('border-primary');
                }
                
                // Remove any home badge
                const badge = title?.querySelector('.badge');
                if (badge) {
                    badge.remove();
                }
                
                // Ensure they have a footer with buttons
                if (!footer && article) {
                    const newFooter = document.createElement('div');
                    newFooter.className = 'card-footer d-flex align-items-center py-3';
                    newFooter.innerHTML = `
                        <div class="d-flex">
                            <button type="button" class="card-home-button btn btn-sm btn-outline-primary me-3">
                                <i class="bx bx-home fs-xl me-1"></i>
                                <span class="d-none d-md-inline">Set as Home</span>
                            </button>
                            <button type="button" class="card-delete-button btn btn-sm btn-outline-danger">
                                <i class="bx bx-trash-alt fs-xl me-1"></i>
                                <span class="d-none d-md-inline">Delete</span>
                            </button>
                        </div>
                    `;
                    
                    // Add event handlers to the new buttons
                    const homeButton = newFooter.querySelector('.card-home-button');
                    if (homeButton && cardId) {
                        homeButton.addEventListener('click', () => this.setHomeTimeZone(cardId));
                    }
                    
                    const infoButton = newFooter.querySelector('.card-info-button');
                    if (infoButton && cardId) {
                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(cardId));
                    }
                    
                    const deleteButton = newFooter.querySelector('.card-delete-button');
                    if (deleteButton && cardId) {
                        deleteButton.addEventListener('click', () => this.deleteTimeZone(cardId));
                    }
                    
                    article.appendChild(newFooter);
                }
            }
        });
    }
    
    /**
     * Directly appends a timezone card to the container
     * This is used when adding a new timezone to avoid refreshing the entire list
     * @param timeZone - The timezone to append
     */
    private async appendTimeZoneCard(timeZone: TimeZoneInfo): Promise<void> {
        const container = document.getElementById('time-zone-container');
        if (!container) {
            return;
        }


        // Check if we have the empty message and remove ONLY the empty message, not all content
        const emptyMessage = container.querySelector('.col-12 .text-muted');
        if (emptyMessage && emptyMessage.parentElement) {
            // Only remove the empty message parent element, not all cards
            const emptyMessageCol = emptyMessage.closest('.col-12');
            if (emptyMessageCol) {
                emptyMessageCol.remove();
            }
        }

        // Check if this timezone is already in the container to avoid duplicates
        const existingCard = container.querySelector(`[data-timezone-id="${timeZone.zoneId}"]`);
        if (existingCard) {
            return;
        }

        // Use our reusable card creation helper
        let cardElement = this.createTimeZoneCard(timeZone);

        // Check if weather info is properly displayed on the newly created card
        const weatherInfoElement = cardElement.querySelector('.card-weather-info');
        if (weatherInfoElement) {2

            // Force weather element to be visible if there's weather info
            if (timeZone.weatherInfo) {
                weatherInfoElement.classList.remove('d-none');
                (weatherInfoElement as HTMLElement).style.display = 'block';
                (weatherInfoElement as HTMLElement).style.visibility = 'visible';
                (weatherInfoElement as HTMLElement).style.opacity = '1';
            }
        } else {
        }

        
        // Reset currentPage to 1 to avoid asking for an empty page
        // This fixes the issue where adding a timezone while on a search results page
        // would try to fetch data for that page number in the user's timezone list
        const oldPage = this.timeZonesCurrentPage;
        this.timeZonesCurrentPage = 1;
        
        // Instead of trying to manage pagination, simply reload the whole view
        // Simpler approach that avoids race conditions and ensures pagination is correct
        try {
            // First add the timezone to the server
            // This was already done in the caller, so we just need to refresh the view
            
            // Get accurate count and update the view

            // CRITICAL FIX: We MUST include weather info when refreshing after adding a new time zone
            // This is the root cause of the weather info disappearing after adding a new card
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=${this.timeZonesCurrentPage}&pageSize=${this.timeZonesPageSize}&includeWeather=true`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                cache: 'no-store'
            });
            
            
            if (response.ok) {
                // Log actual response text for debugging
                const responseText = await response.text();
                
                // Parse the JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    throw new Error('Failed to parse server response as JSON');
                }
                
                if (data.success) {
                    // Clear the container entirely to ensure we don't get duplicates
                    container.innerHTML = '';
                    
                    // If there are time zones, display them
                    const timeZones = data.data?.data || [];
                    const totalCount = data.data?.totalItems || 0;
                    
                    
                    // Log the first timezone if available for debugging
                    if (timeZones.length > 0) {

                        // CRITICAL: Verify weather info is present in the received data
                        const firstTz = timeZones[0];
                        if (firstTz.weatherInfo) {
                            // ALERT BOX: Show when cards are being refreshed with weather data
                        } else {
                        }
                    } else {
                    }
                    
                    if (timeZones.length > 0) {
                        
                        // Create a document fragment to batch DOM operations
                        const fragment = document.createDocumentFragment();
                        
                        // Create elements for each time zone
                        timeZones.forEach((tz: TimeZoneInfo) => {

                            if (tz.weatherInfo) {
                            }

                            // Create card element using our reusable helper
                            const cardElement = this.createTimeZoneCard(tz);

                            // CRITICAL: Explicitly ensure weather info is displayed on the card
                            if (tz.weatherInfo) {
                                // ALERT BOX: Show when explicitly applying weather info to a card
                                // Get the weather element and make sure it's visible
                                const weatherEl = cardElement.querySelector('.card-weather-info');
                                if (weatherEl) {
                                    // Make sure the element is visible
                                    weatherEl.classList.remove('d-none');
                                    (weatherEl as HTMLElement).style.display = 'block';
                                    (weatherEl as HTMLElement).style.visibility = 'visible';

                                    // Update the content with icon
                                    this.updateWeatherInfoOnCard(tz, cardElement);

                                    // Verify the weather info is now visible
                                } else {
                                }
                            }

                            fragment.appendChild(cardElement);
                        });
                        
                        // Add all cards to the container at once
                        container.appendChild(fragment);
                        
                        // Update pagination
                        this.setupUserTimeZonesPagination(totalCount);
                    } else {
                        // Investigate why we might have no time zones after adding one
                        
                        // Show empty state
                        container.innerHTML = `
                        <div class="col-12 text-center">
                            <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                        </div>`;
                        
                        // Clear pagination
                        const paginationContainer = document.getElementById('time-zones-pagination-controls');
                        if (paginationContainer) {
                            paginationContainer.innerHTML = '';
                        }
                    }
                }
                
                // Ensure container is marked as loaded
                container.setAttribute('data-loaded', 'true');
            } else {

                // We need to make sure event handlers are attached since we're directly appending the card
                // Add the event handlers before appending
                const homeButton = cardElement.querySelector('.card-home-button');
                if (homeButton) {
                    homeButton.addEventListener('click', () => this.setHomeTimeZone(timeZone.zoneId));
                }

                const infoButton = cardElement.querySelector('.card-info-button');
                if (infoButton) {
                    infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
                }

                const deleteButton = cardElement.querySelector('.card-delete-button');
                if (deleteButton) {
                    deleteButton.addEventListener('click', () => this.deleteTimeZone(timeZone.zoneId));
                }

                // Fallback: Just append the card
                container.appendChild(cardElement);
            }
        } catch (error) {

            // We need to make sure event handlers are attached since we're directly appending the card
            // Add the event handlers before appending
            const homeButton = cardElement.querySelector('.card-home-button');
            if (homeButton) {
                homeButton.addEventListener('click', () => this.setHomeTimeZone(timeZone.zoneId));
            }

            const infoButton = cardElement.querySelector('.card-info-button');
            if (infoButton) {
                infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
            }

            const deleteButton = cardElement.querySelector('.card-delete-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => this.deleteTimeZone(timeZone.zoneId));
            }

            // In case of error, just append the card
            container.appendChild(cardElement);
        }
        
        // Final verification
    }
    
    /**
     * Shows detailed information about a timezone in a modal dialog
     * @param timeZoneId The ID of the timezone to display information for
     */
    public async showTimeZoneInfoModal(timeZoneId: string): Promise<void> {
        
        // First, ensure our timezone list is loaded
        if (this.timeZoneList.length === 0) {
            try {
                await this.loadAvailableTimeZones();
            } catch (error) {
                createToast('Error: Failed to load timezone information', false);
                return;
            }
        } else {
        }
        
        // Find the selected timezone in our cached list
        const selectedTimeZone = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
        
        // For debugging which timezone is causing issues
        if (selectedTimeZone) {
        }
        
        // If not found, try to get it from the user timezones (this might be the case for non-home timezones)
        if (!selectedTimeZone) {
            try {
                const url = `${document.location.pathname}?handler=GetTimeZoneInfo&timeZoneId=${encodeURIComponent(timeZoneId)}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    }
                });
                
                
                if (response.ok) {
                    const responseText = await response.text();
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        throw new Error('Failed to parse timezone info response');
                    }
                    
                    if (data.success && data.data) {
                        // Use the timezone info from the API response
                        const tzInfo: TimeZoneInfo = data.data;
                        
                        // Check if timezone is already in our list and add it if not
                        if (!this.timeZoneList.some(tz => tz.zoneId === tzInfo.zoneId)) {
                            this.timeZoneList.push(tzInfo);
                        } else {
                        }
                        
                        const selectedTimeZoneNew = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
                        if (selectedTimeZoneNew) {
                            // Continue with the found timezone
                            this.setupTimeZoneInfoModal(selectedTimeZoneNew);
                            return;
                        } else {
                        }
                    } else {
                    }
                } else {
                }
            } catch (error) {
            }
            
            // If we still don't have the timezone, show error
            createToast('Error: Timezone information not found', false);
            return;
        }
        
        // Continue with the found timezone
        this.setupTimeZoneInfoModal(selectedTimeZone);
    }
    
    /**
     * Sets up and displays the timezone info modal with the provided timezone data
     */
    private setupTimeZoneInfoModal(selectedTimeZone: TimeZoneInfo): void {
        
        // Format the UTC offset string
        const utcOffsetStr = `UTC ${selectedTimeZone.utcOffsetHours >= 0 ? '+' : ''}${selectedTimeZone.utcOffsetHours}${selectedTimeZone.utcOffsetMinutes ? ':' + selectedTimeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
        
        // Get modal element
        const infoModalElement = document.getElementById('time-zones-info-modal');
        if (!infoModalElement) {
            return;
        }
        
        // Store the timezone info on the modal element for later use
        (infoModalElement as ExtendedHTMLElement)._tzinfo_data = selectedTimeZone;

        // Populate basic information
        const locationElement = document.getElementById('tz-info-location');
        if (locationElement) {
            locationElement.textContent = `${selectedTimeZone.cities[0]}, ${selectedTimeZone.countryName}`;
        }
        
        const continentElement = document.getElementById('tz-info-continent');
        if (continentElement) {
            continentElement.textContent = selectedTimeZone.continent;
        }
        
        const idElement = document.getElementById('tz-info-id');
        if (idElement) {
            idElement.textContent = selectedTimeZone.zoneId;
        }
        
        const offsetElement = document.getElementById('tz-info-offset');
        if (offsetElement) {
            offsetElement.textContent = utcOffsetStr;
        }
        
        // Set up time display
        this.updateTimeZoneInfoTime(selectedTimeZone);
        
        // Show the modal
        let timeZoneInfoModal: any;
        if (typeof this.bootstrap?.Modal === 'function') {
            // Get existing modal instance or create a new one
            timeZoneInfoModal = this.bootstrap.Modal.getInstance(infoModalElement) || 
                                new this.bootstrap.Modal(infoModalElement, {
                                    keyboard: true
                                });
        } else {
            console.error('Bootstrap Modal not available');
            return;
        }
        
        // Clone the timezone data to ensure it cannot be modified by other code
        // We create a completely independent copy outside of any closures
        const fixedTimeZone: TimeZoneInfo = JSON.parse(JSON.stringify(selectedTimeZone));
        
        // Store the fixed timezone data directly on the modal for reference
        (infoModalElement as ExtendedHTMLElement)._fixed_tzinfo = fixedTimeZone;
        
        // Store references to event handlers so we can remove them later
        const shownEventHandler = () => {
            
            // Always use the deeply cloned timezone data that we stored
            // This ensures we always have a stable reference
            const modalElement = infoModalElement as ExtendedHTMLElement;
            const tzInfo: TimeZoneInfo = modalElement._fixed_tzinfo;
            
            if (!tzInfo) {
                return;
            }
            
            
            // Update time immediately
            this.updateTimeZoneInfoTime(tzInfo);
            
            // Set interval to update every half second for smoother display
            
            const interval = window.setInterval(() => {
                // Always use the data stored on the modal element 
                const currentTzInfo = (infoModalElement as ExtendedHTMLElement)._fixed_tzinfo;
                this.updateTimeZoneInfoTime(currentTzInfo);
            }, 500);
            
            // Store the interval ID on the element for later cleanup
            modalElement._tzinfo_interval = interval;
        };
        
        const hiddenEventHandler = () => {
            const extElement = infoModalElement as ExtendedHTMLElement;
            
            // Clean up the interval
            if (extElement._tzinfo_interval) {
                window.clearInterval(extElement._tzinfo_interval);
                extElement._tzinfo_interval = null;
            } else {
            }
            
            // Clean up by removing event listeners to prevent accumulation
            infoModalElement.removeEventListener('shown.bs.modal', shownEventHandler);
            infoModalElement.removeEventListener('hidden.bs.modal', hiddenEventHandler);
            
            // Keep the timezone data for potential future reopening
        };
        
        // First, clean up any existing event listeners
        const extendedElement = infoModalElement as ExtendedHTMLElement;
        const oldShownHandlers = extendedElement._tzinfo_shown_handler;
        const oldHiddenHandlers = extendedElement._tzinfo_hidden_handler;
        
        if (oldShownHandlers) {
            infoModalElement.removeEventListener('shown.bs.modal', oldShownHandlers);
        }
        
        if (oldHiddenHandlers) {
            infoModalElement.removeEventListener('hidden.bs.modal', oldHiddenHandlers);
        }
        
        // Clear any leftover intervals just in case
        if (extendedElement._tzinfo_interval) {
            window.clearInterval(extendedElement._tzinfo_interval);
            extendedElement._tzinfo_interval = null;
        }
        
        // Store references to event handlers on the DOM element for cleanup
        extendedElement._tzinfo_shown_handler = shownEventHandler;
        extendedElement._tzinfo_hidden_handler = hiddenEventHandler;
        extendedElement._tzinfo_interval = null; // Will be set when shown
        
        // Add new event listeners
        infoModalElement.addEventListener('shown.bs.modal', shownEventHandler);
        infoModalElement.addEventListener('hidden.bs.modal', hiddenEventHandler);
        
        // Show the modal
        timeZoneInfoModal.show();
    }
    
    /**
     * Updates the time display in the timezone info modal
     */
    private updateTimeZoneInfoTime(timeZone: TimeZoneInfo): void {
        
        // Get the current time in the user's browser timezone
        const now = new Date();
        
        // Calculate the time in the selected timezone
        // This is a simplified calculation that doesn't handle DST
        const localOffset = now.getTimezoneOffset();
        
        const targetOffset = (timeZone.utcOffsetHours * 60) + (timeZone.utcOffsetMinutes || 0);
        
        const offsetDiff = localOffset + targetOffset;
        
        // Create a new date object with the adjusted time
        const targetTime = new Date(now.getTime() + (offsetDiff * 60 * 1000));
        
        // Format the time string (HH:MM:SS)
        const hours = targetTime.getHours().toString().padStart(2, '0');
        const minutes = targetTime.getMinutes().toString().padStart(2, '0');
        const seconds = targetTime.getSeconds().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;
        
        // Format the date string (Day, Month DD, YYYY)
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = targetTime.toLocaleDateString('en-US', options);
        
        // Calculate time difference from local time
        let diffHours = Math.floor(offsetDiff / 60);
        const diffMinutes = Math.abs(offsetDiff % 60);
        const diffSign = diffHours >= 0 ? '+' : '-';
        diffHours = Math.abs(diffHours);
        
        // Update the time elements with minimal DOM changes
        this.updateElementTextIfDifferent('tz-info-current-time', timeString);
        
        this.updateElementTextIfDifferent('tz-info-current-date', dateString);
        
        // Update time difference text
        const timeDiffText = offsetDiff === 0 
            ? 'Same as local time' 
            : (diffHours > 0 || diffMinutes > 0 
                ? `${diffSign}${diffHours}h ${diffMinutes}m from local time` 
                : 'Same as local time');
        
        this.updateElementTextIfDifferent('tz-info-time-difference', timeDiffText);
    }
    
    /**
     * Helper method to update element text only if it has changed
     * This prevents unnecessary DOM updates that can cause flickering
     */
    private updateElementTextIfDifferent(elementId: string, newText: string): void {
        
        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }
        
        const currentText = element.textContent;
        
        if (currentText !== newText) {
            element.textContent = newText;
        } else {
        }
    }
    
    /**
     * Sets the home timezone for the user.
     */
    public async setHomeTimeZone(timeZoneId: string): Promise<void> {
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!antiforgeryInput) {
            console.error('Antiforgery token not found');
            createToast('Error: Security token not found. Please refresh the page and try again.', false);
            return;
        }

        try {
            // Show a loading state on the card
            const card = document.querySelector(`[data-timezone-id="${timeZoneId}"]`);
            if (card) {
                const cardBody = card.querySelector('.card-body');
                const cardFooter = card.querySelector('.card-footer');
                
                if (cardBody) {
                    // Add overlay with spinner (light color to avoid black flash)
                    const overlay = document.createElement('div');
                    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-50 d-flex align-items-center justify-content-center';
                    overlay.style.zIndex = '1000';
                    overlay.innerHTML = `
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Setting as home...</span>
                        </div>`;
                    
                    // Make the card relative positioned
                    (card as HTMLElement).style.position = 'relative';
                    card.appendChild(overlay);
                    
                    // Disable buttons
                    if (cardFooter) {
                        const buttons = cardFooter.querySelectorAll('button');
                        buttons.forEach(button => button.setAttribute('disabled', 'disabled'));
                    }
                }
            }

            // Use current path for correct routing
            const url = `${document.location.pathname}?handler=SetHomeTimeZone`;
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'RequestVerificationToken': antiforgeryInput.value
                },
                body: JSON.stringify({ timeZoneId }),
                credentials: 'same-origin',
                // Prevent caching
                cache: 'no-store'
            });

            const responseText = await response.text();
            
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                // Check if we got HTML
                if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
                    throw new Error('Server returned HTML instead of JSON');
                }
                
                throw new Error('Failed to parse server response');
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to set home timezone');
            }
            
            // Show success toast notification
            createToast('Success: Home timezone updated successfully', true);
            
            // Refresh the entire view to maintain consistency
            const container = document.getElementById('time-zone-container');
            if (!container) {
                console.error('Time zone container not found for refreshing');
                return;
            }
            
            try {
                // Fetch the data for current page with weather information
                const dataResponse = await fetch(`${document.location.pathname}?handler=UserTimeZones&pageNumber=${this.timeZonesCurrentPage}&pageSize=${this.timeZonesPageSize}&includeWeather=true`, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    },
                    cache: 'no-store'
                });
                
                if (dataResponse.ok) {
                    const data = await dataResponse.json();
                    if (data.success) {
                        // Clear the container
                        container.innerHTML = '';
                        
                        // If there are time zones for the current page, display them
                        const timeZones = data.data?.data || [];
                        const totalCount = data.data?.totalItems || 0;
                        
                        if (timeZones.length > 0) {
                            // Create a document fragment to batch DOM operations
                            const fragment = document.createDocumentFragment();
                            
                            // Get the templates we'll use to create cards
                            const homeTemplate = document.getElementById('home-time-zone-card-template') as HTMLTemplateElement;
                            const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;
                            
                            
                            // Create elements for each time zone
                            timeZones.forEach((tz: TimeZoneInfo) => {
                                // Format UTC offset string
                                const utcOffsetStr = `UTC ${tz.utcOffsetHours >= 0 ? '+' : ''}${tz.utcOffsetHours}${tz.utcOffsetMinutes ? ':' + tz.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
                                
                                // Determine which template to use based on isHome flag
                                let cardElement: DocumentFragment | HTMLElement;
                                
                                if (tz.isHome && homeTemplate) {
                                    // Use the home template if available
                                    cardElement = homeTemplate.content.cloneNode(true) as DocumentFragment;
                                    
                                    // Set timezone ID on the wrapper div
                                    const wrapper = cardElement.querySelector('.col');
                                    if (wrapper) {
                                        wrapper.setAttribute('data-timezone-id', tz.zoneId);
                                    }
                                    
                                    // Fill in the data
                                    const cityCountry = cardElement.querySelector('.card-city-country');
                                    if (cityCountry) {
                                        cityCountry.textContent = `${tz.cities[0]}, ${tz.countryName}`;
                                    }
                                    
                                    const continent = cardElement.querySelector('.card-continent');
                                    if (continent) {
                                        continent.textContent = tz.continent;
                                    }
                                    
                                    const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
                                    if (utcOffsetEl) {
                                        utcOffsetEl.textContent = utcOffsetStr;
                                    }
                                    
                                    // Add weather information if available
                                    const weatherInfo = cardElement.querySelector('.card-weather-info');
                                    if (weatherInfo && tz.weatherInfo) {
                                        weatherInfo.textContent = tz.weatherInfo;
                                        weatherInfo.classList.remove('d-none');
                                    }
                                    
                                    // Add event handler for info button
                                    const infoButton = cardElement.querySelector('.card-info-button');
                                    if (infoButton) {
                                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                    } else {
                                    }
                                    
                                    // Update weather with icon
                                    const cardBody = cardElement.querySelector('.card-body');
                                    if (cardBody && tz.weatherInfo) {
                                        this.updateWeatherInfoOnCard(tz, cardBody);
                                    }
                                } 
                                else if (!tz.isHome && regularTemplate) {
                                    // Use the regular template if available
                                    cardElement = regularTemplate.content.cloneNode(true) as DocumentFragment;
                                    
                                    // Set timezone ID on the wrapper div
                                    const wrapper = cardElement.querySelector('.col');
                                    if (wrapper) {
                                        wrapper.setAttribute('data-timezone-id', tz.zoneId);
                                    }
                                    
                                    // Fill in the data
                                    const cityCountry = cardElement.querySelector('.card-city-country');
                                    if (cityCountry) {
                                        cityCountry.textContent = `${tz.cities[0]}, ${tz.countryName}`;
                                    }
                                    
                                    const continent = cardElement.querySelector('.card-continent');
                                    if (continent) {
                                        continent.textContent = tz.continent;
                                    }
                                    
                                    const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
                                    if (utcOffsetEl) {
                                        utcOffsetEl.textContent = utcOffsetStr;
                                    }
                                    
                                    // Add weather information if available
                                    const weatherInfo = cardElement.querySelector('.card-weather-info');
                                    if (weatherInfo && tz.weatherInfo) {
                                        weatherInfo.textContent = tz.weatherInfo;
                                        weatherInfo.classList.remove('d-none');
                                    }
                                    
                                    // Update weather with icon
                                    const cardBody = cardElement.querySelector('.card-body');
                                    if (cardBody && tz.weatherInfo) {
                                        this.updateWeatherInfoOnCard(tz, cardBody);
                                    }
                                    
                                    // Add event handlers for buttons
                                    const homeButton = cardElement.querySelector('.card-home-button');
                                    if (homeButton) {
                                        homeButton.addEventListener('click', () => this.setHomeTimeZone(tz.zoneId));
                                    } else {
                                    }
                                    
                                    const infoButton = cardElement.querySelector('.card-info-button');
                                    if (infoButton) {
                                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                    } else {
                                    }
                                    
                                    const deleteButton = cardElement.querySelector('.card-delete-button');
                                    if (deleteButton) {
                                        deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                    } else {
                                    }
                                }
                                else {
                                    // Fallback to manual creation if templates aren't available
                                    const div = document.createElement('div');
                                    div.className = 'col pb-lg-2 mb-4';
                                    div.setAttribute('data-timezone-id', tz.zoneId);
                                    
                                    if (tz.isHome) {
                                        div.innerHTML = `
                                            <article class="card settings-card h-100 border-primary">
                                                <div class="card-body">
                                                    <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                        <span class="card-city-country">${tz.cities[0]}, ${tz.countryName}</span>
                                                        <span class="badge bg-primary ms-2">Home</span>
                                                    </h5>
                                                    <p class="card-text card-continent mb-0">${tz.continent}</p>
                                                    <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                                                    <p class="card-text text-primary small card-weather-info mt-1 ${!tz.weatherInfo ? 'd-none' : ''}">${tz.weatherInfo || ''}</p>
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
                                        
                                        // Add event handlers
                                        const infoButton = div.querySelector('.card-info-button');
                                        if (infoButton) {
                                            infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                        }
                                    } else {
                                        div.innerHTML = `
                                            <article class="card settings-card h-100">
                                                <div class="card-body">
                                                    <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                        <span class="card-city-country">${tz.cities[0]}, ${tz.countryName}</span>
                                                    </h5>
                                                    <p class="card-text card-continent mb-0">${tz.continent}</p>
                                                    <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                                                    <p class="card-text text-primary small card-weather-info mt-1 ${!tz.weatherInfo ? 'd-none' : ''}">${tz.weatherInfo || ''}</p>
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
                                        
                                        // Add event handlers
                                        const homeButton = div.querySelector('.card-home-button');
                                        if (homeButton) {
                                            homeButton.addEventListener('click', () => this.setHomeTimeZone(tz.zoneId));
                                        }
                                        
                                        const infoButton = div.querySelector('.card-info-button');
                                        if (infoButton) {
                                            infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                        }
                                        
                                        const deleteButton = div.querySelector('.card-delete-button');
                                        if (deleteButton) {
                                            deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                        }
                                    }
                                    
                                    // Update weather with icon
                                    this.updateWeatherInfoOnCard(tz, div);
                                    
                                    // Set cardElement to the div we created
                                    cardElement = div;
                                }
                                
                                fragment.appendChild(cardElement);
                            });
                            
                            // Add all cards to the container at once
                            container.appendChild(fragment);
                            
                            // Update pagination
                            this.setupUserTimeZonesPagination(totalCount);
                        } else {
                            // Show empty state
                            container.innerHTML = `
                            <div class="col-12 text-center">
                                <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                            </div>`;
                            
                            // Clear pagination
                            const paginationContainer = document.getElementById('time-zones-pagination-controls');
                            if (paginationContainer) {
                                paginationContainer.innerHTML = '';
                            }
                        }
                    }
                    
                    // Ensure container is marked as loaded
                    container.setAttribute('data-loaded', 'true');
                } else {
                    console.error('Failed to reload time zones after setting home timezone');
                }
            } catch (error) {
                console.error('Error updating time zones after setting home timezone:', error);
                // Not critical, we've already updated on the server
            }
        } catch (error) {
            console.error('Error setting home timezone:', error);
            createToast('Error: Failed to set home timezone', false);
            
            // Remove any loading overlays
            const overlays = document.querySelectorAll('[data-timezone-id] .position-absolute');
            overlays.forEach(overlay => overlay.remove());
            
            // Re-enable any buttons
            const buttons = document.querySelectorAll('[data-timezone-id] button[disabled]');
            buttons.forEach(button => button.removeAttribute('disabled'));
        }
    }
}

// Shared global variable to track if initialization has occurred
let initialized = false;
let globalManager: TimeZonesManager | null = null;

// Initialize the time zones section
export function initTimeZones(): void {
    
    // If already initialized, refresh the data
    if (initialized && globalManager) {
        globalManager.loadTimeZonesData(true);
        return;
    }
    
    initialized = true;
    
    // Create a new manager and store globally
    globalManager = new TimeZonesManager();
    
    // Load time zone data once
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (globalManager) globalManager.loadTimeZonesData();
        });
    } else {
        // DOM is already loaded
        globalManager.loadTimeZonesData();
    }
}

// Make function and manager available globally
(window as any).Yuzu = (window as any).Yuzu || {};
(window as any).Yuzu.Settings = (window as any).Yuzu.Settings || {};
(window as any).Yuzu.Settings.TimeZones = {
    init: initTimeZones,
    Manager: TimeZonesManager,  // Make the class available
    getInstance: () => globalManager  // Provide access to the singleton instance
};
