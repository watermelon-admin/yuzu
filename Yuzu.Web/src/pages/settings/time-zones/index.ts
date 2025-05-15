// src/pages/settings/time-zones/index.ts

import { createToast } from '../../../common/toast-util.js';
import { TimeZoneInfo, ExtendedHTMLElement, PagedTimeZoneResults } from './types.js';
import { createTimeZoneCard } from './card-creator.js';
import { updateWeatherInfoOnCard, setupWeatherDisplayObserver, updateWeatherContent } from './weather-utils.js';
import { updateTimeZoneInfoTime, updateElementTextIfDifferent, formatUtcOffset } from './time-utils.js';
import { setupPagination } from './pagination.js';
import { setupScrollFadeEffects as setupVpScrollFadeEffects } from './viewport-utils.js';

/**
 * Manages the time zones section of the settings page
 */
export class TimeZonesManager {
    // Time zones properties
    private timeZoneList: TimeZoneInfo[] = [];
    private homeTimeZoneId: string | null = null;
    private timeZonesSearchTerm: string = '';
    private totalTimeZones: number = 0;
    // Keep these properties for search modal pagination
    private timeZonesCurrentPage: number = 1; // Used in search modal pagination only
    private timeZonesPageSize: number = 10; // Used in search modal pagination only
    private timeZoneModalFocusedRowIndex: number = -1;
    private timeZoneModalSelectedRowIndex: number = -1;
    private selectedTimeZoneId: string | null = null;
    private bootstrap: any = (window as any).bootstrap;
    
    // State tracking
    private isTimeZoneDataLoading: boolean = false;
    private isTimeZoneDataLoaded: boolean = false;
    
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
        // Keep the changePage binding for search modal pagination
        (window as any).changePage = this.changePage.bind(this);
        (window as any).selectAndConfirmTimeZone = this.selectAndConfirmTimeZone.bind(this);
        (window as any).confirmSelection = this.confirmSelection.bind(this);

        // Set up a mutation observer to ensure weather info is displayed correctly when cards are added
        setupWeatherDisplayObserver();
        
        // Load time zones data first - don't set up fade effects yet
        // The fade effects will be properly set up from the initTimeZones function
        this.loadUserTimeZonesDisplay();
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
                                        // Find our time zone in the data
                                        const tzWithWeather = weatherData.data.data.find(
                                            (tz: TimeZoneInfo) => tz.zoneId === newTimeZone.zoneId
                                        );

