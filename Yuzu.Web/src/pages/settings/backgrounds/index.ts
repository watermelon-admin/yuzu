/// <reference types="jquery" />
/// <reference types="bootstrap" />
/// <reference types="filepond" />
import { createToast } from '../../../common/toast-util.js';
import { setupScrollFadeEffects, animateCardRemoval, createNoBackgroundsMessage, scrollToNewCard } from './viewport-utils.js';

/**
 * Background image management functionality for the Settings page
 */

// Background images specific state
let backgrounds: BackgroundImage[] = [];
let currentPage: number = 1;
const pageSize: number = 9;

// Check if user is subscribed (Pro member)
const isSubscribedElement = document.getElementById('backgrounds-is-subscribed') as HTMLInputElement | null;
const isSubscribed: boolean = isSubscribedElement?.value === 'true';

/**
 * Interface for background image data
 */
interface BackgroundImage {
    name: string;
    title: string;
    thumbnailUrl: string;
    fullImageUrl: string;
    isUserUploaded: boolean;
}

/**
 * Interface for storage metrics
 */
interface StorageMetrics {
    imageCount: number;
    totalSizeBytes: number;
    formattedSize: string;
}

/**
 * Interface for API responses
 */
interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T; // For collections like backgrounds and storageMetrics
    name?: string; // For single background properties
    title?: string;
    thumbnailUrl?: string;
    fullImageUrl?: string;
    errors?: Record<string, string[]>;
}

/**
 * Load background images from the server
 */
