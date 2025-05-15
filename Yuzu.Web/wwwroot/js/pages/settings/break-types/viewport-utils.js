/**
 * Viewport utilities for break types
 * Manages fade effects when scrolling content
 */
/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked
 * @param func - The function to debounce
 * @param wait - The wait time in milliseconds
 */
export function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
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
 * Animates the removal of a card from the DOM
 * @param cardElement The card element to remove with animation
 */
export function animateCardRemoval(cardElement) {
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
            // Update fade effects to adapt to new content height
            setupScrollFadeEffects();
        }, 300); // Same duration as the transition
    }, 10);
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
 * Sets up scroll fade effects for the viewport
 */
export function setupScrollFadeEffects() {
    var _a;
    // Target only the break types section
    const breakTypesSection = document.getElementById('break-types');
    if (!breakTypesSection) {
        console.error('Break types section not found');
        return;
    }
    const viewportContainer = breakTypesSection.querySelector('.viewport-container');
    const topFade = breakTypesSection.querySelector('.fade-overlay.fade-top');
    const bottomFade = breakTypesSection.querySelector('.fade-overlay.fade-bottom');
    if (!viewportContainer || !topFade || !bottomFade) {
        console.error('Required elements for fade effects not found');
        return;
    }
    // Remove previous listeners if any by replacing with cloned element
    const newViewportContainer = viewportContainer.cloneNode(false);
    while (viewportContainer.firstChild) {
        newViewportContainer.appendChild(viewportContainer.firstChild);
    }
    (_a = viewportContainer.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newViewportContainer, viewportContainer);
    // Now work with the new clean container
    const updatedContainer = breakTypesSection.querySelector('.viewport-container');
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
    window.addEventListener('resize', debouncedResizeHandler);
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
}
//# sourceMappingURL=viewport-utils.js.map