                                        if (tzWithWeather && tzWithWeather.weatherInfo) {
                                            // Add weather info to our time zone object
                                            newTimeZone.weatherInfo = tzWithWeather.weatherInfo;
                                        }
                                    }
                                }
                            } catch (error) {
                                // Continue without weather info if there's an error
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
                                        (weatherEl as HTMLElement).style.display = 'block';
                                        (weatherEl as HTMLElement).style.visibility = 'visible';
                                        (weatherEl as HTMLElement).setAttribute('style', 'display: block !important');
                                    }
                                }
                            }, 100);
                        }
                    } catch (error) {
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
            return;
        }

        // Reset state when opening modal
        this.timeZonesCurrentPage = 1; // Reset page for search modal
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
                throw new Error(responseData.message || 'Failed to load available timezones');
            }
        } catch (error) {
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
        
        // Clear any existing content completely using a more efficient approach
        container.innerHTML = '';
        
        // Show loading state immediately
        container.innerHTML = `
        <div class="col-12 text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading all your timezones...</span>
            </div>
            <p class="mt-2">Loading your timezones...</p>
        </div>`;
        

        try {
            // Request all timezones at once with a large page size to get everything
            // Use current path for correct routing and include weather information
            const url = `${document.location.pathname}?handler=UserTimeZones&pageNumber=1&pageSize=1000&includeWeather=true`;
            
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
                        const cardElement = createTimeZoneCard(
                            timeZone, 
                            this.setHomeTimeZone.bind(this),
                            this.showTimeZoneInfoModal.bind(this),
                            this.deleteTimeZone.bind(this)
                        );

                        // Add the card to our fragment
                        fragment.appendChild(cardElement);
                    } catch (err) {
                    }
                });
                
                // Now add all cards to the container at once
                container.appendChild(fragment);
                
                // Mark the container as loaded
                container.setAttribute('data-loaded', 'true');
                
                // Properly update fade effects based on content (don't force scrollbars)
                const viewportContainer = document.getElementById('timezones-viewport-container') as HTMLElement;
                if (viewportContainer) {
                    // Instead of forcing styles, let the fade effect system handle this naturally
                    // Just trigger a scroll event to update fade effects based on content
                    viewportContainer.dispatchEvent(new Event('scroll'));
                }
                
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
    }
    
    /**
     * Changes the page for search results modal (pagination still needed there)
     * This function must be exposed to window to work with onclick handlers.
     * Main page pagination has been removed.
     */
    public changePage(page: number, searchTerm: string | null): void {
        
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
    private searchTimeZones(
        searchTerm: string,
        page: number = 1,
        pageSize: number = 10
    ): PagedTimeZoneResults {
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
     * @param searchTerm The search term to filter time zones
     * @param page The page number for the search results modal (defaults to 1)
     */
    private loadTimeZones(searchTerm: string, page: number = 1): void {
        this.timeZonesSearchTerm = searchTerm; // Store the current search term
        const tableBody = document.getElementById('time-zones-search-table-body');
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        try {
            // Use in-memory search for the modal table (we don't need to hit the server again)
            // This way we avoid additional server round-trips after initial data load
            const pageSize = 10; // Fixed page size for search results
            const { pagedResults, totalCount } = this.searchTimeZones(searchTerm, page, pageSize);
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

            setupPagination(
                totalCount, 
                page, 
                pageSize, 
                'time-zones-search-pagination-controls',
                true,
                searchTerm
            );
        } catch (error) {
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
     * Deletes a timezone from the user's list with animation
     */
    public async deleteTimeZone(timeZoneId: string): Promise<void> {
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
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
                (cardElement as HTMLElement).style.position = 'relative';
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
            
            // Animate the removal of the card instead of refreshing the entire list
            this.animateCardRemoval(cardElement as HTMLElement);
            
        } catch (error) {
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
    private animateCardRemoval(cardElement: HTMLElement): void {
        // Get the parent column element which is what we'll actually remove
        const columnElement = cardElement.closest('.col') as HTMLElement;
        if (!columnElement) return;
        
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
    }

    /**
     * Updates the display when a timezone is set as home with animations and proper event handlers
     * @param newHomeTimeZoneId The ID of the new home timezone
     */
    private async updateHomeTimeZoneDisplay(newHomeTimeZoneId: string): Promise<void> {
        const container = document.getElementById('time-zone-container');
        if (!container) {
            return;
        }
        
        // Store the new home timezone ID
        this.homeTimeZoneId = newHomeTimeZoneId;
        
        // Find all timezone cards
        const cards = container.querySelectorAll('[data-timezone-id]');
        
        // Track the previous home timezone element to animate it
        let previousHomeElement: Element | null = null;
        let newHomeElement: Element | null = null;
        
        cards.forEach(card => {
            const cardId = card.getAttribute('data-timezone-id');
            const article = card.querySelector('article') as HTMLElement;
            const title = card.querySelector('.card-title');
            const footer = card.querySelector('.card-footer') as HTMLElement;
            
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
                    this.scrollCardIntoView(card as HTMLElement);
                }, 350);
                
            } else if (article && article.classList.contains('border-primary')) {
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
                const badge = title?.querySelector('.badge') as HTMLElement;
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
    private async appendTimeZoneCard(timeZone: TimeZoneInfo): Promise<void> {
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
            
            // Create the card using our helper function
            const cardElement = createTimeZoneCard(
                timeZone, 
                this.setHomeTimeZone.bind(this),
                this.showTimeZoneInfoModal.bind(this),
                this.deleteTimeZone.bind(this)
            );
            
            // Add animation class to the column element
            cardElement.classList.add('card-new');
            
            // Add it directly to the container
            container.appendChild(cardElement);
            
            // Scroll the new card into view immediately
            this.scrollCardIntoView(cardElement);
            
            // Update scroll fade effects immediately
            this.setupScrollFadeEffects();
        } catch (error) {
            // If there's an error, fall back to refreshing the entire list
            console.error('Error appending time zone card:', error);
            this.loadUserTimeZonesDisplay();
        }
    }
    
    /**
     * Scrolls a card element into view if it's not currently visible
     * @param cardElement The card element to scroll into view
     */
    private scrollCardIntoView(cardElement: HTMLElement): void {
        const viewportContainer = document.querySelector('.viewport-container') as HTMLElement;
        if (!viewportContainer) return;
        
        // Get the viewport container's bounds
        const containerRect = viewportContainer.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        
        // Check if the card is partially or fully outside the viewport container
        const isVisible = (
            cardRect.top >= containerRect.top &&
            cardRect.bottom <= containerRect.bottom
        );
        
        if (!isVisible) {
            // Calculate how to scroll to make the card fully visible
            // If the card is too tall to fit in the viewport, scroll to its top
            if (cardRect.height > containerRect.height) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Otherwise, scroll to the center of the card
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    /**
     * Sets up the fade effects for the viewport container
     * Shows/hides the top and bottom fade effects based on scroll position
     */
    private setupScrollFadeEffects(): void {
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
    public async showTimeZoneInfoModal(timeZoneId: string): Promise<void> {
        
        // First, ensure our timezone list is loaded
        if (this.timeZoneList.length === 0) {
            try {
                await this.loadAvailableTimeZones();
            } catch (error) {
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
                    } catch (parseError) {
                        throw new Error('Failed to parse timezone info response');
                    }
                    
                    if (data.success && data.data) {
                        // Use the timezone info from the API response
                        const tzInfo: TimeZoneInfo = data.data;
                        
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
        const utcOffsetStr = formatUtcOffset(selectedTimeZone);
        
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
        updateTimeZoneInfoTime(selectedTimeZone);
        
        // Show the modal
        let timeZoneInfoModal: any;
        if (typeof this.bootstrap?.Modal === 'function') {
            // Get existing modal instance or create a new one
            timeZoneInfoModal = this.bootstrap.Modal.getInstance(infoModalElement) ||
                                new this.bootstrap.Modal(infoModalElement, {
                                    keyboard: true
                                });
        } else {
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
            updateTimeZoneInfoTime(tzInfo);
            
            // Set interval to update every half second for smoother display
            
            const interval = window.setInterval(() => {
                // Always use the data stored on the modal element 
                const currentTzInfo = (infoModalElement as ExtendedHTMLElement)._fixed_tzinfo;
                updateTimeZoneInfoTime(currentTzInfo);
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
     * Sets the home timezone for the user with in-place updates and animations.
     */
    public async setHomeTimeZone(timeZoneId: string): Promise<void> {
        const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
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
            
            // Remove any loading overlays first
            const overlays = document.querySelectorAll('[data-timezone-id] .position-absolute');
            overlays.forEach(overlay => {
                (overlay as HTMLElement).style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            });
            
            // Update the UI in-place with animations
            this.updateHomeTimeZoneDisplay(timeZoneId);
            
        } catch (error) {
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
let globalManager: TimeZonesManager | null = null;

// Initialize the time zones section
export function initTimeZones(): void {
    console.log('[DEBUG] TimeZones.initTimeZones - START');
    console.log('[DEBUG] TimeZones.initTimeZones - Initialization state:', { initialized, hasGlobalManager: !!globalManager });
    
    // If already initialized, refresh the data
    if (initialized && globalManager) {
        console.log('[DEBUG] TimeZones.initTimeZones - Already initialized, refreshing data');
        globalManager.loadTimeZonesData(true);
        return;
    }
    
    initialized = true;
    console.log('[DEBUG] TimeZones.initTimeZones - Setting initialized=true');
    
    // Create a new manager first
    console.log('[DEBUG] TimeZones.initTimeZones - Creating new TimeZonesManager');
    globalManager = new TimeZonesManager();
    
    // Set up scroll fade effects after manager creation
    console.log('[DEBUG] TimeZones.initTimeZones - Setting up scroll fade effects');
    setupVpScrollFadeEffects();
    
    // Force-add hidden class to fade overlays to ensure they start hidden
    console.log('[DEBUG] TimeZones.initTimeZones - Forcing hidden class on fade overlays');
    const fadeTop = document.querySelector('#time-zones .fade-overlay.fade-top');
    const fadeBottom = document.querySelector('#time-zones .fade-overlay.fade-bottom');
    if (fadeTop) {
        console.log('[DEBUG] TimeZones.initTimeZones - Adding hidden class to top fade');
        fadeTop.classList.add('hidden');
    }
    if (fadeBottom) {
        console.log('[DEBUG] TimeZones.initTimeZones - Adding hidden class to bottom fade');
        fadeBottom.classList.add('hidden');
    }
    
    // Check fade overlay elements right after setup
    setTimeout(() => {
        console.log('[DEBUG] TimeZones.initTimeZones - Checking fade overlay elements after setup');
        const container = document.getElementById('timezones-viewport-container');
        const topFade = document.querySelector('#time-zones .fade-overlay.fade-top');
        const bottomFade = document.querySelector('#time-zones .fade-overlay.fade-bottom');
        
        console.log('[DEBUG] TimeZones.initTimeZones - Container:', {
            id: container?.id,
            scrollHeight: container?.scrollHeight,
            clientHeight: container?.clientHeight,
            isOverflowing: container ? (container.scrollHeight > container.clientHeight) : false,
            overflowY: container ? window.getComputedStyle(container).overflowY : 'unknown',
            display: container ? window.getComputedStyle(container).display : 'unknown'
        });
        
        console.log('[DEBUG] TimeZones.initTimeZones - Fade overlays:', {
            topFade: topFade ? {
                classList: Array.from(topFade.classList),
                isHidden: topFade.classList.contains('hidden'),
                opacity: window.getComputedStyle(topFade).opacity,
                display: window.getComputedStyle(topFade).display
            } : 'not found',
            bottomFade: bottomFade ? {
                classList: Array.from(bottomFade.classList),
                isHidden: bottomFade.classList.contains('hidden'),
                opacity: window.getComputedStyle(bottomFade).opacity,
                display: window.getComputedStyle(bottomFade).display
            } : 'not found'
        });
    }, 500);
    
    console.log('[DEBUG] TimeZones.initTimeZones - END');
    
    // Debug the state of fade overlays and compare with backgrounds
    const topFade = document.querySelector('#time-zones .fade-overlay.fade-top');
    const bottomFade = document.querySelector('#time-zones .fade-overlay.fade-bottom');
    
    // Compare with backgrounds section to detect differences
    const bgTopFade = document.querySelector('.viewport-container-wrapper .fade-overlay.fade-top');
    const bgBottomFade = document.querySelector('.viewport-container-wrapper .fade-overlay.fade-bottom:not(#time-zones .fade-overlay)');
    const tzContainer = document.getElementById('timezones-viewport-container');
    const bgContainer = document.getElementById('backgrounds-viewport-container');
    
    console.log('[DEBUG] TimeZones.initTimeZones - HTML STRUCTURE COMPARISON:', {
        timeZones: {
            container: tzContainer ? {
                tagName: tzContainer.tagName,
                id: tzContainer.id,
                classes: Array.from(tzContainer.classList),
                parentNode: tzContainer.parentNode && tzContainer.parentNode instanceof Element ? {
                    tagName: (tzContainer.parentNode as Element).tagName,
                    id: (tzContainer.parentNode as Element).id,
                    classes: Array.from((tzContainer.parentNode as Element).classList)
                } : 'none',
                html: tzContainer.outerHTML.substring(0, 150) + '...' // First 150 chars
            } : 'not found',
            topFade: topFade ? {
                tagName: topFade.tagName,
                classes: Array.from(topFade.classList),
                parentNode: topFade.parentNode && topFade.parentNode instanceof Element ? {
                    tagName: (topFade.parentNode as Element).tagName,
                    id: (topFade.parentNode as Element).id,
                    classes: Array.from((topFade.parentNode as Element).classList)
                } : 'none',
                html: topFade.outerHTML
            } : 'not found',
            bottomFade: bottomFade ? {
                tagName: bottomFade.tagName,
                classes: Array.from(bottomFade.classList),
                html: bottomFade.outerHTML
            } : 'not found'
        },
        backgrounds: {
            container: bgContainer ? {
                tagName: bgContainer.tagName,
                id: bgContainer.id,
                classes: Array.from(bgContainer.classList),
                parentNode: bgContainer.parentNode && bgContainer.parentNode instanceof Element ? {
                    tagName: (bgContainer.parentNode as Element).tagName,
                    id: (bgContainer.parentNode as Element).id,
                    classes: Array.from((bgContainer.parentNode as Element).classList)
                } : 'none',
                html: bgContainer.outerHTML.substring(0, 150) + '...' // First 150 chars
            } : 'not found',
            topFade: bgTopFade ? {
                tagName: bgTopFade.tagName,
                classes: Array.from(bgTopFade.classList),
                parentNode: bgTopFade.parentNode && bgTopFade.parentNode instanceof Element ? {
                    tagName: (bgTopFade.parentNode as Element).tagName,
                    id: (bgTopFade.parentNode as Element).id,
                    classes: Array.from((bgTopFade.parentNode as Element).classList)
                } : 'none',
                html: bgTopFade.outerHTML
            } : 'not found',
            bottomFade: bgBottomFade ? {
                tagName: bgBottomFade.tagName,
                classes: Array.from(bgBottomFade.classList),
                html: bgBottomFade.outerHTML
            } : 'not found'
        }
    });
    
    // Additional checking specifically for the nested structure
    const tzWrapper = document.querySelector('#time-zones .viewport-container-wrapper');
    const bgWrapper = document.querySelector('.viewport-container-wrapper:not(#time-zones .viewport-container-wrapper)');
    
    console.log('[DEBUG] TimeZones.initTimeZones - WRAPPER COMPARISON:', {
        timeZonesWrapper: tzWrapper ? {
            tagName: tzWrapper.tagName,
            id: tzWrapper.id,
            classes: Array.from(tzWrapper.classList),
            childNodes: Array.from(tzWrapper.childNodes).map(node => ({
                nodeType: node.nodeType,
                nodeName: node.nodeName,
                classes: node instanceof Element ? Array.from(node.classList) : []
            }))
        } : 'not found',
        backgroundsWrapper: bgWrapper ? {
            tagName: bgWrapper.tagName,
            id: bgWrapper.id,
            classes: Array.from(bgWrapper.classList),
            childNodes: Array.from(bgWrapper.childNodes).map(node => ({
                nodeType: node.nodeType,
                nodeName: node.nodeName,
                classes: node instanceof Element ? Array.from(node.classList) : []
            }))
        } : 'not found'
    });
    
    console.log('Time zones scrollbar setup initialized immediately');
    
    // Load time zone data once and add special handler for container modifications
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (globalManager) globalManager.loadTimeZonesData();
            // Set up special observer for content loading
            setupContentLoadingObserver();
        });
    } else {
        // DOM is already loaded
        globalManager.loadTimeZonesData();
        // Set up special observer for content loading
        setupContentLoadingObserver();
    }
    
    // Function to observe content loading and update fade effects accordingly
    function setupContentLoadingObserver(): void {
        console.log('[DEBUG] TimeZones.setupContentLoadingObserver - Setting up content observer');
        const container = document.getElementById('time-zone-container');
        if (!container) {
            console.error('[DEBUG] TimeZones.setupContentLoadingObserver - Container not found');
            return;
        }
        
        // Also set up direct event listener to the scroll container
        const scrollContainer = document.getElementById('timezones-viewport-container');
        if (scrollContainer) {
            console.log('[DEBUG] TimeZones.setupContentLoadingObserver - Adding direct scroll listener');
            scrollContainer.addEventListener('scroll', () => {
                // Force update fade overlays on scroll
                const fadeTop = document.querySelector('#time-zones .fade-overlay.fade-top') as HTMLElement;
                const fadeBottom = document.querySelector('#time-zones .fade-overlay.fade-bottom') as HTMLElement;
                
                if (fadeTop && fadeBottom) {
                    // Content is overflowing, update fade visibility based on scroll position
                    if (scrollContainer.scrollTop <= 10) {
                        fadeTop.classList.add('hidden');
                    } else {
                        fadeTop.classList.remove('hidden');
                    }
                    
                    const isAtBottom = Math.abs(
                        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight
                    ) < 10;
                    
                    if (isAtBottom) {
                        fadeBottom.classList.add('hidden');
                    } else {
                        fadeBottom.classList.remove('hidden');
                    }
                    
                    console.log(`[DEBUG] Manual scroll handler - top: ${fadeTop.classList.contains('hidden') ? 'hidden' : 'visible'}, bottom: ${fadeBottom.classList.contains('hidden') ? 'hidden' : 'visible'}`);
                }
            }, { passive: true });
        }
        
        // Create observer to watch for data loaded attribute changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-loaded') {
                    const isLoaded = container.getAttribute('data-loaded') === 'true';
                    console.log(`[DEBUG] TimeZones.contentObserver - Content loaded state changed to: ${isLoaded}`);
                    
                    if (isLoaded) {
                        // Content is loaded, force update fade effects
                        setTimeout(() => {
                            console.log('[DEBUG] TimeZones.contentObserver - Content loaded, forcing update of fade effects');
                            const fadeTop = document.querySelector('#time-zones .fade-overlay.fade-top');
                            const fadeBottom = document.querySelector('#time-zones .fade-overlay.fade-bottom');
                            const viewportContainer = document.getElementById('timezones-viewport-container');
                            
                            if (fadeTop && fadeBottom && viewportContainer) {
                                // Check if content is overflowing
                                const isOverflowing = viewportContainer.scrollHeight > viewportContainer.clientHeight;
                                console.log(`[DEBUG] TimeZones.contentObserver - Content overflow check: ${isOverflowing}`);
                                
                                // If not overflowing, both fades should be hidden
                                if (!isOverflowing) {
                                    fadeTop.classList.add('hidden');
                                    fadeBottom.classList.add('hidden');
                                    console.log('[DEBUG] TimeZones.contentObserver - Forcing both fades to be hidden (no overflow)');
                                } else {
                                    // Otherwise check scroll position
                                    if (viewportContainer.scrollTop <= 10) {
                                        fadeTop.classList.add('hidden');
                                    } else {
                                        fadeTop.classList.remove('hidden');
                                    }
                                    
                                    const isAtBottom = Math.abs(
                                        viewportContainer.scrollHeight - viewportContainer.scrollTop - viewportContainer.clientHeight
                                    ) < 10;
                                    
                                    if (isAtBottom) {
                                        fadeBottom.classList.add('hidden');
                                    } else {
                                        fadeBottom.classList.remove('hidden');
                                    }
                                    
                                    console.log('[DEBUG] TimeZones.contentObserver - Updated fade states based on scroll position');
                                }
                            }
                        }, 100);
                    }
                }
            });
        });
        
        // Start observing the container for attribute changes
        observer.observe(container, { attributes: true });
        console.log('[DEBUG] TimeZones.setupContentLoadingObserver - Observer set up successfully');
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