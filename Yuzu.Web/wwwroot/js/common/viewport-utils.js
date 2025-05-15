/**
 * Common viewport utilities for scrollable content sections
 * Manages fade effects, animations, scroll handling, and empty states across the application
 */
// Loading state templates for content loading
export const loadingStateTemplates = {
    'default': `
        <div class="col-12 text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading content...</p>
        </div>
    `,
    'break-types': `
        <div class="col-12 text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading break types...</span>
            </div>
            <p class="mt-2">Loading your break types...</p>
        </div>
    `,
    'time-zones': `
        <div class="col-12 text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading timezones...</span>
            </div>
            <p class="mt-2">Loading your timezones...</p>
        </div>
    `,
    'backgrounds': `
        <div class="col-12 text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading backgrounds...</span>
            </div>
            <p class="mt-2">Loading your background images...</p>
        </div>
    `
};
// Error state templates for error handling
export const errorStateTemplates = {
    'default': `
        <div class="col-12 text-center">
            <p class="text-danger">An error occurred while loading content.</p>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                <i class="bx bx-refresh me-1"></i> Reload Page
            </button>
        </div>
    `,
    'break-types': `
        <div class="col-12 text-center">
            <p class="text-danger">Failed to load break types.</p>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                <i class="bx bx-refresh me-1"></i> Refresh
            </button>
        </div>
    `,
    'time-zones': `
        <div class="col-12 text-center">
            <p class="text-danger">An error occurred while loading your timezones. Please try again.</p>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                <i class="bx bx-refresh me-1"></i> Reload Page
            </button>
        </div>
    `,
    'backgrounds': `
        <div class="col-12 text-center">
            <p class="text-danger">Failed to load background images.</p>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                <i class="bx bx-refresh me-1"></i> Reload Page
            </button>
        </div>
    `
};
// Define common empty state message templates for each section
export const emptyStateTemplates = {
    'break-types': `
        <div class="col-12 text-center py-4">
            <p class="text-muted mb-3">You haven't created any break types yet.</p>
            <button type="button" class="btn btn-primary" id="add-new-break-type-button">
                <i class="bx bx-plus-circle me-2"></i>Add Break Type
            </button>
        </div>
    `,
    'time-zones': `
        <div class="col-12 text-center">
            <p class="text-muted">You have not selected any timezones yet. Click "Add Time Zones" to get started.</p>
        </div>
    `,
    'backgrounds': `
        <div class="col-12 text-center py-5">
            <i class="bx bx-image fs-1 text-muted mb-3"></i>
            <h5>No Background Images</h5>
            <p class="text-muted">Upload your own images or wait for new system backgrounds.</p>
        </div>
    `
};
/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked
 * @param func - The function to debounce
 * @param wait - The wait time in milliseconds
 */
export function debounce(func, wait) {
    let timeout = null;
    return function (...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = window.setTimeout(later, wait);
    };
}
/**
 * Updates the visibility of fade overlays based on scroll position
 * @param container - The scrollable container element
 * @param topFade - The top fade overlay element
 * @param bottomFade - The bottom fade overlay element
 */
export function updateFadeEffects(container, topFade, bottomFade) {
    // First check if content is overflowing - only show fades if there's scrollable content
    const isOverflowing = container.scrollHeight > container.clientHeight;
    if (!isOverflowing) {
        // No overflow, hide both fades
        topFade.classList.add('hidden');
        bottomFade.classList.add('hidden');
        return;
    }
    // Content is overflowing, now check scroll position for top fade
    if (container.scrollTop <= 10) {
        topFade.classList.add('hidden');
    }
    else {
        topFade.classList.remove('hidden');
    }
    // Check scroll position for bottom fade
    // We need to account for small rounding differences in scroll calculations
    const isAtBottom = Math.abs((container.scrollHeight - container.scrollTop - container.clientHeight)) < 10;
    if (isAtBottom) {
        bottomFade.classList.add('hidden');
    }
    else {
        bottomFade.classList.remove('hidden');
    }
}
/**
 * Sets up scroll fade effects for a viewport container
 * @param sectionId - The ID of the section containing the viewport
 */
