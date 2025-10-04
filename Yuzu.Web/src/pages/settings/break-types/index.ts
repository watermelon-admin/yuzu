/// <reference types="jquery" />
/// <reference types="bootstrap" />

/**
 * Break Types management functionality for the Settings page
 */

// Import viewport utilities for scroll effects
import { setupScrollFadeEffects, animateCardRemoval } from './viewport-utils.js';

// Check if user is subscribed (Pro member)
const isSubscribedElement = document.getElementById('backgrounds-is-subscribed') as HTMLInputElement | null;
const isSubscribed: boolean = isSubscribedElement?.value === 'true';

/**
 * Gets the background images URL from the hidden input field.
 */
function getImagePath(): string {
    const imagePathInput = document.getElementById('image-path') as HTMLInputElement | null;
    if (!imagePathInput || !imagePathInput.value) {
        console.error('Background image path not found in hidden field "image-path"');
    }
    return imagePathInput?.value || '';
}

/**
 * Response interface for AJAX calls
 */
interface AjaxResponse {
    success: boolean;
    message: string;
    data?: any;
    errors?: any;
}

/**
 * Interface for break type data
 */
interface BreakType {
    id: number;
    name: string;
    defaultDurationMinutes: number;
    breakTimeStepMinutes: number;
    countdownMessage: string;
    countdownEndMessage: string;
    endTimeTitle: string;
    imageTitle: string;
    thumbnailUrl?: string;
    iconName: string;
    usageCount: number;
    backgroundImageChoices?: string;
    isLocked: boolean;
}

/**
 * Load break types from the server and populate the container.
 * @returns Promise that resolves when the loading is complete
 */
