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
    
    // Set up handlers when DOM is loaded
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