export function setupScrollFadeEffects(sectionId) {
    var _a;
    // Target the specified section
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`Section "${sectionId}" not found`);
        return;
    }
    // Debug the structure of the section
    console.log(`Setting up fade effects for section "${sectionId}"`);
    const viewportContainer = section.querySelector('.viewport-container');
    const topFade = section.querySelector('.fade-overlay.fade-top');
    const bottomFade = section.querySelector('.fade-overlay.fade-bottom');
    // Enhanced error reporting
    if (!viewportContainer) {
        console.error(`Viewport container not found in section "${sectionId}"`);
        // Try to create a report of what was found
        console.log('Section contents:', section.innerHTML.substring(0, 200) + '...');
        return;
    }
    if (!topFade) {
        console.error(`Top fade overlay not found in section "${sectionId}"`);
        return;
    }
    if (!bottomFade) {
        console.error(`Bottom fade overlay not found in section "${sectionId}"`);
        return;
    }
    console.log(`Found all required elements for section "${sectionId}"`);
    // Remove previous listeners if any by replacing with cloned element
    try {
        const newViewportContainer = viewportContainer.cloneNode(false);
        while (viewportContainer.firstChild) {
            newViewportContainer.appendChild(viewportContainer.firstChild);
        }
        (_a = viewportContainer.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newViewportContainer, viewportContainer);
        // Now work with the new clean container
        const updatedContainer = section.querySelector('.viewport-container');
        // Apply initial fade states based on content
        updateFadeEffects(updatedContainer, topFade, bottomFade);
        // Create debounced handlers for better performance
        const debouncedScrollHandler = debounce(() => {
            updateFadeEffects(updatedContainer, topFade, bottomFade);
        }, 10);
        const debouncedResizeHandler = debounce(() => {
            updateFadeEffects(updatedContainer, topFade, bottomFade);
        }, 100);
        // Add scroll event listener with debounce
        updatedContainer.addEventListener('scroll', debouncedScrollHandler, { passive: true });
        // Listen for window resize events with debounce
        window.addEventListener('resize', debouncedResizeHandler, { passive: true });
        // Listen for images loading to update fade effects
        const imageElements = updatedContainer.querySelectorAll('img');
        if (imageElements.length > 0) {
            imageElements.forEach(element => {
                // Type guard to ensure we're working with an HTMLImageElement
                const img = element;
                // Listen for load event on each image
                if (img && !img.complete) {
                    img.addEventListener('load', () => {
                        updateFadeEffects(updatedContainer, topFade, bottomFade);
                    }, { once: true });
                }
            });
        }
        // Listen for content changes using MutationObserver
        const contentObserver = new MutationObserver(() => {
            updateFadeEffects(updatedContainer, topFade, bottomFade);
            // Check if new images were added and attach load listeners
            const newImages = updatedContainer.querySelectorAll('img:not([data-fade-load-tracked])');
            newImages.forEach(element => {
                // Type guard to ensure we're working with an HTMLImageElement
                const img = element;
                if (img) {
                    img.setAttribute('data-fade-load-tracked', 'true');
                    if (!img.complete) {
                        img.addEventListener('load', () => {
                            updateFadeEffects(updatedContainer, topFade, bottomFade);
                        }, { once: true });
                    }
                }
            });
        });
        // Observe content changes in the container
        contentObserver.observe(updatedContainer, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
        console.log(`Fade effects successfully set up for section "${sectionId}"`);
    }
    catch (error) {
        console.error(`Error setting up fade effects for section "${sectionId}":`, error);
    }
}
/**
 * Shows loading state in the container
 * @param containerId ID of the container element
 * @param sectionId Section ID to determine which loading state template to use
 */
export function showLoadingState(containerId, sectionId = 'default') {
    const container = document.getElementById(containerId);
    if (!container)
        return;
    // Get the appropriate loading state template for this section
    const template = loadingStateTemplates[sectionId]
        || loadingStateTemplates.default;
    // Display the loading state
    container.innerHTML = template;
    // Mark the container as loading
    container.setAttribute('data-loading', 'true');
    container.setAttribute('data-loaded', 'false');
}
/**
 * Shows error state in the container
 * @param containerId ID of the container element
 * @param sectionId Section ID to determine which error state template to use
 * @param message Optional custom error message
 */
