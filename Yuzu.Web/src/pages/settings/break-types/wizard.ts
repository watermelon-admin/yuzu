// wizard.ts - Handles the break type creation/editing wizard modal

import { createToast } from '../../../common/toast-util.js';

/**
 * Interface for background image data
 */
interface BackgroundImage {
    id: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    fullSizeUrl: string;
}

/**
 * Interface for icon data
 */
interface IconData {
    name: string;
    displayName: string;
    category: string;
}

/**
 * Response interface for AJAX calls (following the pattern from index.ts)
 */
interface AjaxResponse {
    success: boolean;
    message: string;
    data?: any;
    errors?: any;
}

/**
 * Interface for the break type data
 */
interface BreakTypeWizardData {
    id?: string;
    name: string;
    defaultDurationMinutes: number;
    breakTimeStepMinutes: number;
    countdownMessage: string;
    countdownEndMessage: string;
    endTimeTitle: string;
    imageTitle: string;
    iconName: string;
}

/**
 * Class to handle the break type wizard modal functionality
 */
export class BreakTypeWizard {
    private modal: any; // Bootstrap modal instance
    private modalElement: HTMLElement | null;
    private currentStep: number = 1;
    private totalSteps: number = 4;
    private isEditMode: boolean = false;
    private breakTypeData: BreakTypeWizardData;
    private backgroundImages: BackgroundImage[] = [];
    private selectedBackgroundTitle: string = '';
    private icons: IconData[] = [];
    private selectedIconName: string = '';

