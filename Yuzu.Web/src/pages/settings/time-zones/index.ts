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
     * Updates or hides weather information on time zone cards
     * @param timeZone The time zone data containing weather information
     * @param cardElement The card element to update
     */
    /**
     * Updates weather information on a time zone card with the appropriate weather icon
     * @param timeZone The time zone data with weather information
     * @param cardElement The element containing the card (could be the card itself, card body, or a wrapper)
     */
    private updateWeatherInfoOnCard(timeZone: TimeZoneInfo, cardElement: Element): void {
        // Log for debugging
        console.log(`[DEBUG-WEATHER] updateWeatherInfoOnCard called for ${timeZone.zoneId} with weather: ${timeZone.weatherInfo || 'none'}`);
        
        // First, try to find the weather info element
        const weatherInfoElement = cardElement.querySelector('.card-weather-info');
        if (!weatherInfoElement) {
            console.log(`[DEBUG-WEATHER] No weather info element found for ${timeZone.zoneId}`);
            return;
        }
        
        // Check if we have valid weather information
        if (timeZone.weatherInfo && timeZone.weatherInfo !== 'Weather data unavailable') {
            console.log(`[DEBUG-WEATHER] Adding weather icon for ${timeZone.zoneId}`);
            
            // Make sure the element is visible
            weatherInfoElement.classList.remove('d-none');
            
            // Add weather icon based on the weather description
            const weatherText = timeZone.weatherInfo.toLowerCase();
            if (weatherText.includes('clear') || weatherText.includes('sunny')) {
                weatherInfoElement.innerHTML = `<i class="bx bx-sun me-1"></i> ${timeZone.weatherInfo}`;
            } else if (weatherText.includes('cloud')) {
                weatherInfoElement.innerHTML = `<i class="bx bx-cloud me-1"></i> ${timeZone.weatherInfo}`;
            } else if (weatherText.includes('rain') || weatherText.includes('drizzle') || weatherText.includes('showers')) {
                weatherInfoElement.innerHTML = `<i class="bx bx-cloud-rain me-1"></i> ${timeZone.weatherInfo}`;
            } else if (weatherText.includes('snow')) {
                weatherInfoElement.innerHTML = `<i class="bx bx-cloud-snow me-1"></i> ${timeZone.weatherInfo}`;
            } else if (weatherText.includes('thunder')) {
                weatherInfoElement.innerHTML = `<i class="bx bx-cloud-lightning me-1"></i> ${timeZone.weatherInfo}`;
            } else if (weatherText.includes('fog')) {
                weatherInfoElement.innerHTML = `<i class="bx bx-cloud-light-rain me-1"></i> ${timeZone.weatherInfo}`;
            } else {
                weatherInfoElement.innerHTML = `<i class="bx bx-cloud me-1"></i> ${timeZone.weatherInfo}`;
            }
        } else {
            console.log(`[DEBUG-WEATHER] No weather data for ${timeZone.zoneId}, hiding element`);
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
                            await this.appendTimeZoneCard(newTimeZone);
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
        console.log('loadTimeZonesData called, forceRefresh:', forceRefresh);
        
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
            console.log('Container already loaded (data-loaded=true), skipping initialization');
            return;
        }
        
        // If data is already being loaded, don't start another load operation
        if (this.isTimeZoneDataLoading) {
            console.log('Data is already being loaded, skipping duplicate load');
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
            console.log('Time zone data successfully loaded, marked container as loaded');
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
        console.log(`[DEBUG] loadUserTimeZonesDisplay called - page ${this.timeZonesCurrentPage}, pageSize ${this.timeZonesPageSize}`);
        const container = document.getElementById('time-zone-container');
        
        if (!container) {
            console.error('[ERROR] Time zone container not found: time-zone-container');
            return;
        }
        
        // LOG CONTAINER STATE BEFORE CLEARING
        console.log(`[DEBUG] Container state before clearing - hasChildren: ${container.children.length > 0}, data-loaded: ${container.getAttribute('data-loaded')}`);
        if (container.children.length > 0) {
            console.log(`[DEBUG] Current container children count: ${container.children.length}`);
            
            // Log first couple of children types to see what's there
            Array.from(container.children).slice(0, 2).forEach((child, i) => {
                console.log(`[DEBUG] Child ${i} type: ${child.nodeName}, class: ${(child as HTMLElement).className}`);
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
        
        console.log('[DEBUG] Loading state displayed, now fetching data');

        try {
            // Use current path for correct routing and include weather information
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=${this.timeZonesCurrentPage}&pageSize=${this.timeZonesPageSize}&includeWeather=true`;
            console.log(`[DEBUG] Fetching timezone data with weather from: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                // Add cache busting to prevent browser caching
                cache: 'no-store'
            });
            
            console.log(`[DEBUG] Server response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Log actual response text for debugging
            const responseText = await response.text();
            console.log(`[DEBUG] Raw response (first 100 chars): ${responseText.substring(0, 100)}...`);
            
            // Parse the JSON
            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log(`[DEBUG] Response parsed successfully, success: ${responseData.success}`);
            } catch (parseError) {
                console.error('[ERROR] Failed to parse response as JSON:', parseError);
                console.log(`[DEBUG] Full response text: ${responseText}`);
                throw new Error('Failed to parse server response as JSON');
            }
            
            // Process the standardized response
            if (!responseData.success) {
                console.error(`[ERROR] Server reported failure: ${responseData.message}`);
                throw new Error(responseData.message || 'Failed to load user timezones');
            }
            
            const timeZones = responseData.data?.data || [];
            const totalCount = responseData.data?.totalItems || 0;
            this.homeTimeZoneId = responseData.data?.homeTimeZoneId || null;
            
            console.log(`[DEBUG] Received ${timeZones.length} time zones out of ${totalCount} total for page ${this.timeZonesCurrentPage}`);
            console.log(`[DEBUG] Home time zone ID: ${this.homeTimeZoneId}`);
            
            // Log the first timezone if available for debugging
            if (timeZones.length > 0) {
                console.log(`[DEBUG] First timezone in response:`, JSON.stringify(timeZones[0]));
            } else {
                console.log(`[DEBUG] No timezones received in the response!`);
            }
            
            // Clear the container again to remove loading indicator
            console.log(`[DEBUG] Clearing container before rendering timezones`);
            container.innerHTML = '';
            
            if (timeZones.length > 0) {
                console.log(`[DEBUG] Rendering ${timeZones.length} timezone cards`);
                
                // Create a document fragment to batch DOM operations
                const fragment = document.createDocumentFragment();
                
                // Use template elements when possible for better performance
                const homeTemplate = document.getElementById('home-time-zone-card-template') as HTMLTemplateElement;
                const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;
                
                console.log(`[DEBUG] Templates available: homeTemplate=${!!homeTemplate}, regularTemplate=${!!regularTemplate}`);
                
                timeZones.forEach((timeZone: TimeZoneInfo, index: number) => {
                    try {
                        console.log(`[DEBUG] Creating card for timezone ${timeZone.zoneId}, isHome=${timeZone.isHome}`);
                        
                        // Format the UTC offset string
                        const utcOffsetStr = `UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
                        
                        // Use the appropriate template
                        let cardElement: DocumentFragment;
                        
                        if (timeZone.isHome && homeTemplate) {
                            // Use the home template if available
                            console.log(`[DEBUG] Using home template for ${timeZone.zoneId}`);
                            cardElement = homeTemplate.content.cloneNode(true) as DocumentFragment;
                            
                            // Set timezone ID on the wrapper div
                            const wrapper = cardElement.querySelector('.col');
                            if (wrapper) {
                                wrapper.setAttribute('data-timezone-id', timeZone.zoneId);
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
                            
                            const utcOffset = cardElement.querySelector('.card-utc-offset');
                            if (utcOffset) {
                                utcOffset.textContent = utcOffsetStr;
                            }
                            
                            // First add weather information if available
                            const weatherInfo = cardElement.querySelector('.card-weather-info');
                            if (weatherInfo && timeZone.weatherInfo) {
                                weatherInfo.textContent = timeZone.weatherInfo;
                                weatherInfo.classList.remove('d-none');
                                
                                // Then update it with the icon (this needs to run after the text is set)
                                // We need to pass the parent element that contains the card-weather-info element
                                const cardBody = cardElement.querySelector('.card-body');
                                if (cardBody) {
                                    this.updateWeatherInfoOnCard(timeZone, cardBody);
                                }
                            }
                            
                            // Setup event handler for info button on home timezone card
                            const infoButton = cardElement.querySelector('.card-info-button');
                            if (infoButton) {
                                infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
                                console.log(`[DEBUG] Added info button handler for home timezone ${timeZone.zoneId}`);
                            } else {
                                console.log(`[DEBUG] Info button not found in home template for ${timeZone.zoneId}`);
                            }
                        } 
                        else if (!timeZone.isHome && regularTemplate) {
                            // Use the regular template if available
                            console.log(`[DEBUG] Using regular template for ${timeZone.zoneId}`);
                            cardElement = regularTemplate.content.cloneNode(true) as DocumentFragment;
                            
                            // Set timezone ID on the wrapper div
                            const wrapper = cardElement.querySelector('.col');
                            if (wrapper) {
                                wrapper.setAttribute('data-timezone-id', timeZone.zoneId);
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
                            
                            const utcOffset = cardElement.querySelector('.card-utc-offset');
                            if (utcOffset) {
                                utcOffset.textContent = utcOffsetStr;
                            }
                            
                            // First add weather information if available
                            const weatherInfo = cardElement.querySelector('.card-weather-info');
                            if (weatherInfo && timeZone.weatherInfo) {
                                weatherInfo.textContent = timeZone.weatherInfo;
                                weatherInfo.classList.remove('d-none');
                                
                                // Then update it with the icon (this needs to run after the text is set)
                                // We need to pass the parent element that contains the card-weather-info element
                                const cardBody = cardElement.querySelector('.card-body');
                                if (cardBody) {
                                    this.updateWeatherInfoOnCard(timeZone, cardBody);
                                }
                            }
                            
                            // Setup event handlers for buttons
                            const homeButton = cardElement.querySelector('.card-home-button');
                            if (homeButton) {
                                homeButton.addEventListener('click', () => this.setHomeTimeZone(timeZone.zoneId));
                            } else {
                                console.log(`[DEBUG] Home button not found in template for ${timeZone.zoneId}`);
                            }
                            
                            const infoButton = cardElement.querySelector('.card-info-button');
                            if (infoButton) {
                                infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
                            } else {
                                console.log(`[DEBUG] Info button not found in template for ${timeZone.zoneId}`);
                            }
                            
                            const deleteButton = cardElement.querySelector('.card-delete-button');
                            if (deleteButton) {
                                deleteButton.addEventListener('click', () => this.deleteTimeZone(timeZone.zoneId));
                            } else {
                                console.log(`[DEBUG] Delete button not found in template for ${timeZone.zoneId}`);
                            }
                        }
                        else {
                            // Fallback to direct HTML approach if templates aren't available
                            console.log(`[DEBUG] Using direct HTML approach for ${timeZone.zoneId} (templates not available)`);
                            const tempDiv = document.createElement('div');
                            
                            if (timeZone.isHome) {
                                tempDiv.innerHTML = `
                                    <div class="col pb-lg-2 mb-4" data-timezone-id="${timeZone.zoneId}">
                                        <article class="card settings-card h-100 border-primary">
                                            <div class="card-body">
                                                <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                    <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                                                    <span class="badge bg-primary ms-2">Home</span>
                                                </h5>
                                                <p class="card-text card-continent mb-0">${timeZone.continent}</p>
                                                <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                                                <p class="card-text text-primary small card-weather-info mt-1 ${!timeZone.weatherInfo ? 'd-none' : ''}">${timeZone.weatherInfo || ''}</p>
                                            </div>
                                        </article>
                                    </div>`;
                            } else {
                                tempDiv.innerHTML = `
                                    <div class="col pb-lg-2 mb-4" data-timezone-id="${timeZone.zoneId}">
                                        <article class="card settings-card h-100">
                                            <div class="card-body">
                                                <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                    <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                                                </h5>
                                                <p class="card-text card-continent mb-0">${timeZone.continent}</p>
                                                <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
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
                                    </div>`;
                                    
                                // Setup event handlers for buttons
                                const homeButton = tempDiv.querySelector('.card-home-button');
                                if (homeButton) {
                                    homeButton.addEventListener('click', () => this.setHomeTimeZone(timeZone.zoneId));
                                }
                                
                                const infoButton = tempDiv.querySelector('.card-info-button');
                                if (infoButton) {
                                    infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
                                }
                                
                                const deleteButton = tempDiv.querySelector('.card-delete-button');
                                if (deleteButton) {
                                    deleteButton.addEventListener('click', () => this.deleteTimeZone(timeZone.zoneId));
                                }
                            }
                            
                            // Extract the fragment from tempDiv
                            cardElement = document.createDocumentFragment();
                            while (tempDiv.firstChild) {
                                cardElement.appendChild(tempDiv.firstChild);
                            }
                        }
                        
                        // Add the card to our fragment
                        fragment.appendChild(cardElement);
                    } catch (err) {
                        console.error(`[ERROR] Error creating card for timezone ${timeZone.zoneId}:`, err);
                    }
                });
                
                // Now add all cards to the container at once
                container.appendChild(fragment);
                console.log(`[DEBUG] Time zone cards rendered, container children: ${container.children.length}`);
                
                // Mark the container as loaded
                container.setAttribute('data-loaded', 'true');
                console.log(`[DEBUG] Container marked as loaded`);
                
                // Setup pagination
                this.setupUserTimeZonesPagination(totalCount);
                
            } else {
                console.log(`[DEBUG] No time zones to display, showing empty state message`);
                // Show empty state message
                container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                </div>`;
                
                // Still mark as loaded even though it's empty
                container.setAttribute('data-loaded', 'true');
                console.log(`[DEBUG] Container marked as loaded (empty state)`);
                
                // Clear pagination
                const paginationContainer = document.getElementById('time-zones-pagination-controls');
                if (paginationContainer) {
                    paginationContainer.innerHTML = '';
                    console.log(`[DEBUG] Pagination controls cleared`);
                }
            }
        } catch (error) {
            console.error('[ERROR] Error loading user timezones:', error);
            container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">An error occurred while loading your timezones. Please try again.</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                    <i class="bx bx-refresh me-1"></i> Reload Page
                </button>
            </div>`;
            
            // Mark as not loaded so we'll try again next time
            container.setAttribute('data-loaded', 'false');
            console.log(`[DEBUG] Container marked as not loaded due to error`);
        }
        
        // Final verification
        console.log(`[DEBUG] Final container state - hasChildren: ${container.children.length > 0}, data-loaded: ${container.getAttribute('data-loaded')}`);
    }
    
    /**
     * Set up pagination for user time zones list
     */
    private setupUserTimeZonesPagination(totalCount: number): void {
        console.log(`[DEBUG-PAGINATION] setupUserTimeZonesPagination called with totalCount=${totalCount}, pageSize=${this.timeZonesPageSize}, currentPage=${this.timeZonesCurrentPage}`);
        
        const totalPages = Math.ceil(totalCount / this.timeZonesPageSize);
        console.log(`[DEBUG-PAGINATION] Calculated totalPages=${totalPages}`);
        
        const paginationContainer = document.getElementById('time-zones-pagination-controls');
        
        // Handle the container - always clear old pagination
        if (!paginationContainer) {
            console.error('[ERROR-PAGINATION] Pagination container not found: time-zones-pagination-controls');
            return;
        }
        
        // Log pagination container state before clearing
        console.log(`[DEBUG-PAGINATION] Pagination container before clearing - hasChildren: ${paginationContainer.children.length > 0}`);
        
        // Clear any existing pagination controls
        paginationContainer.innerHTML = '';
        console.log(`[DEBUG-PAGINATION] Cleared existing pagination controls`);
        
        // Skip pagination rendering if only one page
        if (totalPages <= 1) {
            console.log(`[DEBUG-PAGINATION] Skipping pagination rendering (totalPages=${totalPages} <= 1)`);
            return;
        }
        
        // Calculate pagination variables
        console.log(`[DEBUG-PAGINATION] Setting up pagination with totalPages=${totalPages}, currentPage=${this.timeZonesCurrentPage}`);
        
        // Ensure current page is within valid range
        if (this.timeZonesCurrentPage > totalPages) {
            console.log(`[DEBUG-PAGINATION] ⚠️ Current page ${this.timeZonesCurrentPage} is greater than total pages ${totalPages}, resetting to ${totalPages}`);
            this.timeZonesCurrentPage = totalPages;
        } else if (this.timeZonesCurrentPage < 1) {
            console.log(`[DEBUG-PAGINATION] ⚠️ Current page ${this.timeZonesCurrentPage} is less than 1, resetting to 1`);
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
        
        console.log(`[DEBUG-PAGINATION] Page range calculation: startPage=${startPage}, endPage=${endPage}`);
        
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
        
        console.log(`[DEBUG-PAGINATION] Generated pagination HTML of length ${paginationHtml.length}`);
        
        // Set the HTML
        paginationContainer.innerHTML = paginationHtml;
        
        // Verify pagination was set
        console.log(`[DEBUG-PAGINATION] Pagination controls after setting HTML - childCount: ${paginationContainer.children.length}`);
        
        // Validate click handlers by getting all the links
        const pageLinks = paginationContainer.querySelectorAll('a.page-link');
        console.log(`[DEBUG-PAGINATION] Found ${pageLinks.length} page links with changePage handlers`);
    }
    
    /**
     * Changes the current page and reloads the user timezone list.
     * This function must be exposed to window to work with onclick handlers.
     */
    public changePage(page: number, searchTerm: string | null): void {
        console.log(`[DEBUG-PAGE] changePage called with page=${page}, searchTerm=${searchTerm}`);
        
        if (page < 1) {
            console.log(`[DEBUG-PAGE] Page ${page} is less than 1, returning without action`);
            return;
        }
        
        // Update the current page first
        console.log(`[DEBUG-PAGE] Updating timeZonesCurrentPage from ${this.timeZonesCurrentPage} to ${page}`);
        this.timeZonesCurrentPage = page;
        
        // Check if this is a modal search or main page navigation
        if (searchTerm !== null) {
            // This is for the modal search results
            console.log(`[DEBUG-PAGE] This is a modal search pagination (searchTerm provided)`);
            
            // Convert null to empty string if needed
            const term = searchTerm || '';
            console.log(`[DEBUG-PAGE] Loading time zones with search term: "${term}"`);
            this.timeZonesSearchTerm = term;
            this.loadTimeZones(term);
        } else {
            // This is for the user time zones pagination on the main page
            console.log(`[DEBUG-PAGE] This is a main page navigation (searchTerm is null)`);
            
            // Reset the selection state when changing pages
            this.timeZoneModalFocusedRowIndex = -1;
            this.timeZoneModalSelectedRowIndex = -1;
            
            // Reset the container's data-loaded attribute to false
            // to ensure content refreshes for the new page
            const container = document.getElementById('time-zone-container');
            if (container) {
                console.log(`[DEBUG-PAGE] Setting container data-loaded to false before reloading`);
                container.setAttribute('data-loaded', 'false');
                
                // Log current container state
                console.log(`[DEBUG-PAGE] Container state before reloading - hasChildren: ${container.children.length > 0}`);
                if (container.children.length > 0) {
                    // Log first child type for debugging
                    console.log(`[DEBUG-PAGE] First child type: ${container.children[0].nodeName}, class: ${(container.children[0] as HTMLElement).className}`);
                }
            } else {
                console.error(`[ERROR-PAGE] Container not found when changing to page ${page}`);
            }
            
            // Load the user display for the selected page
            console.log(`[DEBUG-PAGE] Calling loadUserTimeZonesDisplay for page ${page}`);
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
        console.log('Set up modal pagination', this.timeZonesCurrentPage, totalPages, searchTerm);
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
                            
                            console.log(`[DEBUG-TEMPLATE] Templates available: homeTemplate=${!!homeTemplate}, regularTemplate=${!!regularTemplate}`);
                            
                            // Create elements for each time zone
                            timeZones.forEach((tz: TimeZoneInfo) => {
                                // Format UTC offset string
                                const utcOffsetStr = `UTC ${tz.utcOffsetHours >= 0 ? '+' : ''}${tz.utcOffsetHours}${tz.utcOffsetMinutes ? ':' + tz.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
                                
                                // Determine which template to use based on isHome flag
                                let cardElement: DocumentFragment | HTMLElement;
                                
                                if (tz.isHome && homeTemplate) {
                                    // Use the home template if available
                                    console.log(`[DEBUG-TEMPLATE] Using home template for ${tz.zoneId}`);
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
                                        console.log(`[DEBUG-TEMPLATE] Info button not found for home time zone ${tz.zoneId}`);
                                    }
                                    
                                    // Update weather with icon
                                    const cardBody = cardElement.querySelector('.card-body');
                                    if (cardBody && tz.weatherInfo) {
                                        this.updateWeatherInfoOnCard(tz, cardBody);
                                    }
                                } 
                                else if (!tz.isHome && regularTemplate) {
                                    // Use the regular template if available
                                    console.log(`[DEBUG-TEMPLATE] Using regular template for ${tz.zoneId}`);
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
                                        console.log(`[DEBUG-TEMPLATE] Home button not found for ${tz.zoneId}`);
                                    }
                                    
                                    const infoButton = cardElement.querySelector('.card-info-button');
                                    if (infoButton) {
                                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                    } else {
                                        console.log(`[DEBUG-TEMPLATE] Info button not found for ${tz.zoneId}`);
                                    }
                                    
                                    const deleteButton = cardElement.querySelector('.card-delete-button');
                                    if (deleteButton) {
                                        deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                    } else {
                                        console.log(`[DEBUG-TEMPLATE] Delete button not found for ${tz.zoneId}`);
                                    }
                                }
                                else {
                                    // Fallback to manual creation if templates aren't available
                                    console.log(`[DEBUG-TEMPLATE] Templates not available, creating card manually for ${tz.zoneId}`);
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
        console.log(`[DEBUG-ADD] appendTimeZoneCard called for timezone: ${timeZone.zoneId}, ${timeZone.cities[0]}`);
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('[ERROR-ADD] Time zone container not found for appending');
            return;
        }
        
        console.log(`[DEBUG-ADD] Container state before append - hasChildren: ${container.children.length > 0}, data-loaded: ${container.getAttribute('data-loaded')}`);
        
        // Check if we have the empty message and remove ONLY the empty message, not all content
        const emptyMessage = container.querySelector('.col-12 .text-muted');
        if (emptyMessage && emptyMessage.parentElement) {
            console.log('[DEBUG-ADD] Found and removing empty message');
            // Only remove the empty message parent element, not all cards
            const emptyMessageCol = emptyMessage.closest('.col-12');
            if (emptyMessageCol) {
                emptyMessageCol.remove();
            }
        }
        
        // Check if this timezone is already in the container to avoid duplicates
        const existingCard = container.querySelector(`[data-timezone-id="${timeZone.zoneId}"]`);
        if (existingCard) {
            console.log(`[DEBUG-ADD] Timezone ${timeZone.zoneId} already exists, not adding duplicate`);
            return;
        }
        
        // Format the UTC offset string
        const utcOffsetStr = `UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
        
        // Get the template for regular time zone cards
        const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;
        
        // Create card element using the template if possible
        let cardElement: HTMLElement;
        
        if (regularTemplate) {
            console.log(`[DEBUG-ADD] Using template for new time zone card ${timeZone.zoneId}`);
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
            
            // Add weather information if available
            const weatherInfo = cardElement.querySelector('.card-weather-info');
            if (weatherInfo && timeZone.weatherInfo) {
                weatherInfo.textContent = timeZone.weatherInfo;
                weatherInfo.classList.remove('d-none');
            }
            
            // Update weather with icon
            const cardBody = cardElement.querySelector('.card-body');
            if (cardBody && timeZone.weatherInfo) {
                this.updateWeatherInfoOnCard(timeZone, cardBody);
            }
        } else {
            // Fallback to manual creation if template isn't available
            console.log(`[DEBUG-ADD] Template not available, creating card manually for ${timeZone.zoneId}`);
            cardElement = document.createElement('div');
            cardElement.className = 'col pb-lg-2 mb-4';
            cardElement.setAttribute('data-timezone-id', timeZone.zoneId);
            
            // Set the inner HTML manually
            cardElement.innerHTML = `
                <article class="card settings-card h-100">
                    <div class="card-body">
                        <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                            <span class="card-city-country">${timeZone.cities[0]}, ${timeZone.countryName}</span>
                        </h5>
                        <p class="card-text card-continent mb-0">${timeZone.continent}</p>
                        <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
                        <p class="card-text text-primary small card-weather-info mt-1 ${!timeZone.weatherInfo ? 'd-none' : ''}">${timeZone.weatherInfo || ''}</p>
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
            
            // Update weather with icon
            if (timeZone.weatherInfo) {
                this.updateWeatherInfoOnCard(timeZone, cardElement);
            }
        }
        
        // Add event handlers
        const homeButton = cardElement.querySelector('.card-home-button');
        if (homeButton) {
            homeButton.addEventListener('click', () => this.setHomeTimeZone(timeZone.zoneId));
        } else {
            console.log(`[DEBUG-ADD] Home button not found for ${timeZone.zoneId}`);
        }
        
        const infoButton = cardElement.querySelector('.card-info-button');
        if (infoButton) {
            infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(timeZone.zoneId));
        } else {
            console.log(`[DEBUG-ADD] Info button not found for ${timeZone.zoneId}`);
        }
        
        const deleteButton = cardElement.querySelector('.card-delete-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => this.deleteTimeZone(timeZone.zoneId));
        } else {
            console.log(`[DEBUG-ADD] Delete button not found for ${timeZone.zoneId}`);
        }
        
        console.log(`[DEBUG-ADD] Starting fetch to reload time zones after adding ${timeZone.zoneId}`);
        
        // Reset currentPage to 1 to avoid asking for an empty page
        // This fixes the issue where adding a timezone while on a search results page
        // would try to fetch data for that page number in the user's timezone list
        const oldPage = this.timeZonesCurrentPage;
        this.timeZonesCurrentPage = 1;
        console.log(`[DEBUG-ADD] Reset timeZonesCurrentPage from ${oldPage} to ${this.timeZonesCurrentPage} to ensure we get data`);
        
        // Instead of trying to manage pagination, simply reload the whole view
        // Simpler approach that avoids race conditions and ensures pagination is correct
        try {
            // First add the timezone to the server
            // This was already done in the caller, so we just need to refresh the view
            
            // Get accurate count and update the view
            console.log(`[DEBUG-ADD] Fetching updated time zone data for page ${this.timeZonesCurrentPage}, pageSize ${this.timeZonesPageSize}`);
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=${this.timeZonesCurrentPage}&pageSize=${this.timeZonesPageSize}&includeWeather=true`;
            console.log(`[DEBUG-ADD] URL: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                cache: 'no-store'
            });
            
            console.log(`[DEBUG-ADD] Server response status: ${response.status}`);
            
            if (response.ok) {
                // Log actual response text for debugging
                const responseText = await response.text();
                console.log(`[DEBUG-ADD] Raw response (first 100 chars): ${responseText.substring(0, 100)}...`);
                
                // Parse the JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                    console.log(`[DEBUG-ADD] Response parsed successfully, success: ${data.success}`);
                } catch (parseError) {
                    console.error('[ERROR-ADD] Failed to parse response as JSON:', parseError);
                    console.log(`[DEBUG-ADD] Full response text: ${responseText}`);
                    throw new Error('Failed to parse server response as JSON');
                }
                
                if (data.success) {
                    // Clear the container entirely to ensure we don't get duplicates
                    console.log(`[DEBUG-ADD] Clearing container before rebuilding cards`);
                    container.innerHTML = '';
                    
                    // If there are time zones, display them
                    const timeZones = data.data?.data || [];
                    const totalCount = data.data?.totalItems || 0;
                    
                    console.log(`[DEBUG-ADD] Received ${timeZones.length} time zones out of ${totalCount} total for page ${this.timeZonesCurrentPage}`);
                    
                    // Log the first timezone if available for debugging
                    if (timeZones.length > 0) {
                        console.log(`[DEBUG-ADD] First timezone in response:`, JSON.stringify(timeZones[0]));
                    } else {
                        console.log(`[DEBUG-ADD] No timezones received in the response!`);
                    }
                    
                    if (timeZones.length > 0) {
                        console.log(`[DEBUG-ADD] Creating ${timeZones.length} timezone cards`);
                        
                        // Create a document fragment to batch DOM operations
                        const fragment = document.createDocumentFragment();
                        
                        // Create elements for each time zone
                        timeZones.forEach((tz: TimeZoneInfo) => {
                            // Format UTC offset
                            const utcOffsetStr = `UTC ${tz.utcOffsetHours >= 0 ? '+' : ''}${tz.utcOffsetHours}${tz.utcOffsetMinutes ? ':' + tz.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
                            
                            console.log(`[DEBUG-ADD] Creating card for ${tz.zoneId}, isHome=${tz.isHome}`);
                            
                            // Create card element
                            const cardElement = document.createElement('div');
                            cardElement.className = 'col pb-lg-2 mb-4';
                            cardElement.setAttribute('data-timezone-id', tz.zoneId);
                            
                            if (tz.isHome) {
                                // Use the home template
                                cardElement.innerHTML = `
                                    <article class="card settings-card h-100 border-primary">
                                        <div class="card-body">
                                            <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                <span class="card-city-country">${tz.cities[0]}, ${tz.countryName}</span>
                                                <span class="badge bg-primary ms-2">Home</span>
                                            </h5>
                                            <p class="card-text card-continent mb-0">${tz.continent}</p>
                                            <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
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
                                
                                // Add event handler for info button
                                const infoButton = cardElement.querySelector('.card-info-button');
                                if (infoButton) {
                                    infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                } else {
                                    console.log(`[DEBUG-ADD] Info button not found for home timezone ${tz.zoneId}`);
                                }
                            } else {
                                // Use the regular template
                                cardElement.innerHTML = `
                                    <article class="card settings-card h-100">
                                        <div class="card-body">
                                            <h5 class="card-title fw-semibold text-truncate pe-2 mb-2">
                                                <span class="card-city-country">${tz.cities[0]}, ${tz.countryName}</span>
                                            </h5>
                                            <p class="card-text card-continent mb-0">${tz.continent}</p>
                                            <p class="card-text text-muted small card-utc-offset">${utcOffsetStr}</p>
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
                                const homeButton = cardElement.querySelector('.card-home-button');
                                if (homeButton) {
                                    homeButton.addEventListener('click', () => this.setHomeTimeZone(tz.zoneId));
                                } else {
                                    console.log(`[DEBUG-ADD] Home button not found for ${tz.zoneId}`);
                                }
                                
                                const infoButton = cardElement.querySelector('.card-info-button');
                                if (infoButton) {
                                    infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                } else {
                                    console.log(`[DEBUG-ADD] Info button not found for ${tz.zoneId}`);
                                }
                                
                                const deleteButton = cardElement.querySelector('.card-delete-button');
                                if (deleteButton) {
                                    deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                } else {
                                    console.log(`[DEBUG-ADD] Delete button not found for ${tz.zoneId}`);
                                }
                            }
                            
                            fragment.appendChild(cardElement);
                        });
                        
                        // Add all cards to the container at once
                        container.appendChild(fragment);
                        console.log(`[DEBUG-ADD] Appended all cards to container, container now has ${container.children.length} children`);
                        
                        // Update pagination
                        console.log(`[DEBUG-ADD] Setting up pagination for ${totalCount} items`);
                        this.setupUserTimeZonesPagination(totalCount);
                    } else {
                        // Investigate why we might have no time zones after adding one
                        console.log(`[DEBUG-ADD] ⚠️ No time zones to display after adding ${timeZone.zoneId}! Showing empty state`);
                        
                        // Show empty state
                        container.innerHTML = `
                        <div class="col-12 text-center">
                            <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                        </div>`;
                        
                        // Clear pagination
                        const paginationContainer = document.getElementById('time-zones-pagination-controls');
                        if (paginationContainer) {
                            paginationContainer.innerHTML = '';
                            console.log(`[DEBUG-ADD] Pagination controls cleared`);
                        }
                    }
                }
                
                // Ensure container is marked as loaded
                container.setAttribute('data-loaded', 'true');
                console.log(`[DEBUG-ADD] Container marked as loaded`);
            } else {
                console.error('[ERROR-ADD] Failed to reload time zones after adding a new one');
                
                // Fallback: Just append the card
                console.log(`[DEBUG-ADD] Using fallback: directly appending the new card`);
                container.appendChild(cardElement);
            }
        } catch (error) {
            console.error('[ERROR-ADD] Error updating time zones after add:', error);
            // In case of error, just append the card
            console.log(`[DEBUG-ADD] Using fallback due to error: directly appending the new card`);
            container.appendChild(cardElement);
        }
        
        // Final verification
        console.log(`[DEBUG-ADD] Final container state - hasChildren: ${container.children.length > 0}, data-loaded: ${container.getAttribute('data-loaded')}`);
    }
    
    /**
     * Shows detailed information about a timezone in a modal dialog
     * @param timeZoneId The ID of the timezone to display information for
     */
    public async showTimeZoneInfoModal(timeZoneId: string): Promise<void> {
        console.log(`[DEBUG-MODAL] Showing timezone info modal for ID: ${timeZoneId}`);
        
        // First, ensure our timezone list is loaded
        if (this.timeZoneList.length === 0) {
            try {
                console.log(`[DEBUG-MODAL] Global timezone list is empty, loading it first`);
                await this.loadAvailableTimeZones();
                console.log(`[DEBUG-MODAL] Loaded ${this.timeZoneList.length} timezones from server`);
            } catch (error) {
                console.error('[DEBUG-MODAL] Failed to load timezone data', error);
                createToast('Error: Failed to load timezone information', false);
                return;
            }
        } else {
            console.log(`[DEBUG-MODAL] Global timezone list has ${this.timeZoneList.length} items`);
        }
        
        // Find the selected timezone in our cached list
        const selectedTimeZone = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
        console.log(`[DEBUG-MODAL] Timezone lookup in global list: ${selectedTimeZone ? 'FOUND' : 'NOT FOUND'}`);
        
        // For debugging which timezone is causing issues
        if (selectedTimeZone) {
            console.log(`[DEBUG-MODAL] Found in global list: ${JSON.stringify(selectedTimeZone)}`);
        }
        
        // If not found, try to get it from the user timezones (this might be the case for non-home timezones)
        if (!selectedTimeZone) {
            console.log(`[DEBUG-MODAL] Timezone with ID ${timeZoneId} not found in global list, trying API endpoint`);
            try {
                const url = `${document.location.pathname}?handler=GetTimeZoneInfo&timeZoneId=${encodeURIComponent(timeZoneId)}`;
                console.log(`[DEBUG-MODAL] Fetching from URL: ${url}`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`[DEBUG-MODAL] API response status: ${response.status}`);
                
                if (response.ok) {
                    const responseText = await response.text();
                    console.log(`[DEBUG-MODAL] API response (first 100 chars): ${responseText.substring(0, 100)}...`);
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                        console.log(`[DEBUG-MODAL] API response parsed successfully: ${data.success}`);
                    } catch (parseError) {
                        console.error('[DEBUG-MODAL] Failed to parse API response:', parseError);
                        throw new Error('Failed to parse timezone info response');
                    }
                    
                    if (data.success && data.data) {
                        console.log(`[DEBUG-MODAL] Found timezone info via API:`, data.data);
                        // Use the timezone info from the API response
                        const tzInfo: TimeZoneInfo = data.data;
                        
                        // Check if timezone is already in our list and add it if not
                        if (!this.timeZoneList.some(tz => tz.zoneId === tzInfo.zoneId)) {
                            console.log(`[DEBUG-MODAL] Adding timezone ${tzInfo.zoneId} to global list`);
                            this.timeZoneList.push(tzInfo);
                        } else {
                            console.log(`[DEBUG-MODAL] Timezone ${tzInfo.zoneId} already in global list`);
                        }
                        
                        const selectedTimeZoneNew = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
                        if (selectedTimeZoneNew) {
                            // Continue with the found timezone
                            console.log(`[DEBUG-MODAL] Success! Using timezone from API:`, selectedTimeZoneNew);
                            this.setupTimeZoneInfoModal(selectedTimeZoneNew);
                            return;
                        } else {
                            console.error(`[DEBUG-MODAL] Something went wrong - timezone not found after adding to list`);
                        }
                    } else {
                        console.error(`[DEBUG-MODAL] API returned success=false or no data:`, data);
                    }
                } else {
                    console.error(`[DEBUG-MODAL] API returned error status: ${response.status}`);
                }
            } catch (error) {
                console.error(`[DEBUG-MODAL] Error fetching timezone info for ${timeZoneId}:`, error);
            }
            
            // If we still don't have the timezone, show error
            console.error(`[DEBUG-MODAL] Timezone with ID ${timeZoneId} not found after trying API`);
            createToast('Error: Timezone information not found', false);
            return;
        }
        
        // Continue with the found timezone
        console.log(`[DEBUG-MODAL] Using timezone from cached list:`, selectedTimeZone);
        this.setupTimeZoneInfoModal(selectedTimeZone);
    }
    
    /**
     * Sets up and displays the timezone info modal with the provided timezone data
     */
    private setupTimeZoneInfoModal(selectedTimeZone: TimeZoneInfo): void {
        console.log(`[DEBUG-SETUP] Setting up modal with timezone: ${selectedTimeZone.zoneId}`);
        console.log(`[DEBUG-SETUP] Full timezone data:`, JSON.stringify(selectedTimeZone));
        
        // Format the UTC offset string
        const utcOffsetStr = `UTC ${selectedTimeZone.utcOffsetHours >= 0 ? '+' : ''}${selectedTimeZone.utcOffsetHours}${selectedTimeZone.utcOffsetMinutes ? ':' + selectedTimeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
        console.log(`[DEBUG-SETUP] Formatted UTC offset: ${utcOffsetStr}`);
        
        // Get modal element
        const infoModalElement = document.getElementById('time-zones-info-modal');
        if (!infoModalElement) {
            console.error('[DEBUG-SETUP] Time zone info modal element not found');
            return;
        }
        
        // Store the timezone info on the modal element for later use
        console.log(`[DEBUG-SETUP] Storing timezone data on modal element`);
        (infoModalElement as ExtendedHTMLElement)._tzinfo_data = selectedTimeZone;
        
        // Verify data was stored
        console.log(`[DEBUG-SETUP] Verification: stored data =`, 
            JSON.stringify((infoModalElement as ExtendedHTMLElement)._tzinfo_data));
        
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
        console.log(`[DEBUG-SETUP] Updating time display`);
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
        console.log(`[DEBUG-FIXED] Created deeply cloned copy of timezone data:`, JSON.stringify(fixedTimeZone));
        
        // Store the fixed timezone data directly on the modal for reference
        (infoModalElement as ExtendedHTMLElement)._fixed_tzinfo = fixedTimeZone;
        
        // Store references to event handlers so we can remove them later
        const shownEventHandler = () => {
            console.log(`[DEBUG-INTERVAL] Modal shown event handler triggered for ${fixedTimeZone.zoneId}`);
            
            // Always use the deeply cloned timezone data that we stored
            // This ensures we always have a stable reference
            const modalElement = infoModalElement as ExtendedHTMLElement;
            const tzInfo: TimeZoneInfo = modalElement._fixed_tzinfo;
            
            if (!tzInfo) {
                console.error(`[DEBUG-INTERVAL] No timezone data found on modal element!`);
                return;
            }
            
            console.log(`[DEBUG-INTERVAL] Using stable timezone data from modal:`, JSON.stringify(tzInfo));
            
            // Update time immediately
            console.log(`[DEBUG-INTERVAL] Updating time display immediately for ${tzInfo.zoneId}`);
            this.updateTimeZoneInfoTime(tzInfo);
            
            // Set interval to update every half second for smoother display
            console.log(`[DEBUG-INTERVAL] Setting up interval for timezone: ${tzInfo.zoneId}`);
            
            const interval = window.setInterval(() => {
                // Always use the data stored on the modal element 
                const currentTzInfo = (infoModalElement as ExtendedHTMLElement)._fixed_tzinfo;
                console.log(`[DEBUG-INTERVAL-TICK] Interval tick for ${currentTzInfo.zoneId}`);
                this.updateTimeZoneInfoTime(currentTzInfo);
            }, 500);
            
            // Store the interval ID on the element for later cleanup
            console.log(`[DEBUG-INTERVAL] Storing interval ID on element: ${interval}`);
            modalElement._tzinfo_interval = interval;
        };
        
        const hiddenEventHandler = () => {
            console.log(`[DEBUG-CLEANUP] Modal hidden event handler triggered`);
            const extElement = infoModalElement as ExtendedHTMLElement;
            
            // Clean up the interval
            if (extElement._tzinfo_interval) {
                console.log(`[DEBUG-CLEANUP] Clearing interval ID: ${extElement._tzinfo_interval}`);
                window.clearInterval(extElement._tzinfo_interval);
                extElement._tzinfo_interval = null;
            } else {
                console.log(`[DEBUG-CLEANUP] No interval to clear`);
            }
            
            // Clean up by removing event listeners to prevent accumulation
            console.log(`[DEBUG-CLEANUP] Removing event listeners`);
            infoModalElement.removeEventListener('shown.bs.modal', shownEventHandler);
            infoModalElement.removeEventListener('hidden.bs.modal', hiddenEventHandler);
            
            // Keep the timezone data for potential future reopening
            console.log(`[DEBUG-CLEANUP] Cleanup complete`);
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
        console.log(`[DEBUG-TIME] updateTimeZoneInfoTime called with timezone: ${timeZone.zoneId}`);
        console.log(`[DEBUG-TIME] Timezone data:`, JSON.stringify(timeZone));
        
        // Get the current time in the user's browser timezone
        const now = new Date();
        console.log(`[DEBUG-TIME] Current browser time: ${now.toISOString()}`);
        
        // Calculate the time in the selected timezone
        // This is a simplified calculation that doesn't handle DST
        const localOffset = now.getTimezoneOffset();
        console.log(`[DEBUG-TIME] Local browser timezone offset: ${localOffset} minutes`);
        
        const targetOffset = (timeZone.utcOffsetHours * 60) + (timeZone.utcOffsetMinutes || 0);
        console.log(`[DEBUG-TIME] Target timezone offset: ${targetOffset} minutes (${timeZone.utcOffsetHours}h ${timeZone.utcOffsetMinutes || 0}m)`);
        
        const offsetDiff = localOffset + targetOffset;
        console.log(`[DEBUG-TIME] Offset difference: ${offsetDiff} minutes`);
        
        // Create a new date object with the adjusted time
        const targetTime = new Date(now.getTime() + (offsetDiff * 60 * 1000));
        console.log(`[DEBUG-TIME] Calculated target time: ${targetTime.toISOString()}`);
        
        // Format the time string (HH:MM:SS)
        const hours = targetTime.getHours().toString().padStart(2, '0');
        const minutes = targetTime.getMinutes().toString().padStart(2, '0');
        const seconds = targetTime.getSeconds().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;
        console.log(`[DEBUG-TIME] Formatted time string: ${timeString}`);
        
        // Format the date string (Day, Month DD, YYYY)
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = targetTime.toLocaleDateString('en-US', options);
        console.log(`[DEBUG-TIME] Formatted date string: ${dateString}`);
        
        // Calculate time difference from local time
        let diffHours = Math.floor(offsetDiff / 60);
        const diffMinutes = Math.abs(offsetDiff % 60);
        const diffSign = diffHours >= 0 ? '+' : '-';
        diffHours = Math.abs(diffHours);
        console.log(`[DEBUG-TIME] Time difference: ${diffSign}${diffHours}h ${diffMinutes}m`);
        
        // Update the time elements with minimal DOM changes
        console.log(`[DEBUG-TIME] Updating displayed time: ${timeString}`);
        this.updateElementTextIfDifferent('tz-info-current-time', timeString);
        
        console.log(`[DEBUG-TIME] Updating displayed date: ${dateString}`);
        this.updateElementTextIfDifferent('tz-info-current-date', dateString);
        
        // Update time difference text
        const timeDiffText = offsetDiff === 0 
            ? 'Same as local time' 
            : (diffHours > 0 || diffMinutes > 0 
                ? `${diffSign}${diffHours}h ${diffMinutes}m from local time` 
                : 'Same as local time');
        
        console.log(`[DEBUG-TIME] Updating time difference text: ${timeDiffText}`);
        this.updateElementTextIfDifferent('tz-info-time-difference', timeDiffText);
    }
    
    /**
     * Helper method to update element text only if it has changed
     * This prevents unnecessary DOM updates that can cause flickering
     */
    private updateElementTextIfDifferent(elementId: string, newText: string): void {
        console.log(`[DEBUG-UPDATE] Trying to update element ${elementId} with text: ${newText}`);
        
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`[DEBUG-UPDATE] Element ${elementId} not found in the DOM`);
            return;
        }
        
        const currentText = element.textContent;
        console.log(`[DEBUG-UPDATE] Current text: "${currentText}", New text: "${newText}"`);
        
        if (currentText !== newText) {
            console.log(`[DEBUG-UPDATE] Text has changed, updating DOM`);
            element.textContent = newText;
        } else {
            console.log(`[DEBUG-UPDATE] Text unchanged, skipping update`);
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
                            
                            console.log(`[DEBUG-TEMPLATE] Templates available: homeTemplate=${!!homeTemplate}, regularTemplate=${!!regularTemplate}`);
                            
                            // Create elements for each time zone
                            timeZones.forEach((tz: TimeZoneInfo) => {
                                // Format UTC offset string
                                const utcOffsetStr = `UTC ${tz.utcOffsetHours >= 0 ? '+' : ''}${tz.utcOffsetHours}${tz.utcOffsetMinutes ? ':' + tz.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
                                
                                // Determine which template to use based on isHome flag
                                let cardElement: DocumentFragment | HTMLElement;
                                
                                if (tz.isHome && homeTemplate) {
                                    // Use the home template if available
                                    console.log(`[DEBUG-TEMPLATE] Using home template for ${tz.zoneId}`);
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
                                        console.log(`[DEBUG-TEMPLATE] Info button not found for home time zone ${tz.zoneId}`);
                                    }
                                    
                                    // Update weather with icon
                                    const cardBody = cardElement.querySelector('.card-body');
                                    if (cardBody && tz.weatherInfo) {
                                        this.updateWeatherInfoOnCard(tz, cardBody);
                                    }
                                } 
                                else if (!tz.isHome && regularTemplate) {
                                    // Use the regular template if available
                                    console.log(`[DEBUG-TEMPLATE] Using regular template for ${tz.zoneId}`);
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
                                        console.log(`[DEBUG-TEMPLATE] Home button not found for ${tz.zoneId}`);
                                    }
                                    
                                    const infoButton = cardElement.querySelector('.card-info-button');
                                    if (infoButton) {
                                        infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(tz.zoneId));
                                    } else {
                                        console.log(`[DEBUG-TEMPLATE] Info button not found for ${tz.zoneId}`);
                                    }
                                    
                                    const deleteButton = cardElement.querySelector('.card-delete-button');
                                    if (deleteButton) {
                                        deleteButton.addEventListener('click', () => this.deleteTimeZone(tz.zoneId));
                                    } else {
                                        console.log(`[DEBUG-TEMPLATE] Delete button not found for ${tz.zoneId}`);
                                    }
                                }
                                else {
                                    // Fallback to manual creation if templates aren't available
                                    console.log(`[DEBUG-TEMPLATE] Templates not available, creating card manually for ${tz.zoneId}`);
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
    console.log('initTimeZones called, already initialized:', initialized);
    
    // If already initialized, refresh the data
    if (initialized && globalManager) {
        console.log('Time zones already initialized, refreshing data');
        globalManager.loadTimeZonesData(true);
        return;
    }
    
    initialized = true;
    console.log('Creating time zones manager');
    
    // Create a new manager and store globally
    globalManager = new TimeZonesManager();
    
    // Load time zone data once
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Loading time zone data from DOMContentLoaded');
            if (globalManager) globalManager.loadTimeZonesData();
        });
    } else {
        // DOM is already loaded
        console.log('Loading time zone data immediately');
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