export function showErrorState(containerId, sectionId = 'default', message) {
    const container = document.getElementById(containerId);
    if (!container)
        return;
    // Get the appropriate error state template for this section
    let template = errorStateTemplates[sectionId]
        || errorStateTemplates.default;
    // Replace error message if provided
    if (message) {
        template = template.replace(/<p class="text-danger">[^<]+<\/p>/, `<p class="text-danger">${message}</p>`);
    }
    // Display the error state
    container.innerHTML = template;
    // Mark the container as not loaded and not loading
    container.setAttribute('data-loading', 'false');
    container.setAttribute('data-loaded', 'false');
}
/**
 * Shows empty state in the container if it's empty
 * @param containerId ID of the container element
 * @param sectionId Section ID to determine which empty state template to use
 * @param itemSelector Selector to check for remaining items
 * @returns True if empty state was shown, false otherwise
 */
export function showEmptyStateIfNeeded(containerId, sectionId, itemSelector) {
    const container = document.getElementById(containerId);
    if (!container)
        return false;
    // Check if container is empty based on the specified item selector
    const hasItems = container.querySelectorAll(itemSelector).length > 0;
    if (!hasItems) {
        // Get the appropriate empty state template for this section
        const emptyStateTemplate = emptyStateTemplates[sectionId];
        if (emptyStateTemplate) {
            container.innerHTML = emptyStateTemplate;
            // Mark the container as loaded
            container.setAttribute('data-loading', 'false');
            container.setAttribute('data-loaded', 'true');
            return true;
        }
    }
    return false;
}
/**
 * Animates the removal of a card from the DOM
 * @param cardElement The card element to remove with animation
 * @param sectionId The ID of the section for updating fade effects after removal
 * @param options Optional configuration for card removal behavior
 */
export function animateCardRemoval(cardElement, sectionId, options = {}) {
    // Get the parent column element which is what we'll actually remove
    const columnElement = cardElement.closest('.col');
    if (!columnElement)
        return;
    // Use CSS transitions for smooth animation
    // First, set up transition properties
    columnElement.style.transition = 'all 0.3s ease-out';
    // Apply initial transition to fade out and shrink
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
            // Check if we need to show an empty state message
            if (options.containerId && options.itemSelector) {
                showEmptyStateIfNeeded(options.containerId, sectionId, options.itemSelector);
            }
            // Call the custom callback if provided
            if (options.onRemoveComplete) {
                options.onRemoveComplete();
            }
            // Update fade effects to adapt to new content height
            setupScrollFadeEffects(sectionId);
        }, 300); // Same duration as the transition
    }, 10);
}
/**
 * Scrolls to a newly added card element
 * @param cardElement The card element to scroll to (pass null to scroll to top)
 * @param options Optional configuration for scrolling behavior
 */
export function scrollToNewCard(cardElement, options = {}) {
    // Default options
    const defaults = {
        behavior: 'smooth',
        offset: 10,
        sectionId: null
    };
    const settings = Object.assign(Object.assign({}, defaults), options);
    // If no card element is provided, scroll to the top of the viewport
    if (!cardElement) {
        const section = settings.sectionId ? document.getElementById(settings.sectionId) : null;
        const viewportContainer = section
            ? section.querySelector('.viewport-container')
            : document.querySelector('.viewport-container');
        if (viewportContainer) {
            viewportContainer.scrollTo({
                top: 0,
                behavior: settings.behavior
            });
        }
        return;
    }
    // Find the viewport container (parent element with overflow)
    const viewportContainer = cardElement.closest('.viewport-container');
    if (!viewportContainer)
        return;
    // Calculate the position to scroll to
    const cardRect = cardElement.getBoundingClientRect();
    const containerRect = viewportContainer.getBoundingClientRect();
    // Calculate the relative position of the card within the viewport container
    const relativeTop = cardRect.top - containerRect.top;
    // Adjust the current scroll position to show the new card
    const scrollTarget = viewportContainer.scrollTop + relativeTop - settings.offset;
    // Scroll to the target position
    viewportContainer.scrollTo({
        top: scrollTarget,
        behavior: settings.behavior
    });
}
//# sourceMappingURL=viewport-utils.js.map