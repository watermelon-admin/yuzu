import { WidgetType } from '../types.js';
import { Widget } from '../widget.js';
import { BoxWidget } from './box-widget.js';
import { QRWidget } from './qr-widget.js';
import { TextWidget } from './text-widget.js';
import { GroupWidget } from './group-widget.js';
import { ImageWidget } from './image-widget.js';
/**
 * Factory class for creating widgets of different types.
 */
export class WidgetFactory {
    /**
     * Creates a widget based on the provided data.
     * @param data - The widget data.
     * @returns The created widget.
     */
    static createWidget(data) {
        switch (data.type) {
            case WidgetType.Box:
                return new BoxWidget(data);
            case WidgetType.QR:
                return new QRWidget(data);
            case WidgetType.Text:
                return new TextWidget(data);
            case WidgetType.Group:
                // Use a type assertion to handle the GroupWidget type issue
                return new GroupWidget(data);
            case WidgetType.Image:
                return new ImageWidget(data);
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
    static createBoxWidget(id, x, y, width, height, zIndex) {
        const data = {
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
    static createQRWidget(id, x, y, size, zIndex, imageUrl = 'path/to/default-qr.jpg') {
        const data = {
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
    static createTextWidget(id, x, y, width, height, zIndex, text = 'I am a text box.') {
        const data = {
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
     * Creates a new Image widget with default properties.
     * @param id - The widget ID.
     * @param x - The x position.
     * @param y - The y position.
     * @param width - The width.
     * @param height - The height.
     * @param zIndex - The z-index.
     * @param imageUrl - The image URL.
     * @param imageName - The GUID-based image name.
     * @param userId - The user ID.
     * @param breakTypeId - The break type ID.
     * @returns The created widget.
     */
    static createImageWidget(id, x, y, width, height, zIndex, imageUrl = '', imageName = '', userId = '', breakTypeId = '') {
        const data = {
            id,
            position: { x, y },
            size: { width, height },
            zIndex,
            type: WidgetType.Image,
            properties: {
                imageUrl,
                imageName,
                userId,
                breakTypeId
            }
        };
        return new ImageWidget(data);
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
    static createGroupWidget(id, x, y, width, height, zIndex, childIds = []) {
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
        const data = {
            id,
            position: { x: paddedX, y: paddedY },
            size: { width: paddedWidth, height: paddedHeight },
            zIndex,
            type: WidgetType.Group,
            properties: {
                childIds: [...childIds]
            }
        };
        // Use a type assertion to handle the GroupWidget type issue
        return new GroupWidget(data);
    }
}
//# sourceMappingURL=widget-factory.js.map