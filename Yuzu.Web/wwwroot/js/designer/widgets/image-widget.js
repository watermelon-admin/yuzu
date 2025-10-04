import { Widget } from '../widget.js';
import { WidgetType } from '../types.js';
/**
 * Represents an image widget in the designer.
 * Contains a user-uploaded image (JPG/PNG).
 */
export class ImageWidget extends Widget {
    /**
     * Creates an instance of ImageWidget.
     * @param data - The data for the widget.
     */
    constructor(data) {
        // Ensure the type is set correctly
        data.type = WidgetType.Image;
        // Initialize default properties if not provided
        if (!data.properties) {
            data.properties = {
                imageUrl: '',
                imageName: '',
                userId: '',
                breakTypeId: ''
            };
        }
        super(data);
        this.isLoadingImage = false;
        this.hasLoadError = false;
        // Set up double-click handler for changing image
        this.setupImageChangeHandler();
    }
    /**
     * Updates properties specific to the image widget.
     */
    updateSpecificProperties() {
        const properties = this.data.properties;
        if (this.contentElement && properties) {
            // Clear previous content
            this.contentElement.innerHTML = '';
            // Handle different states
            if (this.hasLoadError) {
                // Show error placeholder
                this.showErrorPlaceholder();
            }
            else if (!properties.imageUrl) {
                // Show empty state placeholder
                this.showEmptyPlaceholder();
            }
            else if (this.isLoadingImage) {
                // Show loading state
                this.showLoadingPlaceholder();
            }
            else {
                // Show the image
                this.showImage(properties.imageUrl);
            }
        }
    }
    /**
     * Shows the actual image
     */
    showImage(imageUrl) {
        if (!this.contentElement)
            return;
        const img = document.createElement('img');
        // Use proxy URL for CORS support (needed for html2canvas thumbnail generation)
        const properties = this.data.properties;
        if (properties.imageName) {
            // Extract just the filename from imageName (in case it's a full path)
            const filename = properties.imageName.split('/').pop() || properties.imageName;
            img.src = `/Designer?handler=WidgetImageProxy&filename=${encodeURIComponent(filename)}`;
        }
        else {
            // Fallback to direct URL if imageName is not available
            img.src = imageUrl;
        }
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain'; // Maintain aspect ratio
        img.style.border = 'none';
        img.style.pointerEvents = 'none'; // Allow dragging the widget
        img.alt = 'Widget image';
        img.crossOrigin = 'anonymous'; // Enable CORS for html2canvas thumbnail generation
        // Handle image load error
        img.onerror = () => {
            this.hasLoadError = true;
            this.updateDomFromData();
        };
        // Handle successful load
        img.onload = () => {
            this.hasLoadError = false;
            this.isLoadingImage = false;
        };
        this.contentElement.appendChild(img);
    }
    /**
     * Shows a placeholder when the image is empty
     */
    showEmptyPlaceholder() {
        if (!this.contentElement)
            return;
        const placeholder = document.createElement('div');
        placeholder.className = 'image-widget-placeholder';
        placeholder.style.width = '100%';
        placeholder.style.height = '100%';
        placeholder.style.display = 'flex';
        placeholder.style.flexDirection = 'column';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.backgroundColor = '#f8f9fa';
        placeholder.style.color = '#6c757d';
        placeholder.style.cursor = 'pointer';
        placeholder.style.pointerEvents = 'none'; // Allow dragging, double-click is on widget element
        const icon = document.createElement('i');
        icon.className = 'bx bx-image-add';
        icon.style.fontSize = '3rem';
        icon.style.marginBottom = '0.5rem';
        icon.style.pointerEvents = 'none';
        const text = document.createElement('div');
        text.textContent = 'Double-click to add image';
        text.style.fontSize = '0.875rem';
        text.style.textAlign = 'center';
        text.style.pointerEvents = 'none';
        placeholder.appendChild(icon);
        placeholder.appendChild(text);
        this.contentElement.appendChild(placeholder);
    }
    /**
     * Shows a loading placeholder
     */
    showLoadingPlaceholder() {
        if (!this.contentElement)
            return;
        const placeholder = document.createElement('div');
        placeholder.className = 'image-widget-loading';
        placeholder.style.width = '100%';
        placeholder.style.height = '100%';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.backgroundColor = '#f8f9fa';
        placeholder.style.pointerEvents = 'none'; // Allow dragging
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-primary';
        spinner.setAttribute('role', 'status');
        spinner.style.pointerEvents = 'none';
        const spinnerText = document.createElement('span');
        spinnerText.className = 'visually-hidden';
        spinnerText.textContent = 'Loading...';
        spinner.appendChild(spinnerText);
        placeholder.appendChild(spinner);
        this.contentElement.appendChild(placeholder);
    }
    /**
     * Shows an error placeholder when image fails to load
     */
    showErrorPlaceholder() {
        if (!this.contentElement)
            return;
        const placeholder = document.createElement('div');
        placeholder.className = 'image-widget-error';
        placeholder.style.width = '100%';
        placeholder.style.height = '100%';
        placeholder.style.display = 'flex';
        placeholder.style.flexDirection = 'column';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.backgroundColor = '#f8d7da';
        placeholder.style.color = '#842029';
        placeholder.style.cursor = 'pointer';
        placeholder.style.pointerEvents = 'none'; // Allow dragging, double-click is on widget element
        const icon = document.createElement('i');
        icon.className = 'bx bx-error-circle';
        icon.style.fontSize = '3rem';
        icon.style.marginBottom = '0.5rem';
        icon.style.pointerEvents = 'none';
        const text = document.createElement('div');
        text.textContent = 'Failed to load image';
        text.style.fontSize = '0.875rem';
        text.style.textAlign = 'center';
        text.style.pointerEvents = 'none';
        const subtext = document.createElement('div');
        subtext.textContent = 'Double-click to change';
        subtext.style.fontSize = '0.75rem';
        subtext.style.marginTop = '0.25rem';
        subtext.style.opacity = '0.7';
        subtext.style.pointerEvents = 'none';
        placeholder.appendChild(icon);
        placeholder.appendChild(text);
        placeholder.appendChild(subtext);
        this.contentElement.appendChild(placeholder);
    }
    /**
     * Sets up double-click handler for changing image
     */
    setupImageChangeHandler() {
        if (this.element) {
            this.element.addEventListener('dblclick', this.openImageChangeModal.bind(this));
        }
    }
    /**
     * Opens the image change/upload modal
     */
    openImageChangeModal(event) {
        event.stopPropagation();
        // Dispatch custom event to notify the designer to open the modal
        const changeEvent = new CustomEvent('image-widget-change-request', {
            detail: {
                widgetId: this.data.id,
                currentImageUrl: this.data.properties.imageUrl
            },
            bubbles: true
        });
        this.element.dispatchEvent(changeEvent);
    }
    /**
     * Sets the image URL and related properties
     * @param imageUrl - The URL of the image
     * @param imageName - The GUID-based name of the image
     * @param thumbnailUrl - Optional thumbnail URL
     */
    setImage(imageUrl, imageName, thumbnailUrl) {
        if (!this.data.properties) {
            this.data.properties = {};
        }
        const properties = this.data.properties;
        properties.imageUrl = imageUrl;
        properties.imageName = imageName;
        if (thumbnailUrl) {
            properties.thumbnailUrl = thumbnailUrl;
        }
        this.isLoadingImage = true;
        this.hasLoadError = false;
        this.updateDomFromData();
    }
    /**
     * Gets the image information
     */
    getImageInfo() {
        const properties = this.data.properties;
        return {
            imageUrl: properties.imageUrl || '',
            imageName: properties.imageName || '',
            thumbnailUrl: properties.thumbnailUrl
        };
    }
}
//# sourceMappingURL=image-widget.js.map