export async function loadBreakTypes(): Promise<void> {
    try {
        // Show loading spinner
        const loadingElement = document.querySelector('.page-loading');
        if (loadingElement) {
            loadingElement.classList.add('active');
        }
        
        // Use current path for correct routing (regardless of which page it's embedded in)
        // Get all items by passing a high page size value
        const url = `${document.location.pathname}?handler=BreakTypes&pageSize=100&pageNumber=1`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Network response was not OK');
            return;
        }
        
        const responseData = await response.json() as AjaxResponse;
        console.log('Break types response:', responseData);
        
        // Process the standardized response
        if (responseData.success) {
            // Get the container and template   
            const container = document.getElementById('break-type-container');
            const template = document.getElementById('break-type-template');
        
            if (!container || !template) {
                console.error('Container or template not found');
                return;
            }
            
            // Clear the container before adding new items
            container.innerHTML = '';
            
            // Get the background images URL
            const backgroundImagesURL = getImagePath();
            console.log('Background images URL:', backgroundImagesURL);
            
            // Create card elements
            const breakTypes = responseData.data?.data || [];
            console.log('Break types array:', breakTypes);
            
            breakTypes.forEach((item: BreakType) => {
                console.log('Processing break type:', item);

                // Get the template
                const template = document.getElementById('break-type-template') as HTMLTemplateElement;
                if (!template) {
                    console.error('Break type card template not found');
                    return;
                }
                
                // Clone the template content
                const fragment = document.importNode(template.content, true);
                const cardDiv = $(fragment);
                
                // Set data attribute for the card
                const articleElement = cardDiv.find('article');
                articleElement.attr('data-id', item.id);
                
                // Set the icon as overlay
                const iconElement = cardDiv.find('.break-type-icon');
                iconElement.removeClass().addClass(`break-type-icon bx ${item.iconName || 'bx-coffee-togo'} fs-4`);
                
                // Use thumbnail if available, otherwise fall back to background image
                console.log(`Break type ${item.id} - thumbnailUrl:`, item.thumbnailUrl);
                let previewImageUrl = item.thumbnailUrl || `${backgroundImagesURL}/${item.imageTitle}-thumb.jpg`;
                console.log(`Break type ${item.id} - using preview image:`, previewImageUrl);

                // Add cache-busting parameter for thumbnails to ensure fresh images
                if (item.thumbnailUrl) {
                    // Remove existing query parameters and add fresh timestamp
                    const urlWithoutQuery = previewImageUrl.split('?')[0];
                    previewImageUrl = `${urlWithoutQuery}?v=${Date.now()}`;
                    console.log(`Break type ${item.id} - final URL with cache busting:`, previewImageUrl);
                } else {
                    console.log(`Break type ${item.id} - no thumbnailUrl, using fallback background image`);
                }
                cardDiv.find('.card-preview-image').attr('src', previewImageUrl);
                
                // Card Title
                cardDiv.find('.card-title-link').text(item.name);
                
                // Badge to show whether break type is system or user-defined
                if (item.isLocked) {
                    // System break type (locked)
                    cardDiv.find('.system-badge').removeClass('d-none');
                } else {
                    // User-defined break type
                    cardDiv.find('.user-badge').removeClass('d-none');
                }
                
                // Default Duration
                cardDiv.find('.card-duration').text(item.defaultDurationMinutes.toString());
                
                // Usage Count
                cardDiv.find('.card-usage').text(item.usageCount.toString());
                
                // Store all data attributes on the article element for easy access
                articleElement.attr('data-id', item.id);
                articleElement.attr('data-name', item.name);
                articleElement.attr('data-image-title', item.imageTitle);
                articleElement.attr('data-icon-name', item.iconName || 'bx-coffee-togo');
                articleElement.attr('data-default-duration', item.defaultDurationMinutes.toString());
                articleElement.attr('data-time-step', item.breakTimeStepMinutes.toString());
                articleElement.attr('data-countdown-message', item.countdownMessage || 'Minutes until break ends');
                articleElement.attr('data-countdown-end-message', item.countdownEndMessage || 'Break is over');
                articleElement.attr('data-end-time-title', item.endTimeTitle || 'Break Ends At');
                articleElement.attr('data-usage-count', item.usageCount.toString());
                articleElement.attr('data-is-locked', item.isLocked.toString());
                
                // Store background image choices on the article for preview
                if (item.backgroundImageChoices) {
                    const backgroundImages = item.backgroundImageChoices.split(';');
                    if (backgroundImages.length >= 2) {
                        articleElement.attr('data-image-title-1', backgroundImages[0] || '');
                        articleElement.attr('data-image-title-2', backgroundImages[1] || '');
                    } else {
                        // Fallback if no choices are available
                        articleElement.attr('data-image-title-1', item.imageTitle || '');
                        articleElement.attr('data-image-title-2', item.imageTitle || '');
                    }
                } else {
                    // Fallback if no choices are available
                    articleElement.attr('data-image-title-1', item.imageTitle || '');
                    articleElement.attr('data-image-title-2', item.imageTitle || '');
                }
                
                // Edit button (dropdown item)
                const editButton = cardDiv.find('.btn-edit');
                editButton.attr('data-id', item.id);
                editButton.attr('data-name', item.name);
                editButton.attr('data-image-title', item.imageTitle);
                editButton.attr('data-icon-name', item.iconName || 'bx-coffee-togo');
                editButton.attr('data-default-duration', item.defaultDurationMinutes.toString());
                editButton.attr('data-time-step', item.breakTimeStepMinutes.toString());
                editButton.attr('data-countdown-message', item.countdownMessage || 'Minutes until break ends');
                editButton.attr('data-countdown-end-message', item.countdownEndMessage || 'Break is over');
                editButton.attr('data-end-time-title', item.endTimeTitle || 'Break Ends At');

                // Add background image choices for the simple edit modal
                if (item.backgroundImageChoices) {
                    const backgroundImages = item.backgroundImageChoices.split(';');
                    if (backgroundImages.length >= 2) {
                        editButton.attr('data-image-title-1', backgroundImages[0] || '');
                        editButton.attr('data-image-title-2', backgroundImages[1] || '');
                    } else {
                        // Fallback if no choices are available
                        editButton.attr('data-image-title-1', item.imageTitle || '');
                        editButton.attr('data-image-title-2', item.imageTitle || '');
                    }
                } else {
                    // Fallback if no choices are available
                    editButton.attr('data-image-title-1', item.imageTitle || '');
                    editButton.attr('data-image-title-2', item.imageTitle || '');
                }
                
                // Design Button (dropdown item)
                // For subscribers, link directly to the designer, for non-subscribers show premium modal
                if (isSubscribed) {
                    cardDiv.find('.btn-design').attr('href', `/designer?id=${item.id}`);
                } else {
                    // For non-subscribers, prevent direct navigation and set up to show premium modal
                    cardDiv.find('.btn-design').attr('href', 'javascript:;');
                    cardDiv.find('.btn-design').attr('data-bs-toggle', 'modal');
                    cardDiv.find('.btn-design').attr('data-bs-target', '#break-types-design-prompt-modal');
                }

                // Delete Button - Only show for non-locked break types and for subscribed users
                if (!item.isLocked && isSubscribed) {
                    const deleteContainer = cardDiv.find('.btn-delete-container');
                    deleteContainer.removeClass('d-none');
                    
                    const deleteButton = cardDiv.find('.btn-delete');
                    deleteButton.attr('data-id', item.id.toString());
                    deleteButton.attr('data-name', item.name);
                }
                
                // Preview button
                const previewButton = cardDiv.find('.break-type-preview-button');
                previewButton.attr('data-id', item.id.toString());
                
                // Append the cloned template to the container
                $('#break-type-container').append(cardDiv);
            });
            
            // Setup event listeners for the newly added cards
            setupEventListeners();
            
            // Setup scroll fade effects after content is loaded
            setupScrollFadeEffects();
        } else {
            console.error('API request failed:', responseData.message);
            (window as any).createToast?.(responseData.message || 'Failed to load break types', false);
        }
    }
    catch (error) {
        console.error('Error fetching break types:', error);
    }
    finally {
        // Hide the loading spinner once data is loaded
        const loadingElement = document.querySelector('.page-loading');
        if (loadingElement) {
            loadingElement.classList.remove('active');
        }
    }
}

