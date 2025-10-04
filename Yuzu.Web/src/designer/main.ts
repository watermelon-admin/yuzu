import { Designer } from './core/index.js';
import { WidgetImageManager } from './widget-image-manager.js';

// Declare html2canvas global from CDN
declare const html2canvas: any;

// Extend the Window interface to include our global designer instance
declare global {
    interface Window {
        designer: Designer;
    }
}

// Generate thumbnail from designer canvas
// Uses an off-screen canvas clone to avoid visible UI changes during save (issue #60)
// This approach creates a temporary hidden copy of the canvas, captures it with html2canvas,
// and then removes it - all invisible to the user for a professional experience
async function generateThumbnail(canvasElement: HTMLElement): Promise<Blob | null> {
    try {
        console.log('[Thumbnail] Starting invisible canvas screenshot generation');

        // Create an off-screen container for thumbnail generation
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.position = 'absolute';
        offscreenContainer.style.left = '-10000px';
        offscreenContainer.style.top = '0';
        offscreenContainer.style.width = '1920px';
        offscreenContainer.style.height = '1080px';
        offscreenContainer.style.overflow = 'hidden';
        document.body.appendChild(offscreenContainer);
        console.log('[Thumbnail] Created off-screen container');

        // Create a clone of the canvas element
        const canvasClone = document.createElement('div');
        canvasClone.style.width = '1920px';
        canvasClone.style.height = '1080px';
        canvasClone.style.position = 'relative';
        canvasClone.style.backgroundColor = '#ffffff';

        // Copy background image from original canvas
        const backgroundImageStyle = window.getComputedStyle(canvasElement).backgroundImage;
        let backgroundImageUrl: string | null = null;

        if (backgroundImageStyle && backgroundImageStyle !== 'none') {
            const urlMatch = backgroundImageStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
                backgroundImageUrl = urlMatch[1];
                canvasClone.style.backgroundImage = backgroundImageStyle;
                canvasClone.style.backgroundSize = 'cover';
                canvasClone.style.backgroundPosition = 'center';
                console.log('[Thumbnail] Applied background image to clone:', backgroundImageUrl);
            }
        }

        // Clone all widget elements from the original canvas
        const widgets = canvasElement.querySelectorAll('.widget');
        console.log(`[Thumbnail] Cloning ${widgets.length} widgets to off-screen canvas`);

        widgets.forEach((widget, index) => {
            const widgetClone = widget.cloneNode(true) as HTMLElement;

            // Remove selection handles and resize handles from clone
            const handles = widgetClone.querySelectorAll('.selection-handle, .resize-handle');
            handles.forEach(handle => handle.remove());

            // Remove selection class if present
            widgetClone.classList.remove('selected');

            // Remove design-time styles (borders, shadows) that shouldn't appear in thumbnail
            widgetClone.style.border = 'none';
            widgetClone.style.boxShadow = 'none';
            widgetClone.style.outline = 'none';

            canvasClone.appendChild(widgetClone);
            console.log(`[Thumbnail] Cloned widget ${index + 1}/${widgets.length}`);
        });

        offscreenContainer.appendChild(canvasClone);
        console.log('[Thumbnail] All widgets cloned to off-screen canvas');

        // Wait for all resources to be ready before capturing
        console.log('[Thumbnail] Waiting for fonts and images to load...');

        // 1. Wait for fonts to be ready
        await document.fonts.ready;
        console.log('[Thumbnail] Fonts loaded');

        // 2. Wait for all images in the clone to load
        const images = canvasClone.querySelectorAll('img');
        if (images.length > 0) {
            console.log(`[Thumbnail] Waiting for ${images.length} images to load...`);
            await Promise.all(
                Array.from(images).map(img => {
                    if (img.complete) {
                        return Promise.resolve();
                    }
                    return new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => {
                            console.warn('[Thumbnail] Image failed to load:', img.src);
                            resolve(); // Continue even if image fails
                        };
                    });
                })
            );
            console.log('[Thumbnail] All images loaded');
        }

        // 3. Wait for next animation frame to ensure browser has painted everything
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        console.log('[Thumbnail] Browser paint complete');

        // Capture the off-screen clone with html2canvas
        console.log('[Thumbnail] Capturing off-screen canvas with html2canvas');
        const screenshot = await html2canvas(canvasClone, {
            backgroundColor: null,        // Transparent background - we have our own
            scale: 1,                     // Capture at actual resolution
            logging: false,               // Disable logging
            useCORS: true,                // Allow cross-origin images
            allowTaint: false,            // Don't allow tainted canvases
            foreignObjectRendering: false // Use native rendering for better compatibility
        });

        // Clean up: remove the off-screen container
        document.body.removeChild(offscreenContainer);
        console.log('[Thumbnail] Removed off-screen container');

        console.log('[Thumbnail] Canvas captured, creating thumbnail at 640x360');

        // Create thumbnail canvas (640x360 for 16:9 ratio, 2x retina for 180px display)
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 640;
        thumbCanvas.height = 360;

        const ctx = thumbCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Draw the screenshot (includes background and all widgets), scaled down from 1920x1080 to 640x360
        console.log('[Thumbnail] Drawing screenshot to thumbnail canvas');
        console.log('[Thumbnail] Screenshot canvas dimensions:', screenshot.width, 'x', screenshot.height);
        ctx.drawImage(screenshot, 0, 0, 640, 360);

        // Convert to blob (JPEG, 85% quality for good balance of size/quality)
        return new Promise((resolve) => {
            thumbCanvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log(`[Thumbnail] Generated thumbnail: ${(blob.size / 1024).toFixed(2)}KB`);

                        // DEBUG: Download thumbnail locally to verify what's being generated
                        // Uncomment to test thumbnail generation without uploading
                        // const url = URL.createObjectURL(blob);
                        // const a = document.createElement('a');
                        // a.href = url;
                        // a.download = 'thumbnail-debug.jpg';
                        // a.click();
                        // URL.revokeObjectURL(url);
                        // console.log('[Thumbnail] Debug: Thumbnail downloaded locally');
                    }
                    resolve(blob);
                },
                'image/jpeg',
                0.85
            );
        });
    } catch (error) {
        console.error('[Thumbnail] Error generating thumbnail:', error);
        return null;
    }
}

