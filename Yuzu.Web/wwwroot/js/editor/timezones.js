const luxonGlobal = window.luxon;
let focusedRowIndex = -1;
let selectedRowIndex = -1;
const pageSize = 10;
let currentPage = 1;
let selectedTimeZoneId = null;
let timeZoneList = [];
let homeTimeZoneId = null;
let currentSearchTerm = '';
let totalTimeZones = 0;
/**
 * Initializes Bootstrap tooltips for the timezone table.
 */
function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(element => {
        new bootstrap.Tooltip(element);
    });
}
/**
 * Adds click and keyboard selection behavior to table rows
 */
function addRowSelection() {
    const rows = document.querySelectorAll('#timeZoneTableBody tr[role="option"]');
    // Handle table container focus
    const tableBody = document.getElementById('timeZoneTableBody');
    if (tableBody) {
        tableBody.addEventListener('focus', (event) => {
            if (event.target === tableBody) {
                // When table receives focus, focus the first row if no row is focused
                if (focusedRowIndex === -1 && rows.length > 0) {
                    focusedRowIndex = 0;
                    updateFocusedRow(rows);
                }
            }
        });
    }
    rows.forEach((row, index) => {
        // Click handler
        row.addEventListener('click', () => {
            focusedRowIndex = index;
            updateFocusedRow(rows);
            selectTimeZone(row);
        });
        // Double click handler
        row.addEventListener('dblclick', () => {
            selectTimeZone(row);
            confirmSelection();
        });
        // Focus handler
        row.addEventListener('focus', () => {
            if (focusedRowIndex !== index) {
                focusedRowIndex = index;
                updateFocusedRow(rows);
            }
        });
        // Keyboard handler
        row.addEventListener('keydown', (event) => {
            const key = event.key;
            const rowCount = rows.length;
            switch (key) {
                case 'ArrowDown':
                    event.preventDefault();
                    if (focusedRowIndex < rowCount - 1) {
                        focusedRowIndex++;
                        updateFocusedRow(rows);
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    if (focusedRowIndex > 0) {
                        focusedRowIndex--;
                        updateFocusedRow(rows);
                    }
                    break;
                case 'Home':
                    event.preventDefault();
                    focusedRowIndex = 0;
                    updateFocusedRow(rows);
                    break;
                case 'End':
                    event.preventDefault();
                    focusedRowIndex = rowCount - 1;
                    updateFocusedRow(rows);
                    break;
                case 'PageUp':
                    event.preventDefault();
                    if (currentPage > 1) {
                        currentPage--;
                        loadTimeZones(currentSearchTerm);
                    }
                    break;
                case 'PageDown':
                    event.preventDefault();
                    const maxPages = Math.ceil(totalTimeZones / pageSize);
                    if (currentPage < maxPages) {
                        currentPage++;
                        loadTimeZones(currentSearchTerm);
                    }
                    break;
                case ' ':
                case 'Enter':
                    event.preventDefault();
                    selectTimeZone(row);
                    if (key === 'Enter') {
                        confirmSelection();
                    }
                    break;
            }
        });
    });
    // Set initial focus if not set
    if (focusedRowIndex === -1 && rows.length > 0) {
        focusedRowIndex = 0;
        updateFocusedRow(rows);
    }
}
/**
 * Shows the time zones modal dialog.
 */
async function showTimeZonesModal() {
    const timeZonesModalElement = document.getElementById('timeZonesModal');
    if (!timeZonesModalElement)
        return;
    // Reset state when opening modal
    currentPage = 1;
    focusedRowIndex = -1;
    selectedTimeZoneId = null;
    currentSearchTerm = '';
    // Initialize select button state
    const selectButton = document.getElementById('selectButton');
    if (selectButton) {
        selectButton.setAttribute('disabled', '');
        selectButton.classList.remove('btn-primary');
        selectButton.classList.add('btn-secondary');
    }
    // Load available timezones first
    try {
        await loadAvailableTimeZones();
    }
    catch (error) {
        console.error('Failed to load available timezones:', error);
        return;
    }
    const timeZonesModal = new bootstrap.Modal(timeZonesModalElement, {
        keyboard: true
    });
    // Set up focus trap
    const focusableElements = timeZonesModalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    // Handle focus trap
    timeZonesModalElement.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            }
            else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });
    // Handle modal close
    timeZonesModalElement.addEventListener('hidden.bs.modal', () => {
        // Reset state when closing modal
        currentPage = 1;
        focusedRowIndex = -1;
        selectedTimeZoneId = null;
        currentSearchTerm = '';
    });
    // Handle modal shown event to ensure search input gets focus
    timeZonesModalElement.addEventListener('shown.bs.modal', () => {
        const searchInput = document.getElementById('searchTerm');
        if (searchInput) {
            searchInput.value = '';
            // Load all timezones initially with empty search
            loadTimeZones('');
            // Set focus after a short delay to ensure the modal is fully rendered
            setTimeout(() => {
                searchInput.focus();
            }, 50);
        }
    });
    timeZonesModal.show();
}
/**
 * Updates the focused row in the timezone table.
 */
