/// <reference types="jquery" />
/// <reference types="bootstrap" />
/**
 * Break Types management functionality for the Settings page
 */
// Break types specific pagination state
let breakTypesCurrentPage = 1;
const breakTypesPageSize = 4;
let breakTypesContinuationTokens = { 1: null };
// Check if user is subscribed (Pro member)
const isSubscribedElement = document.getElementById('backgrounds-is-subscribed');
const isSubscribed = (isSubscribedElement === null || isSubscribedElement === void 0 ? void 0 : isSubscribedElement.value) === 'true';
/**
 * Gets the background images URL from the hidden input field.
 */
function getImagePath() {
    const imagePathInput = document.getElementById('image-path');
    if (!imagePathInput || !imagePathInput.value) {
        console.error('Background image path not found in hidden field "image-path"');
    }
    return (imagePathInput === null || imagePathInput === void 0 ? void 0 : imagePathInput.value) || '';
}
/**
 * Load break types from the server and populate the container.
 * @param page - The page number to load.
 * @returns Promise that resolves when the loading is complete
 */
export async function loadBreakTypes(page) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        // Show loading spinner
        const loadingElement = document.querySelector('.page-loading');
        if (loadingElement) {
            loadingElement.classList.add('active');
        }
        // Retrieve the continuation token for the requested page
        const continuationToken = breakTypesContinuationTokens[page] || '';
        // Use current path for correct routing (regardless of which page it's embedded in)
        const url = `${document.location.pathname}?handler=BreakTypes&pageNumber=${page}&pageSize=${breakTypesPageSize}&continuationToken=${encodeURIComponent(continuationToken)}`;
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
        const responseData = await response.json();
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
            const breakTypes = ((_a = responseData.data) === null || _a === void 0 ? void 0 : _a.data) || [];
            console.log('Break types array:', breakTypes);
            breakTypes.forEach((item) => {
                console.log('Processing break type:', item);
                // Clone the template content
                const cardDiv = $($(template).html());
                // Set data attribute for the card
                const articleElement = cardDiv.find('article');
                articleElement.attr('data-id', item.id);
                // Preview Image
                cardDiv.find('.card-preview-image').attr('src', `${backgroundImagesURL}/${item.imageTitle}-thumb.jpg`);
                // Card Title
                cardDiv.find('.card-title-link').text(item.name);
                // Badge to show whether break type is system or user-defined
                if (item.isLocked) {
                    // System break type (locked)
                    cardDiv.find('.system-badge').removeClass('d-none');
                }
                else {
                    // User-defined break type
                    cardDiv.find('.user-badge').removeClass('d-none');
                }
                // Default Duration
                cardDiv.find('.card-duration').text(item.defaultDurationMinutes.toString());
                // Usage Count
                cardDiv.find('.card-usage').text(item.usageCount.toString());
                // Edit button
                const editButton = cardDiv.find('.btn-edit');
                editButton.attr('data-id', item.id);
                editButton.attr('data-name', item.name);
                editButton.attr('data-image-title', item.imageTitle);
                editButton.attr('data-icon-name', item.iconName || 'bx-coffee-togo');
                editButton.attr('data-default-duration', item.defaultDurationMinutes);
                editButton.attr('data-time-step', item.breakTimeStepMinutes);
                editButton.attr('data-countdown-message', item.countdownMessage || '');
                editButton.attr('data-countdown-end-message', item.countdownEndMessage || '');
                editButton.attr('data-end-time-title', item.endTimeTitle || '');
                editButton.attr('data-is-locked', item.isLocked.toString());
                // Add backgroundImageChoices data
                if (item.backgroundImageChoices) {
                    const backgroundImages = item.backgroundImageChoices.split(';');
                    if (backgroundImages.length >= 2) {
                        editButton.attr('data-image-title-1', backgroundImages[0] || '');
                        editButton.attr('data-image-title-2', backgroundImages[1] || '');
                    }
                    else {
                        // Fallback if no choices are available
                        editButton.attr('data-image-title-1', item.imageTitle || '');
                        editButton.attr('data-image-title-2', item.imageTitle || '');
                    }
                }
                else {
                    // Fallback if no choices are available
                    editButton.attr('data-image-title-1', item.imageTitle || '');
                    editButton.attr('data-image-title-2', item.imageTitle || '');
                }
                // Design Button
                cardDiv.find('.btn-design').attr('href', `/designer?id=${item.id}`);
                // Delete Button - Only show for non-locked break types and for subscribed users
                if (!item.isLocked && isSubscribed) {
                    const deleteContainer = cardDiv.find('.btn-delete-container');
                    deleteContainer.removeClass('d-none');
                    const deleteButton = cardDiv.find('.btn-delete');
                    deleteButton.attr('data-id', item.id.toString());
                    deleteButton.attr('data-name', item.name);
                }
                // Append the cloned template to the container
                $('#break-type-container').append(cardDiv);
            });
            // Update continuation tokens map
            breakTypesContinuationTokens[page + 1] = (_b = responseData.data) === null || _b === void 0 ? void 0 : _b.continuationToken;
            // Setup pagination controls with the data from the standardized response
            setupPagination((_c = responseData.data) === null || _c === void 0 ? void 0 : _c.totalItems, (_d = responseData.data) === null || _d === void 0 ? void 0 : _d.pageSize, (_e = responseData.data) === null || _e === void 0 ? void 0 : _e.currentPage);
            // Setup event listeners for the newly added cards
            setupEventListeners();
        }
        else {
            console.error('API request failed:', responseData.message);
            (_g = (_f = window).createToast) === null || _g === void 0 ? void 0 : _g.call(_f, responseData.message || 'Failed to load break types', false);
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
/**
 * Setup pagination controls.
 */
export function setupPagination(totalItems, pageSize, currentPageNum) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginationControls = document.getElementById('break-types-pagination-controls');
    if (paginationControls) {
        paginationControls.innerHTML = ''; // Clear existing pagination controls
        // Only show pagination if there's more than one page
        if (totalPages > 1) {
            // Create pagination items
            for (let i = 1; i <= totalPages; i++) {
                const isActive = i === currentPageNum ? 'active' : '';
                const pageItem = document.createElement('li');
                pageItem.className = `page-item ${isActive}`;
                pageItem.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                paginationControls.appendChild(pageItem);
            }
            // Add click event listeners to pagination links
            paginationControls.querySelectorAll('.page-link').forEach(link => {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    const page = parseInt(this.getAttribute('data-page') || '1');
                    breakTypesCurrentPage = page;
                    loadBreakTypes(page);
                });
            });
        }
    }
}
/**
 * Set up event listeners for the break type card buttons
 */
