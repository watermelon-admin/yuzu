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
export function updateFadeEffects(container: HTMLElement, topFade: HTMLElement, bottomFade: HTMLElement): void {
    // Check if scrollable in either direction
    const isScrollable = container.scrollHeight > container.clientHeight + 20; // Add a small buffer
    
    // Get scroll positions
    const scrollTop = container.scrollTop;
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    if (!isScrollable) {
        // Not scrollable, hide both fades
        topFade.classList.add('hidden');
        bottomFade.classList.add('hidden');
        return;
    }
    
    // Handle top fade
    if (scrollTop <= 10) {
        topFade.classList.add('hidden');
    } else {
        topFade.classList.remove('hidden');
    }
    
    // Handle bottom fade
    if (scrollBottom <= 10) {
        bottomFade.classList.add('hidden');
    } else {
        bottomFade.classList.remove('hidden');
    }
}

/**
 * Creates a debounced version of a function
 * @param func The function to debounce
 * @param wait The debounce wait time in milliseconds
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
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
 * Sets up the fade effects for the viewport container
 * Shows/hides the top and bottom fade effects based on scroll position
 */
export function setupScrollFadeEffects(): void {
    // Target only the backgrounds section
    const backgroundsSection = document.getElementById('backgrounds');
    if (!backgroundsSection) {
        console.error('Backgrounds section not found');
        return;
    }
    
    // Find elements within the backgrounds section scope
    const viewportContainer = backgroundsSection.querySelector('.viewport-container') as HTMLElement;
    const topFade = backgroundsSection.querySelector('.fade-overlay.fade-top') as HTMLElement;
    const bottomFade = backgroundsSection.querySelector('.fade-overlay.fade-bottom') as HTMLElement;
    
    if (!viewportContainer || !topFade || !bottomFade) {
        console.error('Required elements for fade effects not found');
        return;
    }
    
    // Remove previous listeners if any by replacing with cloned elements
    const newViewportContainer = viewportContainer.cloneNode(false) as HTMLElement;
    while (viewportContainer.firstChild) {
        newViewportContainer.appendChild(viewportContainer.firstChild);
    }
    viewportContainer.parentNode?.replaceChild(newViewportContainer, viewportContainer);
    
    // Now work with the new clean container
    const updatedContainer = backgroundsSection.querySelector('.viewport-container') as HTMLElement;
    
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
    
    // Run another check after a short delay to ensure everything is properly initialized
    setTimeout(() => {
        updateFadeEffects(updatedContainer, topFade, bottomFade);
    }, 100);
}

/**
 * Animates the removal of a card from the DOM
 * @param cardElement The card element to remove with animation
 */
export function animateCardRemoval(cardElement: HTMLElement): void {
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
            
            // Update fade effects to adapt to new content height
            setupScrollFadeEffects();
        }, 300); // Same duration as the transition
    }, 10);
}

/**
 * Creates a "no backgrounds" message element for empty state
 * @returns The message element
 */
export function createNoBackgroundsMessage(): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'col-12 text-center py-5';
    messageDiv.innerHTML = `
        <i class="bx bx-image fs-1 text-muted mb-3"></i>
        <h5>No Background Images</h5>
        <p class="text-muted">Upload your own images or wait for new system backgrounds.</p>
    `;
    return messageDiv;
}