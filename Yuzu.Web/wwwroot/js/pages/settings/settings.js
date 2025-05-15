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
        // Remove active and fade-out classes immediately (prevents flickering)
        // Use requestAnimationFrame to ensure it happens after the browser's next paint
        requestAnimationFrame(() => {
            activeContainer.classList.remove('active', 'fade-out');
        });
    }
    // Make the target container visible immediately
    // Use requestAnimationFrame to ensure it happens right after removing the previous container
    requestAnimationFrame(() => {
        // Make the target container visible
        targetContainer.classList.add('active');
        // Add fade-in animation class
        targetContainer.classList.add('fade-in');
        // After animation completes, just remove the fade-in class
        // Use requestAnimationFrame to ensure smooth transitions
        requestAnimationFrame(() => {
            var _a, _b, _c;
            // Ensure any viewport container gets its fade effects updated
            if (tabId === 'backgrounds' || tabId === 'time-zones' || tabId === 'break-types' || tabId === 'membership') {
                console.log(`Switched to ${tabId} tab`);
                // Force update of fade effects for the tab's viewport containers
                const viewportContainer = targetContainer.querySelector('.viewport-container');
                const topFade = targetContainer.querySelector('.fade-overlay.fade-top');
                const bottomFade = targetContainer.querySelector('.fade-overlay.fade-bottom');
                if (viewportContainer && topFade && bottomFade) {
                    // Import common function from window namespace
                    const setupScrollFadeEffects = (_c = (_b = (_a = window.Yuzu) === null || _a === void 0 ? void 0 : _a.Settings) === null || _b === void 0 ? void 0 : _b.viewportUtils) === null || _c === void 0 ? void 0 : _c.setupScrollFadeEffects;
                    if (typeof setupScrollFadeEffects === 'function') {
                        setupScrollFadeEffects(tabId);
                    }
                }
            }
            // Remove the fade-in class to finalize the transition
            setTimeout(() => {
                targetContainer.classList.remove('fade-in');
            }, 50); // Short delay to ensure transition completes
        });
    });
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
    // Priority order for determining which tab to show:
    // 1. Hash in URL (takes precedence when page is reloaded)
    // 2. Initial section from hidden input (used on first load)
    // 3. Default to 'account-details' as fallback
    if (window.location.hash) {
        // If URL has hash, use it (for page reloads)
        const hash = window.location.hash.substring(1);
        switchToTab(hash);
    }
    else {
        // Otherwise use the initial section from hidden input or default
        const initialSectionInput = document.getElementById('initial-section');
        const initialSection = (initialSectionInput === null || initialSectionInput === void 0 ? void 0 : initialSectionInput.value) || 'account-details';
        switchToTab(initialSection);
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