/**
 * Initialize the simple edit modal for break types (for non-subscribers)
 * @param button - The edit button element
 */
function initSimpleEdit(button) {
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
    const idField = document.getElementById('simple-edit-break-type-id');
    const nameField = document.getElementById('simple-edit-break-type-name');
    const iconNameField = document.getElementById('simple-edit-icon-name');
    const countdownMessageField = document.getElementById('simple-edit-countdown-message');
    const countdownEndMessageField = document.getElementById('simple-edit-countdown-end-message');
    const endTimeTitleField = document.getElementById('simple-edit-end-time-title');
    const defaultDurationField = document.getElementById('simple-edit-default-duration');
    const timeStepField = document.getElementById('simple-edit-time-step');
    // Set background image options
    const backgroundOption1 = document.getElementById('background-option-1');
    const backgroundOption2 = document.getElementById('background-option-2');
    const backgroundOption1Radio = document.getElementById('background-option-1-radio');
    const backgroundOption2Radio = document.getElementById('background-option-2-radio');
    if (idField)
        idField.value = id;
    if (nameField)
        nameField.value = name;
    if (iconNameField)
        iconNameField.value = iconName;
    if (countdownMessageField)
        countdownMessageField.value = countdownMessage;
    if (countdownEndMessageField)
        countdownEndMessageField.value = countdownEndMessage;
    if (endTimeTitleField)
        endTimeTitleField.value = endTimeTitle;
    if (defaultDurationField)
        defaultDurationField.value = defaultDuration;
    if (timeStepField)
        timeStepField.value = timeStep;
    // Get the background images URL
    const backgroundImagesURL = getImagePath();
    // Set background image previews
    if (backgroundOption1)
        backgroundOption1.src = `${backgroundImagesURL}/${imageTitle1}-thumb.jpg`;
    if (backgroundOption2)
        backgroundOption2.src = `${backgroundImagesURL}/${imageTitle2}-thumb.jpg`;
    // Check the background option that matches the current image title
    if (backgroundOption1Radio && backgroundOption2Radio) {
        if (imageTitle === imageTitle1) {
            backgroundOption1Radio.checked = true;
        }
        else if (imageTitle === imageTitle2) {
            backgroundOption2Radio.checked = true;
        }
        else {
            backgroundOption1Radio.checked = true;
        }
    }
    // Initialize the bootstrap modal
    const modal = new window.bootstrap.Modal(modalElement);
    modal.show();
}
/**
 * Set up event listeners for the break type card buttons
 */