function updateFocusedRow(rows) {
    rows.forEach((row, index) => {
        const element = row;
        if (index === focusedRowIndex) {
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
 * Selects a timezone without confirming
 */
function selectTimeZone(row) {
    const rows = document.querySelectorAll('#timeZoneTableBody tr[role="option"]');
    rows.forEach(r => {
        r.classList.remove('selected');
        r.setAttribute('aria-selected', 'false');
    });
    row.classList.add('selected');
    row.setAttribute('aria-selected', 'true');
    selectedTimeZoneId = row.getAttribute('data-zone-id');
    // Enable/disable select button based on selection
    const selectButton = document.getElementById('selectButton');
    if (selectButton) {
        if (selectedTimeZoneId) {
            selectButton.removeAttribute('disabled');
            selectButton.classList.remove('btn-secondary');
            selectButton.classList.add('btn-primary');
        }
        else {
            selectButton.setAttribute('disabled', '');
            selectButton.classList.remove('btn-primary');
            selectButton.classList.add('btn-secondary');
        }
    }
    // Announce selection to screen readers
    const searchResults = document.getElementById('searchResults');
    if (searchResults && selectedTimeZoneId) {
        const timezone = timeZoneList.find(tz => tz.zoneId === selectedTimeZoneId);
        if (timezone) {
            searchResults.textContent = `Selected ${timezone.cities[0]}, ${timezone.countryName}`;
        }
    }
}
/**
 * Selects and confirms a timezone
 */
function selectAndConfirmTimeZone(row) {
    selectTimeZone(row);
    const selectButton = document.getElementById('selectButton');
    if (selectButton && !selectButton.hasAttribute('disabled')) {
        selectButton.click();
    }
}
/**
 * Updates the search results announcement for screen readers.
 */
function updateSearchResultsAnnouncement(totalCount, searchTerm = '') {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        const message = searchTerm
            ? `Found ${totalCount} timezone${totalCount !== 1 ? 's' : ''} matching "${searchTerm}"`
            : `Showing all ${totalCount} timezones`;
        searchResults.textContent = message;
    }
}
/**
 * Sets up pagination controls for the timezone table.
 */
function setupPagination(searchTerm, totalCount) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer)
        return;
    let paginationHtml = '';
    // Previous button
    paginationHtml += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); changePage(${currentPage - 1}, '${searchTerm}')" 
               aria-label="Previous"
               ${currentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>`;
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" 
                       onclick="event.preventDefault(); changePage(${i}, '${searchTerm}')"
                       aria-label="Page ${i}"
                       aria-current="${i === currentPage ? 'page' : 'false'}"
                       ${i === currentPage ? 'tabindex="0"' : ''}>
                        ${i}
                    </a>
                </li>`;
        }
        else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
                </li>`;
        }
    }
    // Next button
    paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); changePage(${currentPage + 1}, '${searchTerm}')" 
               aria-label="Next"
               ${currentPage === totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>`;
    paginationContainer.innerHTML = paginationHtml;
    // Add keyboard navigation for pagination
    const paginationLinks = paginationContainer.querySelectorAll('.page-link:not([aria-disabled="true"])');
    paginationLinks.forEach(link => {
        link.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                link.click();
            }
        });
    });
}
/**
 * Changes the current page and reloads the timezone list.
 */
function changePage(page, searchTerm) {
    if (page < 1)
        return;
    currentPage = page;
    loadTimeZones(searchTerm);
}
/**
 * Initializes the page by loading user's timezones and available timezones.
 */