async function loadBackgroundImages(): Promise<void> {
    // Get the container outside of try/catch for scope access
    const container = document.getElementById('backgrounds-gallery-container');
    
    try {
        console.log('Loading background images from server');
        
        // Show loading state
        if (container) {
            // Clear the container first
            container.innerHTML = '';
            container.setAttribute('data-loaded', 'false');
            
            // Create loading placeholder
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'col loading-placeholder';
            
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card h-100 border-0 shadow-sm';
            
            const cardBodyDiv = document.createElement('div');
            cardBodyDiv.className = 'card-body d-flex align-items-center justify-content-center';
            
            const spinnerDiv = document.createElement('div');
            spinnerDiv.className = 'spinner-border text-primary';
            spinnerDiv.setAttribute('role', 'status');
            
            const spinnerSpan = document.createElement('span');
            spinnerSpan.className = 'visually-hidden';
            spinnerSpan.textContent = 'Loading...';
            
            spinnerDiv.appendChild(spinnerSpan);
            cardBodyDiv.appendChild(spinnerDiv);
            cardDiv.appendChild(cardBodyDiv);
            loadingDiv.appendChild(cardDiv);
            container.appendChild(loadingDiv);
        }

        const response = await fetch('?handler=BackgroundImages', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json() as ApiResponse<{ 
            backgrounds: BackgroundImage[],
            storageMetrics: StorageMetrics 
        }>;
        
        // Debug logging for the response
        console.log('Background images API response:', data);
        
        if (data.success && data.data) {
            // Process background images
            backgrounds = (data.data.backgrounds || []).map(bg => ({
                ...bg,
                // Determine if this is a user uploaded image based on the filename pattern
                isUserUploaded: bg.name.startsWith('user-')
            }));
            
            console.log(`Processed ${backgrounds.length} background images`);
            
            // Display the backgrounds
            displayBackgrounds();
            
            // Display storage metrics if available
            if (data.data.storageMetrics) {
                console.log('Found storage metrics:', data.data.storageMetrics);
                updateStorageInfo(data.data.storageMetrics);
            } else {
                console.warn('No storage metrics found in response');
            }
            
            // Mark as loaded
            if (container) {
                container.setAttribute('data-loaded', 'true');
                
                // Initialize scroll fade effects after content is loaded
                setupScrollFadeEffects();
            }
        } else {
            console.error('API returned error:', data.message);
            createToast(`Error: ${data.message || 'Failed to load background images'}`, false);
            
            // Show error state in the container
            if (container) {
                container.innerHTML = `
                    <div class="col-12 text-center py-4">
                        <div class="alert alert-danger">
                            <i class="bx bx-error-circle me-2"></i>
                            Failed to load background images. Please try again.
                        </div>
                        <button class="btn btn-sm btn-primary mt-3" onclick="window.location.reload()">
                            <i class="bx bx-refresh me-2"></i>Reload Page
                        </button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading backgrounds:', error);
        createToast('Error: Failed to load background images', false);
        
        // Show error state in the container
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <div class="alert alert-danger">
                        <i class="bx bx-error-circle me-2"></i>
                        Failed to load background images. Please try again.
                    </div>
                    <button class="btn btn-sm btn-primary mt-3" onclick="window.location.reload()">
                        <i class="bx bx-refresh me-2"></i>Reload Page
                    </button>
                </div>
            `;
            container.setAttribute('data-loaded', 'false');
        }
    }
}

/**
 * Creates a background card element from the template
 * @param background - The background image data
 * @returns The populated card element
 */
function createBackgroundCard(background: BackgroundImage): DocumentFragment {
    console.log(`Creating card for ${background.title}`, background);
    
    // Get the template
    const template = document.getElementById('backgrounds-card-template') as HTMLTemplateElement;
    if (!template) {
        console.error('Background card template not found');
        throw new Error('Template not found');
    }
    
    // Clone the template
    const card = document.importNode(template.content, true);
    
    // Set image source and alt text
    const img = card.querySelector('.card-img-top') as HTMLImageElement;
    if (img) {
        img.src = background.thumbnailUrl;
        img.alt = background.title;
        
        // Add error handling for images
        img.onerror = function() {
            console.error(`Failed to load image: ${background.thumbnailUrl}`);
            (img as HTMLImageElement).src = ''; // Clear the src to prevent further errors
            (img as HTMLImageElement).alt = 'Image loading failed';
            
            // Add a placeholder
            const imgContainer = img.closest('.position-relative');
            if (imgContainer) {
                const errorPlaceholder = document.createElement('div');
                errorPlaceholder.className = 'image-error-placeholder d-flex align-items-center justify-content-center';
                errorPlaceholder.style.height = '180px';
                errorPlaceholder.style.backgroundColor = '#f8f9fa';
                errorPlaceholder.style.borderRadius = '0.5rem 0.5rem 0 0';
                errorPlaceholder.innerHTML = '<i class="bx bx-image text-muted" style="font-size: 3rem;"></i>';
                
                // Insert before the img
                imgContainer.insertBefore(errorPlaceholder, img);
                
                // Hide the original img
                img.style.display = 'none';
            }
        };
        
        console.log(`Set image src: ${img.src}`);
    } else {
        console.error('Image element not found in card template');
    }
    
    // Add data attribute to track the image name for easier lookup
    const cardRoot = card.querySelector('.col');
    if (cardRoot) {
        cardRoot.setAttribute('data-background-name', background.name);
        // Removed tooltip attributes as requested
    } else {
        console.error('Col element not found in card template');
    }
    
    // Set card styles for viewport container
    const cardElement = card.querySelector('.settings-card');
    if (cardElement) {
        cardElement.classList.add('h-100'); // Ensure full height
    } else {
        console.error('Settings card element not found in card template');
    }
    
    // Set title
    const titleElement = card.querySelector('.backgrounds-card-title');
    if (titleElement) {
        titleElement.textContent = background.title;
    } else {
        console.error('Title element not found in card template');
    }
    
    // Add appropriate badge based on image type
    const imgContainer = card.querySelector('.position-relative');
    if (imgContainer) {
        const badge = document.createElement('div');
        
        if (background.isUserUploaded) {
            badge.className = 'image-badge user-image-badge';
            badge.textContent = 'Custom';
        } else {
            badge.className = 'image-badge system-image-badge';
            badge.textContent = 'System';
        }
        
        imgContainer.appendChild(badge);
    } else {
        console.error('Image container not found in card template');
    }
    
    // Set up preview button
    const previewButton = card.querySelector('.backgrounds-preview-button');
    if (previewButton) {
        previewButton.addEventListener('click', () => previewImage(background));
    } else {
        console.error('Preview button not found in card template');
    }
    
    // Set up delete button
    const deleteButton = card.querySelector('.backgrounds-delete-button');
    if (deleteButton) {
        if (background.isUserUploaded && isSubscribed) {
            deleteButton.addEventListener('click', () => confirmDelete(background));
        } else {
            // Hide delete button for system backgrounds or non-subscribed users
            (deleteButton as HTMLElement).style.display = 'none';
        }
    } else {
        console.error('Delete button not found in card template');
    }
    
    console.log('Card created successfully');
    return card;
}

// createNoBackgroundsMessage now imported from viewport-utils.js

/**
 * Display background images with pagination
 * @param scrollToTop - Whether to scroll to the top after displaying (defaults to false)
 */
function displayBackgrounds(scrollToTop: boolean = false): void {
    const container = document.getElementById('backgrounds-gallery-container');
    if (!container) {
        console.error('Background container not found');
        return;
    }
    
    console.log(`displayBackgrounds called with ${backgrounds.length} backgrounds`);
    
    // Clear the container
    container.innerHTML = '';

    // With viewport layout, we show all backgrounds at once instead of paginating
    
    // Tooltips removed as requested
    
    // Handle empty state
    if (backgrounds.length === 0) {
        console.log('No backgrounds found, showing empty state message');
        container.appendChild(createNoBackgroundsMessage());
        // Update the container's data-loaded attribute
        container.setAttribute('data-loaded', 'true');
        // Hide pagination
        const paginationControls = document.getElementById('backgrounds-pagination-controls');
        if (paginationControls) {
            paginationControls.style.display = 'none';
        }
        // Set up fade effects but they should hide themselves since there's no scrollable content
        setupScrollFadeEffects();
        return;
    }

    console.log(`Creating ${backgrounds.length} background cards`);
    
    // Get all backgrounds and create cards (no pagination)
    backgrounds.forEach((background, index) => {
        try {
            console.log(`Creating card for background ${index + 1}: ${background.title}`);
            const card = createBackgroundCard(background);
            container.appendChild(card);
        } catch (error) {
            console.error(`Error creating card for background ${background.title}:`, error);
        }
    });

    // Tooltips removed as requested
    
    // Hide pagination controls since we're using the viewport scroll
    const paginationControls = document.getElementById('backgrounds-pagination-controls');
    if (paginationControls) {
        paginationControls.style.display = 'none';
    }
    
    // Set the container's data-loaded attribute to indicate content is loaded
    container.setAttribute('data-loaded', 'true');
    
    // Update fade effects after content is loaded
    setupScrollFadeEffects();
    
    console.log('Background cards created and displayed successfully');
}

/**
 * Creates a pagination button
 * @param type - The type of button (prev, next, page)
 * @param pageNumber - The page number (for page type)
 * @param isActive - Whether this button is active
 * @param isDisabled - Whether this button is disabled
 * @returns The pagination button element
 */
function createPaginationButton(
    type: 'prev' | 'next' | 'page', 
    pageNumber: number = 0, 
    isActive: boolean = false, 
    isDisabled: boolean = false
): HTMLElement {
    const listItem = document.createElement('li');
    
    // Set appropriate classes
    let className = 'page-item';
    if (isActive) className += ' active';
    if (isDisabled) className += ' disabled';
    listItem.className = className;
    
    // Create the link
    const link = document.createElement('a');
    link.className = 'page-link';
    link.href = '#';
    
    // Set content based on type
    if (type === 'prev') {
        const icon = document.createElement('i');
        icon.className = 'bx bx-chevron-left';
        link.appendChild(icon);
    } else if (type === 'next') {
        const icon = document.createElement('i');
        icon.className = 'bx bx-chevron-right';
        link.appendChild(icon);
    } else {
        // Regular page number
        link.textContent = pageNumber.toString();
    }
    
    // Set click handler
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (isDisabled) return;
        
        if (type === 'prev' && currentPage > 1) {
            currentPage--;
            displayBackgrounds();
        } else if (type === 'next' && currentPage < pageNumber) {
            // For next button, pageNumber represents totalPages
            currentPage++;
            displayBackgrounds();
        } else if (type === 'page') {
            currentPage = pageNumber;
            displayBackgrounds();
        }
    });
    
    listItem.appendChild(link);
    return listItem;
}