function setupEventListeners() {
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
function removeExistingEventListeners() {
    // Remove edit button listeners
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.removeEventListener('click', handleEditClick);
    });
    // Remove delete button listeners
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.removeEventListener('click', handleDeleteClick);
    });
}
/**
 * Event handler for edit button clicks
 */
function handleEditClick(e) {
    var _a, _b;
    e.preventDefault();
    const button = e.currentTarget;
    // Use different editor based on subscription status
    if (isSubscribed) {
        if (typeof window.editBreakType === 'function') {
            window.editBreakType(button);
        }
        else {
            console.error('editBreakType function not found');
            (_b = (_a = window).createToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Editor function not available', false);
        }
    }
    else {
        // Use our internal function to handle simple edit modal
        initSimpleEdit(button);
    }
}
/**
 * Event handler for delete button clicks
 */
function handleDeleteClick(e) {
    e.preventDefault();
    const button = e.currentTarget;
    // Get break type ID and name
    const id = button.getAttribute('data-id');
    const name = button.getAttribute('data-name');
    // Open delete confirmation modal
    openDeleteConfirmationModal(id, name);
}
/**
 * Event handler for add new break type button clicks
 */
function handleAddButtonClick() {
    var _a, _b;
    if (isSubscribed) {
        if (typeof window.createBreakType === 'function') {
            window.createBreakType();
        }
        else {
            console.error('createBreakType function not found');
            (_b = (_a = window).createToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Create function not available', false);
        }
    }
    else {
        // For non-subscribers, show the Pro feature required modal
        showProFeatureRequiredModal();
    }
}
/**
 * Show the Pro feature required modal for non-subscribers
 */
function showProFeatureRequiredModal() {
    var _a, _b;
    // Get the modal element
    const modalElement = document.getElementById('pro-feature-required-modal');
    if (!modalElement) {
        console.error('Pro feature required modal not found');
        (_b = (_a = window).createToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Subscription required for this feature', false);
        return;
    }
    // Initialize the bootstrap modal
    const modal = new window.bootstrap.Modal(modalElement);
    modal.show();
}
/**
 * Initialize the simple create modal for break types (for non-subscribers)
 */
function initSimpleCreate() {
    // Get the modal element
    const modalElement = document.getElementById('break-type-simple-edit-modal');
    if (!modalElement) {
        console.error('Simple create modal not found');
        return;
    }
    // Reset the form fields to default values
    const idField = document.getElementById('simple-edit-break-type-id');
    const nameField = document.getElementById('simple-edit-break-type-name');
    const iconNameField = document.getElementById('simple-edit-icon-name');
    const countdownMessageField = document.getElementById('simple-edit-countdown-message');
    const countdownEndMessageField = document.getElementById('simple-edit-countdown-end-message');
    const endTimeTitleField = document.getElementById('simple-edit-end-time-title');
    const defaultDurationField = document.getElementById('simple-edit-default-duration');
    const timeStepField = document.getElementById('simple-edit-time-step');
    // Set default values
    if (idField)
        idField.value = '';
    if (nameField)
        nameField.value = 'New Break';
    if (iconNameField)
        iconNameField.value = 'bx-coffee-togo';
    if (countdownMessageField)
        countdownMessageField.value = 'Minutes until break ends';
    if (countdownEndMessageField)
        countdownEndMessageField.value = 'Break is over';
    if (endTimeTitleField)
        endTimeTitleField.value = 'Break Ends At';
    if (defaultDurationField)
        defaultDurationField.value = '15';
    if (timeStepField)
        timeStepField.value = '5';
    // Set background image options
    const backgroundOption1 = document.getElementById('background-option-1');
    const backgroundOption2 = document.getElementById('background-option-2');
    const backgroundOption1Radio = document.getElementById('background-option-1-radio');
    // Get the background images URL
    const backgroundImagesURL = getImagePath();
    // Set default background image previews
    if (backgroundOption1)
        backgroundOption1.src = `${backgroundImagesURL}/coffee-thumb.jpg`;
    if (backgroundOption2)
        backgroundOption2.src = `${backgroundImagesURL}/break-thumb.jpg`;
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
    const modal = new window.bootstrap.Modal(modalElement);
    modal.show();
}
/**
 * Opens the delete confirmation modal
 * @param id - The ID of the break type to delete
 * @param name - The name of the break type to delete
 */
function openDeleteConfirmationModal(id, name) {
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
    const idField = document.getElementById('delete-break-type-id');
    const nameSpan = document.getElementById('delete-break-type-name');
    if (idField)
        idField.value = id;
    if (nameSpan)
        nameSpan.textContent = name;
    // Show the modal
    const modal = new window.bootstrap.Modal(modalElement);
    modal.show();
}
/**
 * Deletes a break type
 */
async function deleteBreakType() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        // Get form element
        const form = document.getElementById('delete-break-type-form');
        if (!form) {
            console.error('Delete form not found');
            return;
        }
        // Get break type ID
        const idField = document.getElementById('delete-break-type-id');
        if (!idField || !idField.value) {
            console.error('Break type ID is missing');
            return;
        }
        // Get token for request
        const tokenElement = form.querySelector('input[name="__RequestVerificationToken"]');
        if (!tokenElement) {
            console.error('Anti-forgery token not found');
            (_b = (_a = window).createToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Security token not found', false);
            return;
        }
        const token = tokenElement.value;
        // Disable delete button
        const deleteButton = document.getElementById('confirm-delete-btn');
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
                const modal = window.bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            // Show success message
            (_d = (_c = window).createToast) === null || _d === void 0 ? void 0 : _d.call(_c, data.message || 'Break type deleted successfully', true);
            // Reload break types
            loadBreakTypes(breakTypesCurrentPage);
        }
        else {
            // Show error message
            (_f = (_e = window).createToast) === null || _f === void 0 ? void 0 : _f.call(_e, data.message || 'Failed to delete break type', false);
        }
    }
    catch (error) {
        console.error('Error deleting break type:', error);
        (_h = (_g = window).createToast) === null || _h === void 0 ? void 0 : _h.call(_g, 'An error occurred while deleting the break type', false);
    }
    finally {
        // Reset delete button
        const deleteButton = document.getElementById('confirm-delete-btn');
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = 'Delete';
        }
    }
}
/**
 * Save the simple break type edit
 */
