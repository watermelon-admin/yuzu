import { WidgetData, WidgetType, GroupWidgetProperties } from '../types.js';
import { Widget } from '../widget.js';
import { BoxWidget } from './box-widget.js';
import { QRWidget } from './qr-widget.js';
import { TextWidget } from './text-widget.js';
import { GroupWidget } from './group-widget.js';

/**
 * Factory class for creating widgets of different types.
 */
export class WidgetFactory {
    /**
     * Creates a widget based on the provided data.
     * @param data - The widget data.
     * @returns The created widget.
     */
    public static createWidget(data: WidgetData): Widget {
        switch (data.type) {
            case WidgetType.Box:
                return new BoxWidget(data);
            case WidgetType.QR:
                return new QRWidget(data);
            case WidgetType.Text:
                return new TextWidget(data);
            case WidgetType.Group:
                // Use a type assertion to handle the GroupWidget type issue
                return new GroupWidget(data) as unknown as Widget;
            default:
                // Default to basic widget
                console.warn(`Widget type "${data.type}" not recognized, using basic widget.`);
                return new Widget(data);
        }
    }
    
    /**
     * Creates a new Box widget with default properties.
     * @param id - The widget ID.
     * @param x - The x position.
     * @param y - The y position.
     * @param width - The width.
     * @param height - The height.
     * @param zIndex - The z-index.
     * @returns The created widget.
     */
    public static createBoxWidget(
        id: string, 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        zIndex: number
    ): BoxWidget {
        const data: WidgetData = {
            id,
            position: { x, y },
            size: { width, height },
            zIndex,
            type: WidgetType.Box
        };
        
        return new BoxWidget(data);
    }
    
    /**
     * Creates a new QR widget with default properties.
     * @param id - The widget ID.
     * @param x - The x position.
     * @param y - The y position.
     * @param size - The size (width and height will be the same).
     * @param zIndex - The z-index.
     * @param imageUrl - The QR code image URL.
     * @returns The created widget.
     */
    public static createQRWidget(
        id: string, 
        x: number, 
        y: number, 
        size: number, 
        zIndex: number,
        imageUrl: string = 'path/to/default-qr.jpg'
    ): QRWidget {
        const data: WidgetData = {
            id,
            position: { x, y },
            size: { width: size, height: size },
            zIndex,
            type: WidgetType.QR,
            properties: {
                imageUrl
            }
        };
        
        return new QRWidget(data);
    }
    
    /**
     * Creates a new Text widget with default properties.
     * @param id - The widget ID.
     * @param x - The x position.
     * @param y - The y position.
     * @param width - The width.
     * @param height - The height.
     * @param zIndex - The z-index.
     * @param text - The initial text content.
     * @returns The created widget.
     */
    public static createTextWidget(
        id: string, 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        zIndex: number,
        text: string = 'I am a text box.'
    ): TextWidget {
        const data: WidgetData = {
            id,
            position: { x, y },
            size: { width, height },
            zIndex,
            type: WidgetType.Text,
            properties: {
                text,
                fontFamily: 'Arial',
                fontSize: 16,
                fontColor: '#000000'
            }
        };
        
        return new TextWidget(data);
    }
    
    /**
     * Creates a new Group widget.
     * @param id - The widget ID.
     * @param x - The x position.
     * @param y - The y position.
     * @param width - The width.
     * @param height - The height.
     * @param zIndex - The z-index.
     * @param childIds - Array of IDs of the widgets to include in the group.
     * @returns The created group widget.
     */
    public static createGroupWidget(
        id: string, 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        zIndex: number,
        childIds: string[] = []
    ): Widget {
        // Add padding to ensure the group fully contains its children
        const padding = 20;
        const paddedX = Math.max(0, x - padding);
        const paddedY = Math.max(0, y - padding);
        const paddedWidth = width + (padding * 2);
        const paddedHeight = height + (padding * 2);
        
        console.log('Creating group widget with padded dimensions:', {
            original: { x, y, width, height },
            padded: { x: paddedX, y: paddedY, width: paddedWidth, height: paddedHeight }
        });
        
        const data: WidgetData = {
            id,
            position: { x: paddedX, y: paddedY },
            size: { width: paddedWidth, height: paddedHeight },
            zIndex,
            type: WidgetType.Group,
            properties: {
                childIds: [...childIds]
            } as GroupWidgetProperties
        };
        
        // Use a type assertion to handle the GroupWidget type issue
        return new GroupWidget(data) as unknown as Widget;
    }
}