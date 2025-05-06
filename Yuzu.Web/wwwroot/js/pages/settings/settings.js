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
export function switchToTab(tabId) {
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
export function initTabSwitching() {
    // Get the initial section from hidden input or default to 'account-details'
    const initialSectionInput = document.getElementById('initial-section');
    const initialSection = (initialSectionInput === null || initialSectionInput === void 0 ? void 0 : initialSectionInput.value) || 'account-details';
    // Switch to the initial tab
    switchToTab(initialSection);
    // Add click event listeners to menu items
    const menuItems = document.querySelectorAll('#account-menu a[href^="#"]');
    menuItems.forEach(item => {
        item.addEventListener('click', (event) => {
            // Prevent default behavior (scrolling to anchor)
            event.preventDefault();
            // Extract the tab ID from the href attribute
            const href = item.getAttribute('href') || '';
            const tabId = href.substring(1); // Remove the # character
            // Switch to the selected tab
            switchToTab(tabId);
            // Update URL without causing scroll (using history API)
            if (history.pushState) {
                history.pushState(null, '', `#${tabId}`);
            }
        });
    });
    // Handle initial hash (if present in URL)
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        switchToTab(hash);
    }
}
/**
 * Initializes all section modules
 */
export function initSections() {
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
function hidePageLoader() {
    // Find the page loader
    const pageLoader = document.querySelector('.page-loading');
    if (!pageLoader)
        return;
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
export function initSettings() {
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
window.initSettings = initSettings;
window.switchToTab = switchToTab;
window.Yuzu = window.Yuzu || {};
window.Yuzu.Settings = window.Yuzu.Settings || {};
window.Yuzu.Settings.Main = {
    init: initSettings,
    switchToTab: switchToTab
};
//# sourceMappingURL=settings.js.map