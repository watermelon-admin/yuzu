/**
 * Viewport utilities for the backgrounds section
 * These functions handle fade overlays and scrolling effects
 */
/**
 * Updates the fade effects based on scroll position
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
    const isAtBottom = Math.abs((container.scrollHeight - container.scrollTop - container.clientHeight)) < 10;
    if (isAtBottom) {
        bottomFade.classList.add('hidden');
    }
    else {
        bottomFade.classList.remove('hidden');
    }
}
/**
 * Creates a debounced version of a function
 * @param func The function to debounce
 * @param wait The debounce wait time in milliseconds
 */
function debounce(func, wait) {
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
 * Sets up the fade effects for the viewport container
 * Shows/hides the top and bottom fade effects based on scroll position
 */
export function setupScrollFadeEffects() {
    var _a;
    // Target only the backgrounds section
    const backgroundsSection = document.getElementById('backgrounds');
    if (!backgroundsSection) {
        console.error('Backgrounds section not found');
        return;
    }
    // Find elements within the backgrounds section scope
    const viewportContainer = backgroundsSection.querySelector('.viewport-container');
    const topFade = backgroundsSection.querySelector('.fade-overlay.fade-top');
    const bottomFade = backgroundsSection.querySelector('.fade-overlay.fade-bottom');
    if (!viewportContainer || !topFade || !bottomFade) {
        console.error('Required elements for fade effects not found');
        return;
    }
    // Clean up previous event listeners before adding new ones
    // First, create a clone without any listeners
    const newViewportContainer = viewportContainer.cloneNode(false);
    while (viewportContainer.firstChild) {
        newViewportContainer.appendChild(viewportContainer.firstChild);
    }
    (_a = viewportContainer.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newViewportContainer, viewportContainer);
    // Now work with the new clean container
    const updatedContainer = backgroundsSection.querySelector('.viewport-container');
    // Apply initial fade states based on content
    updateFadeEffects(updatedContainer, topFade, bottomFade);
    // Create debounced handlers for better performance
    const debouncedScrollHandler = debounce(() => {
        updateFadeEffects(updatedContainer, topFade, bottomFade);
    }, 10); // Small debounce to improve scroll performance
    const debouncedResizeHandler = debounce(() => {
        updateFadeEffects(updatedContainer, topFade, bottomFade);
    }, 100); // Longer debounce for resize events
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
 * Creates a "no backgrounds" message element for empty state
 * @returns The message element
 */
export function createNoBackgroundsMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'col-12 text-center py-5';
    messageDiv.innerHTML = `
        <i class="bx bx-image fs-1 text-muted mb-3"></i>
        <h5>No Background Images</h5>
        <p class="text-muted">Upload your own images or wait for new system backgrounds.</p>
    `;
    return messageDiv;
}
//# sourceMappingURL=viewport-utils.js.map