// Pagination has been removed in favor of viewport scrolling

/**
 * Set up event listeners for the break type card buttons
 */
/**
 * Initialize the simple edit modal for break types (for non-subscribers)
 * @param button - The edit button element
 */
function initSimpleEdit(button: Element): void {
    // Get the modal element with kebab-case ID
    const modalElement = document.getElementById('break-type-simple-edit-modal');
    if (!modalElement) {
        console.error('Simple edit modal not found');
        return;
    }

    // Get data from the button
    const id = button.getAttribute('data-id') || '';
    const name = button.getAttribute('data-name') || '';
    const imageTitle = button.getAttribute('data-image-title') || '';
    const iconName = button.getAttribute('data-icon-name') || '';
    const defaultDuration = button.getAttribute('data-default-duration') || '';
    const timeStep = button.getAttribute('data-time-step') || '';
    const countdownMessage = button.getAttribute('data-countdown-message') || '';
    const countdownEndMessage = button.getAttribute('data-countdown-end-message') || '';
    const endTimeTitle = button.getAttribute('data-end-time-title') || '';
    const imageTitle1 = button.getAttribute('data-image-title-1') || imageTitle;
    const imageTitle2 = button.getAttribute('data-image-title-2') || imageTitle;
    
    // Set form values
    const idField = document.getElementById('simple-edit-break-type-id') as HTMLInputElement;
    const nameField = document.getElementById('simple-edit-break-type-name') as HTMLInputElement;
    const iconNameField = document.getElementById('simple-edit-icon-name') as HTMLInputElement;
    const countdownMessageField = document.getElementById('simple-edit-countdown-message') as HTMLInputElement;
    const countdownEndMessageField = document.getElementById('simple-edit-countdown-end-message') as HTMLInputElement;
    const endTimeTitleField = document.getElementById('simple-edit-end-time-title') as HTMLInputElement;
    const defaultDurationField = document.getElementById('simple-edit-default-duration') as HTMLInputElement;
    const timeStepField = document.getElementById('simple-edit-time-step') as HTMLInputElement;
    
    // Set background image options
    const backgroundOption1 = document.getElementById('background-option-1') as HTMLImageElement;
    const backgroundOption2 = document.getElementById('background-option-2') as HTMLImageElement;
    const backgroundOption1Radio = document.getElementById('background-option-1-radio') as HTMLInputElement;
    const backgroundOption2Radio = document.getElementById('background-option-2-radio') as HTMLInputElement;
    
    if (idField) idField.value = id;
    if (nameField) nameField.value = name;
    if (iconNameField) iconNameField.value = iconName;
    if (countdownMessageField) countdownMessageField.value = countdownMessage;
    if (countdownEndMessageField) countdownEndMessageField.value = countdownEndMessage;
    if (endTimeTitleField) endTimeTitleField.value = endTimeTitle;
    if (defaultDurationField) defaultDurationField.value = defaultDuration;
    if (timeStepField) timeStepField.value = timeStep;
    
    // Get the background images URL
    const backgroundImagesURL = getImagePath();
    
    // Set background image previews
    if (backgroundOption1) backgroundOption1.src = `${backgroundImagesURL}/${imageTitle1}-thumb.jpg`;
    if (backgroundOption2) backgroundOption2.src = `${backgroundImagesURL}/${imageTitle2}-thumb.jpg`;
    
    // Check the background option that matches the current image title
    if (backgroundOption1Radio && backgroundOption2Radio) {
        if (imageTitle === imageTitle1) {
            backgroundOption1Radio.checked = true;
        } else if (imageTitle === imageTitle2) {
            backgroundOption2Radio.checked = true;
        } else {
            backgroundOption1Radio.checked = true;
        }
    }
    
    // Initialize the bootstrap modal
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Opens the preview modal for a break type
 * @param article - The card article element containing the break type data
 */
function openBreakTypePreviewModal(article: HTMLElement): void {
    if (!article) {
        console.error('Article element is missing');
        return;
    }
    
    // Get break type data from article element
    const id = article.getAttribute('data-id');
    const name = article.getAttribute('data-name');
    const imageTitle = article.getAttribute('data-image-title');
    const iconName = article.getAttribute('data-icon-name');
    const defaultDuration = article.getAttribute('data-default-duration');
    const timeStep = article.getAttribute('data-time-step');
    const countdownMessage = article.getAttribute('data-countdown-message');
    const countdownEndMessage = article.getAttribute('data-countdown-end-message');
    const usageCount = article.getAttribute('data-usage-count');
    
    // Get the modal element
    const modal = document.getElementById('break-type-preview-modal');
    if (!modal) {
        console.error('Preview modal not found');
        return;
    }
    
    // Set modal content
    const titleElement = document.getElementById('break-type-preview-title');
    const iconElement = document.querySelector('.break-type-preview-icon');
    const backgroundElement = document.getElementById('break-type-preview-background') as HTMLImageElement;
    const durationElement = document.getElementById('break-type-preview-duration');
    const timeStepElement = document.getElementById('break-type-preview-time-step');
    const usageElement = document.getElementById('break-type-preview-usage');
    const countdownMessageElement = document.getElementById('break-type-preview-countdown-message');
    const endMessageElement = document.getElementById('break-type-preview-end-message');
    const editButton = modal.querySelector('.btn-edit-from-preview') as HTMLButtonElement;
    
    // Set content values
    if (titleElement) titleElement.textContent = name;
    if (iconElement) {
        iconElement.className = `break-type-preview-icon bx ${iconName || 'bx-coffee-togo'} fs-1 text-primary`;
    }
    
    const backgroundImagesURL = getImagePath();
    if (backgroundElement) {
        backgroundElement.src = `${backgroundImagesURL}/${imageTitle}-fhd.jpg`;
        backgroundElement.alt = `${name} background`;
    }
    
    if (durationElement) durationElement.textContent = `${defaultDuration} minutes`;
    if (timeStepElement) timeStepElement.textContent = `${timeStep} minutes`;
    if (usageElement) usageElement.textContent = `${usageCount} times used`;
    if (countdownMessageElement) countdownMessageElement.textContent = countdownMessage || 'Minutes until break ends';
    if (endMessageElement) endMessageElement.textContent = countdownEndMessage || 'Break is over';
    
    // Set up the edit button to open the edit modal when clicked
    if (editButton) {
        // Clean up any existing click event listeners
        const newEditButton = editButton.cloneNode(true);
        if (editButton.parentNode) {
            editButton.parentNode.replaceChild(newEditButton, editButton);
        }
        
        // Add click handler to the new button
        newEditButton.addEventListener('click', () => {
            // Hide the preview modal first
            const previewModalInstance = (window as any).bootstrap.Modal.getInstance(modal);
            if (previewModalInstance) {
                previewModalInstance.hide();
            }
            
            // Find the edit button for this break type and trigger a click on it
            document.querySelectorAll(`.btn-edit[data-id="${id}"]`).forEach(editBtn => {
                setTimeout(() => {
                    (editBtn as HTMLElement).click();
                }, 300); // Small delay to ensure modal transitions don't conflict
            });
        });
    }
    
    // Show the modal
    const modalInstance = new (window as any).bootstrap.Modal(modal);
    modalInstance.show();
}

/**
 * Handle click event for preview buttons
 */
function handlePreviewClick(e: Event): void {
    e.preventDefault();
    
    const button = e.currentTarget as HTMLElement;
    const article = button.closest('article');
    
    if (article) {
        openBreakTypePreviewModal(article as HTMLElement);
    } else {
        console.error('Parent article element not found');
    }
}

/**
 * Set up event listeners for the break type card buttons
 */
function setupEventListeners(): void {
    // Clean up existing event listeners using a helper function
    removeExistingEventListeners();
    
    // Listen for clicks on edit buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', handleEditClick);
    });
    
    // Listen for clicks on delete buttons
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', handleDeleteClick);
    });

    // Listen for clicks on clone buttons
    document.querySelectorAll('.btn-clone').forEach(button => {
        button.addEventListener('click', handleCloneClick);
    });

    // Listen for clicks on preview buttons
    document.querySelectorAll('.break-type-preview-button').forEach(button => {
        button.addEventListener('click', handlePreviewClick);
    });
    
    // Configure dropdowns to have high z-index and proper positioning
    document.querySelectorAll('.dropdown-toggle').forEach(button => {
        // For each dropdown button, find its dropdown menu
        const menuId = button.getAttribute('data-bs-target') || '';
        let dropdownMenu: Element | null = null;
        
        if (menuId) {
            // If there's a target specified, use it
            dropdownMenu = document.querySelector(menuId);
        } else {
            // Otherwise find the sibling dropdown-menu
            const parentDropdown = button.closest('.dropdown');
            if (parentDropdown) {
                dropdownMenu = parentDropdown.querySelector('.dropdown-menu');
            }
        }
        
        // Set custom Bootstrap dropdown options if available
        if (typeof (window as any).bootstrap !== 'undefined' && 
            typeof (window as any).bootstrap.Dropdown !== 'undefined' &&
            dropdownMenu) {
            // Create or get a dropdown instance with custom config
            const dropdown = new (window as any).bootstrap.Dropdown(button, {
                popperConfig: {
                    modifiers: [
                        {
                            name: 'preventOverflow',
                            options: {
                                boundary: document.body
                            }
                        },
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 2]
                            }
                        }
                    ]
                }
            });
        }
    });
    
    // Add new break type button event listener (only needs to be set up once)
    const addButton = document.getElementById('add-new-break-type-button');
    if (addButton && !addButton.getAttribute('data-initialized')) {
        addButton.setAttribute('data-initialized', 'true');
        addButton.addEventListener('click', handleAddButtonClick);
    }
    
    // Add save event listener for the simple edit modal (only needs to be set up once)
    const saveButton = document.getElementById('simple-edit-save-btn');
    if (saveButton && !saveButton.getAttribute('data-initialized')) {
        saveButton.setAttribute('data-initialized', 'true');
        saveButton.addEventListener('click', async () => {
            await saveSimpleBreakTypeEdit();
        });
    }
    
    // Add delete confirmation button event listener (only needs to be set up once)
    const confirmDeleteButton = document.getElementById('confirm-delete-btn');
    if (confirmDeleteButton && !confirmDeleteButton.getAttribute('data-initialized')) {
        confirmDeleteButton.setAttribute('data-initialized', 'true');
        confirmDeleteButton.addEventListener('click', async () => {
            await deleteBreakType();
        });
    }
}

