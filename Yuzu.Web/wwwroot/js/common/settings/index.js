/**
 * Entry point for Settings components
 * This file exports all shared components for settings pages
 */
// Base classes for settings pages
// Define the global Yuzu namespace
window.Yuzu = window.Yuzu || {};
window.Yuzu.Web = window.Yuzu.Web || {};
window.Yuzu.Web.Settings = window.Yuzu.Web.Settings || {};
// Define the settings module
var Yuzu;
(function (Yuzu) {
    var Web;
    (function (Web) {
        var Settings;
        (function (Settings) {
            /**
             * Base class for all settings pages
             * Provides common functionality for loading data, pagination, and item management
             */
            class SettingsPage {
                /**
                 * Constructor for the SettingsPage class
                 * @param containerId The ID of the container element
                 * @param templateId The ID of the template element
                 * @param paginationId The ID of the pagination controls element
                 * @param pageSize The number of items per page
                 */
                constructor(containerId, templateId, paginationId, pageSize = 10) {
                    // Pagination properties
                    this.currentPage = 1;
                    this.items = [];
                    this.totalItems = 0;
                    this.continuationTokens = { 1: null };
                    // Get DOM elements
                    this.container = document.getElementById(containerId);
                    this.template = document.getElementById(templateId);
                    this.paginationControls = document.getElementById(paginationId);
                    this.loading = document.querySelector('.page-loading');
                    this.pageSize = pageSize;
                    if (!this.container) {
                        console.error(`Container element with ID ${containerId} not found`);
                    }
                    if (!this.template) {
                        console.error(`Template element with ID ${templateId} not found`);
                    }
                    // Initialize the page on DOMContentLoaded
                    document.addEventListener('DOMContentLoaded', () => {
                        this.initialize();
                    });
                }
                /**
                 * Initialize the settings page
                 * Override this method to add custom initialization logic
                 */
                initialize() {
                    // Load items for the first page
                    return this.loadItems(this.currentPage);
                }
                /**
                 * Load items from the server
                 * @param page The page number to load
                 */
                loadItems(page) {
                    // This should be implemented by derived classes
                    return Promise.resolve();
                }
                /**
                 * Render items in the container
                 * Override this method to add custom rendering logic
                 */
                renderItems() {
                    // This should be implemented by derived classes
                }
                /**
                 * Set up pagination controls
                 * @param totalItems The total number of items
                 * @param pageSize The number of items per page
                 * @param currentPage The current page number
                 */
                setupPagination(totalItems, pageSize, currentPage) {
                    if (!this.paginationControls)
                        return;
                    const totalPages = Math.ceil(totalItems / pageSize);
                    // Clear existing pagination controls
                    this.paginationControls.innerHTML = '';
                    // Create pagination items
                    for (let i = 1; i <= totalPages; i++) {
                        const isActive = i === currentPage ? 'active' : '';
                        const pageItem = document.createElement('li');
                        pageItem.className = `page-item ${isActive}`;
                        pageItem.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                        this.paginationControls.appendChild(pageItem);
                    }
                    // Add click event listeners to pagination links
                    this.paginationControls.querySelectorAll('.page-link').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const page = parseInt(e.target.getAttribute('data-page'));
                            this.currentPage = page;
                            this.loadItems(page);
                        });
                    });
                }
                /**
                 * Show loading indicator
                 */
                showLoading() {
                    if (this.loading) {
                        this.loading.classList.add('active');
                    }
                }
                /**
                 * Hide loading indicator
                 */
                hideLoading() {
                    if (this.loading) {
                        this.loading.classList.remove('active');
                    }
                }
            }
            Settings.SettingsPage = SettingsPage;
            /**
             * Represents a card component in a settings page
             * This class handles rendering and updating of card components
             */
            class CardComponent {
                /**
                 * Constructor for the CardComponent class
                 * @param template The template element to use for rendering
                 * @param data The data to bind to the template
                 */
                constructor(template, data) {
                    this.element = null;
                    this.template = template;
                    this.data = data;
                }
                /**
                 * Render the card component
                 * @returns The rendered HTML element
                 */
                render() {
                    // Clone the template content
                    const clone = document.importNode(this.template.content, true);
                    // Find the first element that could be a card container
                    const cardElement = clone.querySelector('.card-container') || clone.firstElementChild;
                    if (!cardElement) {
                        throw new Error('Template does not contain a valid card element');
                    }
                    // Cast to HTMLElement
                    const element = cardElement;
                    this.element = element;
                    this.bindData();
                    return element;
                }
                /**
                 * Update the card with new data
                 * @param data The new data to bind to the card
                 */
                update(data) {
                    this.data = Object.assign(Object.assign({}, this.data), data);
                    if (this.element) {
                        this.bindData();
                    }
                }
                /**
                 * Bind data to the card elements
                 * Override this method in derived classes to implement custom binding logic
                 */
                bindData() {
                    // This should be implemented by derived classes
                }
                /**
                 * Render a collection of cards
                 * @param container The container element to append the cards to
                 * @param template The template element to use for rendering
                 * @param items The items to render
                 * @param cardFactory Optional factory function to create card components
                 * @returns Array of rendered card components
                 */
                static renderCollection(container, template, items, cardFactory) {
                    // Clear the container
                    container.innerHTML = '';
                    // Create and render cards
                    const cards = [];
                    items.forEach(item => {
                        let card;
                        if (cardFactory) {
                            // Use the factory to create a card component
                            card = cardFactory(template, item);
                        }
                        else {
                            // Create a generic card component
                            card = new CardComponent(template, item);
                        }
                        // Render the card and append to container
                        const element = card.render();
                        container.appendChild(element);
                        cards.push(card);
                    });
                    return cards;
                }
            }
            Settings.CardComponent = CardComponent;
            /**
             * Manages modal dialogs in settings pages
             */
            class ModalManager {
                /**
                 * Constructor for the ModalManager class
                 * @param modalId The ID of the modal element
                 */
                constructor(modalId) {
                    var _a;
                    this.formElement = null;
                    this.submitCallback = null;
                    const element = document.getElementById(modalId);
                    if (!element) {
                        console.error(`Modal element with ID ${modalId} not found`);
                        throw new Error(`Modal element with ID ${modalId} not found`);
                    }
                    this.modalElement = element;
                    // Get the form element inside the modal
                    this.formElement = this.modalElement.querySelector('form');
                    // Initialize Bootstrap modal
                    if (typeof ((_a = window.bootstrap) === null || _a === void 0 ? void 0 : _a.Modal) === 'function') {
                        this.modal = new window.bootstrap.Modal(this.modalElement);
                    }
                    else {
                        console.error('Bootstrap Modal not available');
                        throw new Error('Bootstrap Modal not available');
                    }
                    // Set up event listeners
                    this.setupEventListeners();
                }
                /**
                 * Set up event listeners for the modal
                 */
                setupEventListeners() {
                    // Find the save/submit button
                    const submitButton = this.modalElement.querySelector('.modal-save-btn, [type="submit"]');
                    if (submitButton && this.formElement) {
                        submitButton.addEventListener('click', async (e) => {
                            e.preventDefault();
                            // Check form validity
                            const $form = window.$(this.formElement);
                            const isValid = $form && typeof $form.valid === 'function' ? $form.valid() : true;
                            if (isValid) {
                                // Create FormData from the form
                                const formData = new FormData(this.formElement);
                                // Call the submit callback
                                if (this.submitCallback) {
                                    const success = await this.submitCallback(formData);
                                    if (success) {
                                        this.hide();
                                    }
                                }
                            }
                            else if ($form && typeof $form.validate === 'function') {
                                const validator = $form.validate();
                                if (validator && typeof validator.focusInvalid === 'function') {
                                    validator.focusInvalid();
                                }
                            }
                        });
                    }
                }
                /**
                 * Show the modal with the given data
                 * @param data The data to populate the modal with
                 * @param submitCallback Callback function to handle form submission
                 */
                show(data, submitCallback) {
                    // Set the submit callback
                    this.submitCallback = submitCallback || null;
                    // Populate the modal with data if provided
                    if (data && this.formElement) {
                        this.populateForm(data);
                    }
                    // Show the modal
                    if (this.modal && typeof this.modal.show === 'function') {
                        this.modal.show();
                    }
                }
                /**
                 * Hide the modal
                 */
                hide() {
                    if (this.modal && typeof this.modal.hide === 'function') {
                        this.modal.hide();
                    }
                }
                /**
                 * Populate the form with data
                 * @param data The data to populate the form with
                 */
                populateForm(data) {
                    if (!this.formElement)
                        return;
                    // Populate form fields
                    Object.keys(data).forEach(key => {
                        const input = this.formElement.querySelector(`[name="${key}"]`);
                        if (input) {
                            input.value = data[key];
                        }
                    });
                }
                /**
                 * Get the form element
                 * @returns The form element
                 */
                getForm() {
                    return this.formElement;
                }
                /**
                 * Get the modal element
                 * @returns The modal element
                 */
                getModalElement() {
                    return this.modalElement;
                }
            }
            Settings.ModalManager = ModalManager;
            /**
             * Form validation helper for settings pages
             */
            class FormValidator {
                /**
                 * Constructor for the FormValidator class
                 * @param formElement The form element to validate
                 */
                constructor(formElement) {
                    if (typeof formElement === 'string') {
                        const element = document.getElementById(formElement);
                        if (!element) {
                            throw new Error(`Form element with ID ${formElement} not found`);
                        }
                        this.form = element;
                    }
                    else {
                        this.form = formElement;
                    }
                    // Convert to jQuery form
                    this.jQueryForm = window.$(this.form);
                    // Set up input change event listeners
                    this.setupInputListeners();
                }
                /**
                 * Set up input change event listeners for validation
                 */
                setupInputListeners() {
                    const inputs = this.form.querySelectorAll('input, select, textarea');
                    inputs.forEach(input => {
                        input.addEventListener('change', () => {
                            this.validateInput(input);
                        });
                        // For text inputs, also validate on keyup after a delay
                        if (input.tagName === 'INPUT' &&
                            ['text', 'email', 'password', 'number'].includes(input.type)) {
                            let timeout = null;
                            input.addEventListener('keyup', () => {
                                if (timeout) {
                                    clearTimeout(timeout);
                                }
                                timeout = setTimeout(() => {
                                    this.validateInput(input);
                                    timeout = null;
                                }, 500);
                            });
                        }
                    });
                }
                /**
                 * Validate a specific input element
                 * @param input The input element to validate
                 * @returns True if the input is valid, false otherwise
                 */
                validateInput(input) {
                    const $input = window.$(input);
                    if ($input && typeof $input.valid === 'function') {
                        return $input.valid();
                    }
                    return true;
                }
                /**
                 * Validate the entire form
                 * @returns True if the form is valid, false otherwise
                 */
                validate() {
                    if (this.jQueryForm && typeof this.jQueryForm.valid === 'function') {
                        return this.jQueryForm.valid();
                    }
                    return true;
                }
                /**
                 * Focus the first invalid element in the form
                 */
                focusInvalid() {
                    if (this.jQueryForm && typeof this.jQueryForm.validate === 'function') {
                        const validator = this.jQueryForm.validate();
                        if (validator && typeof validator.focusInvalid === 'function') {
                            validator.focusInvalid();
                        }
                    }
                }
                /**
                 * Reset the form validation
                 */
                reset() {
                    this.form.reset();
                    if (this.jQueryForm && typeof this.jQueryForm.validate === 'function') {
                        const validator = this.jQueryForm.validate();
                        if (validator && typeof validator.resetForm === 'function') {
                            validator.resetForm();
                        }
                    }
                }
            }
            Settings.FormValidator = FormValidator;
        })(Settings = Web.Settings || (Web.Settings = {}));
    })(Web = Yuzu.Web || (Yuzu.Web = {}));
})(Yuzu || (Yuzu = {}));
// Make classes available globally
window.Yuzu.Web.Settings.SettingsPage = Yuzu.Web.Settings.SettingsPage;
window.Yuzu.Web.Settings.CardComponent = Yuzu.Web.Settings.CardComponent;
window.Yuzu.Web.Settings.ModalManager = Yuzu.Web.Settings.ModalManager;
window.Yuzu.Web.Settings.FormValidator = Yuzu.Web.Settings.FormValidator;
//# sourceMappingURL=index.js.map