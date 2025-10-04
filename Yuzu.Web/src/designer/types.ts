// Core types and interfaces for the widget designer

/**
 * Represents a point in 2D space.
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Represents the size of a widget.
 */
export interface Size {
    width: number;
    height: number;
}

/**
 * Represents a rectangle in 2D space.
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Represents the data associated with a widget.
 */
export interface WidgetData {
    id: string; // Unique identifier for the widget
    position: Point; // Position of the widget
    size: Size; // Size of the widget
    zIndex: number; // Z-index for layering widgets
    content?: string; // Optional content of the widget
    type: string; // Type of the widget
    properties?: Record<string, any>; // Optional additional properties
}

/**
 * Enum for the types of widgets available in the designer.
 */
export enum WidgetType {
    Box = 'box',
    QR = 'qr',
    Text = 'text',
    Group = 'group',
    Image = 'image'
}

/**
 * Properties specific to Box widgets.
 */
export interface BoxWidgetProperties {
    backgroundColor: string;
    borderRadius: number;
}

/**
 * Properties specific to QR widgets.
 */
export interface QRWidgetProperties {
    imageUrl: string;
}

/**
 * Properties specific to Text widgets.
 */
export interface TextWidgetProperties {
    text: string;
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    textAlign: string;
    hasPlaceholders?: boolean;      // Indicates if text contains placeholders
    showRawPlaceholders?: boolean;  // Whether to show raw placeholders (edit mode) or replaced values
    placeholderError?: string;      // Error message if any placeholder has syntax errors
}

/**
 * Properties specific to Group widgets.
 */
export interface GroupWidgetProperties {
    childIds: string[]; // IDs of widgets contained in this group
}

/**
 * Properties specific to Image widgets.
 */
export interface ImageWidgetProperties {
    imageUrl: string;           // URL to the image
    imageName: string;          // GUID-based name of the image
    userId: string;             // Owner user ID
    breakTypeId: string;        // Associated break type ID
    thumbnailUrl?: string;      // Optional thumbnail URL
    originalFileName?: string;  // Optional original filename
}

/**
 * Enum for the positions of resize handles on a widget.
 */
export enum ResizeHandlePosition {
    NorthWest = 'nw',
    NorthEast = 'ne',
    SouthWest = 'sw',
    SouthEast = 'se'
}

/**
 * Enum for the types of drag operations.
 */
export enum DragType {
    None,
    Move,
    Resize,
    Select
}

/**
 * Represents the state of a drag operation.
 */
export interface DragState {
    type: DragType; // Type of the drag operation
    startPoint: Point; // Starting point of the drag
    currentPoint: Point; // Current point of the drag
    pointerId?: number; // ID of the pointer (for tracking specific pointer in multi-pointer scenarios)
    resizeHandle?: ResizeHandlePosition; // Optional position of the resize handle
    affectedWidgets: string[]; // IDs of the widgets affected by the drag
    selectionBox?: Rect; // Optional selection box for selecting multiple widgets
    originalPositions?: Map<string, Point>; // Optional original positions of the widgets
    originalSize?: Size; // Optional original size of the widget
    originalRect?: Rect; // Optional original rectangle of the widget
}
