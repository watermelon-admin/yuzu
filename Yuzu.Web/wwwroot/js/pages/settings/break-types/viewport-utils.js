import { setupScrollFadeEffects as sharedSetupScrollFadeEffects, animateCardRemoval as sharedAnimateCardRemoval, scrollCardIntoView as sharedScrollCardIntoView } from '../shared/viewport-utils.js';
/**
 * Sets up scroll fade effects for the break types section
 */
export function setupScrollFadeEffects() {
    sharedSetupScrollFadeEffects('break-types');
}
/**
 * Animates the removal of a break type card from the DOM
 * @param cardElement The card element to remove
 */
export function animateCardRemoval(cardElement) {
    sharedAnimateCardRemoval(cardElement, 'break-types');
}
/**
 * Scrolls a newly added break type card into view
 * @param cardElement The card element to scroll into view
 */
export function scrollToNewCard(cardElement) {
    sharedScrollCardIntoView(cardElement, 'break-types-viewport-container');
}
//# sourceMappingURL=viewport-utils.js.map