async function saveSimpleBreakTypeEdit() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        // Get form elements
        const form = document.getElementById('break-type-simple-edit-form');
        if (!form) {
            console.error('Simple edit form not found');
            return;
        }
        // Get values from form
        const idField = document.getElementById('simple-edit-break-type-id');
        const nameField = document.getElementById('simple-edit-break-type-name');
        const iconNameField = document.getElementById('simple-edit-icon-name');
        const countdownMessageField = document.getElementById('simple-edit-countdown-message');
        const countdownEndMessageField = document.getElementById('simple-edit-countdown-end-message');
        const endTimeTitleField = document.getElementById('simple-edit-end-time-title');
        const defaultDurationField = document.getElementById('simple-edit-default-duration');
        const timeStepField = document.getElementById('simple-edit-time-step');
        // Get selected background image option
        const selectedBgOption = form.querySelector('input[name="backgroundOption"]:checked');
        const selectedBgOptionValue = selectedBgOption ? parseInt(selectedBgOption.value) : 0;
        // Get image titles
        const bgOptionCards = document.querySelectorAll('.background-option-card');
        let selectedImageTitle = '';
        bgOptionCards.forEach((card) => {
            const dataOption = card.getAttribute('data-image-option');
            if (dataOption && parseInt(dataOption) === selectedBgOptionValue) {
                const img = card.querySelector('img');
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
        const tokenElement = form.querySelector('input[name="__RequestVerificationToken"]');
        if (!tokenElement) {
            console.error('Anti-forgery token not found');
            (_b = (_a = window).createToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Security token not found', false);
            return;
        }
        const token = tokenElement.value;
        // Validate form data
        if (!defaultDurationField.checkValidity() || !timeStepField.checkValidity()) {
            form.classList.add('was-validated');
            (_d = (_c = window).createToast) === null || _d === void 0 ? void 0 : _d.call(_c, 'Please correct the errors in the form', false);
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
        const saveButton = document.getElementById('simple-edit-save-btn');
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
                const modal = window.bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            // Show success message
            (_f = (_e = window).createToast) === null || _f === void 0 ? void 0 : _f.call(_e, data.message || 'Break type saved successfully', true);
            // Reload break types
            loadBreakTypes(breakTypesCurrentPage);
        }
        else {
            // Show error message
            (_h = (_g = window).createToast) === null || _h === void 0 ? void 0 : _h.call(_g, data.message || 'Failed to save break type', false);
            // Display validation errors if any
            if (data.errors) {
                console.error('Validation errors:', data.errors);
                // Display the specific validation errors using toast
                for (const [field, errors] of Object.entries(data.errors)) {
                    const errorArray = errors;
                    if (errorArray && errorArray.length > 0) {
                        (_k = (_j = window).createToast) === null || _k === void 0 ? void 0 : _k.call(_j, `${field}: ${errorArray[0]}`, false);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error saving break type:', error);
        (_m = (_l = window).createToast) === null || _m === void 0 ? void 0 : _m.call(_l, 'An error occurred while saving the break type', false);
    }
    finally {
        // Reset save button
        const saveButton = document.getElementById('simple-edit-save-btn');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Save Changes';
        }
    }
}
/**
 * Initialize Swiper instances for carousels
 */
function initSwipers() {
    try {
        // Check if Swiper is available
        if (typeof window.Swiper === 'undefined') {
            console.error('Swiper is not available');
            return;
        }
        // Initialize background swiper
        const backgroundSwiperElement = document.querySelector('.background-swiper');
        if (backgroundSwiperElement) {
            const options = backgroundSwiperElement.getAttribute('data-swiper-options');
            if (options) {
                const parsedOptions = JSON.parse(options);
                new window.Swiper(backgroundSwiperElement, parsedOptions);
            }
        }
        // Initialize icon swiper
        const iconSwiperElement = document.querySelector('.icon-swiper');
        if (iconSwiperElement) {
            const options = iconSwiperElement.getAttribute('data-swiper-options');
            if (options) {
                const parsedOptions = JSON.parse(options);
                new window.Swiper(iconSwiperElement, parsedOptions);
            }
        }
    }
    catch (error) {
        console.error('Error initializing swipers:', error);
    }
}
/**
 * Initializes the break types section
 */
export function initBreakTypes() {
    console.debug('Break Types section initialized');
    // Load break types
    loadBreakTypes(breakTypesCurrentPage);
    // Initialize swipers
    initSwipers();
    // Initialize event listeners for wizard modal if it's opened
    document.addEventListener('shown.bs.modal', function (event) {
        const modal = event.target;
        if (modal.id === 'break-type-wizard-modal') {
            // Initialize swipers inside the modal
            initSwipers();
            // Note: The wizard navigation is now handled by the wizard.ts module
        }
    });
}
// Make function available globally
window.Yuzu = window.Yuzu || {};
window.Yuzu.Settings = window.Yuzu.Settings || {};
window.Yuzu.Settings.BreakTypes = {
    init: initBreakTypes,
    loadBreakTypes: loadBreakTypes,
    setupPagination: setupPagination
};
//# sourceMappingURL=index.js.map