async function initializePage() {
    console.log('Initializing page...');
    try {
        await Promise.all([
            loadUserTimeZonesDisplay(),
            loadAvailableTimeZones()
        ]);
        setupEventHandlers();
        console.log('Page initialization complete');
    }
    catch (error) {
        console.error('Failed to initialize page:', error);
    }
}
/**
 * Sets up event handlers for search and pagination.
 */
function setupEventHandlers() {
    // Search input handler
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                currentPage = 1;
                loadTimeZones(searchInput.value);
            }
        });
    }
    // Search button handler
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const searchTerm = document.getElementById('searchTerm').value;
            currentPage = 1;
            loadTimeZones(searchTerm);
        });
    }
    // Select button handler
    const selectButton = document.getElementById('selectButton');
    if (selectButton) {
        selectButton.addEventListener('click', async () => {
            if (selectedTimeZoneId) {
                const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
                if (!antiforgeryInput)
                    return;
                try {
                    const response = await fetch('?handler=SelectTimeZone', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'RequestVerificationToken': antiforgeryInput.value
                        },
                        body: JSON.stringify({ selectedTimeZoneId: selectedTimeZoneId })
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to add timezone');
                    }
                    // Close the modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('timeZonesModal'));
                    if (modal) {
                        modal.hide();
                    }
                    // Reload the user's timezones display
                    await loadUserTimeZonesDisplay();
                }
                catch (error) {
                    console.error('Error adding timezone:', error);
                    alert('Failed to add timezone. Please try again.');
                }
            }
        });
    }
}
/**
 * Loads the list of available timezones from the backend
 */
async function loadAvailableTimeZones() {
    try {
        const response = await fetch('/Settings/TimeZones?handler=AvailableTimeZones');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Invalid timezone data received');
        }
        timeZoneList = data;
    }
    catch (error) {
        console.error('Error loading available timezones:', error);
        throw error; // Re-throw to handle in calling function
    }
}
/**
 * Loads and displays user's selected time zones in the main page container.
 */
async function loadUserTimeZonesDisplay() {
    const container = document.getElementById('timeZoneContainer');
    if (!container)
        return;
    container.innerHTML = '';
    try {
        const response = await fetch(`/Settings/TimeZones?handler=UserTimeZones&pageNumber=${currentPage}&pageSize=${pageSize}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const timeZones = data.data;
        const totalCount = data.totalItems;
        homeTimeZoneId = data.homeTimeZoneId;
        if (timeZones.length > 0) {
            timeZones.forEach(timeZone => {
                const card = `
                    <div class="col" data-timezone-id="${timeZone.zoneId}">
                        <div class="card h-100 ${timeZone.isHome ? 'border-primary' : ''}">
                            <div class="card-body">
                                <div class="d-flex justify-content-between pb-2 mb-1">
                                    <h5 class="card-title fw-semibold text-truncate pe-2 mb-0">
                                        ${timeZone.cities[0]}, ${timeZone.countryName}
                                        ${timeZone.isHome ? '<span class="badge bg-primary ms-2">Home</span>' : ''}
                                    </h5>
                                    <div class="d-flex flex-nowrap">
                                        ${!timeZone.isHome ? `
                                        <button type="button" 
                                            class="btn btn-sm btn-outline-primary me-2" 
                                            onclick="setHomeTimeZone('${timeZone.zoneId}')" 
                                            title="Set as home timezone">
                                            <i class="bx bx-home fs-xl"></i>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-danger" 
                                            onclick="deleteTimeZone('${timeZone.zoneId}')">
                                            <i class="bx bx-trash-alt fs-xl"></i>
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <p class="card-text mb-0">${timeZone.continent}</p>
                                <p class="card-text text-muted small">UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}</p>
                            </div>
                        </div>
                    </div>`;
                container.insertAdjacentHTML('beforeend', card);
            });
        }
        else {
            // Show empty state message
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">You have not selected any timezones yet. Click "Add New" to get started.</p>
                </div>`;
        }
    }
    catch (error) {
        console.error('Error loading user timezones:', error);
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">An error occurred while loading your timezones. Please try again.</p>
            </div>`;
    }
}
/**
 * Searches and paginates the time zone list based on the given search term.
 */
