import { setupScrollFadeEffects as sharedSetupScrollFadeEffects, animateCardRemoval as sharedAnimateCardRemoval, scrollCardIntoView as sharedScrollCardIntoView } from '../shared/viewport-utils.js';
/**
 * Sets up scroll fade effects for the backgrounds section
 */
export function setupScrollFadeEffects() {
    sharedSetupScrollFadeEffects('backgrounds');
}
/**
 * Animates the removal of a background card from the DOM
 * @param cardElement The card element to remove
 */
export function animateCardRemoval(cardElement) {
    sharedAnimateCardRemoval(cardElement, 'backgrounds');
}
/**
 * Scrolls a newly added background card into view
 * @param cardElement The card element to scroll into view
 */
export function scrollToNewCard(cardElement) {
    sharedScrollCardIntoView(cardElement, 'backgrounds-viewport-container');
}
/**
 * Creates a "no backgrounds" message element for empty state
 * @returns The message element
 */
export function createNoBackgroundsMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'col-12 text-center py-5';
    messageDiv.innerHTML = `
        <i class="bx bx-image fs-1 text-muted mb-3"></i>
        <h5>No Background Images</h5>
        <p class="text-muted">Upload your own images or wait for new system backgrounds.</p>
    `;
    return messageDiv;
}
//# sourceMappingURL=viewport-utils.js.map