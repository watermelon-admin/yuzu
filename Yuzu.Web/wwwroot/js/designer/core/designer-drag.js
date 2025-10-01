import { DesignerAlignment } from './designer-alignment.js';
import { DragType, ResizeHandlePosition } from '../types.js';
import { MoveWidgetsCommand, ResizeWidgetCommand } from '../commands/basic-commands.js';
import { WidgetLogger } from './designer-events.js';
// Functionality related to dragging, resizing, and mouse interactions
export class DesignerDrag extends DesignerAlignment {
    /**
     * Handles the start of a resize operation.
     * @param widgetId - The ID of the widget being resized.
     * @param handlePosition - The position of the resize handle.
     * @param event - The mouse event.
     */
    handleResizeStart(widgetId, handlePosition, event) {
        WidgetLogger.info('Resize', `Starting resize operation: widgetId=${widgetId}, handle=${handlePosition}`, {
            widgetId,
            handlePosition,
            eventType: event.type,
            eventTarget: event.target instanceof Element ? event.target.tagName : 'unknown'
        });
        const widget = this.widgets.get(widgetId);
        if (!widget) {
            WidgetLogger.error('Resize', `Widget not found for resize: ${widgetId}`);
            return;
        }
        // Capture all widget positions for debugging
        const widgetPositionsBeforeResize = new Map();
        this.widgets.forEach((w, id) => {
            const data = w.getData();
            widgetPositionsBeforeResize.set(id, {
                id,
                position: Object.assign({}, data.position),
                size: Object.assign({}, data.size)
            });
        });
        WidgetLogger.debug('Resize', 'Widget positions before resize operation', Array.from(widgetPositionsBeforeResize.values()));
        // Ensure the widget is selected
        if (!widget.isSelected()) {
            WidgetLogger.info('Resize', `Widget was not selected, selecting it now: ${widgetId}`);
            this.selectionManager.clearSelection();
            this.selectionManager.selectWidget(widgetId);
        }
        // Get starting point
        const point = this.getClientPointFromEvent(event);
        const widgetRect = widget.getRect();
        WidgetLogger.debug('Resize', `Resize start details for widget ${widgetId}`, {
            point,
            widgetRect,
            widgetType: widget.getData().type,
            handlePosition,
            widgetData: widget.getData()
        });
        // Set up drag state for resizing
        this.dragState = {
            type: DragType.Resize,
            startPoint: point,
            currentPoint: point,
            resizeHandle: handlePosition,
            affectedWidgets: [widgetId],
            originalRect: Object.assign({}, widgetRect)
        };
        WidgetLogger.debug('Resize', `Resize drag state initialized for widget ${widgetId}`, this.dragState);
        // Add global mouse move and up handlers
        document.addEventListener('mousemove', this.boundMouseMoveHandler);
        document.addEventListener('mouseup', this.boundMouseUpHandler);
        WidgetLogger.debug('Resize', `Added document event listeners for resize operation`);
    }
    /**
     * Handles mouse down events on the canvas.
     * @param e - The mouse event.
     */
    handleCanvasMouseDown(e) {
        console.log(`[Debug] handleCanvasMouseDown: clientX=${e.clientX}, clientY=${e.clientY}, button=${e.button}, shiftKey=${e.shiftKey}`);
        // Ignore mouse events in preview mode
        if (this.previewMode) {
            console.log(`[Debug] Ignoring mouse down - in preview mode`);
            return;
        }
        const point = this.getClientPointFromEvent(e);
        console.log(`[Debug] Canvas point: x=${point.x}, y=${point.y}`);
        // Try multiple approaches to find a widget at the point
        // First check for direct DOM element hit (most reliable)
        let widget = null;
        // 1. Try DOM element hit testing first (most reliable)
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        if (targetElement) {
            // Look for a widget element or its child
            let widgetElement = targetElement.closest('.widget');
            if (widgetElement) {
                const widgetId = widgetElement.getAttribute('data-id');
                if (widgetId) {
                    widget = this.widgets.get(widgetId);
                    console.log(`[Debug] DOM hit testing found widget: ${widgetId}`);
                }
            }
        }
        // 2. If DOM hit testing failed, try coordinate-based detection
        if (!widget) {
            // Try the standard point lookup
            widget = this.findWidgetAtPoint(point);
        }
        // 3. As a last resort, try an aggressive fallback with large tolerance
        if (!widget) {
            // As a fallback, try checking all widgets with direct coordinate comparison
            console.log(`[Debug] Aggressive fallback widget detection - checking all widgets directly`);
            // Sort by z-index for proper layering
            const sortedWidgets = Array.from(this.widgets.values()).sort((a, b) => b.getData().zIndex - a.getData().zIndex);
            // Use a larger tolerance for the fallback check (20px is quite aggressive)
            const tolerance = 20;
            for (const w of sortedWidgets) {
                const rect = w.getRect();
                if (point.x >= rect.x - tolerance &&
                    point.x <= rect.x + rect.width + tolerance &&
                    point.y >= rect.y - tolerance &&
                    point.y <= rect.y + rect.height + tolerance) {
                    widget = w;
                    console.log(`[Debug] Aggressive fallback detection found widget: ${w.getId()}`);
                    break;
                }
            }
        }
        console.log(`[Debug] Widget found at point: ${widget ? widget.getId() : 'none'}`);
        if (widget) {
            console.log(`[Debug] Starting widget interaction with: ${widget.getId()}, type=${widget.getData().type}`);
            // Start move operation
            const isShiftKey = e.shiftKey;
            if (!widget.isSelected() && !isShiftKey) {
                console.log(`[Debug] Widget not selected and shift not pressed - clearing selection`);
                this.selectionManager.clearSelection();
            }
            if (!widget.isSelected()) {
                console.log(`[Debug] Selecting widget: ${widget.getId()}, addToSelection=${isShiftKey}`);
                this.selectionManager.selectWidget(widget.getId(), isShiftKey);
            }
            else if (isShiftKey) {
                // If widget is already selected and shift is pressed,
                // make it the reference widget
                console.log(`[Debug] Setting reference widget: ${widget.getId()}`);
                this.selectionManager.setReferenceWidget(widget.getId());
            }
            // Store original positions of all selected widgets
            const selectedIds = this.selectionManager.getSelectedWidgetIds();
            const originalPositions = new Map();
            console.log(`[Debug] Selected widgets for move: ${selectedIds.join(', ')}`);
            selectedIds.forEach(id => {
                const w = this.widgets.get(id);
                if (w) {
                    const position = Object.assign({}, w.getData().position);
                    originalPositions.set(id, position);
                    console.log(`[Debug] Original position for ${id}: x=${position.x}, y=${position.y}`);
                }
            });
            this.dragState = {
                type: DragType.Move,
                startPoint: point,
                currentPoint: point,
                affectedWidgets: selectedIds,
                originalPositions
            };
            console.log(`[Debug] Move drag state initialized for ${selectedIds.length} widgets`);
            // Don't automatically bring widgets to front when moving them
            // this.bringSelectionToFront();
            // Add document listeners for move
            document.addEventListener('mousemove', this.boundMouseMoveHandler);
            document.addEventListener('mouseup', this.boundMouseUpHandler);
            console.log(`[Debug] Added document event listeners for move operation`);
        }
        else {
            // Start selection box
            console.log(`[Debug] Starting selection box at ${point.x},${point.y}`);
            this.selectionManager.startSelectionBox(this.canvasElement, point);
            this.dragState = {
                type: DragType.Select,
                startPoint: point,
                currentPoint: point,
                affectedWidgets: []
            };
            // Clear selection if Shift key is not pressed
            if (!e.shiftKey) {
                console.log(`[Debug] Shift not pressed - clearing selection before box select`);
                this.selectionManager.clearSelection();
            }
            else {
                console.log(`[Debug] Shift pressed - adding to selection with box select`);
            }
            // Add document listeners for selection
            document.addEventListener('mousemove', this.boundMouseMoveHandler);
            document.addEventListener('mouseup', this.boundMouseUpHandler);
            console.log(`[Debug] Added document event listeners for selection box operation`);
        }
    }
    /**
     * Handles mouse move events on the document.
     * @param e - The mouse event.
     */
    handleDocumentMouseMove(e) {
        if (!this.dragState) {
            console.warn(`[Debug] handleDocumentMouseMove called without drag state`);
            return;
        }
        const point = this.getClientPointFromEvent(e);
        this.dragState.currentPoint = point;
        const { startPoint, currentPoint, type, affectedWidgets, resizeHandle, originalPositions, originalRect } = this.dragState;
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        // Throttle logging to avoid console flood
        if (Math.abs(dx) % 10 === 0 || Math.abs(dy) % 10 === 0) {
            console.log(`[Debug] Mouse move: type=${type}, dx=${dx}, dy=${dy}`);
        }
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
                            // Throttle logging
                            if (Math.abs(dx) % 20 === 0 || Math.abs(dy) % 20 === 0) {
                                console.log(`[Debug] Moving widget ${widgetId} to x=${newPosition.x}, y=${newPosition.y}`);
                            }
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
                        // Throttle logging
                        if (Math.abs(dx) % 20 === 0 || Math.abs(dy) % 20 === 0) {
                            console.log(`[Debug] Resizing widget ${widgetId} with handle ${resizeHandle}:`, {
                                newPosition: { x: newRect.x, y: newRect.y },
                                newSize: { width: newRect.width, height: newRect.height },
                                delta: { dx, dy }
                            });
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
                // Throttle logging
                if (Math.abs(dx) % 20 === 0 || Math.abs(dy) % 20 === 0) {
                    console.log(`[Debug] Updating selection box: start=(${startPoint.x},${startPoint.y}), current=(${currentPoint.x},${currentPoint.y})`);
                }
                break;
        }
    }
    /**
     * Handles mouse up events on the document.
     * @param e - The mouse event.
     */
    handleDocumentMouseUp(e) {
        WidgetLogger.info('MouseUp', `Mouse up: clientX=${e.clientX}, clientY=${e.clientY}, button=${e.button}`, {
            target: e.target instanceof Element ? e.target.tagName : 'unknown',
            eventType: e.type
        });
        if (!this.dragState) {
            WidgetLogger.warn('MouseUp', `Mouse up without drag state - missing dragState`);
            return;
        }
        const { type, startPoint, currentPoint, affectedWidgets, resizeHandle } = this.dragState;
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        WidgetLogger.info('MouseUp', `Finalizing drag operation: type=${type}, dx=${dx}, dy=${dy}`, {
            dragType: type,
            deltaX: dx,
            deltaY: dy,
            startPoint,
            currentPoint
        });
        // Capture all widget positions for monitoring unexpected position changes
        const allWidgetPositionsBeforeCommand = new Map();
        this.widgets.forEach((w, id) => {
            const data = w.getData();
            allWidgetPositionsBeforeCommand.set(id, {
                id,
                position: Object.assign({}, data.position),
                size: Object.assign({}, data.size)
            });
        });
        WidgetLogger.debug('MouseUp', 'All widget positions before command execution', Array.from(allWidgetPositionsBeforeCommand.values()));
        switch (type) {
            case DragType.Move:
                // Finalize move operation with a command
                // Always create a move command regardless of the distance moved
                if (this.dragState.originalPositions) {
                    WidgetLogger.info('Move', `Creating move command for ${affectedWidgets.length} widgets`, {
                        affectedWidgets
                    });
                    const oldPositions = affectedWidgets.map(id => {
                        var _a;
                        const originalPos = (_a = this.dragState.originalPositions) === null || _a === void 0 ? void 0 : _a.get(id);
                        if (!originalPos) {
                            WidgetLogger.error('Move', `Missing original position for widget ${id}`);
                            return { id, x: 0, y: 0 };
                        }
                        return { id, x: originalPos.x, y: originalPos.y };
                    });
                    const newPositions = affectedWidgets.map(id => {
                        const widget = this.widgets.get(id);
                        if (!widget) {
                            WidgetLogger.error('Move', `Widget not found for ${id}`);
                            return { id, x: 0, y: 0 };
                        }
                        const pos = widget.getData().position;
                        return { id, x: pos.x, y: pos.y };
                    });
                    WidgetLogger.debug('Move', `Move command details`, {
                        widgets: affectedWidgets,
                        oldPositions,
                        newPositions,
                        deltaX: dx,
                        deltaY: dy
                    });
                    const command = new MoveWidgetsCommand(this, affectedWidgets, oldPositions, newPositions);
                    WidgetLogger.info('Move', `Executing move command`);
                    this.commandManager.execute(command);
                    WidgetLogger.info('Move', `Move command executed successfully`);
                    // Verify widget positions after command execution
                    setTimeout(() => {
                        const widgetPositionsAfterCommand = new Map();
                        this.widgets.forEach((w, id) => {
                            widgetPositionsAfterCommand.set(id, {
                                id,
                                position: Object.assign({}, w.getData().position)
                            });
                        });
                        // Check if any non-affected widgets had their positions changed unexpectedly
                        const unexpectedChanges = [];
                        this.widgets.forEach((w, id) => {
                            if (!affectedWidgets.includes(id)) {
                                const before = allWidgetPositionsBeforeCommand.get(id);
                                const after = widgetPositionsAfterCommand.get(id);
                                if (before && after && (before.position.x !== after.position.x ||
                                    before.position.y !== after.position.y)) {
                                    unexpectedChanges.push({
                                        id,
                                        before: before.position,
                                        after: after.position
                                    });
                                }
                            }
                        });
                        if (unexpectedChanges.length > 0) {
                            WidgetLogger.error('Move', `Unexpected position changes detected for non-affected widgets`, unexpectedChanges);
                        }
                    }, 0);
                }
                else {
                    WidgetLogger.warn('Move', `Move command not created - missing originalPositions`, { dx, dy });
                }
                break;
            case DragType.Resize:
                // Finalize resize operation with a command
                if (affectedWidgets.length === 1 && resizeHandle && this.dragState.originalRect) {
                    const widgetId = affectedWidgets[0];
                    const widget = this.widgets.get(widgetId);
                    WidgetLogger.info('Resize', `Finalizing resize for widget ${widgetId}`);
                    if (widget) {
                        const newData = widget.getData();
                        const originalRect = this.dragState.originalRect;
                        WidgetLogger.debug('Resize', `Resize command details`, {
                            widgetId,
                            originalPosition: { x: originalRect.x, y: originalRect.y },
                            originalSize: { width: originalRect.width, height: originalRect.height },
                            newPosition: newData.position,
                            newSize: newData.size,
                            handle: resizeHandle,
                            deltaX: dx,
                            deltaY: dy
                        });
                        const command = new ResizeWidgetCommand(this, widgetId, { x: originalRect.x, y: originalRect.y }, { width: originalRect.width, height: originalRect.height }, newData.position, newData.size);
                        WidgetLogger.info('Resize', `Executing resize command`);
                        this.commandManager.execute(command);
                        WidgetLogger.info('Resize', `Resize command executed successfully`);
                        // Verify widget positions after resize command
                        setTimeout(() => {
                            const widgetPositionsAfterCommand = new Map();
                            this.widgets.forEach((w, id) => {
                                const data = w.getData();
                                widgetPositionsAfterCommand.set(id, {
                                    id,
                                    position: Object.assign({}, data.position),
                                    size: Object.assign({}, data.size)
                                });
                            });
                            // Check if any non-affected widgets had their positions changed unexpectedly
                            const unexpectedChanges = [];
                            this.widgets.forEach((w, id) => {
                                if (id !== widgetId) { // Only check non-resized widgets
                                    const before = allWidgetPositionsBeforeCommand.get(id);
                                    const after = widgetPositionsAfterCommand.get(id);
                                    if (before && after && (before.position.x !== after.position.x ||
                                        before.position.y !== after.position.y ||
                                        before.size.width !== after.size.width ||
                                        before.size.height !== after.size.height)) {
                                        unexpectedChanges.push({
                                            id,
                                            beforePos: before.position,
                                            afterPos: after.position,
                                            beforeSize: before.size,
                                            afterSize: after.size
                                        });
                                    }
                                }
                            });
                            if (unexpectedChanges.length > 0) {
                                WidgetLogger.error('Resize', `Unexpected changes detected for non-resized widgets`, unexpectedChanges);
                            }
                        }, 0);
                    }
                    else {
                        WidgetLogger.error('Resize', `Widget not found for resize completion: ${widgetId}`);
                    }
                }
                else {
                    WidgetLogger.warn('Resize', `Invalid resize state, not creating command`, {
                        affectedWidgetCount: affectedWidgets.length,
                        hasHandle: !!resizeHandle,
                        hasRect: !!this.dragState.originalRect
                    });
                }
                break;
            case DragType.Select:
                // Finalize selection box operation
                WidgetLogger.info('Select', `Finalizing selection box`);
                const selectionRect = this.selectionManager.endSelectionBox();
                WidgetLogger.debug('Select', `Selection rect`, selectionRect);
                if (selectionRect) {
                    // Check if the selection is a small click rather than a drag
                    if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5) {
                        // This is a small click rather than a drag - deselect current selection if not holding shift
                        if (!e.shiftKey) {
                            WidgetLogger.info('Select', `Small selection click without shift - clearing selection`);
                            this.selectionManager.clearSelection();
                        }
                    }
                    else {
                        // Normal selection box operation
                        WidgetLogger.info('Select', `Selecting widgets in rect`, {
                            rect: selectionRect,
                            addToSelection: e.shiftKey
                        });
                        // Store selected widgets before for comparison
                        const selectedBefore = this.selectionManager.getSelectedWidgetIds();
                        this.selectionManager.selectWidgetsInRect(selectionRect, this.widgets, e.shiftKey);
                        // Log selection change
                        const selectedAfter = this.selectionManager.getSelectedWidgetIds();
                        WidgetLogger.debug('Select', `Selection changed from ${selectedBefore.length} to ${selectedAfter.length} widgets`, {
                            before: selectedBefore,
                            after: selectedAfter
                        });
                    }
                }
                else {
                    WidgetLogger.warn('Select', `No selection rect available`);
                }
                break;
        }
        // Clean up event listeners
        WidgetLogger.debug('MouseUp', `Removing document event listeners`);
        document.removeEventListener('mousemove', this.boundMouseMoveHandler);
        document.removeEventListener('mouseup', this.boundMouseUpHandler);
        WidgetLogger.debug('MouseUp', `Clearing drag state`);
        this.dragState = null;
    }
}
//# sourceMappingURL=designer-drag.js.map