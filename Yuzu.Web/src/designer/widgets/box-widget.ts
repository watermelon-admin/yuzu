import { Widget } from '../widget.js';
import { WidgetData, WidgetType, BoxWidgetProperties, Size } from '../types.js';

/**
 * Represents a box widget in the designer.
 * A simple rectangle that can have custom color and rounded corners.
 */
export class BoxWidget extends Widget {
    /**
     * Creates an instance of BoxWidget.
     * @param data - The data for the widget.
     */
    constructor(data: WidgetData) {
        // Ensure the type is set correctly
        data.type = WidgetType.Box;
        
        // Initialize default properties if not provided
        if (!data.properties) {
            data.properties = {
                backgroundColor: '#3498db',
                borderRadius: 0
            } as BoxWidgetProperties;
        }
        
        super(data);
    }
    
    /**
     * Updates properties specific to the box widget.
     */
    protected override updateSpecificProperties(): void {
        const properties = this.data.properties as BoxWidgetProperties;
        
        if (this.contentElement && properties) {
            // Set background color
            this.contentElement.style.backgroundColor = properties.backgroundColor;
            
            // Apply border radius regardless of preview mode - we want to keep rounded corners in preview
            this.contentElement.style.borderRadius = `${properties.borderRadius}px`;
            this.element.style.borderRadius = `${properties.borderRadius}px`;
            
            // Set important flag in preview mode to ensure it takes precedence
            if (this.element.classList.contains('preview-mode')) {
                this.contentElement.style.setProperty('border-radius', `${properties.borderRadius}px`, 'important');
                this.element.style.setProperty('border-radius', `${properties.borderRadius}px`, 'important');
            }
        }
    }
    
    /**
     * Sets the background color of the box.
     * @param color - The CSS color value.
     */
    public setBackgroundColor(color: string): void {
        if (!this.data.properties) {
            this.data.properties = {} as BoxWidgetProperties;
        }
        
        (this.data.properties as BoxWidgetProperties).backgroundColor = color;
        this.updateDomFromData();
    }
    
    /**
     * Sets the border radius of the box.
     * @param radius - The border radius in pixels.
     */
    public setBorderRadius(radius: number): void {
        if (!this.data.properties) {
            this.data.properties = {} as BoxWidgetProperties;
        }
        
        (this.data.properties as BoxWidgetProperties).borderRadius = radius;
        this.updateDomFromData();
    }
}