/**
 * Remove existing event listeners to prevent duplicates
 */
function removeExistingEventListeners(): void {
    // Remove edit button listeners
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.removeEventListener('click', handleEditClick);
    });
    
    // Remove delete button listeners
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.removeEventListener('click', handleDeleteClick);
    });

    // Remove clone button listeners
    document.querySelectorAll('.btn-clone').forEach(button => {
        button.removeEventListener('click', handleCloneClick);
    });

    // Remove preview button listeners
    document.querySelectorAll('.break-type-preview-button').forEach(button => {
        button.removeEventListener('click', handlePreviewClick);
    });
}

/**
 * Event handler for edit button clicks
 */
function handleEditClick(e: Event): void {
    e.preventDefault();
    const button = e.currentTarget as Element;
    
    // Use different editor based on subscription status
    if (isSubscribed) {
        if (typeof (window as any).editBreakType === 'function') {
            (window as any).editBreakType(button);
        } else {
            console.error('editBreakType function not found');
            (window as any).createToast?.('Editor function not available', false);
        }
    } else {
        // Use our internal function to handle simple edit modal
        initSimpleEdit(button);
    }
}

/**
 * Event handler for delete button clicks
 */
function handleDeleteClick(e: Event): void {
    e.preventDefault();
    const button = e.currentTarget as Element;

    // Get break type ID and name
    const id = button.getAttribute('data-id');
    const name = button.getAttribute('data-name');

    // Open delete confirmation modal
    openDeleteConfirmationModal(id, name);
}