// Upload thumbnail to server
async function uploadThumbnail(blob: Blob, breakTypeId: string, antiForgeryToken: string): Promise<string | null> {
    try {
        console.log('[Thumbnail] Uploading thumbnail for break type:', breakTypeId);

        const formData = new FormData();
        formData.append('thumbnail', blob, `break-${breakTypeId}.jpg`);
        formData.append('breakTypeId', breakTypeId);

        const response = await fetch('/Designer?handler=UploadThumbnail', {
            method: 'POST',
            headers: {
                'RequestVerificationToken': antiForgeryToken
            },
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.thumbnailUrl) {
            console.log('[Thumbnail] Upload successful:', result.thumbnailUrl);
            return result.thumbnailUrl;
        }

        throw new Error(result.message || 'Upload failed');
    } catch (error) {
        console.error('[Thumbnail] Error uploading thumbnail:', error);
        return null;
    }
}

// Helper function to get the image path
function getImagePath(): string {
    const imagePathElement = document.getElementById('image-path') as HTMLInputElement;
    if (imagePathElement) {
        return imagePathElement.value;
    }
    console.error('[Debug] Could not find image path element');
    return '';
}

// Helper function to convert external background URL to proxy URL for CORS-safe access
function getProxyUrl(imageUrl: string): string {
    try {
        // Extract filename from URL (e.g., "https://backgrounds.breakscreen.com/blueray-fhd.jpg" -> "blueray-fhd.jpg")
        const url = new URL(imageUrl);
        const filename = url.pathname.split('/').pop();

        if (!filename) {
            console.error('[Debug] Could not extract filename from URL:', imageUrl);
            return imageUrl;
        }

        // Return proxy URL
        const proxyUrl = `/Designer?handler=BackgroundProxy&filename=${encodeURIComponent(filename)}`;
        console.log(`[Debug] Converted ${imageUrl} to proxy URL: ${proxyUrl}`);
        return proxyUrl;
    } catch (error) {
        console.error('[Debug] Error converting to proxy URL:', error);
        return imageUrl;
    }
}

// Background selector functionality - defined before use
function applyBackground(imageUrl: string, title: string) {
    console.log(`[Debug] applyBackground called with title: "${title}", url: ${imageUrl}`);

    // Apply background to the canvas
    const canvas = document.getElementById('designer-canvas');
    console.log(`[Debug] Canvas element found: ${!!canvas}`);

    if (canvas) {
        try {
            // Apply the background image style
            console.log('[Debug] Setting canvas background image style');
            const oldBackgroundImage = canvas.style.backgroundImage;
            console.log(`[Debug] Previous background image: ${oldBackgroundImage || 'none'}`);

            // Convert to proxy URL to avoid CORS issues with html2canvas
            const proxyImageUrl = getProxyUrl(imageUrl);

            // Check if the background is actually changing
            const newBackgroundImage = `url('${proxyImageUrl}')`;
            if (oldBackgroundImage !== newBackgroundImage) {
                canvas.style.backgroundImage = newBackgroundImage;
                console.log(`[Debug] New background image set: ${newBackgroundImage}`);
                
                // Mark the designer as having unsaved changes
                if (window.designer && typeof window.designer.markAsChanged === 'function') {
                    console.log('[Debug] Marking designer as having unsaved changes');
                    window.designer.markAsChanged();
                }
                
                // Show success toast
                console.log('[Debug] Showing success toast for background change');
                try {
                    (window as any).Toastify({
                        text: `Background changed to "${title}"`,
                        duration: 3000,
                        close: true,
                        gravity: 'top',
                        position: 'center',
                        style: {
                            background: '#28a745'
                        },
                        stopOnFocus: true,
                        className: 'toast-spacious',
                        onClick: function(){
                            console.log('[Debug] Background changed toast clicked');
                        } // Callback after click
                    }).showToast();
                    console.log('[Debug] Success toast shown');
                } catch (toastError) {
                    console.error('[Debug] Error showing toast:', toastError);
                }
            } else {
                console.log('[Debug] Background image is the same, no changes needed');
            }
            
            console.log('[Debug] Background applied successfully');
        } catch (error) {
            console.error('[Debug] Error applying background:', error);
            console.error('[Debug] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace available',
                type: error instanceof Error ? error.constructor.name : typeof error
            });
        }
    } else {
        console.error('[Debug] Error: Canvas element not found when applying background');
    }
}

