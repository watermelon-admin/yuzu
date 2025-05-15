/**
 * Shared viewport utilities for settings sections
 * Manages fade effects when scrolling content
 */

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked
 * @param func - The function to debounce
 * @param wait - The wait time in milliseconds
 */
export function debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: number | null = null;
    
    return (...args: any[]): void => {
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
        console.log(`No overflow detected for ${container.id}, hiding fade overlays`);
        return;
    }
    
    console.log(`Content is overflowing for ${container.id}, showing fade overlays as needed`);
    
    // Content is overflowing, now check scroll position for top fade
    if (container.scrollTop <= 10) {
        topFade.classList.add('hidden');
    } else {
        topFade.classList.remove('hidden');
    }
    
    // Check if we're at the bottom
    const isAtBottom = Math.abs(
        (container.scrollHeight - container.scrollTop - container.clientHeight)
    ) < 10;
    
    // Only hide the bottom fade if we're at the bottom
    if (isAtBottom) {
        bottomFade.classList.add('hidden');
    } else {
        // Always show bottom fade otherwise
        bottomFade.classList.remove('hidden');
    }
    
    // Log the current state for debugging
    console.log(`Fade overlay states for ${container.id}: top=${topFade.classList.contains('hidden') ? 'hidden' : 'visible'}, bottom=${bottomFade.classList.contains('hidden') ? 'hidden' : 'visible'}`);
}

/**
 * Sets up scroll fade effects for a viewport
 * @param sectionId - The ID of the section (without the # symbol)
 */
export function setupScrollFadeEffects(sectionId: string): void {
    console.log(`[DEBUG] Shared.viewport-utils.setupScrollFadeEffects(${sectionId}) - START`);
    
    // Target the specific section
    const sectionElement = document.getElementById(sectionId);
    if (!sectionElement) {
        console.error(`[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Section ${sectionId} not found`);
        return;
    }
    
    // Get viewport container using section-specific ID
    const viewportContainerId = `${sectionId}-viewport-container`;
    const viewportContainer = document.getElementById(viewportContainerId) as HTMLElement;
    
    // Get fade overlays from the section
    console.log(`[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Looking for fade overlays in section #${sectionId}`);
    
    // Now all sections use a consistent structure
    const topFade = sectionElement.querySelector('.fade-overlay.fade-top') as HTMLElement;
    const bottomFade = sectionElement.querySelector('.fade-overlay.fade-bottom') as HTMLElement;
    
    // Log what we found
    console.log('[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Found elements:', {
        sectionElement: {
            id: sectionElement.id,
            classList: Array.from(sectionElement.classList)
        },
        viewportContainer: viewportContainer ? {
            id: viewportContainer.id,
            classList: Array.from(viewportContainer.classList),
            style: viewportContainer.getAttribute('style'),
            scrollHeight: viewportContainer.scrollHeight,
            clientHeight: viewportContainer.clientHeight
        } : 'not found',
        topFade: topFade ? {
            classList: Array.from(topFade.classList),
            style: topFade.getAttribute('style')
        } : 'not found',
        bottomFade: bottomFade ? {
            classList: Array.from(bottomFade.classList),
            style: bottomFade.getAttribute('style')
        } : 'not found'
    });
    
    if (!viewportContainer || !topFade || !bottomFade) {
        console.error(`[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Required elements for fade effects not found in ${sectionId}`);
        return;
    }
    
    console.log('[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Removing previous listeners by cloning container');
    // Remove previous listeners if any by replacing with cloned element
    const newViewportContainer = viewportContainer.cloneNode(false) as HTMLElement;
    while (viewportContainer.firstChild) {
        newViewportContainer.appendChild(viewportContainer.firstChild);
    }
    viewportContainer.parentNode?.replaceChild(newViewportContainer, viewportContainer);
    
    // Now work with the new clean container - get it again by ID
    const updatedContainer = document.getElementById(viewportContainerId) as HTMLElement;
    console.log('[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Container clone status:', {
        originalId: viewportContainer.id,
        newId: updatedContainer?.id, 
        isCloneValid: !!updatedContainer,
        childrenCount: updatedContainer?.childElementCount
    });
    
    // Only show scrollbar when content overflows, to match other sections
    console.log('[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Setting overflow-y: auto');
    updatedContainer.style.overflowY = 'auto';
    
    // Log important container dimensions before updating
    console.log('[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Container dimensions:', {
        scrollHeight: updatedContainer.scrollHeight,
        clientHeight: updatedContainer.clientHeight,
        isOverflowing: updatedContainer.scrollHeight > updatedContainer.clientHeight
    });
    
    // Apply initial fade states based on content
    console.log('[DEBUG] Shared.viewport-utils.setupScrollFadeEffects - Applying initial fade states');
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
    
    // Listen for content changes using MutationObserver
    const contentObserver = new MutationObserver(() => {
        updateFadeEffects(updatedContainer, topFade, bottomFade);
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
 * @param sectionId The ID of the section
 */
export function animateCardRemoval(cardElement: HTMLElement, sectionId: string): void {
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
            setupScrollFadeEffects(sectionId);
        }, 300); // Same duration as the transition
    }, 10);
}

/**
 * Scrolls a card element into view within the viewport
 * @param cardElement The card element to scroll into view
 * @param containerId The viewport container ID
 */
export function scrollCardIntoView(cardElement: HTMLElement, containerId: string): void {
    const viewportContainer = document.getElementById(containerId) as HTMLElement;
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
        if (cardRect.height > containerRect.height) {
            // If the card is too tall to fit, scroll to its top
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Otherwise, scroll to the center of the card
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}