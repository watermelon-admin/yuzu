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
    // Check if scrollable in either direction
    const isScrollable = container.scrollHeight > container.clientHeight + 20; // Add a small buffer
    // Get scroll positions
    const scrollTop = container.scrollTop;
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    console.log('Updating fade effects:', {
        containerHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
        isScrollable,
        scrollTop,
        scrollBottom
    });
    if (!isScrollable) {
        // Not scrollable, hide both fades
        console.log('Content not scrollable, hiding both fade overlays');
        topFade.classList.add('hidden');
        bottomFade.classList.add('hidden');
        return;
    }
    // Handle top fade
    if (scrollTop <= 10) {
        console.log('At top of content, hiding top fade');
        topFade.classList.add('hidden');
    }
    else {
        console.log('Scrolled down, showing top fade');
        topFade.classList.remove('hidden');
    }
    // Handle bottom fade
    if (scrollBottom <= 10) {
        console.log('At bottom of content, hiding bottom fade');
        bottomFade.classList.add('hidden');
    }
    else {
        console.log('Not at bottom, showing bottom fade');
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
    console.log('Setting up scroll fade effects');
    // First, let's make sure we're only targeting the backgrounds section
    const backgroundsSection = document.getElementById('backgrounds');
    if (!backgroundsSection) {
        console.error('Backgrounds section not found');
        return;
    }
    // Find elements within the backgrounds section scope
    const viewportContainer = backgroundsSection.querySelector('.viewport-container');
    const topFade = backgroundsSection.querySelector('.fade-overlay.fade-top');
    const bottomFade = backgroundsSection.querySelector('.fade-overlay.fade-bottom');
    if (!viewportContainer) {
        console.error('Viewport container element not found in backgrounds section');
        // Do a global search to see if it exists elsewhere
        const anyContainer = document.querySelector('.viewport-container');
        console.log('Global viewport container search result:', anyContainer);
        return;
    }
    if (!topFade) {
        console.error('Top fade overlay element not found in backgrounds section');
        return;
    }
    if (!bottomFade) {
        console.error('Bottom fade overlay element not found in backgrounds section');
        return;
    }
    console.log('All required elements found:', {
        viewportContainerId: viewportContainer.id,
        viewportContainerClasses: viewportContainer.className,
        topFadeClasses: topFade.className,
        bottomFadeClasses: bottomFade.className,
        isTopFadeHidden: topFade.classList.contains('hidden'),
        isBottomFadeHidden: bottomFade.classList.contains('hidden')
    });
    // Log current dimensions
    console.log('Container dimensions:', {
        clientHeight: viewportContainer.clientHeight,
        scrollHeight: viewportContainer.scrollHeight,
        isScrollable: viewportContainer.scrollHeight > viewportContainer.clientHeight
    });
    // Remove previous listeners if any by replacing with cloned elements
    const newViewportContainer = viewportContainer.cloneNode(false);
    while (viewportContainer.firstChild) {
        newViewportContainer.appendChild(viewportContainer.firstChild);
    }
    (_a = viewportContainer.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newViewportContainer, viewportContainer);
    // Now work with the new clean container
    const updatedContainer = backgroundsSection.querySelector('.viewport-container');
    // Apply initial fade states based on content
    console.log('Applying initial fade states');
    updateFadeEffects(updatedContainer, topFade, bottomFade);
    // Create debounced handlers for better performance
    const debouncedScrollHandler = debounce(() => {
        console.log('Scroll event triggered');
        updateFadeEffects(updatedContainer, topFade, bottomFade);
    }, 10); // Small debounce to improve scroll performance
    const debouncedResizeHandler = debounce(() => {
        console.log('Resize event triggered');
        updateFadeEffects(updatedContainer, topFade, bottomFade);
    }, 100); // Longer debounce for resize events
    // Add scroll event listener with debounce
    console.log('Adding scroll event listener');
    updatedContainer.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    // Force a manual scroll event dispatch to ensure the listener works
    setTimeout(() => {
        console.log('Simulating scroll event');
        const scrollEvent = new Event('scroll');
        updatedContainer.dispatchEvent(scrollEvent);
    }, 100);
    console.log('Scroll event listener attached');
    // Listen for window resize events with debounce
    console.log('Adding resize event listener');
    window.addEventListener('resize', debouncedResizeHandler);
    console.log('Resize event listener attached');
    // Run another check after a short delay to ensure everything is properly initialized
    setTimeout(() => {
        console.log('Running delayed initialization check');
        updateFadeEffects(updatedContainer, topFade, bottomFade);
    }, 1000);
    console.log('Resize event listener attached');
    // Mark as having listeners attached
    viewportContainer._hasScrollListener = true;
    window._hasResizeListener = true;
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