function searchTimeZones(searchTerm, page = 1, pageSize = 10) {
    const filteredTimeZones = timeZoneList.filter(tz => (tz.cities && tz.cities[0] && tz.cities[0].toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tz.countryName && tz.countryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tz.continent && tz.continent.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tz.alias && tz.alias.toLowerCase().includes(searchTerm.toLowerCase())));
    const startIndex = (page - 1) * pageSize;
    const pagedResults = filteredTimeZones.slice(startIndex, startIndex + pageSize);
    return { pagedResults, totalCount: filteredTimeZones.length };
}
/**
 * Loads and displays time zones based on the current search term and pagination.
 */
function loadTimeZones(searchTerm) {
    currentSearchTerm = searchTerm; // Store the current search term
    const tableBody = document.getElementById('timeZoneTableBody');
    if (!tableBody)
        return;
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    const { pagedResults, totalCount } = searchTimeZones(searchTerm, currentPage, pageSize);
    totalTimeZones = totalCount; // Store the total count
    tableBody.innerHTML = '';
    if (pagedResults.length > 0) {
        pagedResults.forEach((timeZone, index) => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', 'false');
            row.setAttribute('tabindex', '0');
            row.setAttribute('data-zone-id', timeZone.zoneId);
            row.innerHTML = `
                <th scope="row">${timeZone.continent}</th>
                <td>${timeZone.countryName}</td>
                <td title="${timeZone.cities[0]}" data-bs-toggle="tooltip" data-bs-placement="top">${timeZone.cities[0]}</td>
                <td>UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}</td>
                <td>${timeZone.alias !== undefined ? timeZone.alias : ''}</td>`;
            // If this was the previously selected timezone, restore selection
            if (timeZone.zoneId === selectedTimeZoneId) {
                row.classList.add('selected');
                row.setAttribute('aria-selected', 'true');
            }
            tableBody.appendChild(row);
        });
        initializeTooltips();
        addRowSelection();
        // Restore focus after pagination
        if (focusedRowIndex >= 0) {
            const rows = tableBody.querySelectorAll('tr[role="option"]');
            if (focusedRowIndex >= rows.length) {
                focusedRowIndex = rows.length - 1;
            }
            if (focusedRowIndex >= 0 && rows[focusedRowIndex]) {
                updateFocusedRow(rows);
            }
        }
        updateSearchResultsAnnouncement(totalCount, searchTerm);
    }
    else {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Sorry, I could not find any results. Please try again.</td></tr>';
        updateSearchResultsAnnouncement(0, searchTerm);
        focusedRowIndex = -1; // Reset focus when no results
    }
    setupPagination(searchTerm, totalCount);
}
/**
 * Deletes a timezone from the user's list and removes it from display
 */
