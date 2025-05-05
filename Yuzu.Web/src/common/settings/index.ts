/**
 * Entry point for Settings components
 * This file exports all shared components for settings pages
 */

// Base classes for settings pages
// Define the global Yuzu namespace
(window as any).Yuzu = (window as any).Yuzu || {};
(window as any).Yuzu.Web = (window as any).Yuzu.Web || {};
(window as any).Yuzu.Web.Settings = (window as any).Yuzu.Web.Settings || {};

// Define the settings module
namespace Yuzu.Web.Settings {
    /**
     * Type definitions for jQuery and Bootstrap
     * Used internally within the Yuzu.Web.Settings namespace
     */
    export interface IJQuery {
        // Validation methods
        validate?: () => any;
        valid?: () => boolean;
        
        // Data methods
        data(key: string, value: any): IJQuery;
        data(key: string): any;
        
        // DOM manipulation methods
        attr(attributeName: string, value: string): IJQuery;
        attr(attributeName: string): string;
        find(selector: string): IJQuery;
        closest(selector: string): IJQuery;
        text(text: string): IJQuery;
        text(): string;
        addClass(className: string): IJQuery;
        removeClass(className: string): IJQuery;
        append(element: IJQuery | Element | string): IJQuery;
        val(value: string | number): IJQuery;
        val(): string;
    }

    // Bootstrap modal interface
    export interface IBootstrapModal {
        show(): void;
        hide(): void;
    }

    export interface IBootstrapStatic {
        Modal: {
            new(element: HTMLElement, options?: any): IBootstrapModal;
            getInstance(element: HTMLElement): IBootstrapModal | null;
        };
        Tooltip: {
            new(element: Element, options?: any): any;
        };
    }

    /**
     * Base class for all settings pages
     * Provides common functionality for loading data, pagination, and item management
     */
    export class SettingsPage<T> {
        // Pagination properties
        protected currentPage: number = 1;
        protected pageSize: number;
        protected items: T[] = [];
        protected totalItems: number = 0;
        protected continuationTokens: { [key: number]: string | null } = { 1: null };

        // DOM elements
        protected container: HTMLElement;
        protected template: HTMLTemplateElement;
        protected paginationControls: HTMLElement | null;
        protected loading: HTMLElement | null;

