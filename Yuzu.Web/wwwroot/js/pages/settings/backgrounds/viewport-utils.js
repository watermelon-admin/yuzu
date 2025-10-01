/**
 * Viewport utilities for backgrounds
 * Re-exports common viewport utilities with section-specific parameters
 */
import { setupScrollFadeEffects as commonSetupScrollFadeEffects, animateCardRemoval as commonAnimateCardRemoval, updateFadeEffects as commonUpdateFadeEffects, showLoadingState as commonShowLoadingState, showErrorState as commonShowErrorState, showEmptyStateIfNeeded as commonShowEmptyStateIfNeeded, scrollToNewCard as commonScrollToNewCard } from '../../../common/viewport-utils.js';
// Container ID for backgrounds section
const CONTAINER_ID = 'backgrounds-gallery-container';
const SECTION_ID = 'backgrounds';
const VIEWPORT_CONTAINER_ID = 'backgrounds-viewport-container';
const ITEM_SELECTOR = '[data-background-name]';
/**
 * Sets up scroll fade effects for the backgrounds viewport
 */
export function setupScrollFadeEffects() {
    console.log('Setting up scroll fade effects for backgrounds section');
    // Use the common function with the backgrounds section ID
    commonSetupScrollFadeEffects(SECTION_ID);
}
/**
 * Updates the fade effects based on scroll position
 * Preserved for backward compatibility
 * @param container - The scrollable container element
 * @param topFade - The top fade overlay element
 * @param bottomFade - The bottom fade overlay element
 */
export function updateFadeEffects(container, topFade, bottomFade) {
    // Use the common function
    commonUpdateFadeEffects(container, topFade, bottomFade);
}
/**
 * Shows loading state in the backgrounds container
 */
export function showLoadingState() {
    commonShowLoadingState(CONTAINER_ID, SECTION_ID);
}
/**
 * Shows error state in the backgrounds container
 * @param message Optional custom error message
 */
export function showErrorState(message) {
    commonShowErrorState(CONTAINER_ID, SECTION_ID, message);
}
/**
 * Shows empty state in the backgrounds container if needed
 * @returns True if empty state was shown, false otherwise
 */
export function showEmptyStateIfNeeded() {
    return commonShowEmptyStateIfNeeded(CONTAINER_ID, SECTION_ID, ITEM_SELECTOR);
}
/**
 * Animates the removal of a card from the DOM
 * @param cardElement The card element to remove with animation
 */
export function animateCardRemoval(cardElement) {
    // Use the common function with the backgrounds section ID
    commonAnimateCardRemoval(cardElement, SECTION_ID, {
        containerId: CONTAINER_ID,
        itemSelector: ITEM_SELECTOR
    });
}
/**
 * Creates a "no backgrounds" message element for empty state
 * @returns The message element
 * @deprecated Use showEmptyStateIfNeeded() instead
 */
export function createNoBackgroundsMessage() {
    // For backward compatibility only
    const messageDiv = document.createElement('div');
    messageDiv.className = 'col-12 text-center py-5';
    messageDiv.innerHTML = `
        <i class="bx bx-image fs-1 text-muted mb-3"></i>
        <h5>No Background Images</h5>
        <p class="text-muted">Upload your own images or wait for new system backgrounds.</p>
    `;
    return messageDiv;
}
/**
 * Scrolls to a newly added card in the backgrounds section
 * @param cardElement The card element to scroll to (pass null to scroll to top)
 */
export function scrollToNewCard(cardElement) {
    // Use the common function with the backgrounds section ID
    commonScrollToNewCard(cardElement, {
        sectionId: SECTION_ID,
        behavior: 'smooth',
        offset: 15 // Slightly larger offset for backgrounds
    });
}
//# sourceMappingURL=viewport-utils.js.map