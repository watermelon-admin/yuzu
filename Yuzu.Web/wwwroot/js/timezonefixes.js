/**
 * Time zone section modal integration
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
    
    // Set up click handler for the "Add Time Zones" button
    document.addEventListener("DOMContentLoaded", function() {
        const addButton = document.getElementById('add-time-zones-button');
        if (addButton) {
            addButton.addEventListener('click', function(event) {
                event.preventDefault();
                openTimeZoneModal();
            });
        }
    });
})();