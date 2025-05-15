/**
 * Viewport utilities for break types
 * Re-exports common viewport utilities with section-specific parameters
 */

import { 
    animateCardRemoval as commonAnimateCardRemoval, 
    setupScrollFadeEffects as commonSetupScrollFadeEffects,
    showLoadingState as commonShowLoadingState,
    showErrorState as commonShowErrorState,
    showEmptyStateIfNeeded as commonShowEmptyStateIfNeeded
} from '../../../common/viewport-utils.js';

// Container ID for break types section
const CONTAINER_ID = 'break-type-container';
const SECTION_ID = 'break-types';
const ITEM_SELECTOR = 'article[data-id]';

/**
 * Sets up scroll fade effects for the break types viewport
 */
export function setupScrollFadeEffects(): void {
    // Use the common function with the break-types section ID
    commonSetupScrollFadeEffects(SECTION_ID);
}

/**
 * Shows loading state in the break types container
 */
export function showLoadingState(): void {
    commonShowLoadingState(CONTAINER_ID, SECTION_ID);
}

/**
 * Shows error state in the break types container
 * @param message Optional custom error message
 */
export function showErrorState(message?: string): void {
    commonShowErrorState(CONTAINER_ID, SECTION_ID, message);
}

/**
 * Shows empty state in the break types container if needed
 * @returns True if empty state was shown, false otherwise
 */
export function showEmptyStateIfNeeded(): boolean {
    return commonShowEmptyStateIfNeeded(CONTAINER_ID, SECTION_ID, ITEM_SELECTOR);
}

/**
 * Animates the removal of a card from the DOM
 * @param cardElement The card element to remove with animation
 */
export function animateCardRemoval(cardElement: HTMLElement): void {
    // Use the common function with the break-types section ID
    commonAnimateCardRemoval(cardElement, SECTION_ID, {
        containerId: CONTAINER_ID,
        itemSelector: ITEM_SELECTOR
    });
}