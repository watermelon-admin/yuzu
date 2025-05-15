// src/pages/settings/time-zones/weather-utils.ts
/**
 * Updates weather information on a time zone card with the appropriate weather icon
 * Key fix: This method ensures weather information is shown correctly on time zone cards
 * @param timeZone The time zone data with weather information
 * @param cardElement The element containing the card (could be the card itself, card body, or a wrapper)
 */
export function updateWeatherInfoOnCard(timeZone, cardElement) {
    // Get the card element data attribute to verify we're operating on the right card
    const cardId = cardElement.getAttribute ? cardElement.getAttribute('data-timezone-id') : null;
    // When using templates with DocumentFragment, we need to find the proper container
    let targetElement = cardElement;
    // If this element doesn't have data-timezone-id, try to find the parent that does
    if (cardId !== timeZone.zoneId) {
        // First, if it's the card content, try to find its parent with data-timezone-id
        let parent = cardElement.closest('[data-timezone-id]');
        if (parent && parent.getAttribute('data-timezone-id') === timeZone.zoneId) {
            targetElement = parent;
        }
        else {
            // If the element has children, check if any of them have the right data-timezone-id
            const child = cardElement.querySelector(`[data-timezone-id="${timeZone.zoneId}"]`);
            if (child) {
                targetElement = child;
            }
        }
    }
    // Re-check the card ID after finding the target element
    const targetId = targetElement.getAttribute ? targetElement.getAttribute('data-timezone-id') : null;
    const cardPath = targetId === timeZone.zoneId ? 'correct-card' : 'WRONG-CARD';
    // First, try to find the weather info element
    const weatherInfoElement = targetElement.querySelector('.card-weather-info');
    if (!weatherInfoElement) {
        // Try looking for it in the child elements (especially for DocumentFragment)
        const card = targetElement.querySelector('.card');
        if (card) {
            const weatherInCard = card.querySelector('.card-weather-info');
            if (weatherInCard) {
                updateWeatherContent(timeZone, weatherInCard, cardPath);
                return;
            }
        }
        return;
    }
    updateWeatherContent(timeZone, weatherInfoElement, cardPath);
}
/**
 * Helper method to update weather content with appropriate icon
 * This is extracted from updateWeatherInfoOnCard to avoid code duplication
 */
export function updateWeatherContent(timeZone, weatherInfoElement, cardPath) {
    // Cast to HTMLElement to access style properties
    const htmlElement = weatherInfoElement;
    // Check if we have valid weather information
    if (timeZone.weatherInfo && timeZone.weatherInfo.length > 0) {
        // Make sure the element is visible
        htmlElement.classList.remove('d-none');
        // Log the computed style to check if it's actually visible
        try {
            const computedStyle = window.getComputedStyle(htmlElement);
        }
        catch (error) {
        }
        // Add weather icon based on the weather description
        const weatherText = timeZone.weatherInfo.toLowerCase();
        let weatherIcon = '';
        if (weatherText.includes('clear') || weatherText.includes('sunny')) {
            weatherIcon = '<i class="bx bx-sun me-1"></i>';
        }
        else if (weatherText.includes('cloud')) {
            weatherIcon = '<i class="bx bx-cloud me-1"></i>';
        }
        else if (weatherText.includes('rain') || weatherText.includes('drizzle') || weatherText.includes('showers')) {
            weatherIcon = '<i class="bx bx-cloud-rain me-1"></i>';
        }
        else if (weatherText.includes('snow')) {
            weatherIcon = '<i class="bx bx-cloud-snow me-1"></i>';
        }
        else if (weatherText.includes('thunder')) {
            weatherIcon = '<i class="bx bx-cloud-lightning me-1"></i>';
        }
        else if (weatherText.includes('fog')) {
            weatherIcon = '<i class="bx bx-cloud-light-rain me-1"></i>';
        }
        else {
            weatherIcon = '<i class="bx bx-cloud me-1"></i>';
        }
        // Set the HTML directly with the weather icon
        const newContent = `${weatherIcon} ${timeZone.weatherInfo}`;
        htmlElement.innerHTML = newContent;
        // Remove any display:none that might be from CSS
        htmlElement.style.removeProperty('display');
        // Add animation class if not already present
        htmlElement.classList.add('animate-in');
        // Ensure visibility with multiple approaches
        htmlElement.style.display = 'block';
        htmlElement.style.visibility = 'visible';
        htmlElement.style.opacity = '1';
        // Override any conflicting styles - but keep animation properties
        htmlElement.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important');
    }
    else {
        htmlElement.classList.add('d-none');
    }
}
/**
 * Sets up a mutation observer to ensure weather information is displayed correctly
 * when new time zone cards are added to the DOM
 */
export function setupWeatherDisplayObserver() {
    // Function to process newly added cards and ensure weather info is displayed
    const processWeatherElements = (addedNodes) => {
        // Check each added node for weather elements
        Array.from(addedNodes).forEach((node) => {
            if (!(node instanceof HTMLElement))
                return;
            // If this is a card or contains cards
            const weatherElements = node.querySelectorAll('.card-weather-info');
            weatherElements.forEach(element => {
                const weatherElement = element;
                const content = weatherElement.textContent || '';
                // If it has weather content but is hidden, make it visible
                if (content && content.trim() !== '') {
                    // Remove d-none class
                    weatherElement.classList.remove('d-none');
                    // Apply direct styles to ensure visibility
                    weatherElement.style.display = 'block';
                    weatherElement.style.visibility = 'visible';
                    weatherElement.style.opacity = '1';
                    // Add animation class
                    weatherElement.classList.add('animate-in');
                    // Add weather icon if not present
                    if (!weatherElement.querySelector('i.bx')) {
                        const weatherText = content.toLowerCase();
                        let iconClass = 'bx-cloud';
                        if (weatherText.includes('clear') || weatherText.includes('sunny')) {
                            iconClass = 'bx-sun';
                        }
                        else if (weatherText.includes('rain') || weatherText.includes('drizzle')) {
                            iconClass = 'bx-cloud-rain';
                        }
                        const icon = document.createElement('i');
                        icon.className = `bx ${iconClass} me-1`;
                        weatherElement.insertBefore(icon, weatherElement.firstChild);
                    }
                }
                else {
                    weatherElement.classList.add('d-none');
                }
            });
        });
    };
    // Create a mutation observer to watch for new cards
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                processWeatherElements(mutation.addedNodes);
            }
        });
    });
    // Start observing the container for added cards
    const container = document.getElementById('time-zone-container');
    if (container) {
        observer.observe(container, { childList: true, subtree: true });
    }
    else {
        // If container doesn't exist yet, wait and try again
        setTimeout(() => {
            const delayedContainer = document.getElementById('time-zone-container');
            if (delayedContainer) {
                observer.observe(delayedContainer, { childList: true, subtree: true });
            }
        }, 1000);
    }
}
//# sourceMappingURL=weather-utils.js.map