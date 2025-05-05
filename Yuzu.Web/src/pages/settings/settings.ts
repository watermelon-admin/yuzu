// src/pages/settings/settings.ts

// Import all section modules
import { initAccountDetails } from './account-details/index.js';
import { initBreakTypes } from './break-types/index.js';
import { initTimeZones } from './time-zones/index.js';
import { initBackgrounds } from './backgrounds/index.js';
import { initMembership } from './membership/index.js';
import './break-types/wizard.js'; // Import the break type wizard

/**
 * Switches to the specified settings tab
 * @param tabId - The ID of the tab to switch to
 */
export function switchToTab(tabId: string): void {
        console.debug(`Switching to tab: ${tabId}`);

        // Hide all content containers by removing active class
        const containers = document.querySelectorAll('.settings-content-container');
        containers.forEach(container => {
            container.classList.remove('active');
        });

        // Show the selected container by adding active class
        const selectedContainer = document.getElementById(tabId);
        if (selectedContainer) {
            selectedContainer.classList.add('active');
        }

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
        // Get the initial section from hidden input or default to 'account-details'
        const initialSectionInput = document.getElementById('initial-section') as HTMLInputElement;
        const initialSection = initialSectionInput?.value || 'account-details';

        // Switch to the initial tab
        switchToTab(initialSection);

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

        // Handle initial hash (if present in URL)
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            switchToTab(hash);
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
     * Initializes the settings page functionality
     */
    export function initSettings(): void {
        console.debug('Settings page initialized');

        // Initialize tab switching
        initTabSwitching();

        // Initialize all section modules
        initSections();
    }

    // Initialize the page when loaded
    document.addEventListener('DOMContentLoaded', () => {
        initSettings();
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