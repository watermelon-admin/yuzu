// src/pages/settings/time-zones/card-creator.ts

import { TimeZoneInfo } from './types.js';
import { formatUtcOffset } from './time-utils.js';

// Declare global functions on window object for TypeScript
// This ensures we can check for their existence before calling them
declare global {
    interface Window {
        setHomeTimeZone: (id: string) => void;
        deleteTimeZone: (id: string) => void;
    }
}

/**
 * Creates a time zone card element based on the given time zone information
 * @param timeZone - The time zone information to create a card for
 * @param onSetHomeTimeZone - Callback for when the 'Set as Home' button is clicked
 * @param onDeleteTimeZone - Callback for when the 'Delete' button is clicked
 * @param isNewCard - Whether this is a newly added card (to display NEW tag)
 * @returns HTMLElement - The created card element
 */
export function createTimeZoneCard(
    timeZone: TimeZoneInfo,
    onSetHomeTimeZone: (id: string) => void,
    onDeleteTimeZone: (id: string) => void,
    isNewCard: boolean = false
): HTMLElement {
    // Format the UTC offset string
    const utcOffsetStr = formatUtcOffset(timeZone);

    let cardElement: HTMLElement;

    if (timeZone.isHome) {
        // Get the template for home time zone cards
        const homeTemplate = document.getElementById('home-time-zone-card-template') as HTMLTemplateElement;

        if (!homeTemplate) {
            throw new Error('Home timezone card template not found');
        }

        // Use the home template
        const templateClone = homeTemplate.content.cloneNode(true) as DocumentFragment;

        // Get the wrapper element
        const wrapper = templateClone.querySelector('.col');
        if (!wrapper) {
            throw new Error('Card wrapper element not found in template');
        }

        wrapper.setAttribute('data-timezone-id', timeZone.zoneId);
        cardElement = wrapper as HTMLElement;

        // Fill in the data - home cards have separate city and country elements
        const city = cardElement.querySelector('.card-city');
        if (city) {
            city.textContent = timeZone.cities[0];
        }

        const country = cardElement.querySelector('.card-country');
        if (country) {
            country.textContent = timeZone.countryName;
        }

        // Add NEW badge if this is a new card
        if (isNewCard) {
            const cardTitle = cardElement.querySelector('.card-title');
            if (cardTitle) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-success ms-2 new-badge';
                badge.textContent = 'NEW';
                cardTitle.appendChild(badge);
            }
        }

        const continentSm = cardElement.querySelector('.card-continent-sm');
        if (continentSm) {
            continentSm.textContent = timeZone.continent;
        }

        const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
        if (utcOffsetEl) {
            utcOffsetEl.textContent = utcOffsetStr;
        }

    } else {
        // Get the template for regular time zone cards
        const regularTemplate = document.getElementById('time-zone-card-template') as HTMLTemplateElement;

        if (!regularTemplate) {
            throw new Error('Regular timezone card template not found');
        }

        // Use the regular template
        const templateClone = regularTemplate.content.cloneNode(true) as DocumentFragment;

        // Set timezone ID on the wrapper div
        const wrapper = templateClone.querySelector('.col');
        if (!wrapper) {
            throw new Error('Card wrapper element not found in template');
        }

        wrapper.setAttribute('data-timezone-id', timeZone.zoneId);
        cardElement = wrapper as HTMLElement;

        // Fill in the data
        const cityCountry = cardElement.querySelector('.card-city-country');
        if (cityCountry) {
            cityCountry.textContent = `${timeZone.cities[0]}, ${timeZone.countryName}`;
        }

        // Add NEW badge if this is a new card
        if (isNewCard) {
            const cardTitle = cardElement.querySelector('.card-title');
            if (cardTitle) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-success ms-2 new-badge';
                badge.textContent = 'NEW';
                cardTitle.appendChild(badge);
            }
        }

        const continentSm = cardElement.querySelector('.card-continent-sm');
        if (continentSm) {
            continentSm.textContent = timeZone.continent;
        }

        const utcOffsetEl = cardElement.querySelector('.card-utc-offset');
        if (utcOffsetEl) {
            utcOffsetEl.textContent = utcOffsetStr;
        }

        // Add event handlers for buttons
        const homeButton = cardElement.querySelector('.card-home-button');
        if (homeButton) {
            homeButton.setAttribute('onclick', `window.setHomeTimeZone('${timeZone.zoneId}');`);
        }

        const deleteButton = cardElement.querySelector('.card-delete-button');
        if (deleteButton) {
            deleteButton.setAttribute('onclick', `window.deleteTimeZone('${timeZone.zoneId}');`);
        }
    }

    return cardElement;
}