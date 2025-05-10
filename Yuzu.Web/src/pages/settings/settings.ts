// src/pages/settings/settings.ts

// Import all section modules
import { initAccountDetails } from './account-details/index.js';
import { initBreakTypes } from './break-types/index.js';
import { initTimeZones } from './time-zones/index.js';
import { initBackgrounds } from './backgrounds/index.js';
import { initMembership } from './membership/index.js';
import './break-types/wizard.js'; // Import the break type wizard

/**
 * Switches to the specified settings tab with smooth fade transitions
 * @param tabId - The ID of the tab to switch to
 */
export function switchToTab(tabId: string): void {
    console.debug(`Switching to tab: ${tabId}`);
    
    // Get all content containers
    const containers = document.querySelectorAll('.settings-content-container');
    
    // Get the currently active container
    const activeContainer = document.querySelector('.settings-content-container.active');
    
    // Get the container we want to show
    const targetContainer = document.getElementById(tabId);
    
    if (!targetContainer) {
        console.error(`Target container with ID ${tabId} not found`);
        return;
    }
    
    // Define the transition timing
    const transitionDuration = 300; // milliseconds (matches CSS)
    
    // Fade out the current active container if one exists
    if (activeContainer) {
        // Add fade-out animation class
        activeContainer.classList.add('fade-out');
        
        // After animation completes, remove active and fade-out classes
        setTimeout(() => {
            activeContainer.classList.remove('active', 'fade-out');
        }, transitionDuration);
    }
    
    // Fade in the target container after a slight delay
    setTimeout(() => {
        // Make the target container visible but still faded out
        targetContainer.classList.add('active');
        
        // Add fade-in animation class
        targetContainer.classList.add('fade-in');
        
        // After animation completes, remove the fade-in class
        setTimeout(() => {
            targetContainer.classList.remove('fade-in');
        }, transitionDuration);
    }, activeContainer ? transitionDuration : 0); // Add delay only if fading out another tab
    
    // Update active state in menu
    const menuItems = document.querySelectorAll('#account-menu a.list-group-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Find the menu item with href matching the tabId and make it active
    const activeMenuItem = document.querySelector(`#account-menu a[href="#${tabId}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
}

    /**
     * Initializes the tab switching functionality for the settings page
     */
    export function initTabSwitching(): void {
        // Add click event listeners to menu items
        const menuItems = document.querySelectorAll('#account-menu a[href^="#"]');
        menuItems.forEach(item => {
            item.addEventListener('click', (event) => {
                // Prevent default behavior (scrolling to anchor)
                event.preventDefault();

                // Extract the tab ID from the href attribute
                const href = (item as HTMLAnchorElement).getAttribute('href') || '';
                const tabId = href.substring(1); // Remove the # character

                // Switch to the selected tab
                switchToTab(tabId);

                // Update URL without causing scroll (using history API)
                if (history.pushState) {
                    history.pushState(null, '', `#${tabId}`);
                }
            });
        });

        // Priority order for determining which tab to show:
        // 1. Hash in URL (takes precedence when page is reloaded)
        // 2. Initial section from hidden input (used on first load)
        // 3. Default to 'account-details' as fallback

        if (window.location.hash) {
            // If URL has hash, use it (for page reloads)
            const hash = window.location.hash.substring(1);
            switchToTab(hash);
        } else {
            // Otherwise use the initial section from hidden input or default
            const initialSectionInput = document.getElementById('initial-section') as HTMLInputElement;
            const initialSection = initialSectionInput?.value || 'account-details';
            switchToTab(initialSection);
        }
    }

    /**
     * Initializes all section modules
     */
    export function initSections(): void {
        // Initialize all section modules
        initAccountDetails();
        initBreakTypes();
        initTimeZones();
        initBackgrounds();
        initMembership();
    }

    /**
     * Hides the page loading spinner with a fade effect
     */
    function hidePageLoader(): void {
        // Find the page loader
        const pageLoader = document.querySelector('.page-loading');
        if (!pageLoader) return;
        
        // Add a class to start the fade out
        pageLoader.classList.add('fade-out');
        
        // After animation completes, remove the active class
        setTimeout(() => {
            pageLoader.classList.remove('active');
        }, 300);
    }
    
    /**
     * Initializes the settings page functionality
     */
    export function initSettings(): void {
        console.debug('Settings page initialized');

        // Initialize tab switching
        initTabSwitching();

        // Initialize all section modules
        initSections();
        
        // Hide the page loader
        hidePageLoader();
    }

    // Initialize the page when loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Start initializing the page
        initSettings();
        
        // Remove the page loader after a slight delay
        // to ensure animations run smoothly
        setTimeout(() => {
            // This is a redundant call in case the loader wasn't hidden in initSettings
            hidePageLoader();
        }, 500);
    });

    // Make functions available globally
    (window as any).initSettings = initSettings;
    (window as any).switchToTab = switchToTab;
    (window as any).Yuzu = (window as any).Yuzu || {};
    (window as any).Yuzu.Settings = (window as any).Yuzu.Settings || {};
    (window as any).Yuzu.Settings.Main = {
        init: initSettings,
        switchToTab: switchToTab
    };