/**
 * Event handler for clone button clicks
 */
function handleCloneClick(e: Event): void {
    e.preventDefault();

    // Check if user is subscribed
    if (!isSubscribed) {
        showProFeatureRequiredModal();
        return;
    }

    const button = e.currentTarget as Element;
    const article = button.closest('article');

    if (!article) {
        console.error('Parent article element not found');
        return;
    }

    // Get break type ID
    const id = article.getAttribute('data-id');

    if (!id) {
        console.error('Break type ID is missing');
        return;
    }

    // Call the clone function
    cloneBreakType(id);
}

/**
 * Event handler for add new break type button clicks
 */
function handleAddButtonClick(): void {
    if (isSubscribed) {
        if (typeof (window as any).createBreakType === 'function') {
            (window as any).createBreakType();
        } else {
            console.error('createBreakType function not found');
            (window as any).createToast?.('Create function not available', false);
        }
    } else {
        // For non-subscribers, show the Pro feature required modal
        showProFeatureRequiredModal();
    }
}

/**
 * Show the Pro feature required modal for non-subscribers
 */
function showProFeatureRequiredModal(): void {
    // Get the modal element
    const modalElement = document.getElementById('pro-feature-required-modal');
    if (!modalElement) {
        console.error('Pro feature required modal not found');
        (window as any).createToast?.('Subscription required for this feature', false);
        return;
    }

    // Initialize the bootstrap modal
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Initialize the simple create modal for break types (for non-subscribers)
 */
function initSimpleCreate(): void {
    // Get the modal element
    const modalElement = document.getElementById('break-type-simple-edit-modal');
    if (!modalElement) {
        console.error('Simple create modal not found');
        return;
    }

    // Reset the form fields to default values
    const idField = document.getElementById('simple-edit-break-type-id') as HTMLInputElement;
    const nameField = document.getElementById('simple-edit-break-type-name') as HTMLInputElement;
    const iconNameField = document.getElementById('simple-edit-icon-name') as HTMLInputElement;
    const countdownMessageField = document.getElementById('simple-edit-countdown-message') as HTMLInputElement;
    const countdownEndMessageField = document.getElementById('simple-edit-countdown-end-message') as HTMLInputElement;
    const endTimeTitleField = document.getElementById('simple-edit-end-time-title') as HTMLInputElement;
    const defaultDurationField = document.getElementById('simple-edit-default-duration') as HTMLInputElement;
    const timeStepField = document.getElementById('simple-edit-time-step') as HTMLInputElement;

    // Set default values
    if (idField) idField.value = '';
    if (nameField) nameField.value = 'New Break';
    if (iconNameField) iconNameField.value = 'bx-coffee-togo';
    if (countdownMessageField) countdownMessageField.value = 'Minutes until break ends';
    if (countdownEndMessageField) countdownEndMessageField.value = 'Break is over';
    if (endTimeTitleField) endTimeTitleField.value = 'Break Ends At';
    if (defaultDurationField) defaultDurationField.value = '15';
    if (timeStepField) timeStepField.value = '5';

    // Set background image options
    const backgroundOption1 = document.getElementById('background-option-1') as HTMLImageElement;
    const backgroundOption2 = document.getElementById('background-option-2') as HTMLImageElement;
    const backgroundOption1Radio = document.getElementById('background-option-1-radio') as HTMLInputElement;

    // Get the background images URL
    const backgroundImagesURL = getImagePath();

    // Set default background image previews
    if (backgroundOption1) backgroundOption1.src = `${backgroundImagesURL}/coffee-thumb.jpg`;
    if (backgroundOption2) backgroundOption2.src = `${backgroundImagesURL}/break-thumb.jpg`;

    // Select the first background option by default
    if (backgroundOption1Radio) {
        backgroundOption1Radio.checked = true;
    }

    // Update modal title to reflect creation instead of editing
    const modalTitle = document.getElementById('break-type-simple-edit-modal-label');
    if (modalTitle) {
        modalTitle.textContent = 'Create New Break Type';
    }

    // Initialize the bootstrap modal
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Opens the delete confirmation modal
 * @param id - The ID of the break type to delete
 * @param name - The name of the break type to delete
 */
function openDeleteConfirmationModal(id: string | null, name: string | null): void {
    if (!id || !name) {
        console.error('Break type ID or name is missing');
        return;
    }
    
    // Get the modal element
    const modalElement = document.getElementById('delete-break-type-modal');
    if (!modalElement) {
        console.error('Delete confirmation modal not found');
        return;
    }
    
    // Set break type ID and name
    const idField = document.getElementById('delete-break-type-id') as HTMLInputElement;
    const nameSpan = document.getElementById('delete-break-type-name');
    
    if (idField) idField.value = id;
    if (nameSpan) nameSpan.textContent = name;
    
    // Show the modal
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Deletes a break type
 */
async function deleteBreakType(): Promise<void> {
    try {
        // Get form element
        const form = document.getElementById('delete-break-type-form') as HTMLFormElement;
        if (!form) {
            console.error('Delete form not found');
            return;
        }
        
        // Get break type ID
        const idField = document.getElementById('delete-break-type-id') as HTMLInputElement;
        if (!idField || !idField.value) {
            console.error('Break type ID is missing');
            return;
        }
        
        // Get token for request
        const tokenElement = form.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenElement) {
            console.error('Anti-forgery token not found');
            (window as any).createToast?.('Security token not found', false);
            return;
        }
        
        const token = tokenElement.value;
        
        // Disable delete button
        const deleteButton = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
        }
        
        // Send delete request
        const url = `/Settings?handler=DeleteBreakType&id=${idField.value}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify({}), // Empty body, but required for proper AJAX POST handling
            credentials: 'same-origin'
        });
        
        // Parse the JSON response
        const data = await response.json();
        
        if (data.success) {
            // Hide modal
            const modalElement = document.getElementById('delete-break-type-modal');
            if (modalElement) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            
            // Show success message
            (window as any).createToast?.(data.message || 'Break type deleted successfully', true);
            
            // Find the card for the deleted break type
            const breakTypeId = idField.value;
            const card = document.querySelector(`article[data-id="${breakTypeId}"]`);
            
            if (card) {
                // Use the animation utility to smoothly remove the card from DOM
                animateCardRemoval(card as HTMLElement);
                
                // Check if this was the last break type and show empty state if needed
                setTimeout(() => {
                    const container = document.getElementById('break-type-container');
                    if (container && container.children.length === 0) {
                        container.innerHTML = `
                            <div class="col-12 text-center py-4">
                                <p class="text-muted mb-3">You haven't created any break types yet.</p>
                                <button type="button" class="btn btn-primary" id="add-new-break-type-button">
                                    <i class="bx bx-plus-circle me-2"></i>Add Break Type
                                </button>
                            </div>
                        `;
                        
                        // Re-attach event listener for the new button
                        const addButton = document.getElementById('add-new-break-type-button');
                        if (addButton) {
                            addButton.addEventListener('click', handleAddButtonClick);
                        }
                    }
                }, 400); // Wait a bit longer than the animation duration
            } else {
                // Fallback to full reload if card not found
                loadBreakTypes();
            }
        } else {
            // Show error message
            (window as any).createToast?.(data.message || 'Failed to delete break type', false);
        }
    } 
    catch (error) {
        console.error('Error deleting break type:', error);
        (window as any).createToast?.('An error occurred while deleting the break type', false);
    }
    finally {
        // Reset delete button
        const deleteButton = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = 'Delete';
        }
    }
}

/**
 * Clones a break type
 */
async function cloneBreakType(id: string): Promise<void> {
    try {
        // Get the anti-forgery token
        const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenElement) {
            console.error('Anti-forgery token not found');
            (window as any).createToast?.('Security token not found', false);
            return;
        }
        const token = tokenElement.value;

        // Send clone request
        const url = `/Settings?handler=CloneBreakType&id=${id}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify({}),
            credentials: 'same-origin'
        });

        // Parse the JSON response
        const data = await response.json();

        if (data.success) {
            // Show success message
            (window as any).createToast?.(data.message || 'Break type cloned successfully', true);

            // Reload break types to show the new clone
            await loadBreakTypes();
        } else {
            // Show error message
            (window as any).createToast?.(data.message || 'Failed to clone break type', false);
        }
    }
    catch (error) {
        console.error('Error cloning break type:', error);
        (window as any).createToast?.('An error occurred while cloning the break type', false);
    }
}

