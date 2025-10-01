// wizard.ts - Handles the break type creation/editing wizard modal
import { createToast } from '../../../common/toast-util.js';
/**
 * Class to handle the break type wizard modal functionality
 */
export class BreakTypeWizard {
    /**
     * Creates default break type data
     */
    createDefaultBreakTypeData() {
        return {
            name: 'New Break',
            defaultDurationMinutes: 15,
            breakTimeStepMinutes: 5,
            countdownMessage: 'Minutes until break ends',
            countdownEndMessage: 'Break is over',
            endTimeTitle: 'Break Ends At',
            imageTitle: 'coffee', // Default background
            iconName: 'fa-coffee' // Default icon - using Font Awesome regular style
        };
    }
    /**
     * Constructor for the BreakTypeWizard class
     */
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.isEditMode = false;
        this.backgroundImages = [];
        this.selectedBackgroundTitle = '';
        this.icons = [];
        this.selectedIconName = '';
        // Initialize with default break type data
        this.breakTypeData = this.createDefaultBreakTypeData();
        // Find modal element
        this.modalElement = document.getElementById('break-type-wizard-modal');
        // Initialize the modal if element is found
        if (this.modalElement) {
            this.modal = new window.bootstrap.Modal(this.modalElement);
            // Listen for modal show event (before modal is visible) to preload data
            this.modalElement.addEventListener('show.bs.modal', () => {
                // Preload background images and icons when modal is about to be shown
                this.preloadWizardData();
            });
            // Listen for modal shown event to initialize the visible step
            this.modalElement.addEventListener('shown.bs.modal', () => {
                // Modal is now fully visible
                console.log("Modal is fully visible, step:", this.currentStep);
            });
        }
        // Initialize the icons list
        this.initializeIcons();
    }
    /**
     * Preload background images and icons for a smoother experience
     */
    preloadWizardData() {
        // Start loading background images immediately when modal is opened
        this.loadBackgroundImages();
        // Also preload icons
        this.loadIcons();
        console.log('Preloading wizard data for smoother experience');
    }
    /**
     * Gets the background images URL from the hidden input field.
     * Following the pattern from index.ts
     */
    getImagePath() {
        const imagePathInput = document.getElementById('image-path');
        if (!imagePathInput || !imagePathInput.value) {
            console.error('Background image path not found in hidden field "image-path"');
        }
        const imagePath = (imagePathInput === null || imagePathInput === void 0 ? void 0 : imagePathInput.value) || '';
        console.log('Background images URL from hidden field:', imagePath);
        return imagePath;
    }
    /**
     * Load background images from the server
     */
    async loadBackgroundImages() {
        var _a;
        // If we already have background images loaded, no need to fetch again
        if (this.backgroundImages.length > 0) {
            console.log('Using already loaded background images');
            // Just update UI and hide spinner
            const loadingSpinner = document.getElementById('background-loading-spinner');
            const carouselContainer = document.getElementById('background-carousel-container');
            // Render with existing data
            this.renderBackgroundImages();
            // Update UI
            if (loadingSpinner)
                loadingSpinner.classList.add('d-none');
            if (carouselContainer)
                carouselContainer.classList.remove('d-none');
            return;
        }
        try {
            // Show loading spinner and hide other elements
            const loadingSpinner = document.getElementById('background-loading-spinner');
            const errorMessage = document.getElementById('background-error');
            const carouselContainer = document.getElementById('background-carousel-container');
            if (loadingSpinner)
                loadingSpinner.classList.remove('d-none');
            if (errorMessage)
                errorMessage.classList.add('d-none');
            if (carouselContainer)
                carouselContainer.classList.add('d-none');
            // *** IMPORTANT: Following the exact pattern from index.ts for AJAX calls ***
            // Use current path for correct routing (regardless of which page it's embedded in)
            const url = `${document.location.pathname}?handler=BackgroundImages`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                console.error('Network response was not OK');
                this.showBackgroundLoadError();
                return;
            }
            const responseData = await response.json();
            console.log('Background images response:', responseData);
            // Process the response
            if (responseData.success) {
                // The data structure is nested - backgrounds are in responseData.data.backgrounds
                this.backgroundImages = ((_a = responseData.data) === null || _a === void 0 ? void 0 : _a.backgrounds) || [];
                console.log('Parsed background images:', this.backgroundImages);
                this.renderBackgroundImages();
                // Hide loading spinner, show carousel
                if (loadingSpinner)
                    loadingSpinner.classList.add('d-none');
                if (carouselContainer)
                    carouselContainer.classList.remove('d-none');
            }
            else {
                console.error('API request failed:', responseData.message);
                this.showBackgroundLoadError();
            }
        }
        catch (error) {
            console.error('Error fetching background images:', error);
            this.showBackgroundLoadError();
        }
    }
    /**
     * Show error message when background images can't be loaded
     */
    showBackgroundLoadError() {
        const loadingSpinner = document.getElementById('background-loading-spinner');
        const errorMessage = document.getElementById('background-error');
        const carouselContainer = document.getElementById('background-carousel-container');
        if (loadingSpinner)
            loadingSpinner.classList.add('d-none');
        if (errorMessage)
            errorMessage.classList.remove('d-none');
        if (carouselContainer)
            carouselContainer.classList.add('d-none');
    }
    /**
     * Render background images in the carousel
     */
    renderBackgroundImages() {
        const backgroundSlider = document.getElementById('background-slider');
        const template = document.getElementById('background-template');
        if (!backgroundSlider || !template) {
            console.error('Background slider or template not found');
            return;
        }
        // Clear existing slides
        backgroundSlider.innerHTML = '';
        // Get the image path for constructing URLs
        const imagePath = this.getImagePath();
        console.log('Using image path for background cards:', imagePath);
        // Find the selected background
        const selectedTitle = this.selectedBackgroundTitle.toLowerCase() || this.breakTypeData.imageTitle.toLowerCase();
        // First add the selected background as the first slide (if found)
        let selectedAdded = false;
        // Create slides for each background image, putting the selected one first
        this.backgroundImages.forEach(image => {
            var _a, _b, _c;
            // Skip this iteration if this image is the selected one but we're not on the first pass
            if (selectedAdded && image.title.toLowerCase() === selectedTitle) {
                return;
            }
            // Skip non-selected backgrounds on first pass
            if (!selectedAdded && image.title.toLowerCase() !== selectedTitle) {
                return;
            }
            console.log('Creating slide for background:', image);
            // Clone the template content
            const slideContent = template.content.cloneNode(true);
            const card = slideContent.querySelector('.background-card');
            const imageElement = slideContent.querySelector('.background-image');
            const titleElement = slideContent.querySelector('.background-title');
            const descriptionElement = slideContent.querySelector('.background-description');
            const selectButton = slideContent.querySelector('.select-background-btn');
            // Set data attribute for this background
            card.setAttribute('data-background-title', image.title);
            // Set image source with complete URL from image path
            // Make sure to convert the title to lowercase for the filename
            const lowerCaseTitle = image.title.toLowerCase();
            const imageUrl = `${imagePath}/${lowerCaseTitle}-thumb.jpg`;
            console.log('Setting image URL:', imageUrl);
            imageElement.src = imageUrl;
            imageElement.alt = image.description || image.title;
            // Set title and description
            titleElement.textContent = this.formatTitle(image.title);
            descriptionElement.textContent = image.description || '';
            // Set up select button
            selectButton.addEventListener('click', () => {
                this.selectBackground(image.title);
            });
            // Check if this is the selected background (using case-insensitive comparison)
            if (image.title.toLowerCase() === selectedTitle) {
                console.log(`Matching background found: ${image.title} (Selected: ${this.selectedBackgroundTitle}, Data: ${this.breakTypeData.imageTitle})`);
                this.selectBackground(image.title, false); // Don't update data, just UI
                card.classList.add('selected');
                selectButton.classList.add('btn-primary');
                selectButton.classList.remove('btn-outline-primary');
                (_a = selectButton.querySelector('.check-icon')) === null || _a === void 0 ? void 0 : _a.classList.remove('d-none');
                (_b = selectButton.querySelector('.select-text')) === null || _b === void 0 ? void 0 : _b.classList.add('d-none');
                (_c = selectButton.querySelector('.selected-text')) === null || _c === void 0 ? void 0 : _c.classList.remove('d-none');
                selectedAdded = true;
            }
            // Add the slide to the slider
            backgroundSlider.appendChild(slideContent);
        });
        // Now add the rest of the backgrounds (non-selected ones)
        this.backgroundImages.forEach(image => {
            // Skip the selected background as it's already added
            if (image.title.toLowerCase() === selectedTitle) {
                return;
            }
            console.log('Creating slide for background:', image);
            // Clone the template content
            const slideContent = template.content.cloneNode(true);
            const card = slideContent.querySelector('.background-card');
            const imageElement = slideContent.querySelector('.background-image');
            const titleElement = slideContent.querySelector('.background-title');
            const descriptionElement = slideContent.querySelector('.background-description');
            const selectButton = slideContent.querySelector('.select-background-btn');
            // Set data attribute for this background
            card.setAttribute('data-background-title', image.title);
            // Set image source with complete URL from image path
            // Make sure to convert the title to lowercase for the filename
            const lowerCaseTitle = image.title.toLowerCase();
            const imageUrl = `${imagePath}/${lowerCaseTitle}-thumb.jpg`;
            console.log('Setting image URL:', imageUrl);
            imageElement.src = imageUrl;
            imageElement.alt = image.description || image.title;
            // Set title and description
            titleElement.textContent = this.formatTitle(image.title);
            descriptionElement.textContent = image.description || '';
            // Set up select button
            selectButton.addEventListener('click', () => {
                this.selectBackground(image.title);
            });
            // Add the slide to the slider
            backgroundSlider.appendChild(slideContent);
        });
    }
    /**
     * Format the background title for display
     * @param title - The raw background title
     * @returns formatted title
     */
    formatTitle(title) {
        if (!title)
            return '';
        // Replace hyphens with spaces and capitalize each word
        return title
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    /**
     * Select a background image
     * @param backgroundTitle - The title of the selected background
     * @param updateData - Whether to update the breakTypeData object
     */
    selectBackground(backgroundTitle, updateData = true) {
        // Always use lowercase for background titles for consistency
        const normalizedTitle = backgroundTitle.toLowerCase();
        // Update selected background
        this.selectedBackgroundTitle = normalizedTitle;
        // Update breakTypeData if requested
        if (updateData) {
            this.breakTypeData.imageTitle = normalizedTitle;
        }
        console.log(`Selected background: ${normalizedTitle}`);
        // Update UI for all background cards
        const cards = document.querySelectorAll('.background-card');
        cards.forEach(card => {
            const cardTitle = card.getAttribute('data-background-title');
            const selectButton = card.querySelector('.select-background-btn');
            const checkIcon = card.querySelector('.check-icon');
            const selectText = card.querySelector('.select-text');
            const selectedText = card.querySelector('.selected-text');
            // Use case-insensitive comparison
            if (cardTitle && cardTitle.toLowerCase() === normalizedTitle) {
                // This is the selected card
                card.classList.add('selected');
                if (selectButton) {
                    selectButton.classList.add('btn-primary');
                    selectButton.classList.remove('btn-outline-primary');
                }
                if (checkIcon)
                    checkIcon.classList.remove('d-none');
                if (selectText)
                    selectText.classList.add('d-none');
                if (selectedText)
                    selectedText.classList.remove('d-none');
            }
            else {
                // This is not the selected card
                card.classList.remove('selected');
                if (selectButton) {
                    selectButton.classList.remove('btn-primary');
                    selectButton.classList.add('btn-outline-primary');
                }
                if (checkIcon)
                    checkIcon.classList.add('d-none');
                if (selectText)
                    selectText.classList.remove('d-none');
                if (selectedText)
                    selectedText.classList.add('d-none');
            }
        });
        // Don't adjust the carousel position when selecting a card
    }
    /**
     * Initialize the Swiper carousel for background images
     */
    initBackgroundSwiper() {
        try {
            // Check if Swiper is available
            if (typeof window.Swiper === 'undefined') {
                console.error('Swiper is not available');
                return;
            }
            // Initialize the swiper carousel
            const backgroundSwiperElement = document.querySelector('.background-swiper');
            if (backgroundSwiperElement) {
                // We'll render all slides and just mark the selected one as active visually
                // Don't change any slide position - leave the carousel where it is
                // But we still need initialSlide for the configuration
                let initialSlide = 0;
                console.log('Initializing background carousel without changing slide position');
                // Get and modify the Swiper options to include initialSlide
                const options = backgroundSwiperElement.getAttribute('data-swiper-options');
                if (options) {
                    const parsedOptions = JSON.parse(options);
                    // Configure Swiper for proper display without moving slides when selected
                    parsedOptions.initialSlide = 0; // Start at the beginning, not at the selected slide
                    parsedOptions.speed = 300; // Normal animation speed for user navigation
                    parsedOptions.centeredSlides = false; // Don't center the active slide
                    parsedOptions.centeredSlidesBounds = false; // Don't keep slides within bounds
                    parsedOptions.slideToClickedSlide = false; // Don't navigate to slides when clicked (we handle this ourselves)
                    parsedOptions.updateOnImagesReady = true; // Update when images are loaded
                    parsedOptions.preloadImages = true; // Preload all images
                    parsedOptions.watchSlidesProgress = true; // Track slide progress for better positioning
                    parsedOptions.watchSlidesVisibility = true; // Track slide visibility
                    parsedOptions.roundLengths = true; // Round values to prevent blurry text
                    // Set up event handlers for clean initialization
                    parsedOptions.on = parsedOptions.on || {};
                    // Store original event handlers if they exist
                    const originalOnInit = parsedOptions.on.init;
                    const originalOnImagesReady = parsedOptions.on.imagesReady;
                    // Use the init event to disable transitions during initial positioning
                    parsedOptions.on.init = function (swiper) {
                        // Disable transition during initialization
                        swiper.wrapperEl.style.transitionDuration = '0ms';
                        // Call original init if it exists
                        if (typeof originalOnInit === 'function') {
                            originalOnInit(swiper);
                        }
                    };
                    // Use the imagesReady event to ensure proper positioning and re-enable transitions
                    parsedOptions.on.imagesReady = function (swiper) {
                        // Call original imagesReady if it exists
                        if (typeof originalOnImagesReady === 'function') {
                            originalOnImagesReady(swiper);
                        }
                        // Don't change slide position during initialization
                        // No need to do anything here
                        // Re-enable transitions for future slide changes
                        swiper.wrapperEl.style.transitionDuration = '';
                        swiper.params.speed = 300; // Standard Swiper default speed
                    };
                    // No need to force the slide to stay at the initial position after user interaction
                    // Store swiper instance for future reference
                    const backgroundSwiper = new window.Swiper(backgroundSwiperElement, parsedOptions);
                    // Leave carousel at initial position
                    // Store the swiper instance in a global variable for step navigation
                    window.__backgroundSwiper = backgroundSwiper;
                }
            }
        }
        catch (error) {
            console.error('Error initializing background swiper:', error);
        }
    }
    /**
     * Initialize the Swiper carousel for icons
     */
    initIconSwiper() {
        try {
            // Check if Swiper is available
            if (typeof window.Swiper === 'undefined') {
                console.error('Swiper is not available');
                return;
            }
            // Initialize the swiper carousel
            const iconSwiperElement = document.querySelector('.icon-swiper');
            if (iconSwiperElement) {
                // We'll render all slides and just mark the selected one as active visually
                // Don't change any slide position - leave the carousel where it is
                // But we still need initialSlide for the configuration
                let initialSlide = 0;
                console.log('Initializing icon carousel without changing slide position');
                // Get and modify the Swiper options to include initialSlide
                const options = iconSwiperElement.getAttribute('data-swiper-options');
                if (options) {
                    const parsedOptions = JSON.parse(options);
                    // Configure Swiper for proper display without moving slides when selected
                    parsedOptions.initialSlide = 0; // Start at the beginning, not at the selected slide
                    parsedOptions.speed = 300; // Normal animation speed for user navigation
                    parsedOptions.centeredSlides = false; // Don't center the active slide
                    parsedOptions.centeredSlidesBounds = false; // Don't keep slides within bounds
                    parsedOptions.slideToClickedSlide = false; // Don't navigate to slides when clicked (we handle this ourselves)
                    parsedOptions.updateOnImagesReady = true; // Update when images are loaded
                    parsedOptions.preloadImages = true; // Preload all images
                    parsedOptions.watchSlidesProgress = true; // Track slide progress for better positioning
                    parsedOptions.watchSlidesVisibility = true; // Track slide visibility
                    parsedOptions.roundLengths = true; // Round values to prevent blurry text
                    // Set up event handlers for clean initialization
                    parsedOptions.on = parsedOptions.on || {};
                    // Store original event handlers if they exist
                    const originalOnInit = parsedOptions.on.init;
                    const originalOnImagesReady = parsedOptions.on.imagesReady;
                    // Use the init event to disable transitions during initial positioning
                    parsedOptions.on.init = function (swiper) {
                        // Disable transition during initialization
                        swiper.wrapperEl.style.transitionDuration = '0ms';
                        // Call original init if it exists
                        if (typeof originalOnInit === 'function') {
                            originalOnInit(swiper);
                        }
                    };
                    // Use the imagesReady event to ensure proper positioning and re-enable transitions
                    parsedOptions.on.imagesReady = function (swiper) {
                        // Call original imagesReady if it exists
                        if (typeof originalOnImagesReady === 'function') {
                            originalOnImagesReady(swiper);
                        }
                        // Don't change slide position during initialization
                        // No need to do anything here
                        // Re-enable transitions for future slide changes
                        swiper.wrapperEl.style.transitionDuration = '';
                        swiper.params.speed = 300; // Standard Swiper default speed
                    };
                    // No need to force the slide to stay at the initial position after user interaction
                    // Store swiper instance for future reference
                    const iconSwiper = new window.Swiper(iconSwiperElement, parsedOptions);
                    // Leave carousel at initial position
                    // Store the swiper instance in a global variable for step navigation
                    window.__iconSwiper = iconSwiper;
                }
            }
        }
        catch (error) {
            console.error('Error initializing icon swiper:', error);
        }
    }
    /**
     * Initialize the list of available icons
     */
    initializeIcons() {
        // Initialize with a curated list of 50 Font Awesome icons that work well for break types
        this.icons = [
            // Basic break icons
            { name: 'fa-coffee', displayName: 'Coffee', category: 'Breaks' },
            { name: 'fa-mug-hot', displayName: 'Hot Drink', category: 'Breaks' },
            { name: 'fa-mug-tea', displayName: 'Tea', category: 'Breaks' },
            { name: 'fa-cookie', displayName: 'Cookie', category: 'Breaks' },
            { name: 'fa-cookie-bite', displayName: 'Cookie Bite', category: 'Breaks' },
            // Food icons
            { name: 'fa-utensils', displayName: 'Utensils', category: 'Food' },
            { name: 'fa-hamburger', displayName: 'Hamburger', category: 'Food' },
            { name: 'fa-pizza-slice', displayName: 'Pizza', category: 'Food' },
            { name: 'fa-ice-cream', displayName: 'Ice Cream', category: 'Food' },
            { name: 'fa-candy-cane', displayName: 'Candy', category: 'Food' },
            { name: 'fa-apple-alt', displayName: 'Apple', category: 'Food' },
            { name: 'fa-carrot', displayName: 'Carrot', category: 'Food' },
            { name: 'fa-bread-slice', displayName: 'Bread', category: 'Food' },
            { name: 'fa-cheese', displayName: 'Cheese', category: 'Food' },
            { name: 'fa-hotdog', displayName: 'Hot Dog', category: 'Food' },
            // Activity icons
            { name: 'fa-walking', displayName: 'Walking', category: 'Activity' },
            { name: 'fa-hiking', displayName: 'Hiking', category: 'Activity' },
            { name: 'fa-running', displayName: 'Running', category: 'Activity' },
            { name: 'fa-biking', displayName: 'Biking', category: 'Activity' },
            { name: 'fa-swimming-pool', displayName: 'Swimming', category: 'Activity' },
            { name: 'fa-dumbbell', displayName: 'Workout', category: 'Activity' },
            { name: 'fa-table-tennis', displayName: 'Ping Pong', category: 'Activity' },
            { name: 'fa-basketball-ball', displayName: 'Basketball', category: 'Activity' },
            { name: 'fa-football-ball', displayName: 'Football', category: 'Activity' },
            { name: 'fa-volleyball-ball', displayName: 'Volleyball', category: 'Activity' },
            // Relaxation icons
            { name: 'fa-bed', displayName: 'Bed', category: 'Relaxation' },
            { name: 'fa-couch', displayName: 'Couch', category: 'Relaxation' },
            { name: 'fa-bath', displayName: 'Bath', category: 'Relaxation' },
            { name: 'fa-hot-tub', displayName: 'Hot Tub', category: 'Relaxation' },
            { name: 'fa-spa', displayName: 'Spa', category: 'Relaxation' },
            { name: 'fa-book', displayName: 'Reading', category: 'Relaxation' },
            { name: 'fa-book-open', displayName: 'Open Book', category: 'Relaxation' },
            { name: 'fa-headphones', displayName: 'Music', category: 'Relaxation' },
            // Work/Meeting icons
            { name: 'fa-briefcase', displayName: 'Briefcase', category: 'Work' },
            { name: 'fa-users', displayName: 'Meeting', category: 'Work' },
            { name: 'fa-chalkboard-teacher', displayName: 'Presentation', category: 'Work' },
            { name: 'fa-tasks', displayName: 'Tasks', category: 'Work' },
            { name: 'fa-clipboard-list', displayName: 'Checklist', category: 'Work' },
            { name: 'fa-project-diagram', displayName: 'Project', category: 'Work' },
            { name: 'fa-brain', displayName: 'Brain Break', category: 'Work' },
            // Time icons
            { name: 'fa-clock', displayName: 'Clock', category: 'Time' },
            { name: 'fa-hourglass-half', displayName: 'Hourglass', category: 'Time' },
            { name: 'fa-stopwatch', displayName: 'Stopwatch', category: 'Time' },
            { name: 'fa-bell', displayName: 'Bell', category: 'Time' },
            { name: 'fa-calendar-alt', displayName: 'Calendar', category: 'Time' },
            // Misc icons
            { name: 'fa-flask', displayName: 'Lab', category: 'Misc' },
            { name: 'fa-star', displayName: 'Star', category: 'Misc' },
            { name: 'fa-heart', displayName: 'Heart', category: 'Misc' },
            { name: 'fa-lightbulb', displayName: 'Idea', category: 'Misc' },
            { name: 'fa-comment', displayName: 'Comment', category: 'Misc' },
            { name: 'fa-comments', displayName: 'Chat', category: 'Misc' }
        ];
    }
    /**
     * Load and display the icons in the wizard
     */
    loadIcons() {
        try {
            // Show loading spinner, hide error and container
            const loadingSpinner = document.getElementById('icon-loading-spinner');
            const errorMessage = document.getElementById('icon-error');
            const carouselContainer = document.getElementById('icon-carousel-container');
            if (loadingSpinner)
                loadingSpinner.classList.remove('d-none');
            if (errorMessage)
                errorMessage.classList.add('d-none');
            if (carouselContainer)
                carouselContainer.classList.add('d-none');
            // We don't need to wait for API as icons are loaded in memory
            // Just render them immediately
            this.renderIcons();
            // Hide loading spinner, show carousel
            if (loadingSpinner)
                loadingSpinner.classList.add('d-none');
            if (carouselContainer)
                carouselContainer.classList.remove('d-none');
        }
        catch (error) {
            console.error('Error loading icons:', error);
            this.showIconLoadError();
        }
    }
    /**
     * Show error message when icons can't be loaded
     */
    showIconLoadError() {
        const loadingSpinner = document.getElementById('icon-loading-spinner');
        const errorMessage = document.getElementById('icon-error');
        const carouselContainer = document.getElementById('icon-carousel-container');
        if (loadingSpinner)
            loadingSpinner.classList.add('d-none');
        if (errorMessage)
            errorMessage.classList.remove('d-none');
        if (carouselContainer)
            carouselContainer.classList.add('d-none');
    }
    /**
     * Render icons in the carousel
     */
    renderIcons() {
        const iconSlider = document.getElementById('icon-slider');
        const template = document.getElementById('icon-template');
        if (!iconSlider || !template) {
            console.error('Icon slider or template not found');
            return;
        }
        // Clear existing slides
        iconSlider.innerHTML = '';
        // Find the selected icon
        const selectedIconName = this.selectedIconName || this.breakTypeData.iconName;
        // First add the selected icon as the first slide (if found)
        let selectedAdded = false;
        // Create slides for each icon, putting the selected one first
        this.icons.forEach(icon => {
            var _a, _b, _c;
            // Skip this iteration if this icon is the selected one but we're not on the first pass
            if (selectedAdded && icon.name === selectedIconName) {
                return;
            }
            // Skip non-selected icons on first pass
            if (!selectedAdded && icon.name !== selectedIconName) {
                return;
            }
            console.log('Creating slide for icon:', icon);
            // Clone the template content
            const slideContent = template.content.cloneNode(true);
            const card = slideContent.querySelector('.icon-card');
            const iconElement = slideContent.querySelector('.icon-display');
            const titleElement = slideContent.querySelector('.icon-title');
            const selectButton = slideContent.querySelector('.select-icon-btn');
            // Set data attribute for this icon
            card.setAttribute('data-icon-name', icon.name);
            // Set icon classes (using Font Awesome)
            // Using 'far' for regular style instead of 'fas' (solid)
            iconElement.className = '';
            iconElement.classList.add('far', icon.name, 'icon-display', 'fs-1', 'my-4');
            // Set title from display name
            titleElement.textContent = icon.displayName;
            // Set up select button
            selectButton.addEventListener('click', () => {
                this.selectIcon(icon.name);
            });
            // Check if this is the selected icon
            if (icon.name === selectedIconName) {
                console.log(`Matching icon found: ${icon.name} (Selected: ${this.selectedIconName}, Data: ${this.breakTypeData.iconName})`);
                this.selectIcon(icon.name, false); // Don't update data, just UI
                card.classList.add('selected');
                selectButton.classList.add('btn-primary');
                selectButton.classList.remove('btn-outline-primary');
                (_a = selectButton.querySelector('.check-icon')) === null || _a === void 0 ? void 0 : _a.classList.remove('d-none');
                (_b = selectButton.querySelector('.select-text')) === null || _b === void 0 ? void 0 : _b.classList.add('d-none');
                (_c = selectButton.querySelector('.selected-text')) === null || _c === void 0 ? void 0 : _c.classList.remove('d-none');
                selectedAdded = true;
            }
            // Add the slide to the slider
            iconSlider.appendChild(slideContent);
        });
        // Now add the rest of the icons (non-selected ones)
        this.icons.forEach(icon => {
            // Skip the selected icon as it's already added
            if (icon.name === selectedIconName) {
                return;
            }
            console.log('Creating slide for icon:', icon);
            // Clone the template content
            const slideContent = template.content.cloneNode(true);
            const card = slideContent.querySelector('.icon-card');
            const iconElement = slideContent.querySelector('.icon-display');
            const titleElement = slideContent.querySelector('.icon-title');
            const selectButton = slideContent.querySelector('.select-icon-btn');
            // Set data attribute for this icon
            card.setAttribute('data-icon-name', icon.name);
            // Set icon classes (using Font Awesome)
            // Using 'far' for regular style instead of 'fas' (solid)
            iconElement.className = '';
            iconElement.classList.add('far', icon.name, 'icon-display', 'fs-1', 'my-4');
            // Set title from display name
            titleElement.textContent = icon.displayName;
            // Set up select button
            selectButton.addEventListener('click', () => {
                this.selectIcon(icon.name);
            });
            // Add the slide to the slider
            iconSlider.appendChild(slideContent);
        });
    }
    /**
     * Select an icon
     * @param iconName - The name of the selected icon
     * @param updateData - Whether to update the breakTypeData object
     */
    selectIcon(iconName, updateData = true) {
        // Update selected icon
        this.selectedIconName = iconName;
        // Update breakTypeData if requested
        if (updateData) {
            this.breakTypeData.iconName = iconName;
        }
        // Update UI for all icon cards
        const cards = document.querySelectorAll('.icon-card');
        cards.forEach(card => {
            const cardIconName = card.getAttribute('data-icon-name');
            const selectButton = card.querySelector('.select-icon-btn');
            const checkIcon = card.querySelector('.check-icon');
            const selectText = card.querySelector('.select-text');
            const selectedText = card.querySelector('.selected-text');
            if (cardIconName === iconName) {
                // This is the selected card
                card.classList.add('selected');
                if (selectButton) {
                    selectButton.classList.add('btn-primary');
                    selectButton.classList.remove('btn-outline-primary');
                }
                if (checkIcon)
                    checkIcon.classList.remove('d-none');
                if (selectText)
                    selectText.classList.add('d-none');
                if (selectedText)
                    selectedText.classList.remove('d-none');
            }
            else {
                // This is not the selected card
                card.classList.remove('selected');
                if (selectButton) {
                    selectButton.classList.remove('btn-primary');
                    selectButton.classList.add('btn-outline-primary');
                }
                if (checkIcon)
                    checkIcon.classList.add('d-none');
                if (selectText)
                    selectText.classList.remove('d-none');
                if (selectedText)
                    selectedText.classList.add('d-none');
            }
        });
        // Don't adjust the carousel position when selecting a card
    }
    /**
     * Show the wizard modal for creating a new break type
     */
    showCreateWizard() {
        this.isEditMode = false;
        this.resetWizard();
        // Ensure we're on step 1 when showing the modal
        this.currentStep = 1;
        this.updateStepDisplay();
        this.showModal();
    }
    /**
     * Show the wizard modal for editing an existing break type
     * @param breakTypeData - The break type data to edit
     */
    showEditWizard(breakTypeData) {
        this.isEditMode = true;
        // Make a deep copy of the data
        this.breakTypeData = Object.assign({}, breakTypeData);
        // Ensure the image title is properly set (normalize to lowercase)
        if (breakTypeData.imageTitle) {
            console.log(`Setting selected background title: ${breakTypeData.imageTitle}`);
            this.selectedBackgroundTitle = breakTypeData.imageTitle.toLowerCase();
            // Also make sure the data property is lowercase for consistency
            this.breakTypeData.imageTitle = breakTypeData.imageTitle.toLowerCase();
        }
        else {
            this.selectedBackgroundTitle = '';
        }
        // Set selected icon
        this.selectedIconName = breakTypeData.iconName;
        // Destroy any existing Swiper instances to allow fresh initialization
        this.destroyExistingSwipers();
        // Ensure we're on step 1 when showing the modal
        this.currentStep = 1;
        this.updateStepDisplay();
        this.populateWizardFields();
        this.showModal();
    }
    /**
     * Destroy any existing swiper instances to ensure clean initialization
     */
    destroyExistingSwipers() {
        // Destroy background swiper if it exists
        if (window.__backgroundSwiper) {
            try {
                window.__backgroundSwiper.destroy();
                window.__backgroundSwiper = null;
                console.log('Destroyed existing background swiper');
            }
            catch (error) {
                console.error('Error destroying background swiper:', error);
            }
        }
        // Destroy icon swiper if it exists
        if (window.__iconSwiper) {
            try {
                window.__iconSwiper.destroy();
                window.__iconSwiper = null;
                console.log('Destroyed existing icon swiper');
            }
            catch (error) {
                console.error('Error destroying icon swiper:', error);
            }
        }
    }
    /**
     * Reset the wizard to its initial state
     */
    resetWizard() {
        // Reset to step 1
        this.currentStep = 1;
        this.updateStepDisplay();
        // Reset the break type data to defaults using our helper method
        this.breakTypeData = this.createDefaultBreakTypeData();
        // Reset selected background and icon to match defaults
        this.selectedBackgroundTitle = this.breakTypeData.imageTitle;
        this.selectedIconName = this.breakTypeData.iconName;
        // Reset form fields
        const form = document.getElementById('break-type-wizard-form');
        if (form) {
            form.reset();
            // Populate form with default values from this.breakTypeData
            const nameField = document.getElementById('breakTypeName');
            const defaultDurationField = document.getElementById('defaultBreakDuration');
            const timeStepField = document.getElementById('breakTimeStep');
            const countdownMessageField = document.getElementById('breakCountdownMessage');
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage');
            const endTimeTitleField = document.getElementById('breakEndTimeTitle');
            if (nameField)
                nameField.value = this.breakTypeData.name;
            if (defaultDurationField)
                defaultDurationField.value = this.breakTypeData.defaultDurationMinutes.toString();
            if (timeStepField)
                timeStepField.value = this.breakTypeData.breakTimeStepMinutes.toString();
            if (countdownMessageField)
                countdownMessageField.value = this.breakTypeData.countdownMessage;
            if (countdownEndMessageField)
                countdownEndMessageField.value = this.breakTypeData.countdownEndMessage;
            if (endTimeTitleField)
                endTimeTitleField.value = this.breakTypeData.endTimeTitle;
            // Reset break type ID field
            const idField = document.getElementById('break-type-id');
            if (idField)
                idField.value = '';
        }
    }
    /**
     * Populate the wizard fields with the current break type data
     */
    populateWizardFields() {
        // Populate form fields with break type data
        const form = document.getElementById('break-type-wizard-form');
        if (form) {
            // Set break type ID
            const idField = document.getElementById('break-type-id');
            if (idField && this.breakTypeData.id)
                idField.value = this.breakTypeData.id;
            // Set basic properties
            const nameField = document.getElementById('breakTypeName');
            const defaultDurationField = document.getElementById('defaultBreakDuration');
            const timeStepField = document.getElementById('breakTimeStep');
            if (nameField)
                nameField.value = this.breakTypeData.name;
            if (defaultDurationField)
                defaultDurationField.value = this.breakTypeData.defaultDurationMinutes.toString();
            if (timeStepField)
                timeStepField.value = this.breakTypeData.breakTimeStepMinutes.toString();
            // Set text messages
            const countdownMessageField = document.getElementById('breakCountdownMessage');
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage');
            const endTimeTitleField = document.getElementById('breakEndTimeTitle');
            if (countdownMessageField)
                countdownMessageField.value = this.breakTypeData.countdownMessage;
            if (countdownEndMessageField)
                countdownEndMessageField.value = this.breakTypeData.countdownEndMessage;
            if (endTimeTitleField)
                endTimeTitleField.value = this.breakTypeData.endTimeTitle;
            // Background selection will be handled when step 3 is activated
        }
    }
    /**
     * Show the wizard modal
     */
    showModal() {
        if (this.modal) {
            this.modal.show();
        }
        else {
            console.error('Bootstrap modal not initialized');
        }
    }
    /**
     * Hide the wizard modal
     */
    hideModal() {
        if (this.modal) {
            this.modal.hide();
        }
    }
    /**
     * Update the display of steps in the wizard
     */
    updateStepDisplay() {
        // Hide all steps first
        const steps = document.querySelectorAll('.wizard-step');
        steps.forEach(s => {
            s.classList.remove('active');
        });
        // Then show current step (the CSS handles the animation)
        const currentStepElement = document.querySelector(`.wizard-step[data-step="${this.currentStep}"]`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
        // Update progress steps
        const progressSteps = document.querySelectorAll('.wizard-progress-step');
        progressSteps.forEach(ps => {
            const stepNum = parseInt(ps.getAttribute('data-step') || '0');
            if (stepNum < this.currentStep) {
                ps.classList.add('completed');
                ps.classList.remove('active');
            }
            else if (stepNum === this.currentStep) {
                ps.classList.add('active');
                ps.classList.remove('completed');
            }
            else {
                ps.classList.remove('active', 'completed');
            }
        });
        // Update buttons
        const prevButton = document.getElementById('wizard-prev-btn');
        const nextButton = document.getElementById('wizard-next-btn');
        const saveButton = document.getElementById('wizard-save-btn');
        if (prevButton)
            prevButton.disabled = this.currentStep === 1;
        if (nextButton && saveButton) {
            if (this.currentStep === this.totalSteps) {
                nextButton.classList.add('d-none');
                saveButton.classList.remove('d-none');
            }
            else {
                nextButton.classList.remove('d-none');
                saveButton.classList.add('d-none');
            }
        }
        // Update step title
        const stepTitle = document.getElementById('wizard-step-title');
        if (stepTitle) {
            const titles = [
                'Step 1: General Settings',
                'Step 2: Text Messages',
                'Step 3: Choose Background',
                'Step 4: Select Icon'
            ];
            stepTitle.textContent = titles[this.currentStep - 1] || `Step ${this.currentStep}`;
        }
        // Initialize or update the carousel for the current step
        console.log(`Step changed to ${this.currentStep}`);
        // Step 3: Initialize background carousel when stepping into it
        if (this.currentStep === 3) {
            // First, ensure the backgrounds are rendered
            this.renderBackgroundImages();
            // Destroy previous instance if it exists
            if (window.__backgroundSwiper) {
                window.__backgroundSwiper.destroy();
                window.__backgroundSwiper = null;
            }
            // Initialize the background swiper
            this.initBackgroundSwiper();
        }
        // Step 4: Initialize icon carousel when stepping into it
        if (this.currentStep === 4) {
            // First, ensure the icons are rendered
            this.renderIcons();
            // Destroy previous instance if it exists
            if (window.__iconSwiper) {
                window.__iconSwiper.destroy();
                window.__iconSwiper = null;
            }
            // Initialize the icon swiper
            this.initIconSwiper();
        }
    }
    /**
     * Set up event listeners for the wizard
     */
    setupEventListeners() {
        var _a;
        // Get wizard navigation buttons
        const prevButton = document.getElementById('wizard-prev-btn');
        const nextButton = document.getElementById('wizard-next-btn');
        const saveButton = document.getElementById('wizard-save-btn');
        const cancelButton = (_a = this.modalElement) === null || _a === void 0 ? void 0 : _a.querySelector('.btn-close');
        // Handle previous button click
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentStep > 1) {
                    this.currentStep--;
                    this.updateStepDisplay();
                }
            });
        }
        // Handle next button click
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (this.validateCurrentStep() && this.currentStep < this.totalSteps) {
                    this.currentStep++;
                    this.updateStepDisplay();
                }
            });
        }
        // Handle save button click
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                if (this.validateCurrentStep()) {
                    this.saveBreakType();
                }
            });
        }
        // Handle cancel button click
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.hideModal();
            });
        }
    }
    /**
     * Validate the current step
     * @returns boolean - Whether the current step is valid
     */
    validateCurrentStep() {
        // Basic validation for step 1 (General Settings)
        if (this.currentStep === 1) {
            const nameField = document.getElementById('breakTypeName');
            const defaultDurationField = document.getElementById('defaultBreakDuration');
            const timeStepField = document.getElementById('breakTimeStep');
            if (!(nameField === null || nameField === void 0 ? void 0 : nameField.value)) {
                nameField === null || nameField === void 0 ? void 0 : nameField.classList.add('is-invalid');
                return false;
            }
            if (!(defaultDurationField === null || defaultDurationField === void 0 ? void 0 : defaultDurationField.value) || isNaN(parseInt(defaultDurationField.value)) ||
                parseInt(defaultDurationField.value) < 1 || parseInt(defaultDurationField.value) > 1440) {
                defaultDurationField === null || defaultDurationField === void 0 ? void 0 : defaultDurationField.classList.add('is-invalid');
                return false;
            }
            if (!(timeStepField === null || timeStepField === void 0 ? void 0 : timeStepField.value) || isNaN(parseInt(timeStepField.value)) ||
                parseInt(timeStepField.value) < 1 || parseInt(timeStepField.value) > 60) {
                timeStepField === null || timeStepField === void 0 ? void 0 : timeStepField.classList.add('is-invalid');
                return false;
            }
            // Remove invalid class if valid
            nameField === null || nameField === void 0 ? void 0 : nameField.classList.remove('is-invalid');
            defaultDurationField === null || defaultDurationField === void 0 ? void 0 : defaultDurationField.classList.remove('is-invalid');
            timeStepField === null || timeStepField === void 0 ? void 0 : timeStepField.classList.remove('is-invalid');
        }
        // Basic validation for step 2 (Text Messages)
        if (this.currentStep === 2) {
            const countdownMessageField = document.getElementById('breakCountdownMessage');
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage');
            const endTimeTitleField = document.getElementById('breakEndTimeTitle');
            if (!(countdownMessageField === null || countdownMessageField === void 0 ? void 0 : countdownMessageField.value)) {
                countdownMessageField === null || countdownMessageField === void 0 ? void 0 : countdownMessageField.classList.add('is-invalid');
                return false;
            }
            if (!(countdownEndMessageField === null || countdownEndMessageField === void 0 ? void 0 : countdownEndMessageField.value)) {
                countdownEndMessageField === null || countdownEndMessageField === void 0 ? void 0 : countdownEndMessageField.classList.add('is-invalid');
                return false;
            }
            if (!(endTimeTitleField === null || endTimeTitleField === void 0 ? void 0 : endTimeTitleField.value)) {
                endTimeTitleField === null || endTimeTitleField === void 0 ? void 0 : endTimeTitleField.classList.add('is-invalid');
                return false;
            }
            // Remove invalid class if valid
            countdownMessageField === null || countdownMessageField === void 0 ? void 0 : countdownMessageField.classList.remove('is-invalid');
            countdownEndMessageField === null || countdownEndMessageField === void 0 ? void 0 : countdownEndMessageField.classList.remove('is-invalid');
            endTimeTitleField === null || endTimeTitleField === void 0 ? void 0 : endTimeTitleField.classList.remove('is-invalid');
        }
        // Validation for step 3 (Background)
        if (this.currentStep === 3) {
            if (!this.selectedBackgroundTitle) {
                // Show some kind of error
                console.error('No background selected');
                return false;
            }
        }
        // Validation for step 4 (Icon)
        if (this.currentStep === 4) {
            if (!this.selectedIconName) {
                // Show some kind of error
                console.error('No icon selected');
                return false;
            }
        }
        return true;
    }
    /**
     * Save the break type data
     */
    async saveBreakType() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            console.log('Saving break type...');
            // Get form values
            const form = document.getElementById('break-type-wizard-form');
            if (!form) {
                console.error('Form not found');
                return;
            }
            const idField = document.getElementById('break-type-id');
            const nameField = document.getElementById('breakTypeName');
            const defaultDurationField = document.getElementById('defaultBreakDuration');
            const timeStepField = document.getElementById('breakTimeStep');
            const countdownMessageField = document.getElementById('breakCountdownMessage');
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage');
            const endTimeTitleField = document.getElementById('breakEndTimeTitle');
            // Update break type data
            this.breakTypeData.name = (nameField === null || nameField === void 0 ? void 0 : nameField.value) || this.breakTypeData.name;
            this.breakTypeData.defaultDurationMinutes = parseInt((defaultDurationField === null || defaultDurationField === void 0 ? void 0 : defaultDurationField.value) || '15');
            this.breakTypeData.breakTimeStepMinutes = parseInt((timeStepField === null || timeStepField === void 0 ? void 0 : timeStepField.value) || '5');
            this.breakTypeData.countdownMessage = (countdownMessageField === null || countdownMessageField === void 0 ? void 0 : countdownMessageField.value) || this.breakTypeData.countdownMessage;
            this.breakTypeData.countdownEndMessage = (countdownEndMessageField === null || countdownEndMessageField === void 0 ? void 0 : countdownEndMessageField.value) || this.breakTypeData.countdownEndMessage;
            this.breakTypeData.endTimeTitle = (endTimeTitleField === null || endTimeTitleField === void 0 ? void 0 : endTimeTitleField.value) || this.breakTypeData.endTimeTitle;
            this.breakTypeData.imageTitle = this.selectedBackgroundTitle || this.breakTypeData.imageTitle;
            this.breakTypeData.iconName = this.selectedIconName || this.breakTypeData.iconName;
            // Get token for request - EXACTLY as in index.ts
            const tokenElement = form.querySelector('input[name="__RequestVerificationToken"]');
            if (!tokenElement) {
                console.error('Anti-forgery token not found');
                (_b = (_a = window).createToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Security token not found', false);
                return;
            }
            const token = tokenElement.value;
            // Validate form data - similar to index.ts
            if (!defaultDurationField.checkValidity() || !timeStepField.checkValidity() || !nameField.checkValidity()) {
                form.classList.add('was-validated');
                (_d = (_c = window).createToast) === null || _d === void 0 ? void 0 : _d.call(_c, 'Please correct the errors in the form', false);
                return;
            }
            // Create request payload - IMPORTANT: Match the property names with exact casing to match C# model
            const payload = {
                BreakId: idField.value, // Empty for new break types
                Name: nameField.value,
                DefaultDurationMinutes: parseInt(defaultDurationField.value),
                BreakTimeStepMinutes: parseInt(timeStepField.value),
                CountdownMessage: countdownMessageField.value,
                CountdownEndMessage: countdownEndMessageField.value,
                EndTimeTitle: endTimeTitleField.value,
                IconName: this.selectedIconName,
                ImageTitle: this.selectedBackgroundTitle
            };
            console.log('Break type payload:', payload);
            // Disable save button
            const saveButton = document.getElementById('wizard-save-btn');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
            }
            // Send request - EXACTLY MATCH the pattern from index.ts
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
                console.log('Break type saved successfully!', data);
                // Show success message BEFORE hiding modal
                const successMessage = data.message || 'Break type saved successfully';
                console.log('Showing toast:', successMessage);
                createToast(successMessage, true);
                // Store the break type ID for animation
                const savedBreakTypeId = ((_e = data.data) === null || _e === void 0 ? void 0 : _e.id) || this.breakTypeData.id;
                // Hide modal
                this.hideModal();
                // Reload break types list - use the same function as in index.ts
                if (typeof ((_h = (_g = (_f = window.Yuzu) === null || _f === void 0 ? void 0 : _f.Settings) === null || _g === void 0 ? void 0 : _g.BreakTypes) === null || _h === void 0 ? void 0 : _h.loadBreakTypes) === 'function') {
                    window.Yuzu.Settings.BreakTypes.loadBreakTypes(1);
                }
                // Add highlight animation to the saved card after a short delay
                if (savedBreakTypeId) {
                    setTimeout(() => {
                        const cardElement = document.querySelector(`article[data-id="${savedBreakTypeId}"]`);
                        if (cardElement) {
                            // Add highlight animation
                            const article = cardElement;
                            article.style.transition = 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out';
                            article.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.5)'; // Green glow
                            article.style.transform = 'scale(1.03)';
                            // Reset after animation completes
                            setTimeout(() => {
                                article.style.transform = 'scale(1)';
                                setTimeout(() => {
                                    article.style.boxShadow = '';
                                }, 300);
                            }, 700);
                        }
                    }, 500); // Wait for list to reload
                }
            }
            else {
                // Show error message
                createToast(data.message || 'Failed to save break type', false);
                // Display validation errors if any
                if (data.errors) {
                    console.error('Validation errors:', data.errors);
                    // Display the specific validation errors using toast
                    for (const [field, errors] of Object.entries(data.errors)) {
                        const errorArray = errors;
                        if (errorArray && errorArray.length > 0) {
                            createToast(`${field}: ${errorArray[0]}`, false);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error saving break type:', error);
            createToast('An error occurred while saving the break type', false);
        }
        finally {
            // Reset save button
            const saveButton = document.getElementById('wizard-save-btn');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = 'Save <i class="bx bx-check ms-1"></i>';
            }
        }
    }
    /**
     * Initialize the wizard
     */
    init() {
        if (!this.modalElement) {
            console.error('Break type wizard modal element not found');
            return;
        }
        this.setupEventListeners();
        console.log('Break type wizard initialized');
    }
}
// Create and export a singleton instance of the wizard
export const breakTypeWizard = new BreakTypeWizard();
// Initialize the wizard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    breakTypeWizard.init();
});
// Export functions for global access
window.createBreakType = () => {
    breakTypeWizard.showCreateWizard();
};
window.editBreakType = (button) => {
    // Extract break type data from button attributes
    const id = button.getAttribute('data-id') || '';
    const name = button.getAttribute('data-name') || '';
    const imageTitle = button.getAttribute('data-image-title') || '';
    const iconName = button.getAttribute('data-icon-name') || '';
    const defaultDuration = parseInt(button.getAttribute('data-default-duration') || '15');
    const timeStep = parseInt(button.getAttribute('data-time-step') || '5');
    const countdownMessage = button.getAttribute('data-countdown-message') || '';
    const countdownEndMessage = button.getAttribute('data-countdown-end-message') || '';
    const endTimeTitle = button.getAttribute('data-end-time-title') || '';
    const breakTypeData = {
        id,
        name,
        imageTitle,
        iconName,
        defaultDurationMinutes: defaultDuration,
        breakTimeStepMinutes: timeStep,
        countdownMessage,
        countdownEndMessage,
        endTimeTitle
    };
    breakTypeWizard.showEditWizard(breakTypeData);
};
//# sourceMappingURL=wizard.js.map