/**
 * Update pagination controls
 * @param totalPages - The total number of pages
 */
function updatePagination(totalPages: number): void {
    const paginationControls = document.getElementById('backgrounds-pagination-controls');
    if (!paginationControls) {
        console.error('Pagination controls container not found');
        return;
    }
    
    // Clear current pagination
    paginationControls.innerHTML = '';

    // Hide pagination if only one page
    if (totalPages <= 1) {
        paginationControls.style.display = 'none';
        return;
    }

    // Show pagination
    paginationControls.style.display = 'flex';

    // Add previous button
    const prevButton = createPaginationButton('prev', 0, false, currentPage === 1);
    paginationControls.appendChild(prevButton);

    // Add page number buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = createPaginationButton('page', i, currentPage === i);
        paginationControls.appendChild(pageButton);
    }

    // Add next button
    const nextButton = createPaginationButton('next', totalPages, false, currentPage === totalPages);
    paginationControls.appendChild(nextButton);
}

/**
 * Preview image in modal
 * @param background - The background image to preview
 */
function previewImage(background: BackgroundImage): void {
    const modalElement = document.getElementById('backgrounds-preview-modal');
    if (!modalElement) {
        console.error('Preview modal not found');
        return;
    }
    
    const modal = new (window as any).bootstrap.Modal(modalElement);
    const previewImage = document.getElementById('backgrounds-preview-image') as HTMLImageElement;
    const modalTitle = document.getElementById('backgrounds-preview-modal-label');
    
    if (previewImage) {
        previewImage.src = background.fullImageUrl;
    }
    
    if (modalTitle) {
        modalTitle.textContent = `Background Preview: ${background.title}`;
    }
    
    modal.show();
}

/**
 * Confirm delete operation
 * @param background - The background image to delete
 */
