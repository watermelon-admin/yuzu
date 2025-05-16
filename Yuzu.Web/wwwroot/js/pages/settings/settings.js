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
 * Since all data is pre-loaded, this function ONLY handles UI visibility
 * @param tabId - The ID of the tab to switch to
 */
export function switchToTab(tabId) {
    console.log(`🔄 Switching to tab: ${tabId}`);
    console.time(`Tab switch to ${tabId}`);
    // Get the currently active container
    const activeContainer = document.querySelector('.settings-content-container.active');
    // Get the container we want to show
    const targetContainer = document.getElementById(tabId);
    if (!targetContainer) {
        console.error(`Target container with ID ${tabId} not found`);
        return;
    }
    // Measure how long the switch takes
    const startTime = performance.now();
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
            // Only update fade effects - NO DATA LOADING should happen here
            // since all data is already loaded during page initialization
            if (tabId === 'backgrounds' || tabId === 'time-zones' || tabId === 'break-types' || tabId === 'membership') {
                const viewportContainer = targetContainer.querySelector('.viewport-container');
                const topFade = targetContainer.querySelector('.fade-overlay.fade-top');
                const bottomFade = targetContainer.querySelector('.fade-overlay.fade-bottom');
                if (viewportContainer && topFade && bottomFade) {
                    // Just trigger a scroll event to update fade effects
                    viewportContainer.dispatchEvent(new Event('scroll'));
                    // We don't need to call setupScrollFadeEffects again
                    // since it's been set up during initialization
                }
            }
            // Remove the fade-in class to finalize the transition
            setTimeout(() => {
                targetContainer.classList.remove('fade-in');
                // Log how long the switch took
                const endTime = performance.now();
                console.log(`✅ Tab switch to ${tabId} complete in ${(endTime - startTime).toFixed(2)}ms`);
                console.timeEnd(`Tab switch to ${tabId}`);
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
    console.log('Initializing tab switching functionality');
    // Add click event listeners to menu items
    const menuItems = document.querySelectorAll('#account-menu a[href^="#"]');
    console.log(`Found ${menuItems.length} menu items for tab switching`);
    menuItems.forEach(item => {
        item.addEventListener('click', (event) => {
            // Prevent default behavior (scrolling to anchor)
            event.preventDefault();
            // Extract the tab ID from the href attribute
            const href = item.getAttribute('href') || '';
            const tabId = href.substring(1); // Remove the # character
            // Performance measurement - log click to switch start time
            console.log(`🖱️ User clicked tab: ${tabId}`);
            console.time(`Total tab switch with UI updates: ${tabId}`);
            const switchStartTime = performance.now();
            // Switch to the selected tab
            switchToTab(tabId);
            // Update URL without causing scroll (using history API)
            if (history.pushState) {
                history.pushState(null, '', `#${tabId}`);
            }
            // Log full switch time (including UI updates) - this happens before animation completes
            const switchEndTime = performance.now();
            console.log(`⚡ Tab switch to ${tabId} took ${(switchEndTime - switchStartTime).toFixed(2)}ms`);
            console.timeEnd(`Total tab switch with UI updates: ${tabId}`);
        });
    });
    // Priority order for determining which tab to show:
    // 1. Hash in URL (takes precedence when page is reloaded)
    // 2. Initial section from hidden input (used on first load)
    // 3. Default to 'account-details' as fallback
    console.log('Determining initial tab to show');
    let initialTab;
    if (window.location.hash) {
        // If URL has hash, use it (for page reloads)
        initialTab = window.location.hash.substring(1);
        console.log(`Using hash from URL: ${initialTab}`);
    }
    else {
        // Otherwise use the initial section from hidden input or default
        const initialSectionInput = document.getElementById('initial-section');
        initialTab = (initialSectionInput === null || initialSectionInput === void 0 ? void 0 : initialSectionInput.value) || 'account-details';
        console.log(`Using initial section from input: ${initialTab}`);
    }
    // Switch to the initial tab
    switchToTab(initialTab);
    console.log(`✅ Initial tab set to: ${initialTab}`);
}
/**
 * Loads all data for all sections synchronously
 * This ensures all data is loaded while the central spinner is visible
 */
async function loadAllSectionData() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    console.log('========== STARTING DATA PRELOAD FOR ALL SECTIONS ==========');
    console.time('Total preload time');
    // Time Zones
    console.log('🕒 Starting Time Zones data load...');
    console.time('Time Zones preload');
    try {
        if ((_c = (_b = (_a = window.Yuzu) === null || _a === void 0 ? void 0 : _a.Settings) === null || _b === void 0 ? void 0 : _b.TimeZones) === null || _c === void 0 ? void 0 : _c.loadTimeZonesData) {
            await window.Yuzu.Settings.TimeZones.loadTimeZonesData();
            // Verify time zones data is loaded by checking for rendered cards
            const timeZonesContainer = document.getElementById('time-zone-container');
            const timeZoneCards = (timeZonesContainer === null || timeZonesContainer === void 0 ? void 0 : timeZonesContainer.querySelectorAll('.settings-card')) || [];
            console.log(`✅ Time Zones preload complete. Rendered ${timeZoneCards.length} time zone cards.`);
        }
        else {
            console.warn('⚠️ Time Zones loader function not found');
        }
    }
    catch (error) {
        console.error('❌ Error loading Time Zones data:', error);
    }
    console.timeEnd('Time Zones preload');
    // Backgrounds
    console.log('🖼️ Starting Backgrounds data load...');
    console.time('Backgrounds preload');
    try {
        if ((_f = (_e = (_d = window.Yuzu) === null || _d === void 0 ? void 0 : _d.Settings) === null || _e === void 0 ? void 0 : _e.Backgrounds) === null || _f === void 0 ? void 0 : _f.loadBackgroundImages) {
            await window.Yuzu.Settings.Backgrounds.loadBackgroundImages();
            // Verify backgrounds data is loaded by checking for rendered cards
            const bgContainer = document.getElementById('backgrounds-gallery-container');
            const bgCards = (bgContainer === null || bgContainer === void 0 ? void 0 : bgContainer.querySelectorAll('.background-card')) || [];
            console.log(`✅ Backgrounds preload complete. Rendered ${bgCards.length} background cards.`);
        }
        else {
            console.warn('⚠️ Backgrounds loader function not found');
        }
    }
    catch (error) {
        console.error('❌ Error loading Backgrounds data:', error);
    }
    console.timeEnd('Backgrounds preload');
    // Break Types
    console.log('⏸️ Starting Break Types data load...');
    console.time('Break Types preload');
    try {
        if ((_j = (_h = (_g = window.Yuzu) === null || _g === void 0 ? void 0 : _g.Settings) === null || _h === void 0 ? void 0 : _h.BreakTypes) === null || _j === void 0 ? void 0 : _j.loadBreakTypes) {
            await window.Yuzu.Settings.BreakTypes.loadBreakTypes();
            // Verify break types data is loaded by checking for rendered cards
            const breakTypesContainer = document.getElementById('break-type-container');
            const breakTypeCards = (breakTypesContainer === null || breakTypesContainer === void 0 ? void 0 : breakTypesContainer.querySelectorAll('.settings-card')) || [];
            console.log(`✅ Break Types preload complete. Rendered ${breakTypeCards.length} break type cards.`);
        }
        else {
            console.warn('⚠️ Break Types loader function not found');
        }
    }
    catch (error) {
        console.error('❌ Error loading Break Types data:', error);
    }
    console.timeEnd('Break Types preload');
    // Ensure all data containers are properly marked as loaded
    document.querySelectorAll('[data-loaded]').forEach(element => {
        element.setAttribute('data-loaded', 'true');
    });
    console.timeEnd('Total preload time');
    console.log('========== ALL SECTION DATA PRELOADED SUCCESSFULLY ==========');
}
/**
 * Initializes all section modules
 */
export function initSections() {
    // Initialize all section modules first
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
 * Wait for a specified time period
 * @param ms Time to wait in milliseconds
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Initializes the settings page functionality
 */
export async function initSettings() {
    console.log('========== SETTINGS PAGE INITIALIZATION ==========');
    console.time('Total initialization time');
    // Initialize tab switching and sections
    initTabSwitching();
    initSections();
    // Load all data for all sections first
    // This happens while the main page loader is still visible
    try {
        await loadAllSectionData();
        // Wait a short delay to ensure browser has time to render everything
        console.log('⏱️ Final rendering delay for browser to catch up...');
        await delay(200); // Short delay to ensure rendering is complete
        // Double-check all sections are marked as loaded
        const containers = document.querySelectorAll('.settings-content-container');
        containers.forEach(container => {
            const contentContainer = container.querySelector('[data-loaded]');
            if (contentContainer) {
                contentContainer.setAttribute('data-loaded', 'true');
            }
        });
        console.log('✅ All sections verified as loaded and rendered');
    }
    catch (error) {
        console.error('❌ Error during initialization:', error);
    }
    // Now that all data is loaded and rendered, hide the page loader
    hidePageLoader();
    console.log('✅ Page loader hidden, content now visible to user');
    console.timeEnd('Total initialization time');
    console.log('========== SETTINGS PAGE INITIALIZATION COMPLETE ==========');
}
// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired, starting settings initialization');
    // Start initializing the page - will load all data and hide the loader when done
    initSettings().catch(error => {
        console.error('❌ Error during settings initialization:', error);
        // Make sure page loader is hidden even if there's an error
        hidePageLoader();
    });
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