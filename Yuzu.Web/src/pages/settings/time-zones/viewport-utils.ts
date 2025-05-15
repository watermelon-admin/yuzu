import { 
    setupScrollFadeEffects as sharedSetupScrollFadeEffects, 
    animateCardRemoval as sharedAnimateCardRemoval, 
    scrollCardIntoView as sharedScrollCardIntoView 
} from '../shared/viewport-utils.js';

/**
 * Sets up scroll fade effects for the time zones section
 */
export function setupScrollFadeEffects(): void {
    console.log('[DEBUG] TimeZones.viewport-utils.setupScrollFadeEffects - START');
    
    // Before setup, check the DOM state
    const container = document.getElementById('timezones-viewport-container');
    const topFade = document.querySelector('#time-zones .fade-overlay.fade-top');
    const bottomFade = document.querySelector('#time-zones .fade-overlay.fade-bottom');
    
    console.log('[DEBUG] TimeZones.viewport-utils.setupScrollFadeEffects - DOM before setup:', {
        container: {
            exists: !!container,
            id: container?.id,
            classes: container ? Array.from(container.classList) : [],
            style: container ? container.getAttribute('style') : null,
            computedStyle: container ? {
                overflowY: window.getComputedStyle(container).overflowY,
                height: window.getComputedStyle(container).height,
                display: window.getComputedStyle(container).display
            } : null
        },
        topFade: {
            exists: !!topFade,
            classes: topFade ? Array.from(topFade.classList) : [],
            computedStyle: topFade ? {
                opacity: window.getComputedStyle(topFade).opacity,
                display: window.getComputedStyle(topFade).display
            } : null
        },
        bottomFade: {
            exists: !!bottomFade,
            classes: bottomFade ? Array.from(bottomFade.classList) : [],
            computedStyle: bottomFade ? {
                opacity: window.getComputedStyle(bottomFade).opacity,
                display: window.getComputedStyle(bottomFade).display
            } : null
        }
    });
    
    // Call shared setup function
    sharedSetupScrollFadeEffects('time-zones');
    
    // After setup, check DOM again to see what changed
    setTimeout(() => {
        console.log('[DEBUG] TimeZones.viewport-utils.setupScrollFadeEffects - DOM after setup:', {
            container: {
                exists: !!container,
                style: container ? container.getAttribute('style') : null,
                computedStyle: container ? {
                    overflowY: window.getComputedStyle(container).overflowY,
                    height: window.getComputedStyle(container).height,
                    display: window.getComputedStyle(container).display
                } : null
            },
            topFade: {
                exists: !!topFade,
                classes: topFade ? Array.from(topFade.classList) : [],
                computedStyle: topFade ? {
                    opacity: window.getComputedStyle(topFade).opacity,
                    display: window.getComputedStyle(topFade).display
                } : null
            },
            bottomFade: {
                exists: !!bottomFade,
                classes: bottomFade ? Array.from(bottomFade.classList) : [],
                computedStyle: bottomFade ? {
                    opacity: window.getComputedStyle(bottomFade).opacity,
                    display: window.getComputedStyle(bottomFade).display
                } : null
            }
        });
    }, 100);
    
    console.log('[DEBUG] TimeZones.viewport-utils.setupScrollFadeEffects - END');
}

/**
 * Animates the removal of a time zone card from the DOM
 * @param cardElement The card element to remove
 */
export function animateCardRemoval(cardElement: HTMLElement): void {
    sharedAnimateCardRemoval(cardElement, 'time-zones');
}

/**
 * Scrolls a newly added time zone card into view
 * @param cardElement The card element to scroll into view
 */
export function scrollToNewCard(cardElement: HTMLElement | null): void {
    sharedScrollCardIntoView(cardElement, 'timezones-viewport-container');
}