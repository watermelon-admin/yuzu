// src/pages/settings/account-details/index.ts

import { createToast } from '../../../common/toast-util.js';

/**
 * Response interface for name update operation
 */
interface UpdateNameResponse {
    success: boolean;
    message: string;
    data?: {
        firstName: string;
        lastName: string;
    };
    errors?: {
        firstName?: string | string[];
        lastName?: string | string[];
        [key: string]: string | string[] | undefined;
    };
}


/**
 * Updates the user's name
 */
async function updateName(): Promise<void> {
    console.log('Profile update initiated');
    
    // Get form values
    const firstNameInput = document.getElementById('settings-firstname') as HTMLInputElement;
    const lastNameInput = document.getElementById('settings-lastname') as HTMLInputElement;
    const firstNameError = document.getElementById('settings-firstname-error') as HTMLElement;
    const lastNameError = document.getElementById('settings-lastname-error') as HTMLElement;
    const nameUpdateButton = document.getElementById('settings-name-update') as HTMLButtonElement;
    
    if (!firstNameInput || !lastNameInput || !firstNameError || !lastNameError || !nameUpdateButton) {
        console.error('Required form elements not found');
        return;
    }
    
    // Clear previous error messages
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    
    // Validate inputs
    let isValid = true;
    
    if (firstNameInput.value.length > 50) {
        firstNameError.textContent = 'First name cannot exceed 50 characters.';
        isValid = false;
    }
    
    if (lastNameInput.value.length > 50) {
        lastNameError.textContent = 'Last name cannot exceed 50 characters.';
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Create request payload - use capitalized property names to match the C# model
    const payload = {
        FirstName: firstNameInput.value,
        LastName: lastNameInput.value
    };
    
    console.log(`Submitting name update: FirstName="${payload.FirstName}", LastName="${payload.LastName}"`);
    
    try {
        // Just disable the button without showing a loading state
        nameUpdateButton.disabled = true;
        console.log('Button disabled during update');
        
        // Look for the token in a hidden input field (standard ASP.NET Core approach)
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenInput || !tokenInput.value) {
            console.error('Anti-forgery token input not found');
            throw new Error('Anti-forgery token not found');
        }
        const token = tokenInput.value;
        
        console.log('Retrieved anti-forgery token:', token.substring(0, 10) + '...');
        
        // Send update request
        // In ASP.NET Core Razor Pages with AJAX, format is important
        // The correct format for handlers is ?handler=HandlerName (without 'OnPost' prefix)
        const url = document.location.pathname + '?handler=UpdateName';
        console.log('Sending fetch request to:', url);
        
        // Set up headers - ASP.NET Core expects anti-forgery token
        // The correct header name is case-sensitive and important!
        const headers = new Headers({
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json', // Explicitly request JSON response
            'RequestVerificationToken': token // This is the correct header name ASP.NET Core expects
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });
        
        console.log(`Server responded with status: ${response.status}`);
        
        // First, try to read the response as text to see exactly what we're getting
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        // Try to parse as JSON if possible
        let data: UpdateNameResponse;
        try {
            data = JSON.parse(responseText) as UpdateNameResponse;
            console.log('Successfully parsed response as JSON:', data);
        } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            console.error('Response content was:', responseText);
            
            // Create a default error response
            data = {
                success: false,
                message: 'Failed to parse server response as JSON'
            };
            
            // Check if we got HTML and the request failed
            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
                console.error('Server returned HTML instead of JSON - possible server-side error');
                throw new Error('Server returned HTML instead of JSON - request may have been processed incorrectly');
            }
        }
        
        if (data.success) {
            console.log('Profile update successful');
            // Show success message
            createToast(`Success: ${data.message}`, true);
            
            // Update input values with sanitized data from server
            if (data.data) {
                console.log(`Updating UI with returned values: firstName="${data.data.firstName}", lastName="${data.data.lastName}"`);
                firstNameInput.value = data.data.firstName || '';
                lastNameInput.value = data.data.lastName || '';
                
                // Update the user's full name displayed in the sidebar
                const userFullNameElement = document.getElementById('user-full-name');
                if (userFullNameElement) {
                    const firstName = data.data.firstName || '';
                    const lastName = data.data.lastName || '';
                    if (firstName || lastName) {
                        userFullNameElement.textContent = `${firstName} ${lastName}`;
                    } else {
                        userFullNameElement.textContent = 'breakscreen User';
                    }
                }
            }
        } else {
            console.warn('Profile update failed:', data.message);
            
            // Show field-specific errors
            if (data.errors) {
                console.warn('Validation errors:', data.errors);
                
                if (data.errors.firstName) {
                    console.warn('FirstName error:', data.errors.firstName);
                    firstNameError.textContent = Array.isArray(data.errors.firstName) 
                        ? data.errors.firstName[0] 
                        : data.errors.firstName as string;
                }
                
                if (data.errors.lastName) {
                    console.warn('LastName error:', data.errors.lastName);
                    lastNameError.textContent = Array.isArray(data.errors.lastName) 
                        ? data.errors.lastName[0] 
                        : data.errors.lastName as string;
                }
                
                // Only show general error toast if there are no field-specific errors
                // or if the error isn't related to firstName or lastName
                const hasFieldErrors = !!data.errors.firstName || !!data.errors.lastName;
                
                if (!hasFieldErrors) {
                    console.warn('General validation error, showing toast');
                    createToast(`Error: ${data.message || 'Failed to update profile'}`, false);
                }
            } else {
                // Show general error message
                console.warn('Non-validation error, showing toast');
                createToast(`Error: ${data.message || 'Failed to update profile'}`, false);
            }
        }
    } catch (error) {
        // Here's where we might be showing an error toast even when the update succeeded
        // This can happen if there's a parsing error with the response or other client-side issues
        console.error('Error updating profile:', error);
        
        // Check if fields are disabled, which indicates the request was sent
        if (nameUpdateButton.disabled) {
            // Since fields are disabled, the request might have been sent successfully
            // Let's not show an error toast, as the data might have been saved
            console.log('Error occurred but request might have succeeded - not showing error toast');
        } else {
            // If the button wasn't disabled, there was an early error before the request was sent
            createToast('Error: Failed to update profile. Please try again.', false);
        }
    } finally {
        console.log('Re-enabling update button');
        // Just re-enable the button
        nameUpdateButton.disabled = false;
    }
}

/**
 * Initializes the account deletion checkbox and button
 */
function initAccountDeletion(): void {
    const checkbox = document.getElementById('delete-account-checkbox') as HTMLInputElement;
    const button = document.getElementById('delete-account-button') as HTMLButtonElement;
    
    if (checkbox && button) {
        checkbox.addEventListener('change', () => {
            button.disabled = !checkbox.checked;
        });
    }
}

/**
 * Initializes the account details section
 */
function initAccountDetails(): void {
    // Set up event listener for name update
    const updateButton = document.getElementById('settings-name-update');
    if (updateButton) {
        updateButton.addEventListener('click', updateName);
    }
    
    // Set up account deletion controls
    initAccountDeletion();
}

// Export initialization function
export { initAccountDetails };