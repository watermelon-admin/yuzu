// Core types and interfaces for the widget designer
/**
 * Enum for the types of widgets available in the designer.
 */
export var WidgetType;
(function (WidgetType) {
    WidgetType["Box"] = "box";
    WidgetType["QR"] = "qr";
    WidgetType["Text"] = "text";
    WidgetType["Group"] = "group";
    WidgetType["Image"] = "image";
})(WidgetType || (WidgetType = {}));
/**
 * Enum for the positions of resize handles on a widget.
 * Industry standard: 8 handles (4 corners + 4 edges)
 */
export var ResizeHandlePosition;
(function (ResizeHandlePosition) {
    // Corner handles - diagonal resize
    ResizeHandlePosition["NorthWest"] = "nw";
    ResizeHandlePosition["NorthEast"] = "ne";
    ResizeHandlePosition["SouthWest"] = "sw";
    ResizeHandlePosition["SouthEast"] = "se";
    // Edge handles - directional resize (height or width only)
    ResizeHandlePosition["North"] = "n";
    ResizeHandlePosition["South"] = "s";
    ResizeHandlePosition["East"] = "e";
    ResizeHandlePosition["West"] = "w";
})(ResizeHandlePosition || (ResizeHandlePosition = {}));
/**
 * Enum for the types of drag operations.
 */
export var DragType;
(function (DragType) {
    DragType[DragType["None"] = 0] = "None";
    DragType[DragType["Move"] = 1] = "Move";
    DragType[DragType["Resize"] = 2] = "Resize";
    DragType[DragType["Select"] = 3] = "Select";
})(DragType || (DragType = {}));
//# sourceMappingURL=types.js.map