function confirmDelete(background: BackgroundImage): void {
    const modalElement = document.getElementById('backgrounds-delete-modal');
    if (!modalElement) {
        console.error('Delete modal not found');
        return;
    }
    
    const imageNameField = document.getElementById('backgrounds-delete-image-name') as HTMLInputElement;
    if (imageNameField) {
        imageNameField.value = background.name;
    }
    
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Delete the selected image
 */
async function deleteSelectedImage(): Promise<void> {
    const imageNameField = document.getElementById('backgrounds-delete-image-name') as HTMLInputElement;
    if (!imageNameField || !imageNameField.value) {
        console.error('Image name not found');
        return;
    }
    
    const imageName = imageNameField.value;
    const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
    if (!tokenElement) {
        console.error('Anti-forgery token not found');
        createToast('Error: Security token not found', false);
        return;
    }
    
    try {
        // Disable the delete button
        const deleteButton = document.getElementById('backgrounds-confirm-delete-button') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
        }
        
        const response = await fetch('?handler=DeleteImage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': tokenElement.value
            },
            body: JSON.stringify({ imageName })
        });

        const data = await response.json() as ApiResponse;

        // Hide the modal
        const modalElement = document.getElementById('backgrounds-delete-modal');
        if (modalElement) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

        if (data.success) {
            // Find the card before removing from array
            const card = document.querySelector(`[data-background-name="${imageName}"]`);
            const cardElement = card?.closest('.col');
            
            // Remove the image from the array
            backgrounds = backgrounds.filter(bg => bg.name !== imageName);
            
            if (cardElement) {
                // Use animation to remove the card
                animateCardRemoval(cardElement as HTMLElement);
                
                // If this was the last card, show empty state after animation completes
                if (backgrounds.length === 0) {
                    setTimeout(() => {
                        displayBackgrounds(); // This will show the empty state message
                    }, 350); // Wait for animation to complete
                }
            } else {
                // Fall back to full refresh if card element not found
                displayBackgrounds();
            }
            
            // Show success message
            createToast('Success: Background image deleted successfully', true);
            
            // Refresh background list and storage metrics
            loadBackgroundImages();
            
            // Update fade effects
            setupScrollFadeEffects();
        } else {
            createToast(`Error: ${data.message || 'Failed to delete image'}`, false);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        createToast('Error: Failed to delete image', false);
    } finally {
        // Reset the delete button
        const deleteButton = document.getElementById('backgrounds-confirm-delete-button') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = 'Delete';
        }
    }
}

/**
 * Initialize FilePond file upload
 */