/**
 * Save the simple break type edit
 */
async function saveSimpleBreakTypeEdit(): Promise<void> {
    try {
        // Get form elements
        const form = document.getElementById('break-type-simple-edit-form') as HTMLFormElement;
        if (!form) {
            console.error('Simple edit form not found');
            return;
        }
        
        // Get values from form
        const idField = document.getElementById('simple-edit-break-type-id') as HTMLInputElement;
        const nameField = document.getElementById('simple-edit-break-type-name') as HTMLInputElement;
        const iconNameField = document.getElementById('simple-edit-icon-name') as HTMLInputElement;
        const countdownMessageField = document.getElementById('simple-edit-countdown-message') as HTMLInputElement;
        const countdownEndMessageField = document.getElementById('simple-edit-countdown-end-message') as HTMLInputElement;
        const endTimeTitleField = document.getElementById('simple-edit-end-time-title') as HTMLInputElement;
        const defaultDurationField = document.getElementById('simple-edit-default-duration') as HTMLInputElement;
        const timeStepField = document.getElementById('simple-edit-time-step') as HTMLInputElement;
        
        // Get selected background image option
        const selectedBgOption = form.querySelector('input[name="backgroundOption"]:checked') as HTMLInputElement;
        const selectedBgOptionValue = selectedBgOption ? parseInt(selectedBgOption.value) : 0;
        
        // Get image titles
        const bgOptionCards = document.querySelectorAll('.background-option-card');
        let selectedImageTitle = '';
        
        bgOptionCards.forEach((card) => {
            const dataOption = card.getAttribute('data-image-option');
            if (dataOption && parseInt(dataOption) === selectedBgOptionValue) {
                const img = card.querySelector('img') as HTMLImageElement;
                if (img && img.src) {
                    // Extract image title from the src attribute
                    const src = img.src;
                    const matches = src.match(/\/([^\/]+)-thumb\.jpg$/);
                    if (matches && matches[1]) {
                        // Ensure the image title is lowercase for case-sensitive storage systems
                        selectedImageTitle = matches[1].toLowerCase();
                    }
                }
            }
        });
        
        // Get token for request
        const tokenElement = form.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenElement) {
            console.error('Anti-forgery token not found');
            (window as any).createToast?.('Security token not found', false);
            return;
        }
        
        const token = tokenElement.value;
        
        // Validate form data
        if (!defaultDurationField.checkValidity() || !timeStepField.checkValidity()) {
            form.classList.add('was-validated');
            (window as any).createToast?.('Please correct the errors in the form', false);
            return;
        }
        
        // Create request payload
        // Use properly capitalized property names to match C# model exactly
        const payload = {
            BreakId: idField.value,
            Name: nameField.value,
            DefaultDurationMinutes: parseInt(defaultDurationField.value),
            BreakTimeStepMinutes: parseInt(timeStepField.value),
            CountdownMessage: countdownMessageField.value,
            CountdownEndMessage: countdownEndMessageField.value,
            EndTimeTitle: endTimeTitleField.value,
            IconName: iconNameField.value,
            ImageTitle: selectedImageTitle
        };
        
        // Debug log
        console.log('Break type payload:', payload);
        
        // Disable save button
        const saveButton = document.getElementById('simple-edit-save-btn') as HTMLButtonElement;
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
        }
        
        // Send request - Match the exact pattern from working code
        const url = `/Settings?handler=SaveBreakType`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });
        
        // Parse the JSON response
        const data = await response.json();
        
        if (data.success) {
            // Hide modal
            const modalElement = document.getElementById('break-type-simple-edit-modal');
            if (modalElement) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            
            // Show success message
            (window as any).createToast?.(data.message || 'Break type saved successfully', true);
            
            // Reload break types
            loadBreakTypes();
        } else {
            // Show error message
            (window as any).createToast?.(data.message || 'Failed to save break type', false);
            
            // Display validation errors if any
            if (data.errors) {
                console.error('Validation errors:', data.errors);
                
                // Display the specific validation errors using toast
                for (const [field, errors] of Object.entries(data.errors)) {
                    const errorArray = errors as string[];
                    if (errorArray && errorArray.length > 0) {
                        (window as any).createToast?.(
                            `${field}: ${errorArray[0]}`, 
                            false
                        );
                    }
                }
            }
        }
    } 
    catch (error) {
        console.error('Error saving break type:', error);
        (window as any).createToast?.('An error occurred while saving the break type', false);
    }
    finally {
        // Reset save button
        const saveButton = document.getElementById('simple-edit-save-btn') as HTMLButtonElement;
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Save Changes';
        }
    }
}

