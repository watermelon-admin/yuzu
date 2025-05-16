/**
 * Time zone section modal integration 
 * 
 * IMPORTANT: This file should be minimally invasive and ONLY handle the click event
 * for the Add Time Zones button. All other time zone functionality is handled by
 * the TimeZonesManager in the src/pages/settings/time-zones/index.ts file.
 * 
 * This file should NOT manipulate the DOM, modify the time zones container,
 * or interfere with the data loading process.
 */
(function() {
    // Function to open the time zone modal using the TimeZonesManager
    window.openTimeZoneModal = function() {
        // Use the TimeZonesManager instance which is already working
        if (window.Yuzu && window.Yuzu.Settings && window.Yuzu.Settings.TimeZones) {
            const manager = window.Yuzu.Settings.TimeZones.getInstance();
            if (manager && typeof manager.showTimeZonesModal === 'function') {
                manager.showTimeZonesModal();
            }
        }
    };
    
    // Set up handlers when DOM is loaded - ONLY handle the click event
    document.addEventListener("DOMContentLoaded", function() {
        // Set up the Add Time Zones button
        const addButton = document.getElementById('add-time-zones-button');
        if (addButton) {
            addButton.addEventListener('click', function(event) {
                event.preventDefault();
                openTimeZoneModal();
            });
        }
    });
})();