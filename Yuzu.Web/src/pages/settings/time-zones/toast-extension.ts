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
export function createActionToast(
    message: string, 
    isSuccess: boolean = true,
    actionConfig?: {
        linkText: string;
        onClick: () => void;
    }
): void {
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
            const bsToast = (window as any).bootstrap.Toast.getInstance(toastElement);
            if (bsToast) {
                bsToast.hide();
            }
        });
    }

    toastContainer.appendChild(toastElement);
    document.body.appendChild(toastContainer);

    // Use bootstrap Toast
    const bsToast = new (window as any).bootstrap.Toast(toastElement, {
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
export function createViewCardToast(
    message: string, 
    cardElement: HTMLElement,
    isSuccess: boolean = true
): void {
    createActionToast(message, isSuccess, {
        linkText: 'View',
        onClick: () => {
            // First scroll the main settings section into view
            const timeZonesSection = document.getElementById('time-zones');
            if (timeZonesSection) {
                // Scroll the main section into view
                timeZonesSection.scrollIntoView({ behavior: 'smooth' });
                
                setTimeout(() => {
                    scrollToNewCard(cardElement, {
                        sectionId: 'time-zones',
                        behavior: 'smooth',
                        offset: 100
                    });
                    
                    setTimeout(() => {
                        try {
                            cardElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                                inline: 'nearest'
                            });
                        } catch (e) {
                            console.log('Alternative scroll method failed, using fallback');
                        }
                    }, 100);
                }, 300);
            }
        }
    });
}