/**
 * Initialize Swiper instances for carousels
 */
function initSwipers(): void {
    try {
        // Check if Swiper is available
        if (typeof (window as any).Swiper === 'undefined') {
            console.error('Swiper is not available');
            return;
        }
        
        // Initialize background swiper
        const backgroundSwiperElement = document.querySelector('.background-swiper');
        if (backgroundSwiperElement) {
            const options = backgroundSwiperElement.getAttribute('data-swiper-options');
            if (options) {
                const parsedOptions = JSON.parse(options);
                new (window as any).Swiper(backgroundSwiperElement, parsedOptions);
            }
        }
        
        // Initialize icon swiper
        const iconSwiperElement = document.querySelector('.icon-swiper');
        if (iconSwiperElement) {
            const options = iconSwiperElement.getAttribute('data-swiper-options');
            if (options) {
                const parsedOptions = JSON.parse(options);
                new (window as any).Swiper(iconSwiperElement, parsedOptions);
            }
        }
    } catch (error) {
        console.error('Error initializing swipers:', error);
    }
}

/**
 * Initializes the break types section
 */
export function initBreakTypes(): void {
    console.debug('Break Types section initialized');
    
    // The new approach is to let settings.ts load the data for all sections
    // We don't need to load data here directly anymore
    
    // Initialize swipers
    initSwipers();
    
    // Initialize event listeners for wizard modal if it's opened
    document.addEventListener('shown.bs.modal', function(event) {
        const modal = event.target as HTMLElement;
        if (modal.id === 'break-type-wizard-modal') {
            // Initialize swipers inside the modal
            initSwipers();
            // Note: The wizard navigation is now handled by the wizard.ts module
        }
    });
}

// Make function available globally
(window as any).Yuzu = (window as any).Yuzu || {};
(window as any).Yuzu.Settings = (window as any).Yuzu.Settings || {};
(window as any).Yuzu.Settings.BreakTypes = {
    init: initBreakTypes,
    loadBreakTypes: loadBreakTypes
};