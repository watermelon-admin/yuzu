/**
 * Viewport utilities for time zones
 * Re-exports common viewport utilities with section-specific parameters
 */

import { 
    setupScrollFadeEffects as commonSetupScrollFadeEffects, 
    animateCardRemoval as commonAnimateCardRemoval,
    updateFadeEffects as commonUpdateFadeEffects,
    showLoadingState as commonShowLoadingState,
    showErrorState as commonShowErrorState,
    showEmptyStateIfNeeded as commonShowEmptyStateIfNeeded
} from '../../../common/viewport-utils.js';

// Container ID for time zones section
const CONTAINER_ID = 'time-zone-container';
const SECTION_ID = 'time-zones';
const ITEM_SELECTOR = '[data-timezone-id]';

/**
 * Sets up scroll fade effects for the time zones viewport
 */
export function setupScrollFadeEffects(): void {
    commonSetupScrollFadeEffects(SECTION_ID);
}

/**
 * Updates the fade effects based on scroll position
 * Preserved for backward compatibility
 * @param container - The scrollable container element
 * @param topFade - The top fade overlay element
 * @param bottomFade - The bottom fade overlay element
 */
export function updateFadeEffects(container: HTMLElement, topFade: HTMLElement, bottomFade: HTMLElement): void {
    // Use the common function
    commonUpdateFadeEffects(container, topFade, bottomFade);
}

/**
 * Shows loading state in the time zones container
 */
export function showLoadingState(): void {
    commonShowLoadingState(CONTAINER_ID, SECTION_ID);
}

/**
 * Shows error state in the time zones container
 * @param message Optional custom error message
 */
export function showErrorState(message?: string): void {
    commonShowErrorState(CONTAINER_ID, SECTION_ID, message);
}

/**
 * Shows empty state in the time zones container if needed
 * @returns True if empty state was shown, false otherwise
 */
export function showEmptyStateIfNeeded(): boolean {
    return commonShowEmptyStateIfNeeded(CONTAINER_ID, SECTION_ID, ITEM_SELECTOR);
}

/**
 * Animates the removal of a card from the DOM with time zone specific handling
 * @param cardElement The card element to remove with animation
 * @param onComplete Optional callback after removal completes
 */
export function animateCardRemoval(cardElement: HTMLElement, onComplete?: () => void): void {
    // Use the common function with the time-zones section ID
    commonAnimateCardRemoval(cardElement, SECTION_ID, {
        containerId: CONTAINER_ID,
        itemSelector: ITEM_SELECTOR,
        onRemoveComplete: onComplete
    });
}