        /**
         * Constructor for the SettingsPage class
         * @param containerId The ID of the container element
         * @param templateId The ID of the template element
         * @param paginationId The ID of the pagination controls element
         * @param pageSize The number of items per page
         */
        constructor(containerId: string, templateId: string, paginationId: string, pageSize: number = 10) {
            // Get DOM elements
            this.container = document.getElementById(containerId) as HTMLElement;
            this.template = document.getElementById(templateId) as HTMLTemplateElement;
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
        protected initialize(): Promise<void> {
            // Load items for the first page
            return this.loadItems(this.currentPage);
        }

        /**
         * Load items from the server
         * @param page The page number to load
         */
        protected loadItems(page: number): Promise<void> {
            // This should be implemented by derived classes
            return Promise.resolve();
        }

        /**
         * Render items in the container
         * Override this method to add custom rendering logic
         */
        protected renderItems(): void {
            // This should be implemented by derived classes
        }

        /**
         * Set up pagination controls
         * @param totalItems The total number of items
         * @param pageSize The number of items per page
         * @param currentPage The current page number
         */
        protected setupPagination(totalItems: number, pageSize: number, currentPage: number): void {
            if (!this.paginationControls) return;

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
                    const page = parseInt((e.target as HTMLElement).getAttribute('data-page')!);
                    this.currentPage = page;
                    this.loadItems(page);
                });
            });
        }

        /**
         * Show loading indicator
         */
        protected showLoading(): void {
            if (this.loading) {
                this.loading.classList.add('active');
            }
        }

        /**
         * Hide loading indicator
         */
        protected hideLoading(): void {
            if (this.loading) {
                this.loading.classList.remove('active');
            }
        }
    }

    /**
     * Represents a card component in a settings page
     * This class handles rendering and updating of card components
     */
    export class CardComponent<T> {
        protected template: HTMLTemplateElement;
        protected data: T;
        protected element: HTMLElement | null = null;

        /**
         * Constructor for the CardComponent class
         * @param template The template element to use for rendering
         * @param data The data to bind to the template
         */
        constructor(template: HTMLTemplateElement, data: T) {
            this.template = template;
            this.data = data;
        }

        /**
         * Render the card component
         * @returns The rendered HTML element
         */
        public render(): HTMLElement {
            // Clone the template content
            const clone = document.importNode(this.template.content, true);
            
            // Find the first element that could be a card container
            const cardElement = clone.querySelector('.card-container') || clone.firstElementChild;
            
            if (!cardElement) {
                throw new Error('Template does not contain a valid card element');
            }

            // Cast to HTMLElement
            const element = cardElement as HTMLElement;
            
            this.element = element;
            this.bindData();
            return element;
        }

        /**
         * Update the card with new data
         * @param data The new data to bind to the card
         */
        public update(data: Partial<T>): void {
            this.data = { ...this.data, ...data } as T;
            
            if (this.element) {
                this.bindData();
            }
        }

        /**
         * Bind data to the card elements
         * Override this method in derived classes to implement custom binding logic
         */
        protected bindData(): void {
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
        public static renderCollection<T, C extends CardComponent<T>>(
            container: HTMLElement,
            template: HTMLTemplateElement,
            items: T[],
            cardFactory?: (template: HTMLTemplateElement, item: T) => C
        ): C[] {
            // Clear the container
            container.innerHTML = '';
            
            // Create and render cards
            const cards: C[] = [];
            
            items.forEach(item => {
                let card: C;
                
                if (cardFactory) {
                    // Use the factory to create a card component
                    card = cardFactory(template, item);
                } else {
                    // Create a generic card component
                    card = new CardComponent(template, item) as unknown as C;
                }
                
                // Render the card and append to container
                const element = card.render();
                container.appendChild(element);
                cards.push(card);
            });
            
            return cards;
        }
    }

    /**
     * Manages modal dialogs in settings pages
     */
    export class ModalManager {
        protected modalElement: HTMLElement;
        protected modal: any; // Bootstrap modal instance
        private formElement: HTMLFormElement | null = null;
        private submitCallback: ((formData: FormData) => Promise<boolean>) | null = null;

        /**
         * Constructor for the ModalManager class
         * @param modalId The ID of the modal element
         */
        constructor(modalId: string) {
            const element = document.getElementById(modalId);
            if (!element) {
                console.error(`Modal element with ID ${modalId} not found`);
                throw new Error(`Modal element with ID ${modalId} not found`);
            }
            
            this.modalElement = element;

            // Get the form element inside the modal
            this.formElement = this.modalElement.querySelector('form');
            
            // Initialize Bootstrap modal
            if (typeof (window as any).bootstrap?.Modal === 'function') {
                this.modal = new (window as any).bootstrap.Modal(this.modalElement);
            } else {
                console.error('Bootstrap Modal not available');
                throw new Error('Bootstrap Modal not available');
            }
            
            // Set up event listeners
            this.setupEventListeners();
        }

        /**
         * Set up event listeners for the modal
         */
        private setupEventListeners(): void {
            // Find the save/submit button
            const submitButton = this.modalElement.querySelector('.modal-save-btn, [type="submit"]');
            if (submitButton && this.formElement) {
                submitButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    
                    // Check form validity
                    const $form = (window as any).$(this.formElement);
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
                    } else if ($form && typeof $form.validate === 'function') {
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
        public show(data?: any, submitCallback?: (formData: FormData) => Promise<boolean>): void {
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
        public hide(): void {
            if (this.modal && typeof this.modal.hide === 'function') {
                this.modal.hide();
            }
        }

        /**
         * Populate the form with data
         * @param data The data to populate the form with
         */
        private populateForm(data: any): void {
            if (!this.formElement) return;
            
            // Populate form fields
            Object.keys(data).forEach(key => {
                const input = this.formElement!.querySelector(`[name="${key}"]`) as HTMLInputElement;
                if (input) {
                    input.value = data[key];
                }
            });
        }

        /**
         * Get the form element
         * @returns The form element
         */
        public getForm(): HTMLFormElement | null {
            return this.formElement;
        }

        /**
         * Get the modal element
         * @returns The modal element
         */
        public getModalElement(): HTMLElement {
            return this.modalElement;
        }
    }

    /**
     * Form validation helper for settings pages
     */
    export class FormValidator {
        private form: HTMLFormElement;
        private jQueryForm: any; // jQuery object

        /**
         * Constructor for the FormValidator class
         * @param formElement The form element to validate
         */
        constructor(formElement: HTMLFormElement | string) {
            if (typeof formElement === 'string') {
                const element = document.getElementById(formElement) as HTMLFormElement;
                if (!element) {
                    throw new Error(`Form element with ID ${formElement} not found`);
                }
                this.form = element;
            } else {
                this.form = formElement;
            }

            // Convert to jQuery form
            this.jQueryForm = (window as any).$(this.form);
            
            // Set up input change event listeners
            this.setupInputListeners();
        }

        /**
         * Set up input change event listeners for validation
         */
        private setupInputListeners(): void {
            const inputs = this.form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    this.validateInput(input as HTMLInputElement);
                });
                
                // For text inputs, also validate on keyup after a delay
                if (
                    input.tagName === 'INPUT' && 
                    ['text', 'email', 'password', 'number'].includes((input as HTMLInputElement).type)
                ) {
                    let timeout: number | null = null;
                    input.addEventListener('keyup', () => {
                        if (timeout) {
                            clearTimeout(timeout);
                        }
                        timeout = setTimeout(() => {
                            this.validateInput(input as HTMLInputElement);
                            timeout = null;
                        }, 500) as unknown as number;
                    });
                }
            });
        }

        /**
         * Validate a specific input element
         * @param input The input element to validate
         * @returns True if the input is valid, false otherwise
         */
        public validateInput(input: HTMLInputElement): boolean {
            const $input = (window as any).$(input);
            if ($input && typeof $input.valid === 'function') {
                return $input.valid();
            }
            return true;
        }

        /**
         * Validate the entire form
         * @returns True if the form is valid, false otherwise
         */
        public validate(): boolean {
            if (this.jQueryForm && typeof this.jQueryForm.valid === 'function') {
                return this.jQueryForm.valid();
            }
            return true;
        }

        /**
         * Focus the first invalid element in the form
         */
        public focusInvalid(): void {
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
        public reset(): void {
            this.form.reset();
            if (this.jQueryForm && typeof this.jQueryForm.validate === 'function') {
                const validator = this.jQueryForm.validate();
                if (validator && typeof validator.resetForm === 'function') {
                    validator.resetForm();
                }
            }
        }
    }
}

// Make classes available globally
(window as any).Yuzu.Web.Settings.SettingsPage = Yuzu.Web.Settings.SettingsPage;
(window as any).Yuzu.Web.Settings.CardComponent = Yuzu.Web.Settings.CardComponent;
(window as any).Yuzu.Web.Settings.ModalManager = Yuzu.Web.Settings.ModalManager;
(window as any).Yuzu.Web.Settings.FormValidator = Yuzu.Web.Settings.FormValidator;