function initializeFilePond(): void {
    // Check if FilePond is available
    if (typeof (window as any).FilePond === 'undefined') {
        console.error('FilePond is not available');
        return;
    }
    
    const FilePond = (window as any).FilePond;
    const FilePondPluginFileValidateSize = (window as any).FilePondPluginFileValidateSize;
    const FilePondPluginFileValidateType = (window as any).FilePondPluginFileValidateType;
    const FilePondPluginImagePreview = (window as any).FilePondPluginImagePreview;
    
    // Register FilePond plugins
    FilePond.registerPlugin(
        FilePondPluginFileValidateSize,
        FilePondPluginFileValidateType,
        FilePondPluginImagePreview
    );

    // Get FilePond element
    const inputElement = document.getElementById('backgrounds-file-upload') as HTMLInputElement;
    if (!inputElement) {
        console.error('FilePond input element not found with id: backgrounds-file-upload');
        return;
    }
    
    // Create FilePond instance
    const pond = FilePond.create(inputElement, {
        labelIdle: 'Drag & Drop your image or <span class="filepond--label-action">Browse</span>',
        acceptedFileTypes: ['image/jpeg', 'image/png'],
        allowMultiple: false,
        maxFileSize: '5MB',
        name: 'file', // Match the parameter name expected by the backend
        instantUpload: false, // Disable automatic uploading
        allowRevert: true, // Allow removing files
        allowProcess: false, // Disable FilePond's process button
        styleButtonProcessItemPosition: 'none', // Hide the process button
        server: {
            process: {
                url: '?handler=UploadImage',
                method: 'POST',
                withCredentials: false,
                headers: {
                    'RequestVerificationToken': (document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement).value,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                // Don't use any special encoding for FilePond - send a standard multipart/form-data
                process: (fieldName: string, file: File, metadata: any, load: Function, error: Function, progress: Function, abort: Function) => {
                    // Get the title from the input field
                    const imageTitleField = document.getElementById('backgrounds-image-title') as HTMLInputElement;
                    const imageTitle = imageTitleField ? imageTitleField.value.trim() : '';
                    
                    // Validate the title
                    if (!imageTitle) {
                        error('Please enter a title for your background image');
                        return {
                            abort: () => {}
                        };
                    }
                    
                    // Create a standard FormData object
                    const formData = new FormData();
                    formData.append(fieldName, file, file.name);
                    formData.append('imageTitle', imageTitle);
                    
                    // Create the XHR request
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '?handler=UploadImage');
                    
                    // Add the verification token and AJAX request headers
                    xhr.setRequestHeader('RequestVerificationToken', 
                        (document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement).value);
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    xhr.setRequestHeader('Accept', 'application/json');
                    
                    // Set up progress, success, and error handlers
                    xhr.upload.onprogress = (e) => {
                        progress(e.lengthComputable, e.loaded, e.total);
                    };
                    
                    xhr.onload = function() {
                        console.log(`FilePond XHR Response status: ${xhr.status}`);
                        console.log(`FilePond XHR Response headers: ${xhr.getAllResponseHeaders()}`);
                        console.log(`FilePond XHR Response text: ${xhr.responseText.substring(0, 200)}${xhr.responseText.length > 200 ? '...' : ''}`);
                        
                        if (xhr.status >= 200 && xhr.status < 300) {
                            load(xhr.responseText);
                        } else {
                            console.error('FilePond upload failed:', xhr.status, xhr.statusText);
                            console.error('FilePond response content:', xhr.responseText);
                            error('Upload failed: ' + xhr.statusText);
                        }
                    };
                    
                    xhr.onerror = function() {
                        console.error('FilePond network error during upload');
                        console.error('FilePond XHR Error Status:', xhr.status);
                        console.error('FilePond XHR Error statusText:', xhr.statusText);
                        console.error('FilePond XHR Error responseText:', xhr.responseText);
                        error('Upload failed: Network error. Please check console for details.');
                    };
                    
                    // Begin the upload
                    xhr.send(formData);
                    
                    // Return abort function
                    return {
                        abort: () => {
                            xhr.abort();
                            abort();
                        }
                    };
                },
                onload: (response: string) => {
                    console.log('FilePond onload callback triggered');
                    console.log('FilePond response:', response.substring(0, 200) + (response.length > 200 ? '...' : ''));
                    
                    // Reset button state
                    const uploadButton = document.getElementById('backgrounds-upload-button') as HTMLButtonElement;
                    if (uploadButton) {
                        uploadButton.disabled = false;
                        uploadButton.textContent = 'Upload';
                    }
                    
                    // Parse the response
                    let result: ApiResponse;
                    try {
                        result = JSON.parse(response);
                        console.log('FilePond parsed response:', result);
                    } catch (error) {
                        console.error('Error parsing FilePond response:', error);
                        console.error('Raw response that failed to parse:', response);
                        createToast('Error: Failed to parse server response', false);
                        return response;
                    }
                    
                    if (result.success) {

                        // Add the new image to the list and refresh the display
                        console.log('FilePond upload result:', result);
                        
                        // Create the new background object
                        const newBackground: BackgroundImage = {
                            name: result.data.name,
                            title: result.data.title,
                            thumbnailUrl: result.data.thumbnailUrl,
                            fullImageUrl: result.data.fullImageUrl,
                            isUserUploaded: true
                        };
                        
                        // Log detailed information about the new background
                        console.log('New background object created:', newBackground);
                        console.log('Properties check:');
                        console.log('- name:', newBackground.name);
                        console.log('- title:', newBackground.title);
                        console.log('- thumbnailUrl:', newBackground.thumbnailUrl);
                        console.log('- fullImageUrl:', newBackground.fullImageUrl);
                        console.log('- isUserUploaded:', newBackground.isUserUploaded);
                        
                        // Add the new background to the beginning of the array
                        backgrounds.unshift(newBackground);
                        
                        console.log('Background added to list');
                        console.log('Current backgrounds list length:', backgrounds.length);
                        
                        // Check if it's the first background (replacing empty state)
                        const container = document.getElementById('backgrounds-gallery-container');
                        if (container && backgrounds.length === 1) {
                            // If this is the first background, do a full refresh to replace the empty state
                            displayBackgrounds();
                        } else if (container) {
                            // For additional backgrounds, just insert the new card at the beginning with animation
                            const card = createBackgroundCard(newBackground);
                            const cardElement = card.querySelector('.col');
                            if (cardElement) {
                                cardElement.classList.add('card-new'); // Add animation class
                                cardElement.setAttribute('id', `bg-card-${Date.now()}`); // Add unique ID for scrolling
                                container.insertBefore(card, container.firstChild as Node);
                                
                                // Update fade effects after adding the new card
                                setupScrollFadeEffects();
                                
                                // Scroll to the newly added card
                                scrollToNewCard(cardElement as HTMLElement);
                            } else {
                                // Fall back to full refresh if card creation fails
                                displayBackgrounds();
                            }
                        } else {
                            // Fall back to full refresh if container not found
                            displayBackgrounds();
                        }
                        
                        // Clear the form
                        const titleInput = document.getElementById('backgrounds-image-title') as HTMLInputElement;
                        if (titleInput) {
                            titleInput.value = '';
                        }
                        
                        // Reset validation
                        const titleValidationMessage = document.getElementById('backgrounds-title-validation-message');
                        const fileValidationMessage = document.getElementById('backgrounds-file-validation-message');
                        const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
                        
                        if (titleValidationMessage) titleValidationMessage.textContent = '';
                        if (fileValidationMessage) fileValidationMessage.textContent = '';
                        if (formValidationAlert) formValidationAlert.classList.add('d-none');
                        
                        // Close the modal
                        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('backgrounds-upload-modal'));
                        if (modal) {
                            modal.hide();
                        }
                        
                        // Show success message
                        createToast('Success: Background image uploaded successfully', true);
                        
                        // Reset the FilePond instance
                        pond.removeFile();
                    } else {
                        // Show error in the form
                        const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
                        const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                        
                        if (formValidationAlert && validationMessageElement) {
                            formValidationAlert.classList.remove('d-none');
                            validationMessageElement.textContent = result.message || 'Failed to upload image';
                        } else {
                            createToast(`Error: ${result.message || 'Failed to upload image'}`, false);
                        }
                    }
                    return response;
                },
                onerror: (error: string) => {
                    console.error('FilePond onerror callback triggered with:', error);
                    
                    // Reset button state in case of error
                    const uploadButton = document.getElementById('backgrounds-upload-button') as HTMLButtonElement;
                    if (uploadButton) {
                        uploadButton.disabled = false;
                        uploadButton.textContent = 'Upload';
                    }
                    
                    // Show error in form too
                    const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
                    const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                    if (formValidationAlert && validationMessageElement) {
                        formValidationAlert.classList.remove('d-none');
                        validationMessageElement.textContent = `Upload error: ${error}`;
                    }
                    
                    // Show error toast
                    createToast(`Error: Failed to upload image: ${error}`, false);
                    return error;
                }
            }
        }
    });
    
    // Add validation handlers
    const titleInput = document.getElementById('backgrounds-image-title') as HTMLInputElement;
    const uploadButton = document.getElementById('backgrounds-upload-button') as HTMLButtonElement;
    const titleValidationMessage = document.getElementById('backgrounds-title-validation-message');
    const fileValidationMessage = document.getElementById('backgrounds-file-validation-message');
    const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
    
    // Function to validate the form and update button state
    function validateForm(forceShowErrors = false): boolean {
        let isValid = true;
        
        // Clear previous validation messages
        if (titleValidationMessage) titleValidationMessage.textContent = '';
        if (fileValidationMessage) fileValidationMessage.textContent = '';
        if (formValidationAlert) formValidationAlert.classList.add('d-none');
        
        // Validate title
        const imageTitle = titleInput ? titleInput.value.trim() : '';
        if (!imageTitle) {
            isValid = false;
            // Only show validation message if user has interacted or we're forcing validation
            if ((hasInteracted || forceShowErrors) && titleValidationMessage) {
                titleValidationMessage.textContent = 'Please enter a title for your background image';
            }
        } else if (imageTitle.length < 3) {
            isValid = false;
            // Only show validation message if user has interacted or we're forcing validation
            if ((hasInteracted || forceShowErrors) && titleValidationMessage) {
                titleValidationMessage.textContent = 'Title must be at least 3 characters long';
            }
        }
        
        // Validate file
        // Check for files in FilePond - pond.getFiles() returns an array of files
        if (pond && (!pond.getFiles || pond.getFiles().length === 0)) {
            isValid = false;
            // Only show validation message if user has interacted or we're forcing validation
            if ((hasInteracted || forceShowErrors) && fileValidationMessage) {
                fileValidationMessage.textContent = 'Please select an image file';
            }
        }
        
        // Update button state
        if (uploadButton) {
            uploadButton.disabled = !isValid;
        }
        
        return isValid;
    }
    
    // Add input event listeners for real-time validation after first interaction
    let hasInteracted = false;
    
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            hasInteracted = true;
            validateForm();
        });
    }
    
    // Listen for FilePond changes
    pond.on('addfile', () => {
        hasInteracted = true;
        validateForm();
    });
    
    pond.on('removefile', () => {
        hasInteracted = true;
        validateForm();
    });
    
    // Disable the upload button initially without showing validation errors
    if (uploadButton) {
        uploadButton.disabled = true;
    }
    
    // Set up modal open listener to reset form
    const uploadModal = document.getElementById('backgrounds-upload-modal');
    if (uploadModal) {
        uploadModal.addEventListener('show.bs.modal', () => {
            // Reset form fields
            if (titleInput) titleInput.value = '';
            pond.removeFiles();
            
            // Clear validation messages
            if (titleValidationMessage) titleValidationMessage.textContent = '';
            if (fileValidationMessage) fileValidationMessage.textContent = '';
            if (formValidationAlert) formValidationAlert.classList.add('d-none');
            
            // Reset interaction state
            hasInteracted = false;
            
            // Disable upload button
            if (uploadButton) {
                uploadButton.disabled = true;
            }
        });
    }
    
    // Set up upload button to manually handle the upload using the exact same approach as before
    if (uploadButton) {
        uploadButton.addEventListener('click', async () => {
            // Validate before submission and force showing errors
            if (!validateForm(true)) {
                if (formValidationAlert) formValidationAlert.classList.remove('d-none');
                return;
            }
            
            // Get the file from FilePond
            if (!pond.getFiles() || pond.getFiles().length === 0) {
                if (fileValidationMessage) fileValidationMessage.textContent = 'Please select a file to upload';
                return;
            }
            
            // FilePond stores the file in a specific structure
            const pondFile = pond.getFiles()[0];
            
            // Get the form data
            const titleValue = titleInput ? titleInput.value.trim() : '';
            const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
            
            // Create a FormData instance
            const formData = new FormData();
            
            // Set loading state
            uploadButton.disabled = true;
            uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...';
            
            // Add data to FormData
            formData.append('imageTitle', titleValue);
            // Extract the actual file from the FilePond file object
            if (pondFile.file) {
                formData.append('file', pondFile.file);
            }
            if (tokenInput) {
                formData.append('__RequestVerificationToken', tokenInput.value);
            }
            
            try {
                // Use our own manual XHR request instead of relying on FilePond's processing
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '?handler=UploadImage');
                
                // Add the verification token as a header (important for ASP.NET Core)
                xhr.setRequestHeader('RequestVerificationToken', tokenInput.value);
                
                // Add additional headers for proper AJAX request identification
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.setRequestHeader('Accept', 'application/json');
                
                // Handle progress
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        console.log(`Upload progress: ${percentComplete.toFixed(1)}%`);
                    }
                };
                
                // Set up response handler
                xhr.onload = function() {
                    // Reset button state
                    uploadButton.disabled = false;
                    uploadButton.textContent = 'Upload';
                    
                    console.log(`XHR Response status: ${xhr.status}`);
                    console.log(`XHR Response headers: ${xhr.getAllResponseHeaders()}`);
                    console.log(`XHR Response text: ${xhr.responseText.substring(0, 200)}${xhr.responseText.length > 200 ? '...' : ''}`);
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let result: ApiResponse;
                        try {
                            result = JSON.parse(xhr.responseText);
                            console.log('Upload response parsed as JSON:', result);
                            
                            if (result.success) {
                                // Add the new image to the list and refresh the display
                                console.log('Upload result:', result);
                                
                                // Create the new background object
                                const newBackground: BackgroundImage = {
                                    name: result.data.name,
                                    title: result.data.title,
                                    thumbnailUrl: result.data.thumbnailUrl,
                                    fullImageUrl: result.data.fullImageUrl,
                                    isUserUploaded: true
                                };
                                
                                // Log detailed information about the new background
                                console.log('New background object created:', newBackground);
                                console.log('Properties check:');
                                console.log('- name:', newBackground.name);
                                console.log('- title:', newBackground.title);
                                console.log('- thumbnailUrl:', newBackground.thumbnailUrl);
                                console.log('- fullImageUrl:', newBackground.fullImageUrl);
                                console.log('- isUserUploaded:', newBackground.isUserUploaded);
                                
                                // Add the new background to the beginning of the array
                                backgrounds.unshift(newBackground);
                                
                                console.log('Background added to list');
                                console.log('Current backgrounds list length:', backgrounds.length);
                                
                                // Check if it's the first background (replacing empty state)
                                const container = document.getElementById('backgrounds-gallery-container');
                                if (container && backgrounds.length === 1) {
                                    // If this is the first background, do a full refresh to replace the empty state
                                    displayBackgrounds();
                                    
                                    // After refresh, scroll to the top of the viewport
                                    scrollToNewCard(null);
                                } else if (container) {
                                    // For additional backgrounds, just insert the new card at the beginning with animation
                                    const card = createBackgroundCard(newBackground);
                                    const cardElement = card.querySelector('.col');
                                    if (cardElement) {
                                        cardElement.classList.add('card-new'); // Add animation class
                                        cardElement.setAttribute('id', `bg-card-${Date.now()}`); // Add unique ID for scrolling
                                        container.insertBefore(card, container.firstChild as Node);
                                        
                                        // Update fade effects after adding the new card
                                        setupScrollFadeEffects();
                                        
                                        // Scroll to the newly added card
                                        scrollToNewCard(cardElement as HTMLElement);
                                    } else {
                                        // Fall back to full refresh if card creation fails
                                        displayBackgrounds();
                                    }
                                } else {
                                    // Fall back to full refresh if container not found
                                    displayBackgrounds();
                                }
                                
                                // Reset form
                                if (titleInput) titleInput.value = '';
                                pond.removeFile();
                                
                                // Reset validation
                                if (titleValidationMessage) titleValidationMessage.textContent = '';
                                if (fileValidationMessage) fileValidationMessage.textContent = '';
                                if (formValidationAlert) formValidationAlert.classList.add('d-none');
                                
                                // Close modal
                                const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('backgrounds-upload-modal'));
                                if (modal) {
                                    modal.hide();
                                }
                                
                                // Show success message
                                createToast('Success: Background image uploaded successfully', true);
                        
                        // Refresh background images and storage metrics
                        loadBackgroundImages();
                            } else {
                                // Show error in the form
                                const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                                if (formValidationAlert && validationMessageElement) {
                                    formValidationAlert.classList.remove('d-none');
                                    validationMessageElement.textContent = result.message || 'Failed to upload image';
                                } else {
                                    createToast(`Error: ${result.message || 'Failed to upload image'}`, false);
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing response:', error, xhr.responseText);
                            createToast('Error: Failed to parse server response', false);
                        }
                    } else {
                        console.error('Upload failed:', xhr.status, xhr.statusText);
                        console.error('Response content:', xhr.responseText);
                        
                        // Try to parse the error response as JSON (ASP.NET Core often returns JSON error details)
                        let errorMessage = `Upload failed with status ${xhr.status}`;
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            if (errorResponse.message) {
                                errorMessage = errorResponse.message;
                            } else if (errorResponse.title) {
                                errorMessage = errorResponse.title; // ASP.NET Core ProblemDetails format
                            }
                            console.error('Error details:', errorResponse);
                        } catch (parseError) {
                            console.error('Could not parse error response as JSON:', parseError);
                        }
                        
                        createToast(`Error: ${errorMessage}`, false);
                        
                        if (formValidationAlert) {
                            formValidationAlert.classList.remove('d-none');
                            const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                            if (validationMessageElement) {
                                validationMessageElement.textContent = errorMessage;
                            }
                        }
                    }
                };
                
                // Handle network errors
                xhr.onerror = function() {
                    console.error('Network error during upload');
                    console.error('XHR Error Status:', xhr.status);
                    console.error('XHR Error statusText:', xhr.statusText);
                    console.error('XHR Error responseText:', xhr.responseText);
                    
                    createToast('Error: Network error during upload. Please check console for details.', false);
                    
                    // Show detailed error in the form too
                    if (formValidationAlert) {
                        formValidationAlert.classList.remove('d-none');
                        const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                        if (validationMessageElement) {
                            validationMessageElement.textContent = 'Network error: Unable to communicate with the server. Please try again later.';
                        }
                    }
                    
                    // Reset button state
                    uploadButton.disabled = false;
                    uploadButton.textContent = 'Upload';
                };
                
                // Send the request
                xhr.send(formData);
                
            } catch (error) {
                console.error('Error during upload:', error);
                
                // Show error in the UI
                if (formValidationAlert) formValidationAlert.classList.remove('d-none');
                const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                if (validationMessageElement) {
                    validationMessageElement.textContent = (error as Error).message || 'Upload failed';
                }
                
                // Reset button state
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
            }
        });
    }
    
    return pond;
}

