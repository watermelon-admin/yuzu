/// <reference types="jquery" />
/// <reference types="bootstrap" />
/// <reference types="filepond" />
import { createToast } from '../../../common/toast-util.js';
/**
 * Background image management functionality for the Settings page
 */
// Background images specific state
let backgrounds = [];
let currentPage = 1;
const pageSize = 9;
// Check if user is subscribed (Pro member)
const isSubscribedElement = document.getElementById('backgrounds-is-subscribed');
const isSubscribed = (isSubscribedElement === null || isSubscribedElement === void 0 ? void 0 : isSubscribedElement.value) === 'true';
/**
 * Load background images from the server
 */
async function loadBackgroundImages() {
    var _a;
    try {
        // Show loading state
        const container = document.getElementById('backgrounds-gallery-container');
        if (container) {
            // Clear the container first
            container.innerHTML = '';
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
        const data = await response.json();
        if (data.success) {
            backgrounds = ((_a = data.data) === null || _a === void 0 ? void 0 : _a.backgrounds.map(bg => (Object.assign(Object.assign({}, bg), { 
                // Determine if this is a user uploaded image based on the filename pattern
                isUserUploaded: bg.name.startsWith('user-') })))) || [];
            displayBackgrounds();
        }
        else {
            createToast(`Error: ${data.message || 'Failed to load background images'}`, false);
        }
    }
    catch (error) {
        console.error('Error loading backgrounds:', error);
        createToast('Error: Failed to load background images', false);
    }
}
/**
 * Creates a background card element from the template
 * @param background - The background image data
 * @returns The populated card element
 */
function createBackgroundCard(background) {
    // Get the template
    const template = document.getElementById('backgrounds-card-template');
    if (!template) {
        console.error('Background card template not found');
        throw new Error('Template not found');
    }
    // Clone the template
    const card = document.importNode(template.content, true);
    // Set image source and alt text
    const img = card.querySelector('.card-img-top');
    if (img) {
        img.src = background.thumbnailUrl;
        img.alt = background.title;
    }
    // Set title
    const titleElement = card.querySelector('.backgrounds-card-title');
    if (titleElement) {
        titleElement.textContent = background.title;
    }
    // Add appropriate badge based on image type
    const imgContainer = card.querySelector('.position-relative');
    if (imgContainer) {
        const badge = document.createElement('div');
        if (background.isUserUploaded) {
            badge.className = 'image-badge user-image-badge';
            badge.textContent = 'Custom';
        }
        else {
            badge.className = 'image-badge system-image-badge';
            badge.textContent = 'System';
        }
        imgContainer.appendChild(badge);
    }
    // Set up preview button
    const previewButton = card.querySelector('.backgrounds-preview-button');
    if (previewButton) {
        previewButton.addEventListener('click', () => previewImage(background));
    }
    // Set up delete button
    const deleteButton = card.querySelector('.backgrounds-delete-button');
    if (deleteButton) {
        if (background.isUserUploaded && isSubscribed) {
            deleteButton.addEventListener('click', () => confirmDelete(background));
        }
        else {
            // Hide delete button for system backgrounds or non-subscribed users
            deleteButton.style.display = 'none';
        }
    }
    return card;
}
/**
 * Creates a "no backgrounds" message element
 * @returns The message element
 */
function createNoBackgroundsMessage() {
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
 * Display background images with pagination
 */
function displayBackgrounds() {
    const container = document.getElementById('backgrounds-gallery-container');
    if (!container) {
        console.error('Background container not found');
        return;
    }
    // Clear the container
    container.innerHTML = '';
    // Calculate pagination
    const totalPages = Math.ceil(backgrounds.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, backgrounds.length);
    // Initialize tooltips for new elements
    function initTooltips() {
        const tooltips = document.querySelectorAll('[title]');
        tooltips.forEach(el => {
            new window.bootstrap.Tooltip(el);
        });
    }
    // Handle empty state
    if (backgrounds.length === 0) {
        container.appendChild(createNoBackgroundsMessage());
        return;
    }
    // Get backgrounds for current page and create cards
    const currentPageBackgrounds = backgrounds.slice(startIndex, endIndex);
    currentPageBackgrounds.forEach(background => {
        try {
            const card = createBackgroundCard(background);
            container.appendChild(card);
        }
        catch (error) {
            console.error(`Error creating card for background ${background.title}:`, error);
        }
    });
    // Initialize tooltips
    initTooltips();
    // Update pagination controls
    updatePagination(totalPages);
}
/**
 * Creates a pagination button
 * @param type - The type of button (prev, next, page)
 * @param pageNumber - The page number (for page type)
 * @param isActive - Whether this button is active
 * @param isDisabled - Whether this button is disabled
 * @returns The pagination button element
 */
function createPaginationButton(type, pageNumber = 0, isActive = false, isDisabled = false) {
    const listItem = document.createElement('li');
    // Set appropriate classes
    let className = 'page-item';
    if (isActive)
        className += ' active';
    if (isDisabled)
        className += ' disabled';
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
    }
    else if (type === 'next') {
        const icon = document.createElement('i');
        icon.className = 'bx bx-chevron-right';
        link.appendChild(icon);
    }
    else {
        // Regular page number
        link.textContent = pageNumber.toString();
    }
    // Set click handler
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (isDisabled)
            return;
        if (type === 'prev' && currentPage > 1) {
            currentPage--;
            displayBackgrounds();
        }
        else if (type === 'next' && currentPage < pageNumber) {
            // For next button, pageNumber represents totalPages
            currentPage++;
            displayBackgrounds();
        }
        else if (type === 'page') {
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
function updatePagination(totalPages) {
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
function previewImage(background) {
    const modalElement = document.getElementById('backgrounds-preview-modal');
    if (!modalElement) {
        console.error('Preview modal not found');
        return;
    }
    const modal = new window.bootstrap.Modal(modalElement);
    const previewImage = document.getElementById('backgrounds-preview-image');
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
function confirmDelete(background) {
    const modalElement = document.getElementById('backgrounds-delete-modal');
    if (!modalElement) {
        console.error('Delete modal not found');
        return;
    }
    const imageNameField = document.getElementById('backgrounds-delete-image-name');
    if (imageNameField) {
        imageNameField.value = background.name;
    }
    const modal = new window.bootstrap.Modal(modalElement);
    modal.show();
}
/**
 * Delete the selected image
 */
async function deleteSelectedImage() {
    const imageNameField = document.getElementById('backgrounds-delete-image-name');
    if (!imageNameField || !imageNameField.value) {
        console.error('Image name not found');
        return;
    }
    const imageName = imageNameField.value;
    const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!tokenElement) {
        console.error('Anti-forgery token not found');
        createToast('Error: Security token not found', false);
        return;
    }
    try {
        // Disable the delete button
        const deleteButton = document.getElementById('backgrounds-confirm-delete-button');
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
        const data = await response.json();
        // Hide the modal
        const modalElement = document.getElementById('backgrounds-delete-modal');
        if (modalElement) {
            const modal = window.bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        if (data.success) {
            // Remove the image from the array
            backgrounds = backgrounds.filter(bg => bg.name !== imageName);
            // Refresh the display
            displayBackgrounds();
            // Show success message
            createToast('Success: Background image deleted successfully', true);
        }
        else {
            createToast(`Error: ${data.message || 'Failed to delete image'}`, false);
        }
    }
    catch (error) {
        console.error('Error deleting image:', error);
        createToast('Error: Failed to delete image', false);
    }
    finally {
        // Reset the delete button
        const deleteButton = document.getElementById('backgrounds-confirm-delete-button');
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = 'Delete';
        }
    }
}
/**
 * Initialize FilePond file upload
 */
function initializeFilePond() {
    // Check if FilePond is available
    if (typeof window.FilePond === 'undefined') {
        console.error('FilePond is not available');
        return;
    }
    const FilePond = window.FilePond;
    const FilePondPluginFileValidateSize = window.FilePondPluginFileValidateSize;
    const FilePondPluginFileValidateType = window.FilePondPluginFileValidateType;
    const FilePondPluginImagePreview = window.FilePondPluginImagePreview;
    // Register FilePond plugins
    FilePond.registerPlugin(FilePondPluginFileValidateSize, FilePondPluginFileValidateType, FilePondPluginImagePreview);
    // Get FilePond element
    const inputElement = document.getElementById('backgrounds-file-upload');
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
                    'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                // Don't use any special encoding for FilePond - send a standard multipart/form-data
                process: (fieldName, file, metadata, load, error, progress, abort) => {
                    // Get the title from the input field
                    const imageTitleField = document.getElementById('backgrounds-image-title');
                    const imageTitle = imageTitleField ? imageTitleField.value.trim() : '';
                    // Validate the title
                    if (!imageTitle) {
                        error('Please enter a title for your background image');
                        return {
                            abort: () => { }
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
                    xhr.setRequestHeader('RequestVerificationToken', document.querySelector('input[name="__RequestVerificationToken"]').value);
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    xhr.setRequestHeader('Accept', 'application/json');
                    // Set up progress, success, and error handlers
                    xhr.upload.onprogress = (e) => {
                        progress(e.lengthComputable, e.loaded, e.total);
                    };
                    xhr.onload = function () {
                        console.log(`FilePond XHR Response status: ${xhr.status}`);
                        console.log(`FilePond XHR Response headers: ${xhr.getAllResponseHeaders()}`);
                        console.log(`FilePond XHR Response text: ${xhr.responseText.substring(0, 200)}${xhr.responseText.length > 200 ? '...' : ''}`);
                        if (xhr.status >= 200 && xhr.status < 300) {
                            load(xhr.responseText);
                        }
                        else {
                            console.error('FilePond upload failed:', xhr.status, xhr.statusText);
                            console.error('FilePond response content:', xhr.responseText);
                            error('Upload failed: ' + xhr.statusText);
                        }
                    };
                    xhr.onerror = function () {
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
                onload: (response) => {
                    console.log('FilePond onload callback triggered');
                    console.log('FilePond response:', response.substring(0, 200) + (response.length > 200 ? '...' : ''));
                    // Reset button state
                    const uploadButton = document.getElementById('backgrounds-upload-button');
                    if (uploadButton) {
                        uploadButton.disabled = false;
                        uploadButton.textContent = 'Upload';
                    }
                    // Parse the response
                    let result;
                    try {
                        result = JSON.parse(response);
                        console.log('FilePond parsed response:', result);
                    }
                    catch (error) {
                        console.error('Error parsing FilePond response:', error);
                        console.error('Raw response that failed to parse:', response);
                        createToast('Error: Failed to parse server response', false);
                        return response;
                    }
                    if (result.success) {
                        // Add the new image to the list and refresh the display
                        console.log('FilePond upload result:', result);
                        // Create the new background object
                        const newBackground = {
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
                        // Display the updated backgrounds
                        displayBackgrounds();
                        // Clear the form
                        const titleInput = document.getElementById('backgrounds-image-title');
                        if (titleInput) {
                            titleInput.value = '';
                        }
                        // Reset validation
                        const titleValidationMessage = document.getElementById('backgrounds-title-validation-message');
                        const fileValidationMessage = document.getElementById('backgrounds-file-validation-message');
                        const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
                        if (titleValidationMessage)
                            titleValidationMessage.textContent = '';
                        if (fileValidationMessage)
                            fileValidationMessage.textContent = '';
                        if (formValidationAlert)
                            formValidationAlert.classList.add('d-none');
                        // Close the modal
                        const modal = window.bootstrap.Modal.getInstance(document.getElementById('backgrounds-upload-modal'));
                        if (modal) {
                            modal.hide();
                        }
                        // Show success message
                        createToast('Success: Background image uploaded successfully', true);
                        // Reset the FilePond instance
                        pond.removeFile();
                    }
                    else {
                        // Show error in the form
                        const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
                        const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                        if (formValidationAlert && validationMessageElement) {
                            formValidationAlert.classList.remove('d-none');
                            validationMessageElement.textContent = result.message || 'Failed to upload image';
                        }
                        else {
                            createToast(`Error: ${result.message || 'Failed to upload image'}`, false);
                        }
                    }
                    return response;
                },
                onerror: (error) => {
                    console.error('FilePond onerror callback triggered with:', error);
                    // Reset button state in case of error
                    const uploadButton = document.getElementById('backgrounds-upload-button');
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
    const titleInput = document.getElementById('backgrounds-image-title');
    const uploadButton = document.getElementById('backgrounds-upload-button');
    const titleValidationMessage = document.getElementById('backgrounds-title-validation-message');
    const fileValidationMessage = document.getElementById('backgrounds-file-validation-message');
    const formValidationAlert = document.getElementById('backgrounds-form-validation-alert');
    // Function to validate the form and update button state
    function validateForm(forceShowErrors = false) {
        let isValid = true;
        // Clear previous validation messages
        if (titleValidationMessage)
            titleValidationMessage.textContent = '';
        if (fileValidationMessage)
            fileValidationMessage.textContent = '';
        if (formValidationAlert)
            formValidationAlert.classList.add('d-none');
        // Validate title
        const imageTitle = titleInput ? titleInput.value.trim() : '';
        if (!imageTitle) {
            isValid = false;
            // Only show validation message if user has interacted or we're forcing validation
            if ((hasInteracted || forceShowErrors) && titleValidationMessage) {
                titleValidationMessage.textContent = 'Please enter a title for your background image';
            }
        }
        else if (imageTitle.length < 3) {
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
            if (titleInput)
                titleInput.value = '';
            pond.removeFiles();
            // Clear validation messages
            if (titleValidationMessage)
                titleValidationMessage.textContent = '';
            if (fileValidationMessage)
                fileValidationMessage.textContent = '';
            if (formValidationAlert)
                formValidationAlert.classList.add('d-none');
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
                if (formValidationAlert)
                    formValidationAlert.classList.remove('d-none');
                return;
            }
            // Get the file from FilePond
            if (!pond.getFiles() || pond.getFiles().length === 0) {
                if (fileValidationMessage)
                    fileValidationMessage.textContent = 'Please select a file to upload';
                return;
            }
            // FilePond stores the file in a specific structure
            const pondFile = pond.getFiles()[0];
            // Get the form data
            const titleValue = titleInput ? titleInput.value.trim() : '';
            const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
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
                xhr.onload = function () {
                    // Reset button state
                    uploadButton.disabled = false;
                    uploadButton.textContent = 'Upload';
                    console.log(`XHR Response status: ${xhr.status}`);
                    console.log(`XHR Response headers: ${xhr.getAllResponseHeaders()}`);
                    console.log(`XHR Response text: ${xhr.responseText.substring(0, 200)}${xhr.responseText.length > 200 ? '...' : ''}`);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let result;
                        try {
                            result = JSON.parse(xhr.responseText);
                            console.log('Upload response parsed as JSON:', result);
                            if (result.success) {
                                // Add the new image to the list and refresh the display
                                console.log('Upload result:', result);
                                // Create the new background object
                                const newBackground = {
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
                                // Display the updated backgrounds
                                displayBackgrounds();
                                // Reset form
                                if (titleInput)
                                    titleInput.value = '';
                                pond.removeFile();
                                // Reset validation
                                if (titleValidationMessage)
                                    titleValidationMessage.textContent = '';
                                if (fileValidationMessage)
                                    fileValidationMessage.textContent = '';
                                if (formValidationAlert)
                                    formValidationAlert.classList.add('d-none');
                                // Close modal
                                const modal = window.bootstrap.Modal.getInstance(document.getElementById('backgrounds-upload-modal'));
                                if (modal) {
                                    modal.hide();
                                }
                                // Show success message
                                createToast('Success: Background image uploaded successfully', true);
                            }
                            else {
                                // Show error in the form
                                const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                                if (formValidationAlert && validationMessageElement) {
                                    formValidationAlert.classList.remove('d-none');
                                    validationMessageElement.textContent = result.message || 'Failed to upload image';
                                }
                                else {
                                    createToast(`Error: ${result.message || 'Failed to upload image'}`, false);
                                }
                            }
                        }
                        catch (error) {
                            console.error('Error parsing response:', error, xhr.responseText);
                            createToast('Error: Failed to parse server response', false);
                        }
                    }
                    else {
                        console.error('Upload failed:', xhr.status, xhr.statusText);
                        console.error('Response content:', xhr.responseText);
                        // Try to parse the error response as JSON (ASP.NET Core often returns JSON error details)
                        let errorMessage = `Upload failed with status ${xhr.status}`;
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            if (errorResponse.message) {
                                errorMessage = errorResponse.message;
                            }
                            else if (errorResponse.title) {
                                errorMessage = errorResponse.title; // ASP.NET Core ProblemDetails format
                            }
                            console.error('Error details:', errorResponse);
                        }
                        catch (parseError) {
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
                xhr.onerror = function () {
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
            }
            catch (error) {
                console.error('Error during upload:', error);
                // Show error in the UI
                if (formValidationAlert)
                    formValidationAlert.classList.remove('d-none');
                const validationMessageElement = document.getElementById('backgrounds-form-validation-message');
                if (validationMessageElement) {
                    validationMessageElement.textContent = error.message || 'Upload failed';
                }
                // Reset button state
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
            }
        });
    }
    return pond;
}
/**
 * Initialize backgrounds section
 */
export function initBackgrounds() {
    console.debug('Backgrounds section initialized');
    // Set up delete confirmation button event listener
    const confirmDeleteButton = document.getElementById('backgrounds-confirm-delete-button');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', deleteSelectedImage);
    }
    // Initialize FilePond
    initializeFilePond();
    // Load background images
    loadBackgroundImages();
}
// Make function available globally
window.Yuzu = window.Yuzu || {};
window.Yuzu.Settings = window.Yuzu.Settings || {};
window.Yuzu.Settings.Backgrounds = {
    init: initBackgrounds,
    loadBackgroundImages: loadBackgroundImages
};
//# sourceMappingURL=index.js.map