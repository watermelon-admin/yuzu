// src/pages/settings/time-zones/index.ts
import { createToast } from '../../../common/toast-util.js';
import { createTimeZoneCard } from './card-creator.js';
import { updateTimeZoneInfoTime, formatUtcOffset } from './time-utils.js';
import { setupPagination } from './pagination.js';
import { setupScrollFadeEffects as setupVpScrollFadeEffects } from './viewport-utils.js';
import { scrollToNewCard } from '../../../common/viewport-utils.js';
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
     * This is the single point of entry for adding a timezone
     * Must be public so it can be referenced from outside the class
     */
    async handleSelectButtonClick(event) {
        var _a, _b, _c, _d;
        // If an event is passed, prevent default behavior
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        // Static variable to track if we're already processing
        const processed = ((_a = document.getElementById('time-zones-search-modal')) === null || _a === void 0 ? void 0 : _a.getAttribute('data-processing')) === 'true';
        if (processed) {
            console.log('[TIME ZONES] Selection already being processed, stopping duplicate');
            return;
        }
        // Mark as processing to prevent multiple calls
        (_b = document.getElementById('time-zones-search-modal')) === null || _b === void 0 ? void 0 : _b.setAttribute('data-processing', 'true');
        console.log('[TIME ZONES] Processing selection with selectedTimeZoneId:', this.selectedTimeZoneId);
        if (!this.selectedTimeZoneId) {
            console.warn('[TIME ZONES] No timezone selected, cannot add');
            (_c = document.getElementById('time-zones-search-modal')) === null || _c === void 0 ? void 0 : _c.setAttribute('data-processing', 'false');
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
                        if (weatherData.success && ((_d = weatherData.data) === null || _d === void 0 ? void 0 : _d.data)) {
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
                // Set a flag to indicate this is a new time zone that should be shown at the top
                newTimeZone.isNewlyAdded = true;
                // Append the card - weather info should be carried over if available
                await this.appendTimeZoneCard(newTimeZone, true);
                // Scroll the entire page to the top
                console.log('[DEBUG] Scrolling entire page to top for new card');
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                // Make sure all scrollable containers are scrolled to the top
                const scrollableContainers = document.querySelectorAll('.overflow-auto, .overflow-y-auto, [style*="overflow: auto"], [style*="overflow-y: auto"]');
                scrollableContainers.forEach(container => {
                    container.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
                // Make sure the specific time zones section is scrolled
                const sectionContainer = document.getElementById('time-zones');
                if (sectionContainer) {
                    console.log('[DEBUG] Scrolling time zones section to top for new card');
                }
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
                    // Show a simple toast notification without the view link
                    createToast('Success: Time zone added successfully. Displaying at the top of the list.', true);
                }, 100);
            }
        }
        catch (error) {
            console.error('[TIME ZONES] Error adding timezone:', error);
            createToast('Error: Failed to add timezone. Please try again.', false);
        }
        finally {
            // Reset the processing flag to allow future selections
            setTimeout(() => {
                var _a;
                (_a = document.getElementById('time-zones-search-modal')) === null || _a === void 0 ? void 0 : _a.setAttribute('data-processing', 'false');
            }, 500);
        }
    }
    /**
     * Loads timezone data with appropriate loading states
     * @param forceRefresh - If true, force a fresh load from server even if already loaded
     */
    async loadTimeZonesData(forceRefresh = false) {
        console.log('[TIME ZONES][DEBUG] Starting data load - CRITICAL DEBUGGING INFO');
        console.log('[TIME ZONES][DEBUG] Stack trace:', new Error().stack);
        console.log('[TIME ZONES][DEBUG] Current data state:', {
            isTimeZoneDataLoading: this.isTimeZoneDataLoading,
            isTimeZoneDataLoaded: this.isTimeZoneDataLoaded,
            forceRefresh: forceRefresh
        });
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
            console.log('[TIME ZONES] Loading user time zones display WITH WEATHER DATA...');
            // Load and display user time zones WITH WEATHER DATA
            // This is critical to ensure temperature information is displayed
            // Do this ONCE during initial page load, not when switching tabs
            await this.loadUserTimeZonesDisplay(true);
            // Skip any additional weather data loading - the data is already loaded
            // Verify that cards are actually rendered
            const cards = container.querySelectorAll('.settings-card');
            console.log(`[TIME ZONES] Rendered ${cards.length} time zone cards`);
            // Check if weather info is visible
            const weatherElements = container.querySelectorAll('.card-weather-info');
            const visibleWeatherElements = Array.from(weatherElements).filter(el => !el.classList.contains('d-none') &&
                el.style.display !== 'none');
            console.log(`[TIME ZONES] Found ${visibleWeatherElements.length} visible weather elements out of ${weatherElements.length} total`);
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
            // Use only the direct HTML attribute method which has been proven to work
            newSelectButton.setAttribute('onclick', `
                event.preventDefault();
                if (typeof window.Yuzu?.Settings?.TimeZones?.getInstance === 'function') {
                    const manager = window.Yuzu.Settings.TimeZones.getInstance();
                    if (manager && typeof manager.handleSelectButtonClick === 'function') {
                        manager.handleSelectButtonClick(event);
                    }
                }
            `);
            console.log('[TIME ZONES] Select button handler attached using HTML attribute method');
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
            // We do NOT need to re-add handlers here - they are already set during modal creation
            // This prevents duplicate event handlers
            console.log('[TIME ZONES] Modal shown, using existing button handlers');
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
    async loadUserTimeZonesDisplay(includeWeather = false) {
        var _a, _b;
        console.log(`[TIME ZONES] loadUserTimeZonesDisplay called with includeWeather=${includeWeather}`);
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('[TIME ZONES] Container not found in loadUserTimeZonesDisplay');
            return;
        }
        // Keep track of the original content in case we need to restore it
        const originalContent = container.innerHTML;
        try {
            // Request time zones with or without weather based on parameter
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=1&pageSize=1000&includeWeather=${includeWeather}`;
            console.log(`[TIME ZONES] Fetching time zones with URL: ${url}`);
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
                // Bind global functions to ensure they're available
                window.setHomeTimeZone = this.setHomeTimeZone.bind(this);
                window.showTimeZoneInfoModal = this.showTimeZoneInfoModal.bind(this);
                window.deleteTimeZone = this.deleteTimeZone.bind(this);
                // First, see if we have a home time zone in the list
                console.log('[DEBUG] Current homeTimeZoneId:', this.homeTimeZoneId);
                console.log('[DEBUG] All timeZones:', timeZones.map(tz => ({ id: tz.zoneId, city: tz.cities[0] })));
                // First make a deep copy of the timezones so we don't modify the original array
                const timeZonesCopy = JSON.parse(JSON.stringify(timeZones));
                // Find the home timezone and set isHome property
                const homeTimeZone = timeZonesCopy.find(tz => tz.zoneId === this.homeTimeZoneId);
                if (homeTimeZone) {
                    homeTimeZone.isHome = true;
                    console.log('[DEBUG] Found homeTimeZone and set isHome=true:', { id: homeTimeZone.zoneId, city: homeTimeZone.cities[0], isHome: homeTimeZone.isHome });
                }
                else {
                    console.log('[DEBUG] Home time zone not found:', this.homeTimeZoneId);
                }
                const regularTimeZones = timeZonesCopy.filter(tz => tz.zoneId !== this.homeTimeZoneId);
                console.log('[DEBUG] Regular timeZones count:', regularTimeZones.length);
                // Sort regular time zones by offset
                regularTimeZones.sort((a, b) => {
                    // Sort by UTC offset first
                    const offsetA = a.utcOffset || 0;
                    const offsetB = b.utcOffset || 0;
                    if (offsetA !== offsetB) {
                        return offsetA - offsetB;
                    }
                    // If offsets are the same, sort alphabetically by zone ID
                    return a.zoneId.localeCompare(b.zoneId);
                });
                // Create home time zone card first (if exists)
                if (homeTimeZone) {
                    try {
                        console.log('[DEBUG] Creating home card with isHome =', homeTimeZone.isHome);
                        const homeCardElement = createTimeZoneCard(homeTimeZone, this.setHomeTimeZone.bind(this), this.deleteTimeZone.bind(this));
                        // Make absolutely sure it is styled as a home card
                        const article = homeCardElement.querySelector('article');
                        if (article) {
                            article.classList.add('border-primary');
                            article.style.backgroundColor = '#f0f7ff';
                            // Add home badge if it doesn't exist
                            const title = homeCardElement.querySelector('.card-title');
                            if (title && !title.querySelector('.badge.bg-primary')) {
                                const badge = document.createElement('span');
                                badge.className = 'badge bg-primary ms-2';
                                badge.textContent = 'Home';
                                title.appendChild(badge);
                            }
                        }
                        fragment.appendChild(homeCardElement);
                    }
                    catch (err) {
                        console.error('[TIME ZONES] Error creating home card:', err);
                    }
                }
                else {
                    console.log('[DEBUG] No home time zone found to create a card for');
                }
                // Then create cards for regular time zones
                regularTimeZones.forEach((timeZone) => {
                    try {
                        console.log('[DEBUG] Creating regular card for', timeZone.cities[0]);
                        const cardElement = createTimeZoneCard(timeZone, this.setHomeTimeZone.bind(this), this.deleteTimeZone.bind(this));
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
                // but don't reset scroll position since this is initial load
                const viewportContainer = document.getElementById('time-zone-viewport-container');
                if (viewportContainer) {
                    viewportContainer.dispatchEvent(new Event('scroll'));
                    // No need to call setupScrollFadeEffects here as it would cause layout recalculation
                }
                // Skip the second weather data load - weather data is already loaded during initial page load
                // No longer making a second call to loadWeatherDataForTimeZones
                // This avoids the delay when switching tabs
                // this.loadWeatherDataForTimeZones(timeZones.map(tz => tz.zoneId));
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
     * Loads weather data for the specified time zones during initial page load
     * This ensures weather data is loaded once and displayed immediately when
     * switching to the time zones tab
     * @param zoneIds Array of time zone IDs to load weather data for
     */
    async loadWeatherDataForTimeZones(zoneIds) {
        if (!zoneIds || zoneIds.length === 0) {
            console.log('[TIME ZONES] No time zone IDs provided for weather data loading');
            return;
        }
        console.log(`[TIME ZONES] Loading weather data for ${zoneIds.length} time zones...`, zoneIds);
        try {
            // Fetch all timezone data with weather using the UserTimeZones handler
            // The API returns all time zones with weather if includeWeather=true
            const weatherUrl = `${document.location.pathname}?handler=UserTimeZones&pageNumber=1&pageSize=1000&includeWeather=true`;
            // Use GET request since this is what the existing handler expects
            const weatherResponse = await fetch(weatherUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                cache: 'no-store' // Prevent caching to get fresh weather
            });
            if (!weatherResponse.ok) {
                console.error(`[TIME ZONES] Error fetching weather data: ${weatherResponse.status}`);
                const errorText = await weatherResponse.text();
                console.error('[TIME ZONES] Error response:', errorText);
                return;
            }
            // First try to parse the response as text to examine it
            const responseText = await weatherResponse.text();
            console.log('[TIME ZONES] Weather response received:', responseText.substring(0, 200) + '...');
            // Now parse as JSON
            let timeZonesWithWeather;
            try {
                timeZonesWithWeather = JSON.parse(responseText);
            }
            catch (error) {
                console.error('[TIME ZONES] Error parsing weather response:', error);
                return;
            }
            // Check what format the response is in
            console.log('[TIME ZONES] Weather data format:', Object.keys(timeZonesWithWeather));
            // Handle different possible response formats
            let timeZonesList = [];
            // The actual response format is wrapped in a success/message/data structure
            if (timeZonesWithWeather.success && timeZonesWithWeather.data) {
                // Check for pagedResults in the data property
                if (timeZonesWithWeather.data.data && Array.isArray(timeZonesWithWeather.data.data)) {
                    // If data is nested one level deeper - the common format from ASP.NET backends
                    timeZonesList = timeZonesWithWeather.data.data;
                    console.log(`[TIME ZONES] Using data.data with ${timeZonesList.length} items`);
                }
                else if (timeZonesWithWeather.data.pagedResults && Array.isArray(timeZonesWithWeather.data.pagedResults)) {
                    // If using PagedTimeZoneResults format
                    timeZonesList = timeZonesWithWeather.data.pagedResults;
                    console.log(`[TIME ZONES] Using data.pagedResults with ${timeZonesList.length} items`);
                }
                else if (timeZonesWithWeather.data.items && Array.isArray(timeZonesWithWeather.data.items)) {
                    // If using a different format with 'items'
                    timeZonesList = timeZonesWithWeather.data.items;
                    console.log(`[TIME ZONES] Using data.items with ${timeZonesList.length} items`);
                }
                else if (Array.isArray(timeZonesWithWeather.data)) {
                    // If data is directly an array
                    timeZonesList = timeZonesWithWeather.data;
                    console.log(`[TIME ZONES] Using data array with ${timeZonesList.length} items`);
                }
            }
            // Fall back to legacy format handling if not found
            else if (timeZonesWithWeather.pagedResults && Array.isArray(timeZonesWithWeather.pagedResults)) {
                timeZonesList = timeZonesWithWeather.pagedResults;
                console.log(`[TIME ZONES] Using pagedResults with ${timeZonesList.length} items`);
            }
            else if (timeZonesWithWeather.items && Array.isArray(timeZonesWithWeather.items)) {
                timeZonesList = timeZonesWithWeather.items;
                console.log(`[TIME ZONES] Using items with ${timeZonesList.length} items`);
            }
            else if (Array.isArray(timeZonesWithWeather)) {
                timeZonesList = timeZonesWithWeather;
                console.log(`[TIME ZONES] Using direct array with ${timeZonesList.length} items`);
            }
            else {
                console.error('[TIME ZONES] Unexpected response format, no time zone list found. Inspect the response:', JSON.stringify(timeZonesWithWeather).substring(0, 500) + '...');
                return;
            }
            // Check if we have any time zones to process
            if (!timeZonesList || timeZonesList.length === 0) {
                console.warn('[TIME ZONES] No time zones with weather data found in the response');
                return;
            }
            console.log(`[TIME ZONES] Processing ${timeZonesList.length} time zones with weather data`);
            // Process each time zone with weather data
            let updatedCount = 0;
            // Update each card with weather information
            timeZonesList.forEach(timeZone => {
                // Log the first few time zones to check structure
                if (updatedCount < 3) {
                    console.log(`[TIME ZONES] Processing time zone:`, {
                        id: timeZone.zoneId,
                        city: timeZone.cities && timeZone.cities.length > 0 ? timeZone.cities[0] : 'Unknown',
                        hasWeather: !!timeZone.detailedWeather,
                        weatherDetails: timeZone.detailedWeather
                    });
                }
                if (timeZone.detailedWeather) {
                    const card = document.querySelector(`[data-timezone-id="${timeZone.zoneId}"]`);
                    if (card) {
                        // Find the weather info elements
                        const weatherInfo = card.querySelector('.card-weather-info');
                        const weatherContainer = card.querySelector('.card-weather-container');
                        if (weatherInfo && weatherContainer) {
                            // Remove d-none class to ensure visibility
                            weatherInfo.classList.remove('d-none');
                            weatherContainer.classList.remove('d-none');
                            // Format the temperature for display
                            const tempC = Math.round(timeZone.detailedWeather.temperatureC);
                            const tempF = Math.round(timeZone.detailedWeather.temperatureF);
                            const temp = `${tempC}°C / ${tempF}°F`;
                            // Update the weather info with icon and text
                            const weatherIcon = '<i class="bx bxs-thermometer me-1"></i>';
                            weatherInfo.innerHTML = `${weatherIcon} ${temp}`;
                            // Make sure it's visible with explicit styling
                            weatherInfo.style.display = 'block';
                            weatherInfo.style.visibility = 'visible';
                            weatherInfo.style.opacity = '1';
                            // Force the container to be visible too
                            weatherContainer.style.display = 'flex';
                            weatherContainer.style.visibility = 'visible';
                            weatherContainer.style.opacity = '1';
                            updatedCount++;
                        }
                        else {
                            console.warn(`[TIME ZONES] Weather elements not found for card ${timeZone.zoneId}`);
                        }
                    }
                    else {
                        console.warn(`[TIME ZONES] Card for time zone ${timeZone.zoneId} not found`);
                    }
                }
            });
            console.log(`[TIME ZONES] Weather data applied to ${updatedCount} cards out of ${timeZonesList.length} time zones`);
            // Check the DOM to verify weather info is visible
            const allWeatherInfos = document.querySelectorAll('.card-weather-info');
            const visibleCount = Array.from(allWeatherInfos).filter(el => !el.classList.contains('d-none')).length;
            console.log(`[TIME ZONES] Found ${allWeatherInfos.length} weather info elements, ${visibleCount} are visible`);
        }
        catch (error) {
            console.error('[TIME ZONES] Error loading weather data:', error);
        }
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
            row.addEventListener('dblclick', (event) => {
                event.preventDefault();
                event.stopPropagation();
                console.log('[TIME ZONES] Double-click on row');
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
                        event.stopPropagation();
                        this.selectTimeZone(row);
                        if (key === 'Enter') {
                            // Prevent double confirmations by checking if selection is already in progress
                            if (window._timeZoneSelectInProgress !== true) {
                                this.confirmSelection();
                            }
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
     * Confirms the current selection by directly calling the handler
     * This method is used for the double-click functionality in the modal
     */
    confirmSelection() {
        console.log('[TIME ZONES] confirmSelection called');
        // Only proceed if we have a selectedTimeZoneId
        if (!this.selectedTimeZoneId) {
            console.log('[TIME ZONES] No timezone selected, cannot confirm');
            return;
        }
        // Call the handler directly with no intermediate steps
        try {
            console.log('[TIME ZONES] Directly calling selection handler');
            this.handleSelectButtonClick();
        }
        catch (error) {
            console.error('[TIME ZONES] Error in confirmSelection:', error);
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
            // Remove the card immediately (no animation)
            this.animateCardRemoval(cardElement);
            // Show success message after card removal is complete
            createToast('Success: Timezone deleted successfully', true);
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
     * Removes a card from the DOM without animation
     * @param cardElement The card element to remove
     */
    animateCardRemoval(cardElement) {
        // Get the parent column element which is what we'll actually remove
        const columnElement = cardElement.closest('.col');
        if (!columnElement)
            return;
        // Immediately remove the card without animation
        columnElement.remove();
        // If this was the last card, show the empty state
        const container = document.getElementById('time-zone-container');
        if (container && container.querySelectorAll('[data-timezone-id]').length === 0) {
            container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
            </div>`;
        }
        // No fade effects update - avoid viewport resets
    }
    /**
     * Updates the display when a timezone is set as home with animations and proper event handlers
     * @param newHomeTimeZoneId The ID of the new home timezone
     */
    async updateHomeTimeZoneDisplay(newHomeTimeZoneId) {
        console.log('[DEBUG] updateHomeTimeZoneDisplay - START', newHomeTimeZoneId);
        // Capture viewport scroll position BEFORE making any changes
        const viewportContainer = document.getElementById('time-zone-viewport-container');
        const initialScrollPosition = viewportContainer ? viewportContainer.scrollTop : 0;
        console.log('[DEBUG] updateHomeTimeZoneDisplay - Initial scroll position:', initialScrollPosition);
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('[DEBUG] updateHomeTimeZoneDisplay - Container not found');
            return;
        }
        // Store the new home timezone ID
        this.homeTimeZoneId = newHomeTimeZoneId;
        // Mark all existing cards as not home first
        // This is important to make sure we clean up properly
        const allCards = container.querySelectorAll('[data-timezone-id]');
        allCards.forEach(card => {
            const article = card.querySelector('article');
            if (article && article.classList.contains('border-primary')) {
                // Clean up any existing home indicators
                article.classList.remove('border-primary');
                article.style.backgroundColor = '#f5f7fa';
                // Remove home badge
                const title = card.querySelector('.card-title');
                const badge = title === null || title === void 0 ? void 0 : title.querySelector('.badge');
                if (badge) {
                    badge.remove();
                }
                // Get card ID to add standard buttons back
                const cardId = card.getAttribute('data-timezone-id');
                if (cardId && cardId !== newHomeTimeZoneId) {
                    // Only restore buttons for cards that aren't the new home
                    const footer = card.querySelector('.card-footer');
                    if (footer) {
                        // Replace with standard footer
                        footer.remove();
                        // Add standard footer with all buttons
                        const newFooter = document.createElement('div');
                        newFooter.className = 'card-footer d-flex align-items-center py-3';
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
                        // Add event handlers
                        const homeButton = newFooter.querySelector('.card-home-button');
                        if (homeButton) {
                            homeButton.setAttribute('onclick', `window.setHomeTimeZone('${cardId}');`);
                        }
                        const infoButton = newFooter.querySelector('.card-info-button');
                        if (infoButton) {
                            infoButton.setAttribute('onclick', `window.showTimeZoneInfoModal('${cardId}');`);
                        }
                        const deleteButton = newFooter.querySelector('.card-delete-button');
                        if (deleteButton) {
                            deleteButton.setAttribute('onclick', `window.deleteTimeZone('${cardId}');`);
                        }
                        article.appendChild(newFooter);
                    }
                }
            }
        });
        // Find all timezone cards again (order might have changed)
        const cards = container.querySelectorAll('[data-timezone-id]');
        // Track the new home timezone element
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
                    // No transitions - direct style changes
                    article.classList.add('border-primary');
                    article.style.backgroundColor = '#f0f7ff';
                }
                // Add the home badge if it doesn't exist
                if (title && !title.querySelector('.badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-primary ms-2';
                    badge.textContent = 'Home';
                    title.appendChild(badge);
                }
                // Replace the footer without animations
                if (footer) {
                    footer.remove();
                    // Add simple info-only footer
                    if (article) {
                        const infoFooter = document.createElement('div');
                        infoFooter.className = 'card-footer d-flex align-items-center py-3';
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
                            infoButton.setAttribute('onclick', `window.showTimeZoneInfoModal('${cardId}');`);
                        }
                        article.appendChild(infoFooter);
                    }
                }
            }
        });
        // Restore scroll position explicitly since we're not updating fade effects
        if (viewportContainer && initialScrollPosition > 0) {
            console.log('[DEBUG] updateHomeTimeZoneDisplay - Restoring scroll position:', initialScrollPosition);
            viewportContainer.scrollTop = initialScrollPosition;
            // Double-check after a small delay
            setTimeout(() => {
                if (viewportContainer.scrollTop !== initialScrollPosition) {
                    console.log('[DEBUG] updateHomeTimeZoneDisplay - Re-restoring scroll position:', initialScrollPosition);
                    viewportContainer.scrollTop = initialScrollPosition;
                }
            }, 50);
        }
        console.log('[DEBUG] updateHomeTimeZoneDisplay - END');
        // Note: We intentionally don't update scroll fade effects here
        // as it would cause the viewport to reset unnecessarily
        // The home time zone change only affects styling, not card positions
    }
    /**
     * Directly appends a timezone card to the container
     * This is used when adding a new timezone to avoid refreshing the entire list
     * @param timeZone - The timezone to append
     * @param isNewCard - Whether to mark this as a new card with a badge
     */
    async appendTimeZoneCard(timeZone, isNewCard = false) {
        console.log('[DEBUG] appendTimeZoneCard - START', { id: timeZone.zoneId, city: timeZone.cities[0], isNewCard, isHome: timeZone.isHome });
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('[DEBUG] Container not found');
            return;
        }
        try {
            // Check if there's an empty state message and remove it
            const emptyState = container.querySelector('.col-12.text-center');
            if (emptyState) {
                console.log('[DEBUG] Removing empty state message');
                container.innerHTML = '';
            }
            // Ensure global functions are available - this is what makes the buttons work
            window.setHomeTimeZone = this.setHomeTimeZone.bind(this);
            window.showTimeZoneInfoModal = this.showTimeZoneInfoModal.bind(this);
            window.deleteTimeZone = this.deleteTimeZone.bind(this);
            // Create the card using our helper function with isNewCard flag
            console.log('[DEBUG] Creating card with isNewCard =', isNewCard);
            const cardElement = createTimeZoneCard(timeZone, this.setHomeTimeZone.bind(this), this.deleteTimeZone.bind(this), isNewCard // Pass the isNewCard flag to show the NEW badge
            );
            // Add animation class to the new card
            if (isNewCard) {
                const article = cardElement.querySelector('article');
                if (article) {
                    // First make it invisible
                    article.style.opacity = '0';
                    article.style.transform = 'translateY(-20px) scale(0.95)';
                    article.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                    // Then animate it in after a tiny delay
                    setTimeout(() => {
                        article.style.opacity = '1';
                        article.style.transform = 'translateY(0) scale(1)';
                    }, 50);
                }
            }
            // If it's a newly added card or home timezone, insert at the beginning of the container
            // This ensures both home timezones and new timezones are at the top
            if (isNewCard || timeZone.isHome || timeZone.isNewlyAdded) {
                console.log('[DEBUG] Inserting card at the beginning');
                // If there's a home timezone card, insert after it
                if (!timeZone.isHome) {
                    const homeCard = container.querySelector('[data-timezone-id] article.border-primary');
                    if (homeCard) {
                        console.log('[DEBUG] Found home card, inserting after it');
                        const homeCardCol = homeCard.closest('[data-timezone-id]');
                        if (homeCardCol && homeCardCol.nextSibling) {
                            container.insertBefore(cardElement, homeCardCol.nextSibling);
                        }
                        else {
                            // If it's the last element or no next sibling, just append
                            container.appendChild(cardElement);
                        }
                    }
                    else {
                        // No home card, insert at beginning
                        if (container.firstChild) {
                            container.insertBefore(cardElement, container.firstChild);
                        }
                        else {
                            container.appendChild(cardElement);
                        }
                    }
                }
                else {
                    // This is the home timezone, insert at the very beginning
                    if (container.firstChild) {
                        container.insertBefore(cardElement, container.firstChild);
                    }
                    else {
                        container.appendChild(cardElement);
                    }
                }
            }
            else {
                // Regular timezone - insert according to UTC offset order
                console.log('[DEBUG] Inserting card according to UTC offset order');
                let inserted = false;
                const existingCards = container.querySelectorAll('[data-timezone-id]');
                // Skip home timezone and newly added cards when comparing
                const regularCards = Array.from(existingCards).filter(card => {
                    const article = card.querySelector('article');
                    const newBadge = card.querySelector('.badge.new-badge');
                    return !(article === null || article === void 0 ? void 0 : article.classList.contains('border-primary')) && !newBadge;
                });
                if (regularCards.length > 0) {
                    const newOffset = timeZone.utcOffset || 0;
                    for (let i = 0; i < regularCards.length; i++) {
                        const cardId = regularCards[i].getAttribute('data-timezone-id');
                        if (cardId) {
                            const existingTimezone = this.timeZoneList.find(tz => tz.zoneId === cardId);
                            if (existingTimezone) {
                                const existingOffset = existingTimezone.utcOffset || 0;
                                if (newOffset < existingOffset ||
                                    (newOffset === existingOffset &&
                                        timeZone.zoneId.localeCompare(existingTimezone.zoneId) < 0)) {
                                    container.insertBefore(cardElement, regularCards[i]);
                                    inserted = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (!inserted) {
                    container.appendChild(cardElement);
                }
            }
            // When adding a new card, scroll it into view with animation
            if (isNewCard) {
                console.log('[DEBUG] Scrolling to show the new card');
                // First, let the card be positioned in the DOM
                setTimeout(() => {
                    if (cardElement) {
                        // Smooth scroll to the card
                        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Wait for scrolling to complete, then show animation
                        setTimeout(() => {
                            // Add a subtle pulse animation after scrolling
                            const article = cardElement.querySelector('article');
                            if (article) {
                                // Add pulse animation
                                article.style.transition = 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out';
                                article.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.5)'; // Green glow for NEW
                                article.style.transform = 'scale(1.03)';
                                // Reset after animation completes
                                setTimeout(() => {
                                    article.style.transform = 'scale(1)';
                                    setTimeout(() => {
                                        article.style.boxShadow = '';
                                    }, 300);
                                }, 700);
                            }
                        }, 600); // Wait for scroll to complete before animating
                    }
                }, 100);
            }
            console.log('[DEBUG] Card added successfully');
        }
        catch (error) {
            // If there's an error, fall back to refreshing the entire list
            console.error('[DEBUG] Error appending time zone card:', error);
            this.loadUserTimeZonesDisplay();
        }
        console.log('[DEBUG] appendTimeZoneCard - END');
    }
    /**
     * Scrolls a card element into view if it's not currently visible
     * @param cardElement The card element to scroll into view
     */
    scrollCardIntoView(cardElement) {
        scrollToNewCard(cardElement, {
            sectionId: 'time-zones',
            behavior: 'smooth',
            offset: 10
        });
    }
    /**
     * Sets up the fade effects for the viewport container
     * Shows/hides the top and bottom fade effects based on scroll position
     * @param preserveScroll - If true, preserve scroll position when setting up fade effects
     */
    setupScrollFadeEffects(preserveScroll = false) {
        console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - START', preserveScroll ? '(preserving scroll)' : '');
        // Check DOM elements before calling the shared function
        const container = document.getElementById('time-zone-viewport-container');
        const topFade = document.querySelector('#time-zones .fade-overlay.fade-top');
        const bottomFade = document.querySelector('#time-zones .fade-overlay.fade-bottom');
        // Log initial scroll position when preserving
        if (preserveScroll && container) {
            console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - Initial scroll position:', container.scrollTop);
        }
        console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - DOM elements before setup:', {
            container: container ? {
                id: container.id,
                clientHeight: container.clientHeight,
                scrollHeight: container.scrollHeight,
                scrollTop: container.scrollTop,
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
        // Call the viewport-specific setup with our preserve flag
        setupVpScrollFadeEffects(preserveScroll);
        // Check again after setting up
        setTimeout(() => {
            console.log('[DEBUG] TimeZonesManager.setupScrollFadeEffects - DOM elements after setup:', {
                container: container ? {
                    clientHeight: container.clientHeight,
                    scrollHeight: container.scrollHeight,
                    scrollTop: container.scrollTop,
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
                    opacity: window.getComputedStyle(topFade).opacity,
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
     * Sets the home timezone for the user with minimal UI changes to prevent scroll position reset.
     */
    /**
     * Sets a timezone as the home timezone by moving it to the first position
     * and applying home styling.
     */
    async setHomeTimeZone(timeZoneId) {
        console.log('[DEBUG] setHomeTimeZone - START', timeZoneId);
        // Import the createToast function at the beginning to ensure it's available
        const { createToast } = await import('../../../common/toast-util.js');
        try {
            // Get antiforgery token
            const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
            if (!antiforgeryInput) {
                console.error('[DEBUG] Antiforgery token not found');
                return;
            }
            // Get the city name for the toast message
            let cityName = "time zone";
            const selectedTimeZone = this.timeZoneList.find(tz => tz.zoneId === timeZoneId);
            if (selectedTimeZone && selectedTimeZone.cities && selectedTimeZone.cities.length > 0) {
                cityName = selectedTimeZone.cities[0];
            }
            // Make the server request to update the backend
            console.log('[DEBUG] Sending request to server...');
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
                credentials: 'same-origin'
            });
            // Process the response
            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            }
            catch (e) {
                console.error('[DEBUG] Failed to parse response');
                return;
            }
            if (!response.ok || !result.success) {
                console.error('[DEBUG] Request failed');
                createToast('Error: Failed to set home time zone. Please try again.', false);
                return;
            }
            console.log('[DEBUG] Server request successful');
            // Store the new home timezone ID immediately so loadUserTimeZonesDisplay will use it
            this.homeTimeZoneId = timeZoneId;
            // Show a toast notification with the city name
            createToast(`Home time zone set to ${cityName}. Now displayed at the top of the list.`, true);
            // Since we're going to reposition cards, just reload all the time zones
            // This ensures clean styling and correct ordering without having to 
            // handle complex DOM manipulations
            await this.loadUserTimeZonesDisplay();
            // First, scroll the entire page to the top
            console.log('[DEBUG] Scrolling entire page to top');
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            // Also scroll the section container if needed
            const sectionContainer = document.getElementById('time-zones');
            if (sectionContainer) {
                console.log('[DEBUG] Scrolling time zones section to top');
                // Try to find all scrollable containers and reset them
                const scrollableContainers = document.querySelectorAll('.overflow-auto, .overflow-y-auto, [style*="overflow: auto"], [style*="overflow-y: auto"]');
                scrollableContainers.forEach(container => {
                    container.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
            }
            // Then, scroll the inner viewport container to the top
            const viewportContainer = document.getElementById('time-zone-viewport-container');
            if (viewportContainer) {
                console.log('[DEBUG] Scrolling viewport container to top');
                // Use smooth scrolling
                viewportContainer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
            // AFTER scrolling is complete, show the animation with a delay
            setTimeout(() => {
                // Add animation to the new home time zone card
                const homeCard = document.querySelector(`[data-timezone-id="${timeZoneId}"]`);
                if (homeCard) {
                    console.log('[DEBUG] Adding animation to home time zone card');
                    const article = homeCard.querySelector('article');
                    if (article) {
                        // Add highlight animation
                        article.style.transition = 'background-color 0.5s ease-out, transform 0.5s ease-out, box-shadow 0.5s ease-out';
                        article.style.boxShadow = '0 0 20px rgba(0, 123, 255, 0.5)';
                        article.style.transform = 'scale(1.03)';
                        // Reset to normal after animation completes
                        setTimeout(() => {
                            article.style.boxShadow = '';
                            article.style.transform = 'scale(1)';
                        }, 1500);
                    }
                }
            }, 600); // Wait for scrolling to complete before starting animation
        }
        catch (error) {
            console.error('[DEBUG] Error in setHomeTimeZone:', error);
            createToast('Error: Failed to set home time zone. Please try again.', false);
        }
        console.log('[DEBUG] setHomeTimeZone - END');
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
        // Use false here since it's initial setup with no scroll position to preserve
        setupVpScrollFadeEffects(false);
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