// scrollToNewCard is now imported from viewport-utils.ts

/**
 * Update the storage info section with metrics
 * @param metrics - The storage metrics to display
 */
function updateStorageInfo(metrics: StorageMetrics): void {
    console.log('updateStorageInfo called with metrics:', metrics);
    const infoElement = document.getElementById('backgrounds-storage-info');
    
    if (!infoElement) {
        console.error('Could not find backgrounds-storage-info element');
        return;
    }
    
    try {
        // Check if metrics is valid
        if (!metrics) {
            console.error('Invalid metrics object:', metrics);
            infoElement.textContent = 'Error loading storage information.';
            return;
        }
        
        // Use safe access with defaults
        const userImagesCount = metrics.imageCount || 0;
        const storageSize = metrics.formattedSize || '0 B';
        
        // Count the non-user images by checking our loaded backgrounds
        const systemImagesCount = backgrounds.filter(bg => !bg.isUserUploaded).length;
        const totalImagesCount = userImagesCount + systemImagesCount;
        
        // Create the info text - cleaner and more concise
        let infoText = '';
        
        if (isSubscribed) {
            if (userImagesCount > 0) {
                infoText = `${totalImagesCount} background images (${systemImagesCount} system + ${userImagesCount} custom) · ${storageSize} storage used`;
            } else {
                infoText = `${totalImagesCount} background images (all system) · No custom storage used`;
            }
        } else {
            infoText = `${totalImagesCount} background images · Subscribe to Pro to upload custom backgrounds`;
        }
        
        console.log('Setting info text to:', infoText);
        infoElement.textContent = infoText;
    } catch (error) {
        console.error('Error updating storage info:', error);
        infoElement.textContent = 'Error displaying storage information.';
    }
}

