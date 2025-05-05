import { Widget } from '../widget.js';
import { WidgetData, WidgetType, QRWidgetProperties, Size } from '../types.js';

/**
 * Represents a QR code widget in the designer.
 * Contains a mock QR Code and remains square when resizing.
 */
export class QRWidget extends Widget {
    /**
     * Creates an instance of QRWidget.
     * @param data - The data for the widget.
     */
    constructor(data: WidgetData) {
        // Ensure the type is set correctly
        data.type = WidgetType.QR;
        
        // Initialize default properties
        if (!data.properties) {
            data.properties = {} as QRWidgetProperties;
        }
        
        // Always set the image URL to our fixed value
        (data.properties as QRWidgetProperties).imageUrl = 'img/general/dummy-qr.svg';
        
        // Ensure the widget is square
        const maxDimension = Math.max(data.size.width, data.size.height);
        data.size = { width: maxDimension, height: maxDimension };
        
        super(data);
    }
    
    /**
     * Updates properties specific to the QR widget.
     */
    protected override updateSpecificProperties(): void {
        const properties = this.data.properties as QRWidgetProperties;
        
        if (this.contentElement && properties) {
            // Clear previous content
            this.contentElement.innerHTML = '';
            
            // Create the image element
            const img = document.createElement('img');
            img.src = properties.imageUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.border = 'none';
            
            this.contentElement.appendChild(img);
        }
    }
    
    /**
     * Sets the size of the widget, ensuring it remains square.
     * @param size - The new size.
     */
    public override setSize(size: Size): void {
        // Make sure the widget remains square
        const maxDimension = Math.max(size.width, size.height);
        const squareSize = { width: maxDimension, height: maxDimension };
        
        // Call parent setSize (which will update DOM and dispatch widget-size-update)
        // But we'll override the size to ensure it's square
        this.data.size = {
            width: Math.max(squareSize.width, 10),
            height: Math.max(squareSize.height, 10)
        };
        this.updateDomFromData();
        
        // Dispatch both events for consistency
        // Standard size update event from base class
        const updateEvent = new CustomEvent('widget-size-update', {
            detail: {
                id: this.data.id,
                size: this.data.size
            },
            bubbles: true
        });
        this.element.dispatchEvent(updateEvent);
        
        // Legacy qr-widget-resize event for backward compatibility
        const resizeEvent = new CustomEvent('qr-widget-resize', { 
            detail: { id: this.getId(), size: maxDimension } 
        });
        document.dispatchEvent(resizeEvent);
    }
    
    /**
     * Sets the QR code image URL.
     * @param imageUrl - The URL of the QR code image.
     */
    public setImageUrl(imageUrl: string): void {
        if (!this.data.properties) {
            this.data.properties = {} as QRWidgetProperties;
        }
        
        (this.data.properties as QRWidgetProperties).imageUrl = imageUrl;
        this.updateDomFromData();
    }
}