/// <reference types="jquery" />
/// <reference types="bootstrap" />
var Yuzu;
(function (Yuzu) {
    var Web;
    (function (Web) {
        var Settings;
        (function (Settings) {
            var BreakTypes;
            (function (BreakTypes) {
                // Global variables for pagination
                let currentPage = 1;
                const pageSize = 4;
                let continuationTokens = { 1: null };
                // Check if user is subscribed (Pro member)
                const isSubscribedElement = document.getElementById('isSubscribed');
                const isSubscribed = (isSubscribedElement === null || isSubscribedElement === void 0 ? void 0 : isSubscribedElement.value) === 'true';
                /**
                 * Get the background images URL from the hidden input field.
                 */
                function getImagePath() {
                    const imagePathInput = document.getElementById('imagePath');
                    return (imagePathInput === null || imagePathInput === void 0 ? void 0 : imagePathInput.value) || '';
                }
                /**
                 * Load break types from the server and populate the container.
                 * @param page - The page number to load.
                 * @returns Promise that resolves when the loading is complete
                 */
                async function loadBreakTypes(page) {
                    var _a, _b, _c, _d, _e;
                    try {
                        // Retrieve the continuation token for the requested page
                        let continuationToken = continuationTokens[page];
                        // Use current path for correct routing (regardless of which page it's embedded in)
                        const url = `${document.location.pathname}?handler=BreakTypes&pageNumber=${page}&pageSize=${pageSize}&continuationToken=${encodeURIComponent(continuationToken || '')}`;
                        const response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json'
                            }
                        });
                        if (!response.ok) {
                            console.error('Network response was not OK');
                            return;
                        }
                        const responseData = await response.json();
                        console.log('Raw response data:', responseData);
                        // Process the standardized response directly
                        if (responseData.success) {
                            // Server returns a standardized format with success, message, and data properties
                            const data = responseData;
                            console.log('Processed data:', data);
                            // Get the container and template   
                            const container = document.getElementById('breakTypeContainer');
                            const template = document.getElementById('breakTypeTemplate');
                            if (!container || !template) {
                                console.error('Container or template not found');
                                return;
                            }
                            // Clear the container before adding new items
                            container.innerHTML = '';
                            // Get the background images URL
                            const backgroundImagesURL = getImagePath();
                            // Create card elements
                            const breakTypes = ((_a = data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                            console.log('Break types array:', breakTypes);
                            breakTypes.forEach((item) => {
                                console.log('Processing item:', item);
                                // Clone the template content
                                const $cardDiv = $($(template).html());
                                // Card
                                $cardDiv.attr('data-id', item.rowKey);
                                // Preview Image
                                $cardDiv.find('.card-preview-image').attr('src', `${backgroundImagesURL}/${item.imageTitle}-thumb.jpg`);
                                // Card Title
                                $cardDiv.find('.card-title-link').text(item.name);
                                // Default Duration
                                $cardDiv.find('.card-duration-span').text(item.defaultDurationMinutes.toString());
                                // Usage Count
                                $cardDiv.find('.card-usage-count').text(item.usageCount.toString());
                                // Edit button
                                const $editButton = $cardDiv.find('.card-edit-button');
                                $editButton.data('id', item.rowKey);
                                $editButton.data('name', item.name);
                                $editButton.data('image-title', item.imageTitle);
                                $editButton.data('icon-name', item.iconName || 'fa-mug-hot');
                                $editButton.data('default-duration', item.defaultDurationMinutes);
                                $editButton.data('time-step', item.breakTimeStepMinutes);
                                $editButton.data('countdown-message', item.countdownMessage || '');
                                $editButton.data('countdown-end-message', item.countdownEndMessage || '');
                                $editButton.data('end-time-title', item.endTimeTitle || '');
                                // Add backgroundImageChoices data
                                if (item.backgroundImageChoices) {
                                    const backgroundImages = item.backgroundImageChoices.split(';');
                                    if (backgroundImages.length >= 2) {
                                        $editButton.data('image-title-1', backgroundImages[0] || '');
                                        $editButton.data('image-title-2', backgroundImages[1] || '');
                                    }
                                    else {
                                        // Fallback if no choices are available
                                        $editButton.data('image-title-1', item.imageTitle || '');
                                        $editButton.data('image-title-2', item.imageTitle || '');
                                    }
                                }
                                else {
                                    // Fallback if no choices are available
                                    $editButton.data('image-title-1', item.imageTitle || '');
                                    $editButton.data('image-title-2', item.imageTitle || '');
                                }
                                // Design Button
                                const $designButton = $cardDiv.find('.card-design-button');
                                $designButton.attr('href', `/designer?id=${item.rowKey}`);
                                // Delete button
                                $cardDiv.find('.card-delete-button').data('id', item.rowKey);
                                // Append the cloned template to the container
                                $('#breakTypeContainer').append($cardDiv);
                            });
                            // Update continuation tokens map
                            continuationTokens[page + 1] = (_b = data.data) === null || _b === void 0 ? void 0 : _b.continuationToken;
                            // Setup pagination controls with the data from the standardized response
                            setupPagination((_c = data.data) === null || _c === void 0 ? void 0 : _c.totalItems, (_d = data.data) === null || _d === void 0 ? void 0 : _d.pageSize, (_e = data.data) === null || _e === void 0 ? void 0 : _e.currentPage);
                        }
                        else {
                            console.error('API request failed:', responseData.message);
                        }
                        // Hide the loading spinner once data is loaded
                        $('.page-loading').removeClass('active');
                    }
                    catch (error) {
                        console.error('Error fetching break types:', error);
                        $('.page-loading').removeClass('active');
                    }
                }
                BreakTypes.loadBreakTypes = loadBreakTypes;
                /**
                 * Setup pagination controls.
                 */
                function setupPagination(totalItems, pageSize, currentPageNum) {
                    const totalPages = Math.ceil(totalItems / pageSize);
                    const paginationControls = document.getElementById('pagination-controls');
                    if (paginationControls) {
                        paginationControls.innerHTML = ''; // Clear existing pagination controls
                        // Create pagination items
                        for (let i = 1; i <= totalPages; i++) {
                            const isActive = i === currentPageNum ? 'active' : '';
                            const pageItem = document.createElement('li');
                            pageItem.className = `page-item ${isActive}`;
                            pageItem.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                            paginationControls.appendChild(pageItem);
                        }
                        // Add click event listeners to pagination links
                        paginationControls.querySelectorAll('.page-link').forEach(link => {
                            link.addEventListener('click', function (e) {
                                e.preventDefault();
                                const page = parseInt(this.getAttribute('data-page') || '1');
                                currentPage = page;
                                loadBreakTypes(page);
                            });
                        });
                    }
                }
                BreakTypes.setupPagination = setupPagination;
                /**
                 * Set up event listeners for the break type card buttons
                 */
                function setupEventListeners() {
                    // Listen for clicks on edit buttons
                    document.querySelectorAll('.card-edit-button').forEach(button => {
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            // Use different editor based on subscription status
                            if (isSubscribed) {
                                if (typeof window.editBreakType === 'function') {
                                    window.editBreakType(button);
                                }
                                else {
                                    console.error('editBreakType function not found');
                                }
                            }
                            else {
                                if (typeof window.initSimpleEdit === 'function') {
                                    window.initSimpleEdit(button);
                                }
                                else {
                                    console.error('initSimpleEdit function not found');
                                }
                            }
                        });
                    });
                }
                // Initialize on document ready
                document.addEventListener('DOMContentLoaded', () => {
                    loadBreakTypes(currentPage);
                });
                // Add initialization for initial page load
                document.addEventListener('DOMContentLoaded', function () {
                    // Add a MutationObserver to detect when cards are added to the DOM
                    const container = document.getElementById('breakTypeContainer');
                    if (container) {
                        const observer = new MutationObserver(function (mutations) {
                            mutations.forEach(function (mutation) {
                                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                    // When new cards are added, setup event listeners
                                    setupEventListeners();
                                }
                            });
                        });
                        // Start observing the container for changes
                        observer.observe(container, { childList: true });
                    }
                });
            })(BreakTypes = Settings.BreakTypes || (Settings.BreakTypes = {}));
        })(Settings = Web.Settings || (Web.Settings = {}));
    })(Web = Yuzu.Web || (Yuzu.Web = {}));
})(Yuzu || (Yuzu = {}));
// Expose necessary functions to global scope for use in HTML
window.loadBreakTypes = Yuzu.Web.Settings.BreakTypes.loadBreakTypes;
window.setupPagination = Yuzu.Web.Settings.BreakTypes.setupPagination;
//# sourceMappingURL=breaktypes.js.map