/**
 * Initialize backgrounds section
 */
export function initBackgrounds(): void {
    console.debug('Backgrounds section initialized');
    
    // Ensure the title and container is visible
    const backgroundsSection = document.getElementById('backgrounds');
    if (backgroundsSection) {
        console.log('Found backgrounds section');
    } else {
        console.error('Could not find backgrounds section');
    }
    
    // Set up delete confirmation button event listener
    const confirmDeleteButton = document.getElementById('backgrounds-confirm-delete-button');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', deleteSelectedImage);
    }
    
    // Initialize FilePond
    initializeFilePond();
    
    // Set up scroll fade effects immediately to ensure scrollbars are visible right away
    setupScrollFadeEffects();
    
    // Load background images - fade effects will be set up again after loading content
    setTimeout(() => {
        loadBackgroundImages();
    }, 100);
    
    // Check browser console for any errors
    console.log('Fade overlays initialized immediately and will update when content loads');
    
    // Debug the state of fade overlays
    const topFade = document.querySelector('.fade-overlay.fade-top');
    const bottomFade = document.querySelector('.fade-overlay.fade-bottom');
    console.log('Initial fade overlay states:', {
        topFade: topFade ? (topFade.classList.contains('hidden') ? 'hidden' : 'visible') : 'not found',
        bottomFade: bottomFade ? (bottomFade.classList.contains('hidden') ? 'hidden' : 'visible') : 'not found'
    });
    
    // Log the DOM structure of the backgrounds section to help with debugging
    if (backgroundsSection) {
        console.log('Backgrounds section HTML structure:', backgroundsSection.innerHTML.substring(0, 500) + '...');
    }
    
    // Fade effects will be properly set up by the setupScrollFadeEffects function
    // which includes event listeners for scrolling and resizing
}

// Make function available globally
(window as any).Yuzu = (window as any).Yuzu || {};
(window as any).Yuzu.Settings = (window as any).Yuzu.Settings || {};
(window as any).Yuzu.Settings.Backgrounds = {
    init: initBackgrounds,
    loadBackgroundImages: loadBackgroundImages
};