// Initialize the designer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Debug] DOMContentLoaded event fired. Beginning designer initialization...');
    console.time('designer-initialization');
    
    // Background selector variables
    let selectedBackgroundUrl: string | null = null;
    let selectedBackgroundTitle: string | null = null;
    
    try {
        // Initialize Bootstrap tooltips - using the global bootstrap object from bootstrap.bundle.min.js
        console.log('[Debug] Setting up Bootstrap tooltips');
        const tooltipTriggerList = document.querySelectorAll('[title]');
        console.log(`[Debug] Found ${tooltipTriggerList.length} elements with title attributes for tooltips`);
        const tooltipList = Array.from(tooltipTriggerList).map(tooltipTriggerEl => 
            new (window as any).bootstrap.Tooltip(tooltipTriggerEl)
        );
        console.log(`[Debug] Successfully initialized ${tooltipList.length} tooltips`);
        
        // Create a new instance of the Designer class, targeting the element with ID 'designer-canvas'
        console.log('[Debug] Creating Designer instance');
        const designer = new Designer('designer-canvas');
        console.log('[Debug] Designer instance created successfully');
        
        // Check if we're loading an existing design
        console.log('[Debug] Checking for existing design data to load');
        const isLoadingExisting = document.getElementById('is-loading-existing') as HTMLInputElement;
        const initialCanvasDataContainer = document.getElementById('initial-canvas-data-container') as HTMLDivElement;
        console.log(`[Debug] is-loading-existing found: ${!!isLoadingExisting}, value: ${isLoadingExisting?.value}`);
        console.log(`[Debug] initial-canvas-data-container found: ${!!initialCanvasDataContainer}`);
        
        if (isLoadingExisting && isLoadingExisting.value === "true" && initialCanvasDataContainer) {
            console.log('[Debug] Attempting to load existing design');
            try {
                // Load the design from canvas data
                console.log('[Debug] Loading existing design from canvas data');

                // Get the JSON, background title, and background URL from the data attributes
                const jsonData = initialCanvasDataContainer.getAttribute('data-canvas-json');
                const backgroundTitle = initialCanvasDataContainer.getAttribute('data-background-title');
                const backgroundUrl = initialCanvasDataContainer.getAttribute('data-background-url');

                console.log('[Debug] Background title found:', backgroundTitle);
                console.log('[Debug] Background URL found:', backgroundUrl);
                console.log(`[Debug] JSON data attribute found: ${!!jsonData}, length: ${jsonData?.length || 0}`);

                if (jsonData) {
                    if (jsonData.length > 100) {
                        console.log('[Debug] Canvas data preview (first 100 chars):', jsonData.substring(0, 100) + '...');
                    } else {
                        console.log('[Debug] Canvas data:', jsonData);
                    }

                    // Clean the JSON string to ensure no BOM or invisible characters
                    console.log('[Debug] Cleaning JSON string');
                    const cleanJson = jsonData.trim();
                    console.log('[Debug] Cleaned JSON length:', cleanJson.length);
                    console.log('[Debug] Calling designer.loadDesign()');
                    designer.loadDesign(cleanJson);
                    console.log('[Debug] Design loaded successfully');

                    // If we have a background URL (preferred) or title, set up the background
                    if (backgroundUrl && backgroundTitle) {
                        // Background URL is already provided and applied via inline style in HTML
                        // Just set the selected background title for saving
                        console.log('[Debug] Background already applied via inline style, setting selected title');
                        selectedBackgroundTitle = backgroundTitle;
                    } else if (backgroundTitle) {
                        // Fallback: If no URL provided, fetch from API (legacy path)
                        console.log('[Debug] No background URL provided, fetching from API (legacy path)');

                        // Use self-executing async function to handle the async operations
                        (async function loadBackgroundForDesign() {
                            try {
                                // Fetch backgrounds from the API
                                console.log('[Debug] Fetching backgrounds from API to find matching title');
                                const response = await fetch('/Designer?handler=Backgrounds', {
                                    method: 'GET',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    }
                                });

                                if (response.ok) {
                                    const result = await response.json();

                                    if (result.success && result.backgrounds && Array.isArray(result.backgrounds)) {
                                        // Normalize the background title for case-insensitive comparison
                                        const normalizedSearchTitle = backgroundTitle ? backgroundTitle.toLowerCase() : '';
                                        console.log(`[Debug] Searching for background with normalized title: "${normalizedSearchTitle}"`);

                                        // Find the background with matching title (case-insensitive)
                                        const matchingBackground = result.backgrounds.find(
                                            (bg: any) => {
                                                const bgTitle = bg.title ? bg.title.toLowerCase() : '';
                                                return bgTitle === normalizedSearchTitle;
                                            }
                                        );

                                        if (matchingBackground && matchingBackground.fullImageUrl) {
                                            console.log(`[Debug] Found matching background, applying`);
                                            applyBackground(matchingBackground.fullImageUrl, matchingBackground.title || matchingBackground.name);
                                            selectedBackgroundTitle = matchingBackground.title || matchingBackground.name;
                                        } else {
                                            console.error(`[Debug] Could not find background with title "${backgroundTitle}"`);
                                        }
                                    } else {
                                        console.error('[Debug] Invalid response format or no backgrounds returned');
                                    }
                                } else {
                                    console.error(`[Debug] Error fetching backgrounds: ${response.status} ${response.statusText}`);
                                }
                            } catch (error) {
                                console.error('[Debug] Error fetching background data:', error);
                            }
                        })(); // Immediately invoke the async function
                    } else {
                        console.log('[Debug] No background title or URL found for this design');
                    }
                } else {
                    console.error('[Debug] No JSON data available to load design');
                }
                
                // Show success toast for loaded design
                console.log('[Debug] Showing success toast notification');
                try {
                    (window as any).Toastify({
                        text: 'Design loaded successfully!',
                        duration: 3000,
                        close: true,
                        gravity: 'top',
                        position: 'center',
                        style: {
                            background: '#28a745'
                        },
                        stopOnFocus: true,
                        className: 'toast-spacious',
                        onClick: function(){
                            console.log('[Debug] Success toast clicked');
                        } // Callback after click
                    }).showToast();
                    console.log('[Debug] Success toast shown');
                } catch (toastError) {
                    console.error('[Debug] Error showing toast:', toastError);
                }
            } catch (error) {
                console.error('[Debug] Error loading design:', error);
                console.error('[Debug] Error details:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : 'No stack trace available',
                    type: error instanceof Error ? error.constructor.name : typeof error
                });
                
                // Show error toast for loading exception
                console.log('[Debug] Showing error toast notification');
                try {
                    (window as any).Toastify({
                        text: 'Error loading design: ' + (error instanceof Error ? error.message : String(error)),
                        duration: 4000,
                        close: true,
                        gravity: 'top',
                        position: 'center',
                        style: {
                            background: '#dc3545'
                        },
                        stopOnFocus: true,
                        className: 'toast-spacious',
                        onClick: function(){
                            console.log('[Debug] Error toast clicked');
                        } // Callback after click
                    }).showToast();
                    console.log('[Debug] Error toast shown');
                } catch (toastError) {
                    console.error('[Debug] Error showing error toast:', toastError);
                }
            }
        } 
        
        // Register toolboxes with the designer to make them draggable
        console.log('[Debug] Setting up toolboxes');
        const toolboxes = [
            { id: 'main-toolbar', element: document.querySelector('.toolbar') as HTMLElement }
            // Note: align-toolbar removed - alignment buttons are part of main-toolbar
        ];
        
        console.log(`[Debug] Found toolboxes: ${toolboxes.map(t => t.id + (t.element ? ' (found)' : ' (not found)')).join(', ')}`);
    
        // Register each toolbox
        toolboxes.forEach(toolbox => {
            console.log(`[Debug] Processing toolbox: ${toolbox.id}`);
            if (toolbox.element) {
                console.log(`[Debug] Found element for toolbox: ${toolbox.id}`);
                // Move the toolbox from the document body to the canvas
                if (toolbox.element.parentElement) {
                    console.log(`[Debug] Removing toolbox ${toolbox.id} from parent: ${toolbox.element.parentElement.tagName}`);
                    toolbox.element.parentElement.removeChild(toolbox.element);
                } else {
                    console.log(`[Debug] Toolbox ${toolbox.id} has no parent element`);
                }
                
                console.log(`[Debug] Registering toolbox: ${toolbox.id}`);
                designer.registerToolbox(toolbox.id, toolbox.element);

                // Set initial position for main toolbar
                const initialPosition = { x: 20, y: 20 };

                console.log(`[Debug] Setting initial position for ${toolbox.id}: x=${initialPosition.x}, y=${initialPosition.y}`);
                designer.setToolboxPosition(toolbox.id, initialPosition);
                console.log(`[Debug] Toolbox ${toolbox.id} registered and positioned successfully`);
            } else {
                console.warn(`[Debug] Toolbox element not found for ${toolbox.id}`);
            }
        });
    
        // Demo widgets are commented out for now, we'll only show the test design from the backend
        /*
        // Only add default widgets if we're not loading an existing design
        if (!isLoadingExisting || isLoadingExisting.value !== "true") {
            // Create one of each widget type to demonstrate usage, with layered positioning
            // Box Widget (on the bottom)
            designer.addWidget({
                position: { x: 70, y: 130 },
                size: { width: 180, height: 180 },
                type: 'box',
                zIndex: 1,
                properties: {
                    backgroundColor: '#3498db',
                    borderRadius: 8
                }
            });
    
            // QR Widget (in the middle)
            designer.addWidget({
                position: { x: 165, y: 120 },
                size: { width: 120, height: 120 },
                type: 'qr',
                zIndex: 2,
                properties: {
                    imageUrl: 'https://via.placeholder.com/120x120?text=QR+Code'
                }
            });
    
            // Text Widget (on top)
            designer.addWidget({
                position: { x: 25, y: 255 },
                size: { width: 290, height: 32 },
                type: 'text',
                zIndex: 3,
                properties: {
                    text: 'I am a Text Widget. Edit me!',
                    fontFamily: 'Arial',
                    fontSize: 18,
                    fontColor: '#333333',
                    textAlign: 'center'
                }
            });
        }
        */
    
        // Add widget buttons functionality
        console.log('[Debug] Setting up widget buttons');
        const addBoxButton = document.getElementById('btn-add-box');
        console.log(`[Debug] Add box button found: ${!!addBoxButton}`);
        
        if (addBoxButton) {
            console.log('[Debug] Adding click event listener to box button');
            addBoxButton.addEventListener('click', () => {
                console.log('[Debug] Add box button clicked');
                
                try {
                    console.log('[Debug] Creating new box widget with parameters:');
                    const widgetParams = {
                        position: { x: 100, y: 100 },
                        size: { width: 180, height: 180 },
                        type: 'box',
                        properties: {
                            backgroundColor: '#3498db',
                            borderRadius: 8
                        }
                    };
                    console.log('[Debug] Widget parameters:', widgetParams);
                    
                    console.log('[Debug] Calling designer.addWidget()');
                    const widgetId = designer.addWidget(widgetParams);
                    console.log(`[Debug] Box widget created successfully with ID: ${widgetId}`);
                } catch (error) {
                    console.error('[Debug] Error creating box widget:', error);
                    console.error('[Debug] Error details:', {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : 'No stack trace available',
                        type: error instanceof Error ? error.constructor.name : typeof error
                    });
                }
            });
        }
    
        const addQRButton = document.getElementById('btn-add-qr');
        if (addQRButton) {
            addQRButton.addEventListener('click', () => {
                designer.addWidget({
                    position: { x: 150, y: 150 },
                    size: { width: 120, height: 120 },
                    type: 'qr',
                    properties: {
                        imageUrl: 'https://via.placeholder.com/120x120?text=QR+Code'
                    }
                });
            });
        }
    
        const addTextButton = document.getElementById('btn-add-text');
        if (addTextButton) {
            addTextButton.addEventListener('click', () => {
                designer.addWidget({
                    position: { x: 200, y: 200 },
                    size: { width: 290, height: 32 },
                    type: 'text',
                    properties: {
                        text: 'I am a Text Widget. Edit me!',
                        fontFamily: 'Arial',
                        fontSize: 18,
                        fontColor: '#333333',
                        textAlign: 'center'
                    }
                });
            });
        }

        // Initialize Widget Image Manager
        const userIdElement = document.getElementById('user-id') as HTMLInputElement;
        const designIdElement = document.getElementById('design-id') as HTMLInputElement;
        const userId = userIdElement ? userIdElement.value : '';
        const breakTypeId = designIdElement ? designIdElement.value : '';

        let widgetImageManager: WidgetImageManager | null = null;
        if (userId && breakTypeId) {
            console.log('[Debug] Initializing Widget Image Manager');
            widgetImageManager = new WidgetImageManager(userId, breakTypeId);
        }

        // Add image button - opens management modal to select/upload images
        const addImageButton = document.getElementById('btn-add-image');
        if (addImageButton && widgetImageManager) {
            addImageButton.addEventListener('click', () => {
                // Open the management modal to select an existing image or upload a new one
                widgetImageManager!.openManagementModal();
            });
        }

        // Listen for image selected/uploaded events to add widgets
        document.addEventListener('widget-image-selected', ((event: CustomEvent) => {
            designer.addWidget({
                position: { x: 200, y: 200 },
                size: { width: 300, height: 200 },
                type: 'image',
                properties: {
                    imageUrl: event.detail.imageUrl,
                    imageName: event.detail.imageName,
                    thumbnailUrl: event.detail.thumbnailUrl,
                    userId: userId,
                    breakTypeId: breakTypeId
                }
            });
        }) as EventListener);

        document.addEventListener('widget-image-uploaded', ((event: CustomEvent) => {
            // If there's no widget ID (new upload), create a new widget
            if (!event.detail.widgetId) {
                designer.addWidget({
                    position: { x: 200, y: 200 },
                    size: { width: 300, height: 200 },
                    type: 'image',
                    properties: {
                        imageUrl: event.detail.imageUrl,
                        imageName: event.detail.imageName,
                        thumbnailUrl: event.detail.thumbnailUrl,
                        userId: userId,
                        breakTypeId: breakTypeId
                    }
                });
            }
        }) as EventListener);

        // Completely override the behavior of the New button
        const newWidgetButton = document.getElementById('btn-new-widget');
        const dropdownContent = document.querySelector('.dropdown-content') as HTMLElement;
        
        if (newWidgetButton && dropdownContent) {
            // Remove any existing click handlers by cloning and replacing
            const newButton = newWidgetButton.cloneNode(true);
            if (newWidgetButton.parentNode) {
                newWidgetButton.parentNode.replaceChild(newButton, newWidgetButton);
            }
            
            // Add click handler that ONLY shows the dropdown
            newButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (event) => {
                if (!newButton.contains(event.target as Node) && 
                    !dropdownContent.contains(event.target as Node)) {
                    dropdownContent.classList.remove('show');
                }
            });
            
            // Make sure only the specific buttons create widgets
            const addBoxButton = document.getElementById('btn-add-box');
            const addQRButton = document.getElementById('btn-add-qr');
            const addTextButton = document.getElementById('btn-add-text');
            
            // Remove all other click handlers from dropdown items
            dropdownContent.querySelectorAll('.dropdown-item').forEach(item => {
                const newItem = item.cloneNode(true);
                if (item.parentNode) {
                    item.parentNode.replaceChild(newItem, item);
                }
            });
            
            // Re-add specific handlers to each widget button
            if (addBoxButton) {
                const newBoxButton = document.getElementById('btn-add-box');
                if (newBoxButton) {
                    newBoxButton.addEventListener('click', () => {
                        designer.addWidget({
                            position: { x: 100, y: 100 },
                            size: { width: 180, height: 180 },
                            type: 'box',
                            properties: {
                                backgroundColor: '#3498db',
                                borderRadius: 8
                            }
                        });
                        dropdownContent.classList.remove('show');
                    });
                }
            }
            
            if (addQRButton) {
                const newQRButton = document.getElementById('btn-add-qr');
                if (newQRButton) {
                    newQRButton.addEventListener('click', () => {
                        designer.addWidget({
                            position: { x: 150, y: 150 },
                            size: { width: 120, height: 120 },
                            type: 'qr',
                            properties: {
                                imageUrl: 'https://via.placeholder.com/120x120?text=QR+Code'
                            }
                        });
                        dropdownContent.classList.remove('show');
                    });
                }
            }
            
            if (addTextButton) {
                const newTextButton = document.getElementById('btn-add-text');
                if (newTextButton) {
                    newTextButton.addEventListener('click', () => {
                        designer.addWidget({
                            position: { x: 200, y: 200 },
                            size: { width: 290, height: 32 },
                            type: 'text',
                            properties: {
                                text: 'I am a Text Widget. Edit me!',
                                fontFamily: 'Arial',
                                fontSize: 18,
                                fontColor: '#333333',
                                textAlign: 'center'
                            }
                        });
                        dropdownContent.classList.remove('show');
                    });
                }
            }
        }
    
        // Add action button functionality
        const saveButton = document.getElementById('btn-save');
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                console.log('Save button clicked');
                
                try {
                    // Get the canvas data
                    const canvasData = designer.saveDesign();
                    
                    // Get the design ID from the page element
                    const designIdElement = document.getElementById('design-id') as HTMLInputElement;
                    const designId = designIdElement ? designIdElement.value : '';
                    
                    if (!designId) {
                        throw new Error("Design ID not found. Cannot save design.");
                    }
                    
                    // Get the background title
                    const canvasElement = document.getElementById('designer-canvas');
                    let backgroundTitle = "Default Background";
                    
                    // If we have a selected background title from the selector, use that
                    if (selectedBackgroundTitle) {
                        backgroundTitle = selectedBackgroundTitle;
                    }
                    
                    // Get the anti-forgery token first (needed for thumbnail upload)
                    console.log('Looking for anti-forgery token');
                    document.querySelectorAll('input[type="hidden"]').forEach(input => {
                        console.log(`Found hidden input: name="${input.getAttribute('name')}", value="${input.getAttribute('value')}"`);
                    });

                    let tokenElement = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
                    if (!tokenElement) {
                        // Try alternative token names
                        const alternativeTokenElement = document.querySelector('input[name="RequestVerificationToken"]') as HTMLInputElement;
                        if (alternativeTokenElement) {
                            console.log('Found token with alternative name: RequestVerificationToken');
                            tokenElement = alternativeTokenElement;
                        } else {
                            throw new Error("Anti-forgery token not found");
                        }
                    }

                    // Generate and upload thumbnail
                    let thumbnailUrl: string | null = null;
                    if (canvasElement) {
                        const thumbnailBlob = await generateThumbnail(canvasElement);
                        if (thumbnailBlob) {
                            thumbnailUrl = await uploadThumbnail(thumbnailBlob, designId, tokenElement.value);
                            console.log('[Save] Thumbnail URL received from upload:', thumbnailUrl);
                        } else {
                            console.warn('[Save] Failed to generate thumbnail blob');
                        }
                    } else {
                        console.warn('[Save] Canvas element not found for thumbnail generation');
                    }

                    // Create the payload with the real break type ID
                    // Ensure background title is lowercase to maintain consistency
                    const payload = {
                        id: designId,
                        backgroundImageTitle: backgroundTitle.toLowerCase(),
                        canvasData: canvasData,
                        thumbnailUrl: thumbnailUrl // Add thumbnail URL to payload
                    };

                    console.log('[Save] Payload being sent:', JSON.stringify(payload, null, 2));

                    // Send data to the server
                    // For ASP.NET Core Razor Pages, we need to include the antiforgery token and use the right URL format
                    const response = await fetch('/Designer?handler=SaveDesign', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'RequestVerificationToken': tokenElement.value, // Standard ASP.NET Core anti-forgery token header
                        },
                        credentials: 'include', // Important for cookies
                        body: JSON.stringify(payload)
                    });
                    
                    // Check if response is ok before trying to parse JSON
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`Error ${response.status}: ${errorText}`);
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        console.log('Design saved successfully:', result.message);
                        // Show success toast
                        (window as any).Toastify({
                            text: 'Design saved successfully!',
                            duration: 3000,
                            close: true,
                            gravity: 'top',
                            position: 'center',
                            style: {
                                background: '#28a745'
                            },
                            stopOnFocus: true,
                            className: 'toast-spacious',
                            onClick: function(){} // Callback after click
                        }).showToast();
                        
                        // Dispatch a custom event to signal that the design was saved
                        const saveEvent = new CustomEvent('design-saved', { detail: { designId: designId } });
                        document.dispatchEvent(saveEvent);
                    } else {
                        console.error('Error saving design:', result.message);
                        // Show error toast
                        (window as any).Toastify({
                            text: 'Error saving design: ' + result.message,
                            duration: 4000,
                            close: true,
                            gravity: 'top',
                            position: 'center',
                            style: {
                                background: '#dc3545'
                            },
                            stopOnFocus: true,
                            className: 'toast-spacious',
                            onClick: function(){} // Callback after click
                        }).showToast();
                    }
                } catch (error) {
                    console.error('Error saving design:', error);
                    // Show error toast for exception
                    (window as any).Toastify({
                        text: 'Error saving design: ' + (error instanceof Error ? error.message : String(error)),
                        duration: 4000,
                        close: true,
                        gravity: 'top',
                        position: 'center',
                        style: {
                            background: '#dc3545'
                        },
                        stopOnFocus: true,
                        className: 'toast-spacious',
                        onClick: function(){} // Callback after click
                    }).showToast();
                }
            });
        }
        
        const previewButton = document.getElementById('btn-preview');
        if (previewButton) {
            previewButton.addEventListener('click', () => {
                console.log('Preview button clicked - entering preview mode');
                designer.enterPreviewMode();
            });
        }
        
        const exitButton = document.getElementById('btn-exit');
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                console.log('Exit button clicked - returning to Break Types page');
                
                // Ask if the user wants to save before exiting
                if (designer.hasUnsavedChanges()) {
                    const confirmExit = confirm('You have unsaved changes. Do you want to save before exiting?');
                    if (confirmExit) {
                        // First save, then exit
                        const saveButton = document.getElementById('btn-save');
                        if (saveButton) {
                            // Create and dispatch a click event
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            
                            // Add a listener for the save completion
                            document.addEventListener('design-saved', () => {
                                window.location.href = '/Settings#break-types';
                            }, { once: true });

                            saveButton.dispatchEvent(clickEvent);
                            return;
                        }
                    }
                }

                // If no unsaved changes or user doesn't want to save, exit directly
                window.location.href = '/Settings#break-types';
            });
        }

        // Prevent accidental navigation away with unsaved changes
        window.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
            if (designer.hasUnsavedChanges()) {
                // Modern browsers require preventDefault and returnValue to trigger the confirmation dialog
                event.preventDefault();
                event.returnValue = ''; // Chrome requires returnValue to be set
                return ''; // Some older browsers need a return value
            }
        });

        // Background selector button
        const backgroundButton = document.getElementById('btn-background');
        if (backgroundButton) {
            backgroundButton.addEventListener('click', () => {
                console.log('Background button clicked');
                openBackgroundSelector();
            });
        }
        
        // Grid toggle button
        console.log('[Debug] Setting up grid toggle button');
        const gridButton = document.getElementById('btn-grid');
        const canvasElement = document.getElementById('designer-canvas');
        console.log(`[Debug] Grid button found: ${!!gridButton}`);
        console.log(`[Debug] Canvas element found: ${!!canvasElement}`);
        
        let isGridVisible = true; // Grid is visible by default
        console.log(`[Debug] Initial grid visibility: ${isGridVisible}`);
        
        if (gridButton && canvasElement) {
            // Set up initial state
            console.log('[Debug] Setting initial grid button state');
            updateGridButtonIcon(gridButton, isGridVisible);
            
            console.log('[Debug] Adding click event listener to grid button');
            gridButton.addEventListener('click', () => {
                console.log('[Debug] Grid button clicked');
                
                // Toggle grid visibility
                isGridVisible = !isGridVisible;
                console.log(`[Debug] Grid visibility toggled to: ${isGridVisible}`);
                
                // Update the canvas class
                if (isGridVisible) {
                    console.log('[Debug] Showing grid: removing grid-hidden class');
                    canvasElement.classList.remove('grid-hidden');
                    gridButton.setAttribute('aria-pressed', 'true');
                } else {
                    console.log('[Debug] Hiding grid: adding grid-hidden class');
                    canvasElement.classList.add('grid-hidden');
                    gridButton.setAttribute('aria-pressed', 'false');
                }
                
                // Update button icon to reflect current state
                console.log('[Debug] Updating grid button icon');
                updateGridButtonIcon(gridButton, isGridVisible);
                console.log('[Debug] Grid toggle complete');
            });
        } else {
            console.warn('[Debug] Could not set up grid toggle: missing button or canvas element');
        }
        
        // Helper function to update grid button icon
        function updateGridButtonIcon(button: HTMLElement, isVisible: boolean) {
            console.log(`[Debug] updateGridButtonIcon called with isVisible=${isVisible}`);
            
            // First, find the icon element
            const iconElement = button.querySelector('i');
            const srTextElement = button.querySelector('.visually-hidden');
            
            console.log(`[Debug] Found icon element: ${!!iconElement}`);
            console.log(`[Debug] Found screen reader text element: ${!!srTextElement}`);
            
            if (iconElement) {
                // Remove existing grid-related classes
                console.log('[Debug] Removing existing grid icon classes');
                iconElement.classList.remove('fa-border-all', 'fa-border-none');
                
                // Add appropriate icon class based on current state
                if (isVisible) {
                    console.log('[Debug] Setting grid visible icon (fa-border-all)');
                    iconElement.classList.add('fa-border-all');
                    button.setAttribute('title', 'Hide Grid');
                    button.setAttribute('aria-label', 'Hide Grid');
                    if (srTextElement) {
                        console.log('[Debug] Updating screen reader text to "Hide grid"');
                        srTextElement.textContent = 'Hide grid';
                    }
                } else {
                    console.log('[Debug] Setting grid hidden icon (fa-border-none)');
                    iconElement.classList.add('fa-border-none');
                    button.setAttribute('title', 'Show Grid');
                    button.setAttribute('aria-label', 'Show Grid');
                    if (srTextElement) {
                        console.log('[Debug] Updating screen reader text to "Show grid"');
                        srTextElement.textContent = 'Show grid';
                    }
                }
                console.log('[Debug] Grid button icon updated successfully');
            } else {
                console.error('[Debug] Error: Could not find icon element inside grid button');
            }
        }
    
        // Add group/ungroup button handlers
        const groupButton = document.getElementById('btn-group');
        if (groupButton) {
            groupButton.addEventListener('click', () => {
                console.log('Group button clicked!');
                console.log('Can group?', designer.canGroupSelectedWidgets());
                designer.groupSelectedWidgets();
            });
        }
        
        const ungroupButton = document.getElementById('btn-ungroup');
        if (ungroupButton) {
            ungroupButton.addEventListener('click', () => {
                designer.ungroupSelectedWidgets();
            });
        }
        
        // Set up button enabling/disabling based on selection
        document.addEventListener('selection-change', () => {
            if (groupButton instanceof HTMLButtonElement) {
                groupButton.disabled = !designer.canGroupSelectedWidgets();
            }
            if (ungroupButton instanceof HTMLButtonElement) {
                ungroupButton.disabled = !designer.canUngroupSelectedWidgets();
            }
        });
    
        // Expose the designer instance to the global scope for debugging purposes
        window.designer = designer;

        console.log('[Debug] Designer instance exposed to global scope for debugging');
        console.timeEnd('designer-initialization');
        console.log('[Debug] Designer initialized successfully with draggable toolboxes');

        // Hide the loading overlay now that initialization is complete
        const loadingOverlay = document.getElementById('designer-loading-overlay');
        if (loadingOverlay) {
            console.log('[Debug] Hiding loading overlay');
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                console.log('[Debug] Loading overlay hidden');
            }, 300); // Wait for fade out animation
        }
        
        // Background selector functionality
        async function openBackgroundSelector() {
            console.log('[Debug] openBackgroundSelector called');
            console.time('background-selector-load');
            
            // Get the modal
            console.log('[Debug] Getting background selector modal');
            const modalElement = document.getElementById('backgroundSelectorModal');
            console.log(`[Debug] Modal element found: ${!!modalElement}`);
            
            if (!modalElement) {
                console.error('[Debug] Error: Could not find backgroundSelectorModal element');
                return;
            }
            
            try {
                const modal = new (window as any).bootstrap.Modal(modalElement);
                console.log('[Debug] Bootstrap Modal instance created');
                
                // Show the modal
                console.log('[Debug] Showing modal');
                modal.show();
                console.log('[Debug] Modal shown');
                
                // Show loading
                console.log('[Debug] Setting up loading indicators');
                const loadingElement = document.getElementById('background-loading');
                const errorElement = document.getElementById('background-error');
                const gridElement = document.getElementById('background-grid');
                
                console.log(`[Debug] Loading element found: ${!!loadingElement}`);
                console.log(`[Debug] Error element found: ${!!errorElement}`);
                console.log(`[Debug] Grid element found: ${!!gridElement}`);
                
                if (loadingElement) {
                    console.log('[Debug] Showing loading indicator');
                    loadingElement.classList.remove('d-none');
                }
                if (errorElement) {
                    console.log('[Debug] Hiding error message');
                    errorElement.classList.add('d-none');
                }
                if (gridElement) {
                    console.log('[Debug] Clearing grid container');
                    gridElement.innerHTML = '';
                }
                
                try {
                    // Fetch backgrounds from the API
                    console.log('[Debug] Fetching backgrounds from API');
                    console.time('api-fetch-backgrounds');
                    const response = await fetch('/Designer?handler=Backgrounds', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    console.timeEnd('api-fetch-backgrounds');
                    console.log(`[Debug] API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        throw new Error(`Error fetching backgrounds: ${response.status} ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (!result.success) {
                        throw new Error(result.message || 'Unknown error fetching backgrounds');
                    }
                    
                    // Hide loading
                    if (loadingElement) loadingElement.classList.add('d-none');
                    
                    // Populate the grid with thumbnails
                    if (gridElement && result.backgrounds && Array.isArray(result.backgrounds)) {
                        result.backgrounds.forEach((background: any) => {
                            const col = document.createElement('div');
                            col.className = 'col';
                            col.setAttribute('role', 'listitem');
                            
                            const thumbnailContainer = document.createElement('div');
                            thumbnailContainer.className = 'background-thumbnail-container';
                            thumbnailContainer.dataset.fullImageUrl = background.fullImageUrl;
                            thumbnailContainer.dataset.title = background.title;
                            thumbnailContainer.setAttribute('role', 'button');
                            thumbnailContainer.setAttribute('aria-label', `Select background: ${background.title}`);
                            thumbnailContainer.setAttribute('tabindex', '0');
                            thumbnailContainer.setAttribute('aria-description', 'Click to select, double-click to apply immediately');
                            
                            // Add click handler to select the thumbnail
                            thumbnailContainer.addEventListener('click', (e) => {
                                // Deselect all previously selected thumbnails
                                document.querySelectorAll('.background-thumbnail-container.selected').forEach(el => {
                                    el.classList.remove('selected');
                                });
                                
                                // Select this thumbnail
                                thumbnailContainer.classList.add('selected');
                                
                                // Store the selected background URL and title
                                selectedBackgroundUrl = background.fullImageUrl;
                                selectedBackgroundTitle = background.title;
                                
                                // Enable the apply button
                                const applyButton = document.getElementById('btn-apply-background');
                                if (applyButton) {
                                    applyButton.removeAttribute('disabled');
                                }
                            });
                            
                            // Add double-click handler to immediately apply the background
                            thumbnailContainer.addEventListener('dblclick', (e) => {
                                // Apply the background immediately
                                applyBackground(background.fullImageUrl, background.title);
                                
                                // Close the modal
                                modal.hide();
                            });
                            
                            // Add keyboard support for accessibility
                            thumbnailContainer.addEventListener('keydown', (e) => {
                                // Select with Enter or Space
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    
                                    // Simulate click to select
                                    thumbnailContainer.click();
                                    
                                    // If Enter is pressed with Alt key, apply immediately (like double-click)
                                    if (e.key === 'Enter' && e.altKey) {
                                        applyBackground(background.fullImageUrl, background.title);
                                        modal.hide();
                                    }
                                }
                            });
                            
                            const thumbnail = document.createElement('img');
                            thumbnail.className = 'background-thumbnail';
                            thumbnail.src = background.thumbnailUrl;
                            thumbnail.alt = background.title;
                            
                            const title = document.createElement('div');
                            title.className = 'background-thumbnail-title';
                            title.textContent = background.title;
                            
                            thumbnailContainer.appendChild(thumbnail);
                            thumbnailContainer.appendChild(title);
                            col.appendChild(thumbnailContainer);
                            gridElement.appendChild(col);
                        });
                    }
                    
                    // Set up apply button handler
                    const applyButton = document.getElementById('btn-apply-background');
                    if (applyButton) {
                        // Remove any existing event listeners by cloning and replacing
                        const newApplyButton = applyButton.cloneNode(true);
                        if (applyButton.parentNode) {
                            applyButton.parentNode.replaceChild(newApplyButton, applyButton);
                        }
                        
                        newApplyButton.addEventListener('click', () => {
                            if (selectedBackgroundUrl) {
                                applyBackground(selectedBackgroundUrl, selectedBackgroundTitle || '');
                                modal.hide();
                            }
                        });
                    }
                } catch (apiError) {
                    console.error('[Debug] Error fetching backgrounds:', apiError);
                    
                    // Hide loading and show error
                    if (loadingElement) loadingElement.classList.add('d-none');
                    if (errorElement) {
                        errorElement.classList.remove('d-none');
                        errorElement.textContent = `Error loading backgrounds: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
                    }
                }
            } catch (modalError) {
                console.error('[Debug] Error with modal:', modalError);
            }
        }
        
    } catch (initError) {
        console.error('[Debug] Fatal error during designer initialization:', initError);
        console.error('[Debug] Error details:', {
            message: initError instanceof Error ? initError.message : String(initError),
            stack: initError instanceof Error ? initError.stack : 'No stack trace available',
            type: initError instanceof Error ? initError.constructor.name : typeof initError
        });
        
        // Show a fatal error message to the user
        try {
            (window as any).Toastify({
                text: 'Fatal error initializing designer. Please check console for details.',
                duration: 0, // No auto-hide
                close: true,
                gravity: 'top',
                position: 'center',
                style: {
                    background: '#dc3545'
                },
                stopOnFocus: true,
                className: 'toast-spacious'
            }).showToast();
        } catch (toastError) {
            // If even toast fails, try a basic alert
            console.error('[Debug] Could not show error toast:', toastError);
            alert('Fatal error initializing designer. Please check console for details.');
        }
    }
});