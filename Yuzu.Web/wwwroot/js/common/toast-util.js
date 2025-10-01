/// <reference types="jquery" />
/// <reference types="bootstrap" />
/**
 * Creates and displays a toast notification
 * @param message - The message to display in the toast
 * @param isSuccess - Whether this is a success or error toast
 */
export function createToast(message, isSuccess = true) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white ${isSuccess ? 'bg-success' : 'bg-danger'} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    const icon = isSuccess ? 'bx-check-circle' : 'bx-error-circle';
    toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center">
                    <i class="bx ${icon} me-2 fs-4"></i> <span>${message}</span>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
    toastContainer.appendChild(toastElement);
    document.body.appendChild(toastContainer);
    // Use the any type to access bootstrap
    const bsToast = new window.bootstrap.Toast(toastElement, {
        delay: isSuccess ? 1500 : 2000, // Extremely short durations for snappy UX
        animation: true
    });
    bsToast.show();
}
//# sourceMappingURL=toast-util.js.map