    /**
     * Creates default break type data
     */
    private createDefaultBreakTypeData(): BreakTypeWizardData {
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
        // Initialize with default break type data
        this.breakTypeData = this.createDefaultBreakTypeData();

        // Find modal element
        this.modalElement = document.getElementById('break-type-wizard-modal');
        
        // Initialize the modal if element is found
        if (this.modalElement) {
            this.modal = new (window as any).bootstrap.Modal(this.modalElement);
            
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
    private preloadWizardData(): void {
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
    private getImagePath(): string {
        const imagePathInput = document.getElementById('image-path') as HTMLInputElement | null;
        if (!imagePathInput || !imagePathInput.value) {
            console.error('Background image path not found in hidden field "image-path"');
        }
        const imagePath = imagePathInput?.value || '';
        console.log('Background images URL from hidden field:', imagePath);
        return imagePath;
    }

    /**
     * Load background images from the server
     */
    private async loadBackgroundImages(): Promise<void> {
        // If we already have background images loaded, no need to fetch again
        if (this.backgroundImages.length > 0) {
            console.log('Using already loaded background images');
            
            // Just update UI and hide spinner
            const loadingSpinner = document.getElementById('background-loading-spinner');
            const carouselContainer = document.getElementById('background-carousel-container');
            
            // Render with existing data
            this.renderBackgroundImages();
            
            // Update UI
            if (loadingSpinner) loadingSpinner.classList.add('d-none');
            if (carouselContainer) carouselContainer.classList.remove('d-none');
            
            return;
        }
        
        try {
            // Show loading spinner and hide other elements
            const loadingSpinner = document.getElementById('background-loading-spinner');
            const errorMessage = document.getElementById('background-error');
            const carouselContainer = document.getElementById('background-carousel-container');
            
            if (loadingSpinner) loadingSpinner.classList.remove('d-none');
            if (errorMessage) errorMessage.classList.add('d-none');
            if (carouselContainer) carouselContainer.classList.add('d-none');
            
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
            
            const responseData = await response.json() as AjaxResponse;
            console.log('Background images response:', responseData);
            
            // Process the response
            if (responseData.success) {
                // The data structure is nested - backgrounds are in responseData.data.backgrounds
                this.backgroundImages = responseData.data?.backgrounds || [];
                
                console.log('Parsed background images:', this.backgroundImages);
                
                this.renderBackgroundImages();
                
                // Hide loading spinner, show carousel
                if (loadingSpinner) loadingSpinner.classList.add('d-none');
                if (carouselContainer) carouselContainer.classList.remove('d-none');
            } else {
                console.error('API request failed:', responseData.message);
                this.showBackgroundLoadError();
            }
        } catch (error) {
            console.error('Error fetching background images:', error);
            this.showBackgroundLoadError();
        }
    }

    /**
     * Show error message when background images can't be loaded
     */
    private showBackgroundLoadError(): void {
        const loadingSpinner = document.getElementById('background-loading-spinner');
        const errorMessage = document.getElementById('background-error');
        const carouselContainer = document.getElementById('background-carousel-container');
        
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        if (errorMessage) errorMessage.classList.remove('d-none');
        if (carouselContainer) carouselContainer.classList.add('d-none');
    }

    /**
     * Render background images in the carousel
     */
    private renderBackgroundImages(): void {
        const backgroundSlider = document.getElementById('background-slider');
        const template = document.getElementById('background-template') as HTMLTemplateElement;
        
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
            const slideContent = template.content.cloneNode(true) as DocumentFragment;
            const card = slideContent.querySelector('.background-card') as HTMLElement;
            const imageElement = slideContent.querySelector('.background-image') as HTMLImageElement;
            const titleElement = slideContent.querySelector('.background-title') as HTMLElement;
            const descriptionElement = slideContent.querySelector('.background-description') as HTMLElement;
            const selectButton = slideContent.querySelector('.select-background-btn') as HTMLButtonElement;
            
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
                selectButton.querySelector('.check-icon')?.classList.remove('d-none');
                selectButton.querySelector('.select-text')?.classList.add('d-none');
                selectButton.querySelector('.selected-text')?.classList.remove('d-none');
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
            const slideContent = template.content.cloneNode(true) as DocumentFragment;
            const card = slideContent.querySelector('.background-card') as HTMLElement;
            const imageElement = slideContent.querySelector('.background-image') as HTMLImageElement;
            const titleElement = slideContent.querySelector('.background-title') as HTMLElement;
            const descriptionElement = slideContent.querySelector('.background-description') as HTMLElement;
            const selectButton = slideContent.querySelector('.select-background-btn') as HTMLButtonElement;
            
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
    private formatTitle(title: string): string {
        if (!title) return '';
        
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
    private selectBackground(backgroundTitle: string, updateData: boolean = true): void {
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
            const selectButton = card.querySelector('.select-background-btn') as HTMLButtonElement;
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
                if (checkIcon) checkIcon.classList.remove('d-none');
                if (selectText) selectText.classList.add('d-none');
                if (selectedText) selectedText.classList.remove('d-none');
            } else {
                // This is not the selected card
                card.classList.remove('selected');
                if (selectButton) {
                    selectButton.classList.remove('btn-primary');
                    selectButton.classList.add('btn-outline-primary');
                }
                if (checkIcon) checkIcon.classList.add('d-none');
                if (selectText) selectText.classList.remove('d-none');
                if (selectedText) selectedText.classList.add('d-none');
            }
        });
        
        // Don't adjust the carousel position when selecting a card
    }

    /**
     * Initialize the Swiper carousel for background images
     */
    private initBackgroundSwiper(): void {
        try {
            // Check if Swiper is available
            if (typeof (window as any).Swiper === 'undefined') {
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
                    parsedOptions.on.init = function(swiper: any) {
                        // Disable transition during initialization
                        swiper.wrapperEl.style.transitionDuration = '0ms';
                        
                        // Call original init if it exists
                        if (typeof originalOnInit === 'function') {
                            originalOnInit(swiper);
                        }
                    };
                    
                    // Use the imagesReady event to ensure proper positioning and re-enable transitions
                    parsedOptions.on.imagesReady = function(swiper: any) {
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
                    const backgroundSwiper = new (window as any).Swiper(backgroundSwiperElement, parsedOptions);
                    
                    // Leave carousel at initial position
                    
                    // Store the swiper instance in a global variable for step navigation
                    (window as any).__backgroundSwiper = backgroundSwiper;
                }
            }
        } catch (error) {
            console.error('Error initializing background swiper:', error);
        }
    }
    
    /**
     * Initialize the Swiper carousel for icons
     */
    private initIconSwiper(): void {
        try {
            // Check if Swiper is available
            if (typeof (window as any).Swiper === 'undefined') {
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
                    parsedOptions.on.init = function(swiper: any) {
                        // Disable transition during initialization
                        swiper.wrapperEl.style.transitionDuration = '0ms';
                        
                        // Call original init if it exists
                        if (typeof originalOnInit === 'function') {
                            originalOnInit(swiper);
                        }
                    };
                    
                    // Use the imagesReady event to ensure proper positioning and re-enable transitions
                    parsedOptions.on.imagesReady = function(swiper: any) {
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
                    const iconSwiper = new (window as any).Swiper(iconSwiperElement, parsedOptions);
                    
                    // Leave carousel at initial position
                    
                    // Store the swiper instance in a global variable for step navigation
                    (window as any).__iconSwiper = iconSwiper;
                }
            }
        } catch (error) {
            console.error('Error initializing icon swiper:', error);
        }
    }
    
    /**
     * Initialize the list of available icons
     */
    private initializeIcons(): void {
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
    private loadIcons(): void {
        try {
            // Show loading spinner, hide error and container
            const loadingSpinner = document.getElementById('icon-loading-spinner');
            const errorMessage = document.getElementById('icon-error');
            const carouselContainer = document.getElementById('icon-carousel-container');
            
            if (loadingSpinner) loadingSpinner.classList.remove('d-none');
            if (errorMessage) errorMessage.classList.add('d-none');
            if (carouselContainer) carouselContainer.classList.add('d-none');
            
            // We don't need to wait for API as icons are loaded in memory
            // Just render them immediately
            this.renderIcons();
            
            // Hide loading spinner, show carousel
            if (loadingSpinner) loadingSpinner.classList.add('d-none');
            if (carouselContainer) carouselContainer.classList.remove('d-none');
        } catch (error) {
            console.error('Error loading icons:', error);
            this.showIconLoadError();
        }
    }
    
    /**
     * Show error message when icons can't be loaded
     */
    private showIconLoadError(): void {
        const loadingSpinner = document.getElementById('icon-loading-spinner');
        const errorMessage = document.getElementById('icon-error');
        const carouselContainer = document.getElementById('icon-carousel-container');
        
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        if (errorMessage) errorMessage.classList.remove('d-none');
        if (carouselContainer) carouselContainer.classList.add('d-none');
    }
    
    /**
     * Render icons in the carousel
     */
    private renderIcons(): void {
        const iconSlider = document.getElementById('icon-slider');
        const template = document.getElementById('icon-template') as HTMLTemplateElement;
        
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
            const slideContent = template.content.cloneNode(true) as DocumentFragment;
            const card = slideContent.querySelector('.icon-card') as HTMLElement;
            const iconElement = slideContent.querySelector('.icon-display') as HTMLElement;
            const titleElement = slideContent.querySelector('.icon-title') as HTMLElement;
            const selectButton = slideContent.querySelector('.select-icon-btn') as HTMLButtonElement;
            
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
                selectButton.querySelector('.check-icon')?.classList.remove('d-none');
                selectButton.querySelector('.select-text')?.classList.add('d-none');
                selectButton.querySelector('.selected-text')?.classList.remove('d-none');
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
            const slideContent = template.content.cloneNode(true) as DocumentFragment;
            const card = slideContent.querySelector('.icon-card') as HTMLElement;
            const iconElement = slideContent.querySelector('.icon-display') as HTMLElement;
            const titleElement = slideContent.querySelector('.icon-title') as HTMLElement;
            const selectButton = slideContent.querySelector('.select-icon-btn') as HTMLButtonElement;
            
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
    private selectIcon(iconName: string, updateData: boolean = true): void {
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
            const selectButton = card.querySelector('.select-icon-btn') as HTMLButtonElement;
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
                if (checkIcon) checkIcon.classList.remove('d-none');
                if (selectText) selectText.classList.add('d-none');
                if (selectedText) selectedText.classList.remove('d-none');
            } else {
                // This is not the selected card
                card.classList.remove('selected');
                if (selectButton) {
                    selectButton.classList.remove('btn-primary');
                    selectButton.classList.add('btn-outline-primary');
                }
                if (checkIcon) checkIcon.classList.add('d-none');
                if (selectText) selectText.classList.remove('d-none');
                if (selectedText) selectedText.classList.add('d-none');
            }
        });
        
        // Don't adjust the carousel position when selecting a card
    }

    /**
     * Show the wizard modal for creating a new break type
     */
    public showCreateWizard(): void {
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
    public showEditWizard(breakTypeData: BreakTypeWizardData): void {
        this.isEditMode = true;
        // Make a deep copy of the data
        this.breakTypeData = { ...breakTypeData };
        
        // Ensure the image title is properly set (normalize to lowercase)
        if (breakTypeData.imageTitle) {
            console.log(`Setting selected background title: ${breakTypeData.imageTitle}`);
            this.selectedBackgroundTitle = breakTypeData.imageTitle.toLowerCase();
            // Also make sure the data property is lowercase for consistency
            this.breakTypeData.imageTitle = breakTypeData.imageTitle.toLowerCase();
        } else {
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
    private destroyExistingSwipers(): void {
        // Destroy background swiper if it exists
        if ((window as any).__backgroundSwiper) {
            try {
                (window as any).__backgroundSwiper.destroy();
                (window as any).__backgroundSwiper = null;
                console.log('Destroyed existing background swiper');
            } catch (error) {
                console.error('Error destroying background swiper:', error);
            }
        }
        
        // Destroy icon swiper if it exists
        if ((window as any).__iconSwiper) {
            try {
                (window as any).__iconSwiper.destroy();
                (window as any).__iconSwiper = null;
                console.log('Destroyed existing icon swiper');
            } catch (error) {
                console.error('Error destroying icon swiper:', error);
            }
        }
    }

    /**
     * Reset the wizard to its initial state
     */
    private resetWizard(): void {
        // Reset to step 1
        this.currentStep = 1;
        this.updateStepDisplay();
        
        // Reset the break type data to defaults using our helper method
        this.breakTypeData = this.createDefaultBreakTypeData();
        
        // Reset selected background and icon to match defaults
        this.selectedBackgroundTitle = this.breakTypeData.imageTitle;
        this.selectedIconName = this.breakTypeData.iconName;
        
        // Reset form fields
        const form = document.getElementById('break-type-wizard-form') as HTMLFormElement;
        if (form) {
            form.reset();
            
            // Populate form with default values from this.breakTypeData
            const nameField = document.getElementById('breakTypeName') as HTMLInputElement;
            const defaultDurationField = document.getElementById('defaultBreakDuration') as HTMLInputElement;
            const timeStepField = document.getElementById('breakTimeStep') as HTMLInputElement;
            const countdownMessageField = document.getElementById('breakCountdownMessage') as HTMLInputElement;
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage') as HTMLInputElement;
            const endTimeTitleField = document.getElementById('breakEndTimeTitle') as HTMLInputElement;
            
            if (nameField) nameField.value = this.breakTypeData.name;
            if (defaultDurationField) defaultDurationField.value = this.breakTypeData.defaultDurationMinutes.toString();
            if (timeStepField) timeStepField.value = this.breakTypeData.breakTimeStepMinutes.toString();
            if (countdownMessageField) countdownMessageField.value = this.breakTypeData.countdownMessage;
            if (countdownEndMessageField) countdownEndMessageField.value = this.breakTypeData.countdownEndMessage;
            if (endTimeTitleField) endTimeTitleField.value = this.breakTypeData.endTimeTitle;
            
            // Reset break type ID field
            const idField = document.getElementById('break-type-id') as HTMLInputElement;
            if (idField) idField.value = '';
        }
    }

    /**
     * Populate the wizard fields with the current break type data
     */
    private populateWizardFields(): void {
        // Populate form fields with break type data
        const form = document.getElementById('break-type-wizard-form') as HTMLFormElement;
        if (form) {
            // Set break type ID
            const idField = document.getElementById('break-type-id') as HTMLInputElement;
            if (idField && this.breakTypeData.id) idField.value = this.breakTypeData.id;
            
            // Set basic properties
            const nameField = document.getElementById('breakTypeName') as HTMLInputElement;
            const defaultDurationField = document.getElementById('defaultBreakDuration') as HTMLInputElement;
            const timeStepField = document.getElementById('breakTimeStep') as HTMLInputElement;
            
            if (nameField) nameField.value = this.breakTypeData.name;
            if (defaultDurationField) defaultDurationField.value = this.breakTypeData.defaultDurationMinutes.toString();
            if (timeStepField) timeStepField.value = this.breakTypeData.breakTimeStepMinutes.toString();
            
            // Set text messages
            const countdownMessageField = document.getElementById('breakCountdownMessage') as HTMLInputElement;
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage') as HTMLInputElement;
            const endTimeTitleField = document.getElementById('breakEndTimeTitle') as HTMLInputElement;
            
            if (countdownMessageField) countdownMessageField.value = this.breakTypeData.countdownMessage;
            if (countdownEndMessageField) countdownEndMessageField.value = this.breakTypeData.countdownEndMessage;
            if (endTimeTitleField) endTimeTitleField.value = this.breakTypeData.endTimeTitle;
            
            // Background selection will be handled when step 3 is activated
        }
    }

    /**
     * Show the wizard modal
     */
    private showModal(): void {
        if (this.modal) {
            this.modal.show();
        } else {
            console.error('Bootstrap modal not initialized');
        }
    }

    /**
     * Hide the wizard modal
     */
    public hideModal(): void {
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * Update the display of steps in the wizard
     */
    private updateStepDisplay(): void {
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
            } else if (stepNum === this.currentStep) {
                ps.classList.add('active');
                ps.classList.remove('completed');
            } else {
                ps.classList.remove('active', 'completed');
            }
        });
        
        // Update buttons
        const prevButton = document.getElementById('wizard-prev-btn') as HTMLButtonElement;
        const nextButton = document.getElementById('wizard-next-btn') as HTMLButtonElement;
        const saveButton = document.getElementById('wizard-save-btn') as HTMLButtonElement;
        
        if (prevButton) prevButton.disabled = this.currentStep === 1;
        
        if (nextButton && saveButton) {
            if (this.currentStep === this.totalSteps) {
                nextButton.classList.add('d-none');
                saveButton.classList.remove('d-none');
            } else {
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
            if ((window as any).__backgroundSwiper) {
                (window as any).__backgroundSwiper.destroy();
                (window as any).__backgroundSwiper = null;
            }
            
            // Initialize the background swiper
            this.initBackgroundSwiper();
        }
        
        // Step 4: Initialize icon carousel when stepping into it
        if (this.currentStep === 4) {
            // First, ensure the icons are rendered
            this.renderIcons();
            
            // Destroy previous instance if it exists
            if ((window as any).__iconSwiper) {
                (window as any).__iconSwiper.destroy();
                (window as any).__iconSwiper = null;
            }
            
            // Initialize the icon swiper
            this.initIconSwiper();
        }
    }

    /**
     * Set up event listeners for the wizard
     */
    private setupEventListeners(): void {
        // Get wizard navigation buttons
        const prevButton = document.getElementById('wizard-prev-btn');
        const nextButton = document.getElementById('wizard-next-btn');
        const saveButton = document.getElementById('wizard-save-btn');
        const cancelButton = this.modalElement?.querySelector('.btn-close');
        
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
    private validateCurrentStep(): boolean {
        // Basic validation for step 1 (General Settings)
        if (this.currentStep === 1) {
            const nameField = document.getElementById('breakTypeName') as HTMLInputElement;
            const defaultDurationField = document.getElementById('defaultBreakDuration') as HTMLInputElement;
            const timeStepField = document.getElementById('breakTimeStep') as HTMLInputElement;
            
            if (!nameField?.value) {
                nameField?.classList.add('is-invalid');
                return false;
            }
            
            if (!defaultDurationField?.value || isNaN(parseInt(defaultDurationField.value)) || 
                parseInt(defaultDurationField.value) < 1 || parseInt(defaultDurationField.value) > 1440) {
                defaultDurationField?.classList.add('is-invalid');
                return false;
            }
            
            if (!timeStepField?.value || isNaN(parseInt(timeStepField.value)) || 
                parseInt(timeStepField.value) < 1 || parseInt(timeStepField.value) > 60) {
                timeStepField?.classList.add('is-invalid');
                return false;
            }
            
            // Remove invalid class if valid
            nameField?.classList.remove('is-invalid');
            defaultDurationField?.classList.remove('is-invalid');
            timeStepField?.classList.remove('is-invalid');
        }
        
        // Basic validation for step 2 (Text Messages)
        if (this.currentStep === 2) {
            const countdownMessageField = document.getElementById('breakCountdownMessage') as HTMLInputElement;
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage') as HTMLInputElement;
            const endTimeTitleField = document.getElementById('breakEndTimeTitle') as HTMLInputElement;
            
            if (!countdownMessageField?.value) {
                countdownMessageField?.classList.add('is-invalid');
                return false;
            }
            
            if (!countdownEndMessageField?.value) {
                countdownEndMessageField?.classList.add('is-invalid');
                return false;
            }
            
            if (!endTimeTitleField?.value) {
                endTimeTitleField?.classList.add('is-invalid');
                return false;
            }
            
            // Remove invalid class if valid
            countdownMessageField?.classList.remove('is-invalid');
            countdownEndMessageField?.classList.remove('is-invalid');
            endTimeTitleField?.classList.remove('is-invalid');
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
    private async saveBreakType(): Promise<void> {
        try {
            console.log('Saving break type...');
            
            // Get form values
            const form = document.getElementById('break-type-wizard-form') as HTMLFormElement;
            if (!form) {
                console.error('Form not found');
                return;
            }
            
            const idField = document.getElementById('break-type-id') as HTMLInputElement;
            const nameField = document.getElementById('breakTypeName') as HTMLInputElement;
            const defaultDurationField = document.getElementById('defaultBreakDuration') as HTMLInputElement;
            const timeStepField = document.getElementById('breakTimeStep') as HTMLInputElement;
            const countdownMessageField = document.getElementById('breakCountdownMessage') as HTMLInputElement;
            const countdownEndMessageField = document.getElementById('breakCountdownEndMessage') as HTMLInputElement;
            const endTimeTitleField = document.getElementById('breakEndTimeTitle') as HTMLInputElement;
            
            // Update break type data
            this.breakTypeData.name = nameField?.value || this.breakTypeData.name;
            this.breakTypeData.defaultDurationMinutes = parseInt(defaultDurationField?.value || '15');
            this.breakTypeData.breakTimeStepMinutes = parseInt(timeStepField?.value || '5');
            this.breakTypeData.countdownMessage = countdownMessageField?.value || this.breakTypeData.countdownMessage;
            this.breakTypeData.countdownEndMessage = countdownEndMessageField?.value || this.breakTypeData.countdownEndMessage;
            this.breakTypeData.endTimeTitle = endTimeTitleField?.value || this.breakTypeData.endTimeTitle;
            this.breakTypeData.imageTitle = this.selectedBackgroundTitle || this.breakTypeData.imageTitle;
            this.breakTypeData.iconName = this.selectedIconName || this.breakTypeData.iconName;
            
            // Get token for request - EXACTLY as in index.ts
            const tokenElement = form.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
            if (!tokenElement) {
                console.error('Anti-forgery token not found');
                (window as any).createToast?.('Security token not found', false);
                return;
            }
            
            const token = tokenElement.value;
            
            // Validate form data - similar to index.ts
            if (!defaultDurationField.checkValidity() || !timeStepField.checkValidity() || !nameField.checkValidity()) {
                form.classList.add('was-validated');
                (window as any).createToast?.('Please correct the errors in the form', false);
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
            const saveButton = document.getElementById('wizard-save-btn') as HTMLButtonElement;
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
                const savedBreakTypeId = data.data?.id || this.breakTypeData.id;

                // Hide modal
                this.hideModal();

                // Reload break types list - use the same function as in index.ts
                if (typeof (window as any).Yuzu?.Settings?.BreakTypes?.loadBreakTypes === 'function') {
                    (window as any).Yuzu.Settings.BreakTypes.loadBreakTypes(1);
                }

                // Add highlight animation to the saved card after a short delay
                if (savedBreakTypeId) {
                    setTimeout(() => {
                        const cardElement = document.querySelector(`article[data-id="${savedBreakTypeId}"]`);
                        if (cardElement) {
                            // Add highlight animation
                            const article = cardElement as HTMLElement;
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
            } else {
                // Show error message
                createToast(data.message || 'Failed to save break type', false);

                // Display validation errors if any
                if (data.errors) {
                    console.error('Validation errors:', data.errors);

                    // Display the specific validation errors using toast
                    for (const [field, errors] of Object.entries(data.errors)) {
                        const errorArray = errors as string[];
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
            const saveButton = document.getElementById('wizard-save-btn') as HTMLButtonElement;
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = 'Save <i class="bx bx-check ms-1"></i>';
            }
        }
    }

    /**
     * Initialize the wizard
     */
    public init(): void {
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
(window as any).createBreakType = () => {
    breakTypeWizard.showCreateWizard();
};

(window as any).editBreakType = (button: Element) => {
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

    const breakTypeData: BreakTypeWizardData = {
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