async function deleteTimeZone(timeZoneId) {
    var _a;
    const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!antiforgeryInput)
        return;
    try {
        const response = await fetch('?handler=DeleteTimeZone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': antiforgeryInput.value
            },
            body: JSON.stringify(timeZoneId)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete timezone');
        }
        const container = document.getElementById('timeZoneContainer');
        if (!container)
            return;
        // Find and remove the timezone card
        const card = container.querySelector(`[data-timezone-id="${timeZoneId}"]`);
        if (card) {
            // Add a fade-out effect
            card.classList.add('fade-out');
            // Remove the element after the animation
            setTimeout(() => {
                card.remove();
                // Check if only one card remains
                const remainingCards = container.querySelectorAll('[data-timezone-id]');
                if (remainingCards.length === 1) {
                    // Remove delete button from the last remaining card
                    const deleteButton = remainingCards[0].querySelector('.btn-outline-danger');
                    if (deleteButton) {
                        deleteButton.remove();
                    }
                }
            }, 150);
            // If this was the home timezone, update the UI for the new home timezone
            if (result.newHomeTimeZoneId) {
                const newHomeCard = (_a = container.querySelector(`[data-timezone-id="${result.newHomeTimeZoneId}"]`)) === null || _a === void 0 ? void 0 : _a.querySelector('.card');
                if (newHomeCard) {
                    newHomeCard.classList.add('border-primary');
                    const newHomeBtn = newHomeCard.querySelector('.btn-outline-primary');
                    if (newHomeBtn) {
                        newHomeBtn.classList.remove('btn-outline-primary');
                        newHomeBtn.classList.add('btn-primary');
                        const icon = newHomeBtn.querySelector('.bx');
                        if (icon) {
                            icon.classList.remove('bx-home');
                            icon.classList.add('bx-home-heart');
                        }
                        newHomeBtn.setAttribute('title', 'Home timezone');
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error deleting timezone:', error);
        alert('Failed to delete timezone. Please try again.');
    }
}
/**
 * Sets the home timezone for the user.
 */
async function setHomeTimeZone(timeZoneId) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const antiforgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!antiforgeryInput)
        return;
    try {
        const response = await fetch('?handler=SetHomeTimeZone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': antiforgeryInput.value
            },
            body: JSON.stringify({ timeZoneId })
        });
        if (!response.ok) {
            throw new Error('Failed to set home timezone');
        }
        const container = document.getElementById('timeZoneContainer');
        if (!container)
            return;
        // Find the old home card
        const oldHomeCol = (_a = container.querySelector('.card.border-primary')) === null || _a === void 0 ? void 0 : _a.closest('.col');
        const oldHomeCard = oldHomeCol === null || oldHomeCol === void 0 ? void 0 : oldHomeCol.querySelector('.card');
        if (oldHomeCol && oldHomeCard) {
            const oldHomeId = oldHomeCol.getAttribute('data-timezone-id');
            const oldTitle = ((_c = (_b = oldHomeCol.querySelector('.card-title')) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.split('Home')[0]) || '';
            const oldCardText = ((_d = oldHomeCol.querySelector('.card-text')) === null || _d === void 0 ? void 0 : _d.outerHTML) || '';
            const oldTimeText = ((_e = oldHomeCol.querySelector('.text-muted')) === null || _e === void 0 ? void 0 : _e.outerHTML) || '';
            oldHomeCard.outerHTML = `
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between pb-2 mb-1">
                            <h5 class="card-title fw-semibold text-truncate pe-2 mb-0">
                                ${oldTitle}
                            </h5>
                            <div class="d-flex flex-nowrap">
                                <button type="button" 
                                    class="btn btn-sm btn-outline-primary me-2" 
                                    onclick="setHomeTimeZone('${oldHomeId}')" 
                                    title="Set as home timezone">
                                    <i class="bx bx-home fs-xl"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" 
                                    onclick="deleteTimeZone('${oldHomeId}')">
                                    <i class="bx bx-trash-alt fs-xl"></i>
                                </button>
                            </div>
                        </div>
                        ${oldCardText}
                        ${oldTimeText}
                    </div>
                </div>`;
        }
        // Find and update the new home card
        const newHomeCol = container.querySelector(`[data-timezone-id="${timeZoneId}"]`);
        const newHomeCard = newHomeCol === null || newHomeCol === void 0 ? void 0 : newHomeCol.querySelector('.card');
        if (newHomeCol && newHomeCard) {
            const newTitle = ((_f = newHomeCol.querySelector('.card-title')) === null || _f === void 0 ? void 0 : _f.textContent) || '';
            const newCardText = ((_g = newHomeCol.querySelector('.card-text')) === null || _g === void 0 ? void 0 : _g.outerHTML) || '';
            const newTimeText = ((_h = newHomeCol.querySelector('.text-muted')) === null || _h === void 0 ? void 0 : _h.outerHTML) || '';
            newHomeCard.outerHTML = `
                <div class="card h-100 border-primary">
                    <div class="card-body">
                        <div class="d-flex justify-content-between pb-2 mb-1">
                            <h5 class="card-title fw-semibold text-truncate pe-2 mb-0">
                                ${newTitle}
                                <span class="badge bg-primary ms-2">Home</span>
                            </h5>
                            <div class="d-flex flex-nowrap">
                            </div>
                        </div>
                        ${newCardText}
                        ${newTimeText}
                    </div>
                </div>`;
        }
    }
    catch (error) {
        console.error('Error setting home timezone:', error);
    }
}
/**
 * Confirms the current selection
 */
function confirmSelection() {
    const selectButton = document.getElementById('selectButton');
    if (selectButton && !selectButton.hasAttribute('disabled')) {
        selectButton.click();
    }
}
// Call initializePage when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - initializing...');
    initializePage().catch(error => {
        console.error('Failed to initialize page:', error);
    });
});
//# sourceMappingURL=timezones.js.map