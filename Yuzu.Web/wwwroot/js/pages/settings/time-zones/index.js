// src/pages/settings/time-zones/index.ts
import { createToast } from '../../../common/toast-util.js';
import { createTimeZoneCard } from './card-creator.js';
import { updateTimeZoneInfoTime, formatUtcOffset } from './time-utils.js';
import { setupPagination } from './pagination.js';
import { setupScrollFadeEffects as setupVpScrollFadeEffects } from './viewport-utils.js';
/**
 * Manages the time zones section of the settings page
 */
export class TimeZonesManager {
    /**
     * Initialize the time zones manager
     */
    constructor() {
        // Time zones properties
        this.timeZoneList = [];
        this.homeTimeZoneId = null;
        this.timeZonesSearchTerm = '';
        this.totalTimeZones = 0;
        // Keep these properties for search modal pagination
        this.timeZonesCurrentPage = 1; // Used in search modal pagination only
        this.timeZonesPageSize = 10; // Used in search modal pagination only
        this.timeZoneModalFocusedRowIndex = -1;
        this.timeZoneModalSelectedRowIndex = -1;
        this.selectedTimeZoneId = null;
        this.bootstrap = window.bootstrap;
        // Event handler reference for modal events
        this.modalShownHandler = null;
        // State tracking
        this.isTimeZoneDataLoading = false;
        this.isTimeZoneDataLoaded = false;
        console.log('[TIME ZONES] Initializing TimeZonesManager...');
        // CRITICAL: The order here matters
        // 1. Make our methods available in the global namespace with explicit binding
        // 2. Set up instance access via getInstance()
        // 3. Setup event handlers for the modal
        // Step 1: Make all methods available in the global namespace
        // These methods are used directly from HTML attributes in button clicks
        // The explicit bind() ensures they maintain the correct 'this' context
        try {
            console.log('[TIME ZONES] Binding global methods...');
            // Create bound versions of all methods to maintain proper 'this' context
            const boundShowTimeZonesModal = this.showTimeZonesModal.bind(this);
            const boundShowTimeZoneInfoModal = this.showTimeZoneInfoModal.bind(this);
            const boundSetHomeTimeZone = this.setHomeTimeZone.bind(this);
            const boundDeleteTimeZone = this.deleteTimeZone.bind(this);
            const boundChangePage = this.changePage.bind(this);
            const boundSelectAndConfirmTimeZone = this.selectAndConfirmTimeZone.bind(this);
            const boundConfirmSelection = this.confirmSelection.bind(this);
            // Direct assignment to window object - simple and effective
            window.showTimeZonesModal = boundShowTimeZonesModal;
            window.showTimeZoneInfoModal = boundShowTimeZoneInfoModal;
            window.setHomeTimeZone = boundSetHomeTimeZone;
            window.deleteTimeZone = boundDeleteTimeZone;
            window.changePage = boundChangePage;
            window.selectAndConfirmTimeZone = boundSelectAndConfirmTimeZone;
            window.confirmSelection = boundConfirmSelection;
            // Ensure the Yuzu namespace exists for backward compatibility
            window.Yuzu = window.Yuzu || {};
            window.Yuzu.Settings = window.Yuzu.Settings || {};
            window.Yuzu.Settings.TimeZones = window.Yuzu.Settings.TimeZones || {};
            // Verify the bindings worked
            console.log('[TIME ZONES] Global functions bound successfully:', {
                showTimeZonesModal: typeof window.showTimeZonesModal === 'function',
                showTimeZoneInfoModal: typeof window.showTimeZoneInfoModal === 'function',
                setHomeTimeZone: typeof window.setHomeTimeZone === 'function',
                deleteTimeZone: typeof window.deleteTimeZone === 'function',
                changePage: typeof window.changePage === 'function',
                selectAndConfirmTimeZone: typeof window.selectAndConfirmTimeZone === 'function',
                confirmSelection: typeof window.confirmSelection === 'function'
            });
        }
        catch (error) {
            console.error('[TIME ZONES] Error binding global methods:', error);
        }
        // Step 2: Make the instance globally available via getInstance()
        try {
            // Initialize the Yuzu namespace with a simple approach
            window.Yuzu = window.Yuzu || {};
            window.Yuzu.Settings = window.Yuzu.Settings || {};
            window.Yuzu.Settings.TimeZones = window.Yuzu.Settings.TimeZones || {};
            // Only set getInstance if it doesn't exist yet
            if (typeof window.Yuzu.Settings.TimeZones.getInstance !== 'function') {
                window.Yuzu.Settings.TimeZones.getInstance = () => this;
            }
            console.log('[TIME ZONES] Instance made globally available via getInstance()');
        }
        catch (error) {
            console.error('[TIME ZONES] Error making instance globally available:', error);
        }
        // Step 3: Set up event handlers for the search and select in the modal
        this.setupTimeZoneEventHandlers();
        // The new approach is to let settings.ts load the data for all sections
        // We don't load data here directly anymore
        console.log('[TIME ZONES] TimeZonesManager initialization complete');
    }
    /**
     * Sets up event handlers for search and pagination.
     * NOTE: IMPORTANT: This method is only for event handlers in the search modal,
     * not for the main time zone cards, which are handled by the card-creator.
     */
    setupTimeZoneEventHandlers() {
        console.log('[TIME ZONES] Setting up modal event handlers');
        // Search input handler - for the search term in modal
        const searchInput = document.getElementById('time-zones-search-term');
        if (searchInput) {
            searchInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    console.log('[TIME ZONES] Search input Enter key pressed with value:', searchInput.value);
                    this.timeZonesCurrentPage = 1;
                    this.loadTimeZones(searchInput.value);
                }
            });
            console.log('[TIME ZONES] Search input handler set up');
        }
        else {
            console.warn('[TIME ZONES] Search input element not found');
        }
        // Search button handler - for the search button in modal
        const searchButton = document.getElementById('time-zones-search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                var _a;
                const searchTerm = ((_a = document.getElementById('time-zones-search-term')) === null || _a === void 0 ? void 0 : _a.value) || '';
                console.log('[TIME ZONES] Search button clicked with value:', searchTerm);
                this.timeZonesCurrentPage = 1;
                this.loadTimeZones(searchTerm);
            });
            console.log('[TIME ZONES] Search button handler set up');
        }
        else {
            console.warn('[TIME ZONES] Search button element not found');
        }
        // Select button handler - for the select button in modal
        // This is the button that adds the selected time zone
        const selectButton = document.getElementById('time-zones-search-select-button');
        if (selectButton) {
            console.log('[TIME ZONES] Select button found, setting up handler');
            // Create a bound handler that we can reuse
            const boundHandler = this.handleSelectButtonClick.bind(this);
            // Directly add the handler - no need to clone
            selectButton.addEventListener('click', boundHandler);
            // Also set the onclick property for maximum browser compatibility
            selectButton.onclick = boundHandler;
            console.log('[TIME ZONES] Select button handler attached');
        }
        else {
            console.warn('[TIME ZONES] Select button element not found');
        }
    }
    /**
     * Handler for the select button click in the modal
     * Extracted to a separate method for clearer binding
     * Must be public so it can be referenced from outside the class
     */
    async handleSelectButtonClick(event) {
        var _a;
        // If an event is passed, prevent default behavior
        if (event) {
            event.preventDefault();
        }
        console.log('[TIME ZONES] Select button clicked with selectedTimeZoneId:', this.selectedTimeZoneId);
        if (!this.selectedTimeZoneId) {
            console.warn('[TIME ZONES] No timezone selected, cannot add');
            return;
        }
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
        if (!antiforgeryInput) {
            console.error('[TIME ZONES] Antiforgery token not found');
            return;
        }
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
            }
            catch (e) {
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
                        }
                        catch (parseError) {
                            throw new Error('Failed to parse weather data response');
                        }
                        if (weatherData.success && ((_a = weatherData.data) === null || _a === void 0 ? void 0 : _a.data)) {
                            // Find our time zone in the data
                            const tzWithWeather = weatherData.data.data.find((tz) => tz.zoneId === newTimeZone.zoneId);
                            if (tzWithWeather && tzWithWeather.weatherInfo) {
                                // Add weather info to our time zone object
                                newTimeZone.weatherInfo = tzWithWeather.weatherInfo;
                            }
                        }
                    }
                }
                catch (error) {
                    // Continue without weather info if there's an error
                    console.warn('[TIME ZONES] Error fetching weather data:', error);
                }
                // Append the card - weather info should be carried over if available
                await this.appendTimeZoneCard(newTimeZone);
                // Final verification: Find the newly added card and check its weather info
                setTimeout(() => {
                    const newCard = document.querySelector(`[data-timezone-id="${newTimeZone.zoneId}"]`);
                    if (newCard) {
                        const weatherEl = newCard.querySelector('.card-weather-info');
                        if (weatherEl && newTimeZone.weatherInfo && newTimeZone.weatherInfo.length > 0) {
                            weatherEl.classList.remove('d-none');
                            weatherEl.style.display = 'block';
                            weatherEl.style.visibility = 'visible';
                            weatherEl.setAttribute('style', 'display: block !important');
                        }
                    }
                }, 100);
            }
        }
        catch (error) {
            console.error('[TIME ZONES] Error adding timezone:', error);
            createToast('Error: Failed to add timezone. Please try again.', false);
        }
    }
    /**
     * Loads timezone data with appropriate loading states
     * @param forceRefresh - If true, force a fresh load from server even if already loaded
     */
    async loadTimeZonesData(forceRefresh = false) {
        console.log('[TIME ZONES] Starting data load...');
        // Get the container
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('[TIME ZONES] Container not found');
            return;
        }
        // If data is already being loaded, don't start another load operation
        if (this.isTimeZoneDataLoading && !forceRefresh) {
            console.log('[TIME ZONES] Already loading and no force refresh, skipping');
            return;
        }
        // IMPORTANT: For the preloaded data approach, we always keep the container marked as loaded
        // This prevents the loading indicator from showing during data load operations
        container.setAttribute('data-loaded', 'true');
        console.log('[TIME ZONES] Ensuring container stays in loaded state');
        // Store the original content so we can restore it if needed
        const originalContent = container.innerHTML;
        // Track that we're loading internally, but don't show a loading indicator
        this.isTimeZoneDataLoading = true;
        try {
            console.log('[TIME ZONES] Loading available time zones...');
            // Load available time zones first (needed for search functionality)
            await this.loadAvailableTimeZones();
            console.log(`[TIME ZONES] Loaded ${this.timeZoneList.length} available time zones`);
            console.log('[TIME ZONES] Loading user time zones display...');
            // Then load and display user time zones
            await this.loadUserTimeZonesDisplay();
            // Verify that cards are actually rendered
            const cards = container.querySelectorAll('.settings-card');
            console.log(`[TIME ZONES] Rendered ${cards.length} time zone cards`);
            // If we have no cards but also no error, we should show the empty state
            if (cards.length === 0 && container.querySelector('.col-12.text-center .text-muted') === null) {
                console.log('[TIME ZONES] No cards found, showing empty state');
                container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                </div>`;
            }
            // Mark data as loaded
            this.isTimeZoneDataLoaded = true;
            container.setAttribute('data-loaded', 'true');
            console.log('[TIME ZONES] Data loaded successfully, container marked as loaded');
            // Update fade effects
            setupVpScrollFadeEffects();
            console.log('[TIME ZONES] Fade effects updated');
        }
        catch (error) {
            console.error('[TIME ZONES] Error loading data:', error);
            // Show error state
            container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Failed to load timezone data.
                    <a href="#" onclick="event.preventDefault(); window.location.reload();">Refresh</a> to try again.
                </p>
            </div>`;
            // Mark as loaded even though it failed, to prevent loading indicators
            container.setAttribute('data-loaded', 'true');
            console.log('[TIME ZONES] Error shown, container still marked as loaded');
        }
        finally {
            this.isTimeZoneDataLoading = false;
        }
        console.log('[TIME ZONES] Data load complete');
    }
    /**
     * Shows the time zones modal dialog.
     */
    async showTimeZonesModal() {
        var _a;
        console.log("[TIME ZONES] showTimeZonesModal called");
        const modalElement = document.getElementById('time-zones-search-modal');
        if (!modalElement) {
            console.error("[TIME ZONES] Modal element not found");
            return;
        }
        // Reset state when opening modal
        this.timeZonesCurrentPage = 1;
        this.timeZoneModalFocusedRowIndex = -1;
        this.selectedTimeZoneId = null;
        this.timeZonesSearchTerm = '';
        // Reset and properly configure the select button
        const selectButton = document.getElementById('time-zones-search-select-button');
        if (selectButton) {
            // Reset visual state
            selectButton.setAttribute('disabled', '');
            selectButton.classList.remove('btn-primary');
            selectButton.classList.add('btn-secondary');
            selectButton.innerHTML = 'Select Timezone';
            // Important: Ensure event handlers are properly attached
            // First remove all existing handlers to prevent duplicates
            const newSelectButton = selectButton.cloneNode(true);
            if (selectButton.parentNode) {
                selectButton.parentNode.replaceChild(newSelectButton, selectButton);
                console.log('[TIME ZONES] Select button replaced with clean clone');
            }
            // Now add our event handlers using multiple approaches for redundancy
            const boundHandler = this.handleSelectButtonClick.bind(this);
            // 1. Standard addEventListener approach
            newSelectButton.addEventListener('click', boundHandler);
            // 2. Direct onclick property assignment
            newSelectButton.onclick = boundHandler;
            // 3. HTML attribute for absolute compatibility
            newSelectButton.setAttribute('onclick', `event.preventDefault(); 
                console.log('[TIME ZONES] Select button HTML onclick fired'); 
                if(typeof window.Yuzu?.Settings?.TimeZones?.getInstance === 'function') {
                    const manager = window.Yuzu.Settings.TimeZones.getInstance();
                    if (manager && typeof manager.handleSelectButtonClick === 'function') {
                        manager.handleSelectButtonClick(event);
                    }
                }`);
            console.log('[TIME ZONES] Select button handlers attached with triple redundancy');
        }
        // Create the bootstrap modal
        let modal;
        if (typeof ((_a = this.bootstrap) === null || _a === void 0 ? void 0 : _a.Modal) === 'function') {
            // Get existing modal instance or create a new one
            modal = this.bootstrap.Modal.getInstance(modalElement);
            if (!modal) {
                try {
                    modal = new this.bootstrap.Modal(modalElement, {
                        keyboard: true,
                        backdrop: true,
                        focus: true
                    });
                    console.log('[TIME ZONES] Created new Bootstrap modal instance');
                }
                catch (error) {
                    console.error('[TIME ZONES] Error creating modal:', error);
                }
            }
            else {
                console.log('[TIME ZONES] Using existing Bootstrap modal instance');
            }
        }
        else {
            console.error("[TIME ZONES] Bootstrap Modal not available");
            return;
        }
        // Load available time zones if needed (before showing modal)
        if (this.timeZoneList.length === 0) {
            try {
                console.log('[TIME ZONES] Loading available time zones before showing modal');
                await this.loadAvailableTimeZones();
                console.log(`[TIME ZONES] Loaded ${this.timeZoneList.length} available time zones`);
            }
            catch (error) {
                console.error("[TIME ZONES] Failed to load available time zones:", error);
            }
        }
        // Remove any existing shown event handlers to prevent duplicates
        if (this.modalShownHandler) {
            modalElement.removeEventListener('shown.bs.modal', this.modalShownHandler);
            this.modalShownHandler = null;
        }
        // Create a bound handler and store it as a property on the manager
        this.modalShownHandler = () => {
            console.log("[TIME ZONES] Modal shown event fired");
            // Re-verify select button handler
            const selectButton = document.getElementById('time-zones-search-select-button');
            if (selectButton) {
                // Re-add handler directly
                const boundHandler = this.handleSelectButtonClick.bind(this);
                selectButton.onclick = boundHandler;
                console.log('[TIME ZONES] Select button handler verified in shown event');
            }
            // Load time zones and set focus on search input
            const searchInput = document.getElementById('time-zones-search-term');
            if (searchInput) {
                searchInput.value = '';
                this.loadTimeZones('');
                setTimeout(() => {
                    searchInput.focus();
                    console.log('[TIME ZONES] Set focus to search input');
                }, 50);
            }
        };
        // Add the event handler using our stored bound function
        modalElement.addEventListener('shown.bs.modal', this.modalShownHandler);
        // Show the modal
        try {
            console.log('[TIME ZONES] Showing modal...');
            modal.show();
        }
        catch (error) {
            console.error('[TIME ZONES] Error showing modal:', error);
        }
        // Fallback: Load time zones after a delay if the shown event doesn't fire
        setTimeout(() => {
            const searchInput = document.getElementById('time-zones-search-term');
            if (searchInput) {
                if (searchInput.value === '') {
                    console.log('[TIME ZONES] Fallback: Loading time zones after delay');
                    this.loadTimeZones('');
                    searchInput.focus();
                }
            }
        }, 300);
    }
    /**
     * Loads the list of available timezones from the backend
     */
    async loadAvailableTimeZones() {
        try {
            // Use current path for correct routing
            const url = `${document.location.pathname}?handler=AvailableTimeZones`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                cache: 'no-store' // Prevent browser caching
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            // Process the standardized response
            if (responseData.success) {
                this.timeZoneList = responseData.data || [];
            }
            else {
                throw new Error(responseData.message || 'Failed to load available timezones');
            }
        }
        catch (error) {
            // Initialize an empty array to prevent null reference errors elsewhere
            this.timeZoneList = [];
            // Re-throw the error to be handled by the calling function
            throw error;
        }
    }
    /**
     * Loads and displays user's selected time zones in the main page container.
     * Called when the page loads to prepare all data.
     */
    async loadUserTimeZonesDisplay() {
        var _a, _b;
        const container = document.getElementById('time-zone-container');
        if (!container) {
            return;
        }
        // Keep track of the original content in case we need to restore it
        const originalContent = container.innerHTML;
        try {
            // Request all timezones with weather information
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=1&pageSize=1000&includeWeather=true`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                cache: 'no-store' // Prevent caching
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Parse the response
            const responseText = await response.text();
            let responseData = JSON.parse(responseText);
            // Verify success
            if (!responseData.success) {
                throw new Error(responseData.message || 'Failed to load user timezones');
            }
            // Extract data
            const timeZones = ((_a = responseData.data) === null || _a === void 0 ? void 0 : _a.data) || [];
            this.homeTimeZoneId = ((_b = responseData.data) === null || _b === void 0 ? void 0 : _b.homeTimeZoneId) || null;
            // IMPORTANT: Prepare a new container in memory first, don't modify the DOM right away
            // This prevents flickering or showing a loading indicator
            const tempContainer = document.createElement('div');
            if (timeZones.length > 0) {
                // Use document fragment for better performance
                const fragment = document.createDocumentFragment();
                // Create cards for each timezone
                timeZones.forEach((timeZone) => {
                    try {
                        // Ensure global functions are available - this is the key to making it work
                        window.setHomeTimeZone = this.setHomeTimeZone.bind(this);
                        window.showTimeZoneInfoModal = this.showTimeZoneInfoModal.bind(this);
                        window.deleteTimeZone = this.deleteTimeZone.bind(this);
                        // Create the card - we still pass the callbacks for backward compatibility
                        const cardElement = createTimeZoneCard(timeZone, this.setHomeTimeZone.bind(this), this.showTimeZoneInfoModal.bind(this), this.deleteTimeZone.bind(this));
                        fragment.appendChild(cardElement);
                    }
                    catch (err) {
                        console.error('[TIME ZONES] Error creating card:', err);
                    }
                });
                // Add all cards to the temporary container
                tempContainer.appendChild(fragment);
                // Only after preparing everything, update the real container
                container.innerHTML = tempContainer.innerHTML;
                // Update fade effects based on content
                const viewportContainer = document.getElementById('timezones-viewport-container');
                if (viewportContainer) {
                    viewportContainer.dispatchEvent(new Event('scroll'));
                }
            }
            else {
                // Show empty state message
                container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                </div>`;
            }
        }
        catch (error) {
            console.error('[TIME ZONES] Error loading user timezones:', error);
            // Show error state
            container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">An error occurred while loading your timezones. Please try again.</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                    <i class="bx bx-refresh me-1"></i> Reload Page
                </button>
            </div>`;
        }
        // Always ensure the container is marked as loaded
        container.setAttribute('data-loaded', 'true');
    }
    /**
     * Changes the page for search results modal (pagination still needed there)
     * This function must be exposed to window to work with onclick handlers.
     * Main page pagination has been removed.
     */
    changePage(page, searchTerm) {
        if (page < 1) {
            return;
        }
        // Update the current page first (for search modal only)
        this.timeZonesCurrentPage = page;
        // Only handle search modal pagination now
        if (searchTerm !== null) {
            // This is for the modal search results
            // Convert null to empty string if needed
            const term = searchTerm || '';
            this.timeZonesSearchTerm = term;
            this.loadTimeZones(term, page);
        }
        // Main page pagination has been removed - we show all cards in the viewport
    }
    /**
     * Searches and paginates the time zone list based on the given search term.
     */
    searchTimeZones(searchTerm, page = 1, pageSize = 10) {
        console.log(`[DEBUG] searchTimeZones - START with term "${searchTerm}", page ${page}, pageSize ${pageSize}`);
        // Safety check - ensure timeZoneList is defined and is an array
        if (!this.timeZoneList || !Array.isArray(this.timeZoneList)) {
            console.warn("[DEBUG] searchTimeZones - TimeZoneList is not available or not an array");
            return { pagedResults: [], totalCount: 0 };
        }
        console.log(`[DEBUG] searchTimeZones - Working with ${this.timeZoneList.length} time zones`);
        // Normalize the search term to lowercase for case-insensitive search
        const normalizedSearchTerm = searchTerm.toLowerCase();
        console.log(`[DEBUG] searchTimeZones - Normalized search term: "${normalizedSearchTerm}"`);
        // Filter the time zones based on the search term
        const filteredTimeZones = this.timeZoneList.filter(tz => {
            // Debug any malformed timezone data
            if (!tz || typeof tz !== 'object') {
                console.error('[DEBUG] searchTimeZones - Invalid timezone object:', tz);
                return false;
            }
            try {
                // Safety check each property before using it
                const cityMatch = tz.cities && Array.isArray(tz.cities) && tz.cities.length > 0 &&
                    tz.cities[0] && tz.cities[0].toLowerCase().includes(normalizedSearchTerm);
                const countryMatch = tz.countryName && typeof tz.countryName === 'string' &&
                    tz.countryName.toLowerCase().includes(normalizedSearchTerm);
                const continentMatch = tz.continent && typeof tz.continent === 'string' &&
                    tz.continent.toLowerCase().includes(normalizedSearchTerm);
                const aliasMatch = tz.alias && typeof tz.alias === 'string' &&
                    tz.alias.toLowerCase().includes(normalizedSearchTerm);
                return cityMatch || countryMatch || continentMatch || aliasMatch;
            }
            catch (error) {
                console.error('[DEBUG] searchTimeZones - Error while filtering timezone:', error, tz);
                return false;
            }
        });
        console.log(`[DEBUG] searchTimeZones - Filtered to ${filteredTimeZones.length} time zones`);
        // If search term is empty, show all time zones (limited by pagination)
        if (normalizedSearchTerm === '') {
            console.log(`[DEBUG] searchTimeZones - Empty search, showing all time zones (limited by pagination)`);
        }
        // Calculate pagination
        const cleanPage = Math.max(1, page); // Ensure page is at least 1
        const cleanPageSize = Math.max(1, pageSize); // Ensure pageSize is at least 1
        const startIndex = (cleanPage - 1) * cleanPageSize;
        console.log(`[DEBUG] searchTimeZones - Pagination: page ${cleanPage}, pageSize ${cleanPageSize}, startIndex ${startIndex}`);
        // Get the paged results, handling edge cases
        const pagedResults = startIndex < filteredTimeZones.length
            ? filteredTimeZones.slice(startIndex, startIndex + cleanPageSize)
            : [];
        console.log(`[DEBUG] searchTimeZones - Returning ${pagedResults.length} results, total count ${filteredTimeZones.length}`);
        // Log the first item in the results for debugging
        if (pagedResults.length > 0) {
            console.log(`[DEBUG] searchTimeZones - First result: ${JSON.stringify(pagedResults[0])}`);
        }
        return { pagedResults, totalCount: filteredTimeZones.length };
    }
    /**
     * Initializes Bootstrap tooltips for the timezone table.
     */
    initializeTooltips() {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(element => {
            new this.bootstrap.Tooltip(element);
        });
    }
    /**
     * Loads and displays time zones based on the current search term and pagination.
     * @param searchTerm The search term to filter time zones
     * @param page The page number for the search results modal (defaults to 1)
     */
    loadTimeZones(searchTerm, page = 1) {
        console.log(`[DEBUG] loadTimeZones - Loading time zones with search term: "${searchTerm}", page: ${page}`);
        this.timeZonesSearchTerm = searchTerm; // Store the current search term
        const tableBody = document.getElementById('time-zones-search-table-body');
        if (!tableBody) {
            console.error("[DEBUG] loadTimeZones - Time zones table body element not found");
            return;
        }
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        // Check if we have timezone data available
        console.log(`[DEBUG] loadTimeZones - timeZoneList status: ${this.timeZoneList ? 'defined' : 'undefined'}, length: ${this.timeZoneList ? this.timeZoneList.length : 0}`);
        if (!this.timeZoneList || this.timeZoneList.length === 0) {
            console.log("[DEBUG] loadTimeZones - No time zone data available, trying to load from server");
            // Try to load timezone data first
            this.loadAvailableTimeZones().then(() => {
                // After loading, try again
                console.log(`[DEBUG] loadTimeZones - After loadAvailableTimeZones: timeZoneList length: ${this.timeZoneList.length}`);
                this.loadTimeZones(searchTerm, page);
            }).catch(error => {
                console.error("[DEBUG] loadTimeZones - Failed to load timezone data:", error);
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load timezone data from server. Please try refreshing the page.</td></tr>';
                // Display the error in the user interface
                this.updateSearchResultsAnnouncement(0, searchTerm);
            });
            return;
        }
        try {
            console.log(`[DEBUG] loadTimeZones - Searching through ${this.timeZoneList.length} timezones with term: "${searchTerm}"`);
            // Dump first few items to debug
            if (this.timeZoneList.length > 0) {
                console.log('[DEBUG] loadTimeZones - First timezone item sample:', JSON.stringify(this.timeZoneList[0]));
            }
            // Use in-memory search for the modal table (we don't need to hit the server again)
            // This way we avoid additional server round-trips after initial data load
            const pageSize = 10; // Fixed page size for search results
            const { pagedResults, totalCount } = this.searchTimeZones(searchTerm, page, pageSize);
            this.totalTimeZones = totalCount; // Store the total count
            console.log(`[DEBUG] loadTimeZones - Search results: ${totalCount} total matches, showing ${pagedResults.length} on page ${page}`);
            tableBody.innerHTML = '';
            if (pagedResults.length > 0) {
                console.log('[DEBUG] loadTimeZones - Creating rows for search results');
                pagedResults.forEach((timeZone, index) => {
                    const row = document.createElement('tr');
                    row.setAttribute('role', 'option');
                    row.setAttribute('aria-selected', 'false');
                    row.setAttribute('tabindex', '0');
                    row.setAttribute('data-zone-id', timeZone.zoneId);
                    // Format the UTC offset nicely
                    const utcOffsetFormatted = formatUtcOffset(timeZone);
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
                console.log('[DEBUG] loadTimeZones - Rows created, initializing tooltips and row selection');
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
            }
            else {
                // Determine if this is because of an empty search or no timezones at all
                if (this.timeZoneList.length === 0) {
                    console.log('[DEBUG] loadTimeZones - No timezone data available');
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-warning">No timezone data is available. Please try refreshing the page.</td></tr>';
                }
                else {
                    console.log('[DEBUG] loadTimeZones - No matching results found');
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Sorry, I could not find any results. Please try again.</td></tr>';
                }
                this.updateSearchResultsAnnouncement(0, searchTerm);
                this.timeZoneModalFocusedRowIndex = -1; // Reset focus when no results
            }
            console.log('[DEBUG] loadTimeZones - Setting up pagination');
            setupPagination(totalCount, page, pageSize, 'time-zones-search-pagination-controls', true, searchTerm);
        }
        catch (error) {
            console.error("[DEBUG] loadTimeZones - Error loading time zones:", error);
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">An error occurred while searching. Please try again.</td></tr>';
        }
    }
    /**
     * Updates the search results announcement for screen readers.
     */
    updateSearchResultsAnnouncement(totalCount, searchTerm = '') {
        const searchResults = document.getElementById('time-zones-search-results');
        if (searchResults) {
            const message = searchTerm
                ? `Found ${totalCount} timezone${totalCount !== 1 ? 's' : ''} matching "${searchTerm}"`
                : `Showing all ${totalCount} timezones`;
            searchResults.textContent = message;
        }
    }
    /**
     * Adds click and keyboard selection behavior to table rows
     */
    addRowSelection() {
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
                this.selectTimeZone(row);
            });
            // Double click handler
            row.addEventListener('dblclick', () => {
                this.selectTimeZone(row);
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
            row.addEventListener('keydown', (event) => {
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
                            this.loadTimeZones(this.timeZonesSearchTerm, this.timeZonesCurrentPage);
                        }
                        break;
                    case 'PageDown':
                        event.preventDefault();
                        const pageSize = 10; // Fixed page size for search results
                        const maxPages = Math.ceil(this.totalTimeZones / pageSize);
                        if (this.timeZonesCurrentPage < maxPages) {
                            this.timeZonesCurrentPage++;
                            this.loadTimeZones(this.timeZonesSearchTerm, this.timeZonesCurrentPage);
                        }
                        break;
                    case ' ':
                    case 'Enter':
                        event.preventDefault();
                        this.selectTimeZone(row);
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
    updateFocusedRow(rows) {
        rows.forEach((row, index) => {
            const element = row;
            if (index === this.timeZoneModalFocusedRowIndex) {
                element.focus();
                element.classList.add('focused');
                // Ensure the row is visible
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            else {
                element.classList.remove('focused');
            }
        });
    }
    /**
     * Helper method to apply selected styling to a row
     */
    applySelectedRowStyling(row) {
        // Add CSS class
        row.classList.add('selected');
        row.setAttribute('aria-selected', 'true');
        // Apply direct inline styles
        row.style.backgroundColor = '#343a40';
        row.style.color = 'white';
        // Style all cells in the row
        row.querySelectorAll('td, th').forEach(cell => {
            const cellElement = cell;
            cellElement.style.backgroundColor = '#343a40';
            cellElement.style.color = 'white';
            cellElement.style.borderColor = '#212529';
        });
    }
    /**
     * Selects a timezone without confirming
     */
    selectTimeZone(row) {
        var _a;
        const rows = document.querySelectorAll('#time-zones-search-table-body tr[role="option"]');
        rows.forEach(r => {
            r.classList.remove('selected');
            r.setAttribute('aria-selected', 'false');
            // Reset any custom background color or text color
            r.style.removeProperty('background-color');
            r.style.removeProperty('color');
            // Reset the text color in all cells of this row
            r.querySelectorAll('td, th').forEach(cell => {
                const cellElement = cell;
                cellElement.style.removeProperty('background-color');
                cellElement.style.removeProperty('color');
                cellElement.style.removeProperty('border-color');
            });
        });
        // Apply selection styling
        this.applySelectedRowStyling(row);
        this.selectedTimeZoneId = row.getAttribute('data-zone-id');
        // Enable/disable select button based on selection
        const selectButton = document.getElementById('time-zones-search-select-button');
        if (selectButton) {
            if (this.selectedTimeZoneId) {
                // Enable button and make it stand out
                selectButton.removeAttribute('disabled');
                selectButton.classList.remove('btn-secondary');
                selectButton.classList.add('btn-primary');
                // Just update the text - no need to replace the button or re-bind events
                const cityName = ((_a = row.querySelector('td:nth-child(3)')) === null || _a === void 0 ? void 0 : _a.textContent) || '';
                selectButton.innerHTML = `Select &nbsp;<b>${cityName}</b>`;
            }
            else {
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
    selectAndConfirmTimeZone(row) {
        console.log('[TIME ZONES] selectAndConfirmTimeZone called');
        this.selectTimeZone(row);
        this.confirmSelection();
    }
    /**
     * Confirms the current selection by clicking the select button
     * This method is used for the double-click functionality in the modal
     */
    confirmSelection() {
        console.log('[TIME ZONES] confirmSelection called');
        try {
            const selectButton = document.getElementById('time-zones-search-select-button');
            if (selectButton && !selectButton.hasAttribute('disabled')) {
                console.log('[TIME ZONES] Triggering click on select button');
                // Try multiple approaches to trigger the action for maximum reliability
                // 1. Use the click() method (most standard approach)
                selectButton.click();
                // 2. Create and dispatch a click event (for browsers where click() might not work)
                try {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    selectButton.dispatchEvent(clickEvent);
                    console.log('[TIME ZONES] Dispatched synthetic click event');
                }
                catch (e) {
                    console.warn('[TIME ZONES] Error dispatching synthetic click:', e);
                }
                // 3. If we have a selectedTimeZoneId, call the handler directly (most reliable)
                if (this.selectedTimeZoneId) {
                    console.log('[TIME ZONES] Calling handler directly with selected timezone:', this.selectedTimeZoneId);
                    // Small delay to avoid potential race conditions
                    setTimeout(() => {
                        this.handleSelectButtonClick();
                    }, 10);
                }
            }
            else {
                console.log('[TIME ZONES] Select button not found or disabled');
                // Try to find any select button in the modal footer by text content
                const modalFooterButtons = document.querySelectorAll('#time-zones-search-modal .modal-footer button');
                let selectButtonFound = false;
                modalFooterButtons.forEach(btn => {
                    if (btn.innerText.includes('Select')) {
                        console.log('[TIME ZONES] Found select button by text content');
                        selectButtonFound = true;
                        btn.click();
                    }
                });
                // If no button was found but we have a timezone ID, call the handler directly
                if (!selectButtonFound && this.selectedTimeZoneId) {
                    console.log('[TIME ZONES] No button found, but have timezone ID. Calling handler directly.');
                    this.handleSelectButtonClick();
                }
            }
        }
        catch (error) {
            console.error('[TIME ZONES] Error in confirmSelection:', error);
            // Final fallback: If we have a selectedTimeZoneId, always try the handler directly
            if (this.selectedTimeZoneId) {
                console.log('[TIME ZONES] Using final fallback with timezone ID:', this.selectedTimeZoneId);
                try {
                    this.handleSelectButtonClick();
                }
                catch (secondError) {
                    console.error('[TIME ZONES] Final fallback also failed:', secondError);
                }
            }
        }
    }
    /**
     * Deletes a timezone from the user's list with animation
     */
    async deleteTimeZone(timeZoneId) {
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
        if (!antiforgeryInput) {
            createToast('Error: Security token not found. Please refresh the page and try again.', false);
            return;
        }
        try {
            // Find the card element to be removed
            const cardElement = document.querySelector(`[data-timezone-id="${timeZoneId}"]`);
            if (!cardElement) {
                throw new Error('Card element not found');
            }
            // Show a loading state on the card
            const cardBody = cardElement.querySelector('.card-body');
            const cardFooter = cardElement.querySelector('.card-footer');
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
                cardElement.style.position = 'relative';
                cardElement.appendChild(overlay);
                // Disable buttons
                if (cardFooter) {
                    const buttons = cardFooter.querySelectorAll('button');
                    buttons.forEach(button => button.setAttribute('disabled', 'disabled'));
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
            }
            catch (e) {
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
            // Animate the removal of the card instead of refreshing the entire list
            this.animateCardRemoval(cardElement);
        }
        catch (error) {
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
     * Animates the removal of a card from the DOM
     * @param cardElement The card element to remove with animation
     */
    animateCardRemoval(cardElement) {
        // Get the parent column element which is what we'll actually remove
        const columnElement = cardElement.closest('.col');
        if (!columnElement)
            return;
        // Use CSS transitions for smooth animation
        // First, set up transition properties
        columnElement.style.transition = 'all 0.3s ease-out';
        // Apply initial transition to fade out and shrink
        // We'll move this to a setTimeout to ensure the transition applies
        setTimeout(() => {
            columnElement.style.opacity = '0';
            columnElement.style.transform = 'scale(0.8)';
            columnElement.style.maxHeight = '0';
            columnElement.style.margin = '0';
            columnElement.style.padding = '0';
            columnElement.style.overflow = 'hidden';
            // After animation completes, remove the element from DOM
            setTimeout(() => {
                columnElement.remove();
                // If this was the last card, show the empty state
                const container = document.getElementById('time-zone-container');
                if (container && container.querySelectorAll('[data-timezone-id]').length === 0) {
                    container.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
                    </div>`;
                }
                // Update fade effects to adapt to new content height
                this.setupScrollFadeEffects();
            }, 300); // Same duration as the transition
        }, 10);
        // Note: We kept the original implementation rather than using the common utility
        // because this method handles the empty state message specific to time zones
    }
    /**
     * Updates the display when a timezone is set as home with animations and proper event handlers
     * @param newHomeTimeZoneId The ID of the new home timezone
     */
    async updateHomeTimeZoneDisplay(newHomeTimeZoneId) {
        const container = document.getElementById('time-zone-container');
        if (!container) {
            return;
        }
        // Store the new home timezone ID
        this.homeTimeZoneId = newHomeTimeZoneId;
        // Find all timezone cards
        const cards = container.querySelectorAll('[data-timezone-id]');
        // Track the previous home timezone element to animate it
        let previousHomeElement = null;
        let newHomeElement = null;
        cards.forEach(card => {
            const cardId = card.getAttribute('data-timezone-id');
            const article = card.querySelector('article');
            const title = card.querySelector('.card-title');
            const footer = card.querySelector('.card-footer');
            if (cardId === newHomeTimeZoneId) {
                // This is the new home timezone
                newHomeElement = card;
                if (article) {
                    // Apply transition for smooth border color change
                    article.style.transition = 'border-color 0.3s ease, background-color 0.3s ease';
                    article.classList.add('border-primary');
                    // Highlight background color change with animation
                    setTimeout(() => {
                        if (article) {
                            article.style.backgroundColor = '#f0f7ff';
                        }
                    }, 10);
                }
                // Add the home badge if it doesn't exist
                if (title && !title.querySelector('.badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-primary ms-2';
                    badge.textContent = 'Home';
                    badge.style.opacity = '0';
                    badge.style.transform = 'scale(0.8)';
                    badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    title.appendChild(badge);
                    // Animate the badge appearing
                    setTimeout(() => {
                        badge.style.opacity = '1';
                        badge.style.transform = 'scale(1)';
                    }, 10);
                }
                // Remove the footer with buttons with animation
                if (footer) {
                    footer.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease';
                    footer.style.opacity = '0';
                    footer.style.transform = 'translateY(10px)';
                    footer.style.maxHeight = '0';
                    footer.style.overflow = 'hidden';
                    // Remove after animation completes
                    setTimeout(() => {
                        footer.remove();
                        // Add info-only footer
                        if (article) {
                            const infoFooter = document.createElement('div');
                            infoFooter.className = 'card-footer d-flex align-items-center py-3';
                            infoFooter.style.backgroundColor = '#e6f0ff';
                            infoFooter.style.borderTopColor = '#c9d9f9';
                            infoFooter.style.opacity = '0';
                            infoFooter.style.transition = 'opacity 0.3s ease';
                            infoFooter.innerHTML = `
                                <div class="d-flex">
                                    <button type="button" class="card-info-button btn btn-sm btn-outline-primary">
                                        <i class="bx bx-info-circle fs-xl me-1"></i>
                                        <span class="d-none d-md-inline">Info</span>
                                    </button>
                                </div>
                            `;
                            // Add event handler for info button
                            const infoButton = infoFooter.querySelector('.card-info-button');
                            if (infoButton && cardId) {
                                infoButton.addEventListener('click', () => this.showTimeZoneInfoModal(cardId));
                            }
                            article.appendChild(infoFooter);
                            // Animate the new footer appearing
                            setTimeout(() => {
                                infoFooter.style.opacity = '1';
                            }, 10);
                        }
                    }, 300);
                }
                // Scroll this card into view if needed
                setTimeout(() => {
                    this.scrollCardIntoView(card);
                }, 350);
            }
            else if (article && article.classList.contains('border-primary')) {
                // This was the previous home timezone
                previousHomeElement = card;
                // Apply transition for smooth border color change
                article.style.transition = 'border-color 0.3s ease, background-color 0.3s ease';
                article.classList.remove('border-primary');
                // Reset background color with animation
                setTimeout(() => {
                    if (article) {
                        article.style.backgroundColor = '#f5f7fa';
                    }
                }, 10);
                // Remove home badge with animation
                const badge = title === null || title === void 0 ? void 0 : title.querySelector('.badge');
                if (badge) {
                    badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    badge.style.opacity = '0';
                    badge.style.transform = 'scale(0.8)';
                    // Remove after animation completes
                    setTimeout(() => {
                        badge.remove();
                    }, 300);
                }
                // Add standard footer with buttons
                if (!footer && article) {
                    const newFooter = document.createElement('div');
                    newFooter.className = 'card-footer d-flex align-items-center py-3';
                    newFooter.style.opacity = '0';
                    newFooter.style.transform = 'translateY(10px)';
                    newFooter.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    newFooter.innerHTML = `
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
                    // Set the footer style directly
                    newFooter.style.opacity = '1';
                    newFooter.style.transform = 'translateY(0)';
                }
            }
        });
        // Update fade effects in case layout changed
        this.setupScrollFadeEffects();
    }
    /**
     * Directly appends a timezone card to the container with animation
     * This is used when adding a new timezone to avoid refreshing the entire list
     * @param timeZone - The timezone to append
     */
    async appendTimeZoneCard(timeZone) {
        const container = document.getElementById('time-zone-container');
        if (!container) {
            return;
        }
        try {
            // Check if there's an empty state message and remove it
            const emptyState = container.querySelector('.col-12.text-center');
            if (emptyState) {
                container.innerHTML = '';
            }
            // Ensure global functions are available - this is what makes the buttons work
            window.setHomeTimeZone = this.setHomeTimeZone.bind(this);
            window.showTimeZoneInfoModal = this.showTimeZoneInfoModal.bind(this);
            window.deleteTimeZone = this.deleteTimeZone.bind(this);
            // Create the card using our helper function
            const cardElement = createTimeZoneCard(timeZone, this.setHomeTimeZone.bind(this), this.showTimeZoneInfoModal.bind(this), this.deleteTimeZone.bind(this));
            // Add animation class to the column element
            cardElement.classList.add('card-new');
            // Add it directly to the container
            container.appendChild(cardElement);
            // Scroll the new card into view immediately
            this.scrollCardIntoView(cardElement);
            // Update scroll fade effects immediately
            this.setupScrollFadeEffects();
        }
        catch (error) {
            // If there's an error, fall back to refreshing the entire list
            console.error('Error appending time zone card:', error);
            this.loadUserTimeZonesDisplay();
        }
    }
    /**
     * Scrolls a card element into view if it's not currently visible
     * @param cardElement The card element to scroll into view
     */
    scrollCardIntoView(cardElement) {
        const viewportContainer = document.querySelector('.viewport-container');
        if (!viewportContainer)
            return;
        // Get the viewport container's bounds
        const containerRect = viewportContainer.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        // Check if the card is partially or fully outside the viewport container
        const isVisible = (cardRect.top >= containerRect.top &&
            cardRect.bottom <= containerRect.bottom);
        if (!isVisible) {
            // Calculate how to scroll to make the card fully visible
            // If the card is too tall to fit in the viewport, scroll to its top
            if (cardRect.height > containerRect.height) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            else {
                // Otherwise, scroll to the center of the card
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    /**
     * Sets up the fade effects for the viewport container
     * Shows/hides the top and bottom fade effects based on scroll position
     */
    setupScrollFadeEffects() {
        console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - START');
        // Check DOM elements before calling the shared function
        const container = document.getElementById('timezones-viewport-container');
        const topFade = document.querySelector('#time-zones .fade-overlay.fade-top');
        const bottomFade = document.querySelector('#time-zones .fade-overlay.fade-bottom');
        console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - DOM elements before setup:', {
            container: container ? {
                id: container.id,
                clientHeight: container.clientHeight,
                scrollHeight: container.scrollHeight,
                overflowY: window.getComputedStyle(container).overflowY
            } : 'not found',
            topFade: topFade ? {
                classList: Array.from(topFade.classList),
                isHidden: topFade.classList.contains('hidden'),
                opacity: window.getComputedStyle(topFade).opacity,
                display: window.getComputedStyle(topFade).display,
                visibility: window.getComputedStyle(topFade).visibility
            } : 'not found',
            bottomFade: bottomFade ? {
                classList: Array.from(bottomFade.classList),
                isHidden: bottomFade.classList.contains('hidden'),
                opacity: window.getComputedStyle(bottomFade).opacity,
                display: window.getComputedStyle(bottomFade).display,
                visibility: window.getComputedStyle(bottomFade).visibility
            } : 'not found'
        });
        // Use the utility from viewport-utils.js
        setupVpScrollFadeEffects();
        // Check again after setting up
        setTimeout(() => {
            console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - DOM elements after setup:', {
                container: container ? {
                    clientHeight: container.clientHeight,
                    scrollHeight: container.scrollHeight,
                    overflowY: window.getComputedStyle(container).overflowY
                } : 'not found',
                topFade: topFade ? {
                    classList: Array.from(topFade.classList),
                    isHidden: topFade.classList.contains('hidden'),
                    opacity: window.getComputedStyle(topFade).opacity,
                    display: window.getComputedStyle(topFade).display,
                    visibility: window.getComputedStyle(topFade).visibility
                } : 'not found',
                bottomFade: bottomFade ? {
                    classList: Array.from(bottomFade.classList),
                    isHidden: bottomFade.classList.contains('hidden'),
                    opacity: window.getComputedStyle(bottomFade).opacity,
                    display: window.getComputedStyle(bottomFade).display,
                    visibility: window.getComputedStyle(bottomFade).visibility
                } : 'not found'
            });
        }, 200);
        console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - END');
    }
    /**
     * Shows detailed information about a timezone in a modal dialog
     * @param timeZoneId The ID of the timezone to display information for
     */
    async showTimeZoneInfoModal(timeZoneId) {
        // First, ensure our timezone list is loaded
        if (this.timeZoneList.length === 0) {
            try {
                await this.loadAvailableTimeZones();
            }
            catch (error) {
                createToast('Error: Failed to load timezone information', false);
                return;
            }
        }
        // Find the selected timezone in our cached list
        const selectedTimeZone = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
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
                    }
                    catch (parseError) {
                        throw new Error('Failed to parse timezone info response');
                    }
                    if (data.success && data.data) {
                        // Use the timezone info from the API response
                        const tzInfo = data.data;
                        // Check if timezone is already in our list and add it if not
                        if (!this.timeZoneList.some(tz => tz.zoneId === tzInfo.zoneId)) {
                            this.timeZoneList.push(tzInfo);
                        }
                        const selectedTimeZoneNew = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
                        if (selectedTimeZoneNew) {
                            // Continue with the found timezone
                            this.setupTimeZoneInfoModal(selectedTimeZoneNew);
                            return;
                        }
                    }
                }
            }
            catch (error) {
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
    setupTimeZoneInfoModal(selectedTimeZone) {
        var _a;
        // Format the UTC offset string
        const utcOffsetStr = formatUtcOffset(selectedTimeZone);
        // Get modal element
        const infoModalElement = document.getElementById('time-zones-info-modal');
        if (!infoModalElement) {
            return;
        }
        // Store the timezone info on the modal element for later use
        infoModalElement._tzinfo_data = selectedTimeZone;
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
        updateTimeZoneInfoTime(selectedTimeZone);
        // Show the modal
        let timeZoneInfoModal;
        if (typeof ((_a = this.bootstrap) === null || _a === void 0 ? void 0 : _a.Modal) === 'function') {
            // Get existing modal instance or create a new one
            timeZoneInfoModal = this.bootstrap.Modal.getInstance(infoModalElement) ||
                new this.bootstrap.Modal(infoModalElement, {
                    keyboard: true
                });
        }
        else {
            return;
        }
        // Clone the timezone data to ensure it cannot be modified by other code
        // We create a completely independent copy outside of any closures
        const fixedTimeZone = JSON.parse(JSON.stringify(selectedTimeZone));
        // Store the fixed timezone data directly on the modal for reference
        infoModalElement._fixed_tzinfo = fixedTimeZone;
        // Store references to event handlers so we can remove them later
        const shownEventHandler = () => {
            // Always use the deeply cloned timezone data that we stored
            // This ensures we always have a stable reference
            const modalElement = infoModalElement;
            const tzInfo = modalElement._fixed_tzinfo;
            if (!tzInfo) {
                return;
            }
            // Update time immediately
            updateTimeZoneInfoTime(tzInfo);
            // Set interval to update every half second for smoother display
            const interval = window.setInterval(() => {
                // Always use the data stored on the modal element 
                const currentTzInfo = infoModalElement._fixed_tzinfo;
                updateTimeZoneInfoTime(currentTzInfo);
            }, 500);
            // Store the interval ID on the element for later cleanup
            modalElement._tzinfo_interval = interval;
        };
        const hiddenEventHandler = () => {
            const extElement = infoModalElement;
            // Clean up the interval
            if (extElement._tzinfo_interval) {
                window.clearInterval(extElement._tzinfo_interval);
                extElement._tzinfo_interval = null;
            }
            // Clean up by removing event listeners to prevent accumulation
            infoModalElement.removeEventListener('shown.bs.modal', shownEventHandler);
            infoModalElement.removeEventListener('hidden.bs.modal', hiddenEventHandler);
            // Keep the timezone data for potential future reopening
        };
        // First, clean up any existing event listeners
        const extendedElement = infoModalElement;
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
     * Sets the home timezone for the user with in-place updates and animations.
     */
    async setHomeTimeZone(timeZoneId) {
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
        if (!antiforgeryInput) {
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
                    card.style.position = 'relative';
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
            }
            catch (e) {
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
            // Remove any loading overlays first
            const overlays = document.querySelectorAll('[data-timezone-id] .position-absolute');
            overlays.forEach(overlay => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            });
            // Update the UI in-place with animations
            this.updateHomeTimeZoneDisplay(timeZoneId);
        }
        catch (error) {
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
// Already imported as setupVpScrollFadeEffects at the top
// Shared global variable to track if initialization has occurred
let initialized = false;
let globalManager = null;
// Initialize the time zones section
export function initTimeZones() {
    // If already initialized, don't initialize again
    if (initialized && globalManager) {
        console.log('[TIME ZONES] Already initialized, skipping');
        return;
    }
    console.log('[TIME ZONES] Initializing time zones section');
    try {
        // Step 1: Create the TimeZonesManager first - this registers global handlers
        globalManager = new TimeZonesManager();
        console.log('[TIME ZONES] TimeZonesManager created');
        // Step 2: Setup the Add Time Zones button
        // This is the button that opens the modal to select time zones
        const addButton = document.getElementById('add-time-zones-button');
        if (addButton) {
            // Simply set the onclick attribute directly in the HTML
            addButton.setAttribute('onclick', 'window.showTimeZonesModal();');
            console.log('[TIME ZONES] Add Time Zones button handler attached');
        }
        else {
            console.warn('[TIME ZONES] Add Time Zones button not found');
        }
        // Step 3: Setup scroll fade effects for visual polish
        setupVpScrollFadeEffects();
        // Mark as initialized
        initialized = true;
        console.log('[TIME ZONES] Initialization complete');
    }
    catch (error) {
        console.error('[TIME ZONES] Error during initialization:', error);
    }
}
// Removed redundant functions as they're handled in initTimeZones
// Export module functions to the global namespace
// This is the standard pattern - all other boilerplate is removed
console.log('[TIME ZONES] Setting up global namespace with time zones functions');
// Initialize the Yuzu namespace for module exports
window.Yuzu = window.Yuzu || {};
window.Yuzu.Settings = window.Yuzu.Settings || {};
window.Yuzu.Settings.TimeZones = window.Yuzu.Settings.TimeZones || {};
// Only set init if it doesn't exist yet
if (typeof window.Yuzu.Settings.TimeZones.init !== 'function') {
    window.Yuzu.Settings.TimeZones.init = initTimeZones;
}
// Only set Manager if it doesn't exist yet
if (typeof window.Yuzu.Settings.TimeZones.Manager !== 'function') {
    window.Yuzu.Settings.TimeZones.Manager = TimeZonesManager;
}
// Only set loadTimeZonesData if it doesn't exist yet
if (typeof window.Yuzu.Settings.TimeZones.loadTimeZonesData !== 'function') {
    window.Yuzu.Settings.TimeZones.loadTimeZonesData = () => {
        if (globalManager) {
            console.log('[TIME ZONES] Calling loadTimeZonesData via global function');
            return globalManager.loadTimeZonesData(true);
        }
        else {
            console.error('[TIME ZONES] Global manager not available for loadTimeZonesData');
            return Promise.resolve();
        }
    };
}
// Only set getInstance if it doesn't exist yet
if (typeof window.Yuzu.Settings.TimeZones.getInstance !== 'function') {
    window.Yuzu.Settings.TimeZones.getInstance = () => globalManager;
}
// Log what we've set up for debugging
console.log('[TIME ZONES] Global functions availability after setup:', {
    'window.showTimeZonesModal': typeof window.showTimeZonesModal,
    'window.showTimeZoneInfoModal': typeof window.showTimeZoneInfoModal,
    'window.setHomeTimeZone': typeof window.setHomeTimeZone,
    'window.deleteTimeZone': typeof window.deleteTimeZone
});
//# sourceMappingURL=index.js.map