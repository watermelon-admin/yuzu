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
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    
    return function(...args: Parameters<T>): void {
        const later = () => {
            timeout = null;
            func(...args);
        };
        
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        
        timeout = window.setTimeout(later, wait) as unknown as number;
    };
}

/**
 * Updates the visibility of fade overlays based on scroll position
 * @param container - The scrollable container element
 * @param topFade - The top fade overlay element
 * @param bottomFade - The bottom fade overlay element
 */
export function updateFadeEffects(
    container: HTMLElement,
    topFade: HTMLElement,
    bottomFade: HTMLElement
): void {
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
    } else {
        topFade.classList.remove('hidden');
    }
    
    // Check scroll position for bottom fade
    // We need to account for small rounding differences in scroll calculations
    const isAtBottom = 
        Math.abs(
            (container.scrollHeight - container.scrollTop - container.clientHeight)
        ) < 10;
    
    if (isAtBottom) {
        bottomFade.classList.add('hidden');
    } else {
        bottomFade.classList.remove('hidden');
    }
}

/**
 * Sets up scroll fade effects for a viewport container
 * @param sectionId - The ID of the section containing the viewport
 */
export function setupScrollFadeEffects(sectionId: string): void {
    // Target the specified section
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`Section "${sectionId}" not found`);
        return;
    }
    
    const viewportContainer = section.querySelector('.viewport-container') as HTMLElement;
    const topFade = section.querySelector('.fade-overlay.fade-top') as HTMLElement;
    const bottomFade = section.querySelector('.fade-overlay.fade-bottom') as HTMLElement;
    
    if (!viewportContainer || !topFade || !bottomFade) {
        console.error(`Required elements for fade effects not found in section "${sectionId}"`);
        return;
    }
    
    // Remove previous listeners if any by replacing with cloned element
    const newViewportContainer = viewportContainer.cloneNode(false) as HTMLElement;
    while (viewportContainer.firstChild) {
        newViewportContainer.appendChild(viewportContainer.firstChild);
    }
    viewportContainer.parentNode?.replaceChild(newViewportContainer, viewportContainer);
    
    // Now work with the new clean container
    const updatedContainer = section.querySelector('.viewport-container') as HTMLElement;
    
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
            const img = element as HTMLImageElement;
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
            const img = element as HTMLImageElement;
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
}

/**
 * Shows loading state in the container
 * @param containerId ID of the container element
 * @param sectionId Section ID to determine which loading state template to use
 */
export function showLoadingState(containerId: string, sectionId: string = 'default'): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Get the appropriate loading state template for this section
    const template = loadingStateTemplates[sectionId as keyof typeof loadingStateTemplates] 
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
export function showErrorState(containerId: string, sectionId: string = 'default', message?: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Get the appropriate error state template for this section
    let template = errorStateTemplates[sectionId as keyof typeof errorStateTemplates] 
        || errorStateTemplates.default;
        
    // Replace error message if provided
    if (message) {
        template = template.replace(/<p class="text-danger">[^<]+<\/p>/, 
            `<p class="text-danger">${message}</p>`);
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
export function showEmptyStateIfNeeded(containerId: string, sectionId: string, itemSelector: string): boolean {
    const container = document.getElementById(containerId);
    if (!container) return false;
    
    // Check if container is empty based on the specified item selector
    const hasItems = container.querySelectorAll(itemSelector).length > 0;
    
    if (!hasItems) {
        // Get the appropriate empty state template for this section
        const emptyStateTemplate = emptyStateTemplates[sectionId as keyof typeof emptyStateTemplates];
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
export function animateCardRemoval(
    cardElement: HTMLElement, 
    sectionId: string,
    options: {
        containerId?: string;
        itemSelector?: string;
        onRemoveComplete?: () => void;
    } = {}
): void {
    // Get the parent column element which is what we'll actually remove
    const columnElement = cardElement.closest('.col') as HTMLElement;
    if (!columnElement) return;
    
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