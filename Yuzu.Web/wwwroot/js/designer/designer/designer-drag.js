import { DesignerAlignment } from './designer-alignment.js';
import { DragType, ResizeHandlePosition } from '../types.js';
import { MoveWidgetsCommand, ResizeWidgetCommand } from '../commands/basic-commands.js';
// Functionality related to dragging, resizing, and mouse interactions
export class DesignerDrag extends DesignerAlignment {
    /**
     * Handles the start of a resize operation.
     * @param widgetId - The ID of the widget being resized.
     * @param handlePosition - The position of the resize handle.
     * @param event - The mouse event.
     */
    handleResizeStart(widgetId, handlePosition, event) {
        const widget = this.widgets.get(widgetId);
        if (!widget)
            return;
        // Ensure the widget is selected
        if (!widget.isSelected()) {
            this.selectionManager.clearSelection();
            this.selectionManager.selectWidget(widgetId);
        }
        // Get starting point
        const point = this.getClientPointFromEvent(event);
        const widgetRect = widget.getRect();
        // Set up drag state for resizing
        this.dragState = {
            type: DragType.Resize,
            startPoint: point,
            currentPoint: point,
            resizeHandle: handlePosition,
            affectedWidgets: [widgetId],
            originalRect: Object.assign({}, widgetRect)
        };
        // Add global mouse move and up handlers
        document.addEventListener('mousemove', this.boundMouseMoveHandler);
        document.addEventListener('mouseup', this.boundMouseUpHandler);
    }
    /**
     * Handles mouse down events on the canvas.
     * @param e - The mouse event.
     */
    handleCanvasMouseDown(e) {
        const point = this.getClientPointFromEvent(e);
        // Check for regular widget selection/movement
        const widget = this.findWidgetAtPoint(point);
        if (widget) {
            // Start move operation
            const isShiftKey = e.shiftKey;
            if (!widget.isSelected() && !isShiftKey) {
                this.selectionManager.clearSelection();
            }
            if (!widget.isSelected()) {
                this.selectionManager.selectWidget(widget.getId(), isShiftKey);
            }
            else if (isShiftKey) {
                // If widget is already selected and shift is pressed,
                // make it the reference widget
                this.selectionManager.setReferenceWidget(widget.getId());
            }
            // Store original positions of all selected widgets
            const selectedIds = this.selectionManager.getSelectedWidgetIds();
            const originalPositions = new Map();
            selectedIds.forEach(id => {
                const w = this.widgets.get(id);
                if (w) {
                    originalPositions.set(id, Object.assign({}, w.getData().position));
                }
            });
            this.dragState = {
                type: DragType.Move,
                startPoint: point,
                currentPoint: point,
                affectedWidgets: selectedIds,
                originalPositions
            };
            // Bring widgets to front when starting to move them
            this.bringSelectionToFront();
            // Add document listeners for move
            document.addEventListener('mousemove', this.boundMouseMoveHandler);
            document.addEventListener('mouseup', this.boundMouseUpHandler);
        }
        else {
            // Start selection box
            this.selectionManager.startSelectionBox(this.canvasElement, point);
            this.dragState = {
                type: DragType.Select,
                startPoint: point,
                currentPoint: point,
                affectedWidgets: []
            };
            // Clear selection if Shift key is not pressed
            if (!e.shiftKey) {
                this.selectionManager.clearSelection();
            }
            // Add document listeners for selection
            document.addEventListener('mousemove', this.boundMouseMoveHandler);
            document.addEventListener('mouseup', this.boundMouseUpHandler);
        }
    }
    /**
     * Handles mouse move events on the document.
     * @param e - The mouse event.
     */
    handleDocumentMouseMove(e) {
        if (!this.dragState)
            return;
        const point = this.getClientPointFromEvent(e);
        this.dragState.currentPoint = point;
        const { startPoint, currentPoint, type, affectedWidgets, resizeHandle, originalPositions, originalRect } = this.dragState;
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        switch (type) {
            case DragType.Move:
                // Use original positions to calculate new positions
                if (originalPositions) {
                    for (const widgetId of affectedWidgets) {
                        const widget = this.widgets.get(widgetId);
                        const originalPos = originalPositions.get(widgetId);
                        if (widget && originalPos) {
                            const newPosition = {
                                x: originalPos.x + dx,
                                y: originalPos.y + dy
                            };
                            widget.setPosition(newPosition);
                        }
                    }
                }
                break;
            case DragType.Resize:
                // Handle widget resizing during drag using original rect
                if (affectedWidgets.length === 1 && resizeHandle && originalRect) {
                    const widgetId = affectedWidgets[0];
                    const widget = this.widgets.get(widgetId);
                    if (widget) {
                        let newRect = Object.assign({}, originalRect);
                        // Adjust dimensions based on resize handle
                        switch (resizeHandle) {
                            case ResizeHandlePosition.NorthWest:
                                newRect.x = originalRect.x + dx;
                                newRect.y = originalRect.y + dy;
                                newRect.width = originalRect.width - dx;
                                newRect.height = originalRect.height - dy;
                                break;
                            case ResizeHandlePosition.NorthEast:
                                newRect.y = originalRect.y + dy;
                                newRect.width = originalRect.width + dx;
                                newRect.height = originalRect.height - dy;
                                break;
                            case ResizeHandlePosition.SouthWest:
                                newRect.x = originalRect.x + dx;
                                newRect.width = originalRect.width - dx;
                                newRect.height = originalRect.height + dy;
                                break;
                            case ResizeHandlePosition.SouthEast:
                                newRect.width = originalRect.width + dx;
                                newRect.height = originalRect.height + dy;
                                break;
                        }
                        // Apply changes
                        widget.setPosition({ x: newRect.x, y: newRect.y });
                        widget.setSize({ width: newRect.width, height: newRect.height });
                    }
                }
                break;
            case DragType.Select:
                // Update selection box
                this.selectionManager.updateSelectionBox(currentPoint, startPoint);
                break;
        }
    }
    /**
     * Handles mouse up events on the document.
     * @param e - The mouse event.
     */
    handleDocumentMouseUp(e) {
        if (!this.dragState)
            return;
        const { type, startPoint, currentPoint, affectedWidgets, resizeHandle } = this.dragState;
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        switch (type) {
            case DragType.Move:
                // Finalize move operation with a command
                if ((Math.abs(dx) > 2 || Math.abs(dy) > 2) && this.dragState.originalPositions) {
                    const oldPositions = affectedWidgets.map(id => {
                        var _a;
                        const originalPos = (_a = this.dragState.originalPositions) === null || _a === void 0 ? void 0 : _a.get(id);
                        if (!originalPos)
                            return { id, x: 0, y: 0 };
                        return { id, x: originalPos.x, y: originalPos.y };
                    });
                    const newPositions = affectedWidgets.map(id => {
                        const widget = this.widgets.get(id);
                        if (!widget)
                            return { id, x: 0, y: 0 };
                        const pos = widget.getData().position;
                        return { id, x: pos.x, y: pos.y };
                    });
                    const command = new MoveWidgetsCommand(this, affectedWidgets, oldPositions, newPositions);
                    this.commandManager.execute(command);
                }
                break;
            case DragType.Resize:
                // Finalize resize operation with a command
                if (affectedWidgets.length === 1 && resizeHandle && this.dragState.originalRect) {
                    const widgetId = affectedWidgets[0];
                    const widget = this.widgets.get(widgetId);
                    if (widget) {
                        const newData = widget.getData();
                        const originalRect = this.dragState.originalRect;
                        const command = new ResizeWidgetCommand(this, widgetId, { x: originalRect.x, y: originalRect.y }, { width: originalRect.width, height: originalRect.height }, newData.position, newData.size);
                        this.commandManager.execute(command);
                    }
                }
                break;
            case DragType.Select:
                // Finalize selection box operation
                const selectionRect = this.selectionManager.endSelectionBox();
                if (selectionRect && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    this.selectionManager.selectWidgetsInRect(selectionRect, this.widgets, e.shiftKey);
                }
                break;
        }
        // Clean up event listeners
        document.removeEventListener('mousemove', this.boundMouseMoveHandler);
        document.removeEventListener('mouseup', this.boundMouseUpHandler);
        this.dragState = null;
    }
}
//# sourceMappingURL=designer-drag.js.map