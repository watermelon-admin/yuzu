/**
 * Extended toast utilities specific to time zones section
 * Provides additional toast functionality while maintaining backward compatibility
 */
import { createToast as commonCreateToast } from '../../../common/toast-util.js';
import { scrollToNewCard } from '../../../common/viewport-utils.js';
/**
 * Creates a toast notification with an optional action link
 * @param message - The message to display in the toast
 * @param isSuccess - Whether this is a success or error toast
 * @param actionConfig - Optional configuration for an action link
 */
export function createActionToast(message, isSuccess = true, actionConfig) {
    // If no action config, just use the regular toast
    if (!actionConfig) {
        commonCreateToast(message, isSuccess);
        return;
    }
    // Create custom toast with action link
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white ${isSuccess ? 'bg-success' : 'bg-danger'} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    const icon = isSuccess ? 'bx-check-circle' : 'bx-error-circle';
    // Create toast content with link
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="bx ${icon} me-2 fs-4"></i> 
                <span>${message} <a href="#" class="text-white fw-bold ms-2 text-decoration-underline">${actionConfig.linkText}</a></span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    // Add event listener to the link
    const link = toastElement.querySelector('a');
    if (link) {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            actionConfig.onClick();
            // Optionally close the toast after action
            const bsToast = window.bootstrap.Toast.getInstance(toastElement);
            if (bsToast) {
                bsToast.hide();
            }
        });
    }
    toastContainer.appendChild(toastElement);
    document.body.appendChild(toastContainer);
    // Use bootstrap Toast
    const bsToast = new window.bootstrap.Toast(toastElement, {
        delay: 3000, // Longer delay for action toasts
        animation: true
    });
    bsToast.show();
}
/**
 * Creates a toast with a "View" link that scrolls to a specific card
 * @param message - The message to display in the toast
 * @param cardElement - The card element to scroll to
 * @param isSuccess - Whether this is a success or error toast
 */
export function createViewCardToast(message, cardElement, isSuccess = true) {
    createActionToast(message, isSuccess, {
        linkText: 'View',
        onClick: () => {
            // First scroll the main settings section into view
            const timeZonesSection = document.getElementById('time-zones');
            if (timeZonesSection) {
                // Scroll the main section into view
                timeZonesSection.scrollIntoView({ behavior: 'smooth' });
                // Then scroll to the card within the viewport
                setTimeout(() => {
                    // First try to use the scrollToNewCard function with a larger offset
                    scrollToNewCard(cardElement, {
                        sectionId: 'time-zones',
                        behavior: 'smooth',
                        offset: 100 // Increased offset to show more of the card
                    });
                    // Then, as a backup approach, use scrollIntoView with 'center' alignment
                    // to ensure the card is more centered in the viewport
                    setTimeout(() => {
                        try {
                            // Use native scrollIntoView with 'center' alignment if supported
                            cardElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center', // Try to center the element in the viewport
                                inline: 'nearest'
                            });
                        }
                        catch (e) {
                            // Some browsers might not support all options
                            console.log('Alternative scroll method failed, using fallback');
                            // We already tried scrollToNewCard above, so nothing more to do
                        }
                    }, 100);
                }, 300); // Small delay to allow the outer scroll to complete
            }
        }
    });
}
//# sourceMappingURL=toast-extension.js.map