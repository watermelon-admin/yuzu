export class SelectionManager {
    /**
     * Constructor for the SelectionManager class.
     * @param onSelectionChange - Callback function to be called when the selection changes.
     */
    constructor(onSelectionChange = () => { }) {
        this.selectedWidgets = new Set();
        this.selectionBox = null;
        console.log('[Debug] SelectionManager initialized');
        this.onSelectionChange = onSelectionChange;
    }
    /**
     * Selects a widget by its ID.
     * @param widgetId - The ID of the widget to select.
     * @param addToSelection - Whether to add the widget to the current selection or replace the selection.
     */
    selectWidget(widgetId, addToSelection = false) {
        console.log(`[Debug] selectWidget called: widgetId=${widgetId}, addToSelection=${addToSelection}`);
        console.log(`[Debug] Current selection before: ${Array.from(this.selectedWidgets).join(', ') || 'none'}`);
        if (!addToSelection) {
            console.log('[Debug] Replacing current selection - clearing first');
            this.clearSelection();
        }
        else if (this.isWidgetSelected(widgetId)) {
            // If widget is already selected and we're adding to selection,
            // make this the reference widget instead
            console.log(`[Debug] Widget ${widgetId} already selected - setting as reference widget`);
            this.setReferenceWidget(widgetId);
            return;
        }
        // If it's a new selection or the first widget in a multi-select,
        // add it to the beginning of the selection
        if (!this.hasSelection()) {
            console.log(`[Debug] No current selection - adding widget ${widgetId} as first selection`);
            this.selectedWidgets.add(widgetId);
        }
        else {
            // If we already have selection and we're adding,
            // add it to the existing selection (not as reference)
            console.log(`[Debug] Adding widget ${widgetId} to existing selection`);
            this.selectedWidgets.add(widgetId);
        }
        console.log(`[Debug] Selection after change: ${Array.from(this.selectedWidgets).join(', ')}`);
        this.notifySelectionChange();
    }
    /**
     * Deselects a widget by its ID.
     * @param widgetId - The ID of the widget to deselect.
     */
    deselectWidget(widgetId) {
        console.log(`[Debug] deselectWidget called: widgetId=${widgetId}`);
        console.log(`[Debug] Current selection before: ${Array.from(this.selectedWidgets).join(', ') || 'none'}`);
        const wasSelected = this.selectedWidgets.delete(widgetId);
        if (wasSelected) {
            console.log(`[Debug] Widget ${widgetId} was removed from selection`);
            console.log(`[Debug] Selection after change: ${Array.from(this.selectedWidgets).join(', ') || 'none'}`);
            this.notifySelectionChange();
        }
        else {
            console.log(`[Debug] Widget ${widgetId} was not in selection, nothing changed`);
        }
    }
    /**
     * Toggles the selection state of a widget by its ID.
     * @param widgetId - The ID of the widget to toggle.
     */
    toggleWidgetSelection(widgetId) {
        console.log(`[Debug] toggleWidgetSelection called: widgetId=${widgetId}`);
        if (this.isWidgetSelected(widgetId)) {
            console.log(`[Debug] Widget ${widgetId} is currently selected - deselecting it`);
            this.deselectWidget(widgetId);
        }
        else {
            console.log(`[Debug] Widget ${widgetId} is currently not selected - selecting it (adding to selection)`);
            this.selectWidget(widgetId, true);
        }
    }
    /**
     * Checks if a widget is selected.
     * @param widgetId - The ID of the widget to check.
     * @returns True if the widget is selected, false otherwise.
     */
    isWidgetSelected(widgetId) {
        const isSelected = this.selectedWidgets.has(widgetId);
        console.log(`[Debug] isWidgetSelected check: widgetId=${widgetId}, result=${isSelected}`);
        return isSelected;
    }
    /**
     * Clears the current selection.
     */
    clearSelection() {
        console.log(`[Debug] clearSelection called. Current selection: ${Array.from(this.selectedWidgets).join(', ') || 'none'}`);
        if (this.selectedWidgets.size > 0) {
            console.log(`[Debug] Clearing selection of ${this.selectedWidgets.size} widgets`);
            this.selectedWidgets.clear();
            this.notifySelectionChange();
        }
        else {
            console.log(`[Debug] Selection already empty, nothing to clear`);
        }
    }
    /**
     * Gets the IDs of the selected widgets.
     * @returns An array of selected widget IDs.
     */
    getSelectedWidgetIds() {
        const selectedIds = Array.from(this.selectedWidgets);
        console.log(`[Debug] getSelectedWidgetIds: returning ${selectedIds.length} widget IDs`);
        return selectedIds;
    }
    /**
     * Checks if there is any selection.
     * @returns True if there is a selection, false otherwise.
     */
    hasSelection() {
        const hasSelection = this.selectedWidgets.size > 0;
        console.log(`[Debug] hasSelection: ${hasSelection}, count=${this.selectedWidgets.size}`);
        return hasSelection;
    }
    /**
     * Gets the ID of the reference widget (the first selected widget).
     * @returns The ID of the reference widget or null if no widget is selected.
     */
    getReferenceWidgetId() {
        const selectedIds = this.getSelectedWidgetIds();
        const referenceId = selectedIds.length > 0 ? selectedIds[0] : null;
        console.log(`[Debug] getReferenceWidgetId: ${referenceId || 'none'}`);
        return referenceId;
    }
    /**
     * Sets a widget as the reference widget.
     * @param widgetId - The ID of the widget to set as the reference.
     */
    setReferenceWidget(widgetId) {
        console.log(`[Debug] setReferenceWidget called: widgetId=${widgetId}`);
        if (!this.isWidgetSelected(widgetId)) {
            // Can't set a non-selected widget as reference
            console.warn(`[Debug] Widget ${widgetId} is not selected, cannot set as reference`);
            return;
        }
        console.log(`[Debug] Current selection order before change: ${Array.from(this.selectedWidgets).join(', ')}`);
        // Remove the widget from its current position and add it back at the beginning
        this.deselectWidget(widgetId);
        // Create a new set with the reference widget first
        const newSet = new Set([widgetId]);
        console.log(`[Debug] Created new set with reference widget ${widgetId} first`);
        // Add the remaining widgets
        let count = 0;
        this.selectedWidgets.forEach(id => {
            newSet.add(id);
            count++;
        });
        console.log(`[Debug] Added ${count} additional widgets to the selection`);
        this.selectedWidgets = newSet;
        console.log(`[Debug] New selection order: ${Array.from(this.selectedWidgets).join(', ')}`);
        this.notifySelectionChange();
    }
    /**
     * Starts a selection box for selecting multiple widgets.
     * @param canvasElement - The canvas element where the selection box will be drawn.
     * @param startPoint - The starting point of the selection box.
     */
    startSelectionBox(canvasElement, startPoint) {
        console.log(`[Debug] startSelectionBox called: startPoint=(${startPoint.x}, ${startPoint.y})`);
        if (this.selectionBox) {
            console.warn('[Debug] Selection box already exists, cleaning up first');
            if (this.selectionBox.parentElement) {
                this.selectionBox.parentElement.removeChild(this.selectionBox);
            }
        }
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.left = `${startPoint.x}px`;
        this.selectionBox.style.top = `${startPoint.y}px`;
        this.selectionBox.style.width = '0';
        this.selectionBox.style.height = '0';
        canvasElement.appendChild(this.selectionBox);
        console.log('[Debug] Selection box created and added to canvas');
    }
    /**
     * Updates the selection box as the mouse moves.
     * @param currentPoint - The current point of the mouse.
     * @param startPoint - The starting point of the selection box.
     */
    updateSelectionBox(currentPoint, startPoint) {
        if (!this.selectionBox) {
            console.warn('[Debug] updateSelectionBox called, but no selection box exists');
            return;
        }
        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
        // Only log occasionally to avoid console flood
        if (width % 10 === 0 || height % 10 === 0) {
            console.log(`[Debug] Selection box updated: left=${left}, top=${top}, width=${width}, height=${height}`);
        }
    }
    /**
     * Ends the selection box and returns its rectangle.
     * @returns The rectangle of the selection box or null if no selection box was active.
     */
    endSelectionBox() {
        console.log('[Debug] endSelectionBox called');
        if (!this.selectionBox) {
            console.warn('[Debug] No selection box to end');
            return null;
        }
        if (!this.selectionBox.parentElement) {
            console.warn('[Debug] Selection box has no parent element');
            this.selectionBox = null;
            return null;
        }
        const rect = {
            x: parseInt(this.selectionBox.style.left),
            y: parseInt(this.selectionBox.style.top),
            width: parseInt(this.selectionBox.style.width),
            height: parseInt(this.selectionBox.style.height)
        };
        console.log(`[Debug] Selection box final dimensions: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);
        console.log('[Debug] Removing selection box from DOM');
        this.selectionBox.parentElement.removeChild(this.selectionBox);
        this.selectionBox = null;
        return rect;
    }
    /**
     * Selects widgets that intersect with the given rectangle.
     * @param rect - The rectangle to check for intersections.
     * @param widgets - The map of widgets to check.
     * @param addToSelection - Whether to add the widgets to the current selection or replace the selection.
     */
    selectWidgetsInRect(rect, widgets, addToSelection = false) {
        console.log(`[Debug] selectWidgetsInRect called: rect=(${rect.x},${rect.y},${rect.width},${rect.height}), addToSelection=${addToSelection}`);
        console.log(`[Debug] Total widgets to check: ${widgets.size}`);
        // Clear previous selection if not adding to it
        if (!addToSelection) {
            console.log('[Debug] Replacing selection - clearing previous selection');
            this.clearSelection();
        }
        else {
            console.log('[Debug] Adding to existing selection');
        }
        // First, collect all widgets that intersect with the selection rectangle
        const selectedIds = [];
        console.log('[Debug] Checking widgets for intersection with selection rectangle');
        widgets.forEach((widget, id) => {
            const widgetRect = widget.getRect();
            const intersects = this.rectsIntersect(rect, widgetRect);
            console.log(`[Debug] Widget ${id} at (${widgetRect.x},${widgetRect.y},${widgetRect.width},${widgetRect.height}) intersects: ${intersects}`);
            // Check if widget intersects with selection rect
            if (intersects) {
                selectedIds.push(id);
            }
        });
        console.log(`[Debug] Found ${selectedIds.length} widgets intersecting with selection rectangle: ${selectedIds.join(', ') || 'none'}`);
        // If no widgets were selected, do nothing
        if (selectedIds.length === 0) {
            console.log('[Debug] No widgets to select, returning');
            return;
        }
        // If we're adding to selection and there's already a reference widget, keep it
        const hasExistingReference = this.hasSelection() && addToSelection;
        if (hasExistingReference) {
            console.log('[Debug] Adding to existing selection with reference widget');
            // Add the new widgets to the existing selection
            let addedCount = 0;
            selectedIds.forEach(id => {
                if (!this.isWidgetSelected(id)) {
                    this.selectedWidgets.add(id);
                    addedCount++;
                }
            });
            console.log(`[Debug] Added ${addedCount} new widgets to selection`);
        }
        else {
            console.log('[Debug] Creating new selection');
            // No existing reference or we're starting a new selection
            // Make the first selected widget the reference by adding it first
            const firstId = selectedIds[0];
            console.log(`[Debug] Setting ${firstId} as reference widget`);
            this.selectedWidgets.add(firstId);
            // Then add the rest
            for (let i = 1; i < selectedIds.length; i++) {
                console.log(`[Debug] Adding ${selectedIds[i]} to selection`);
                this.selectedWidgets.add(selectedIds[i]);
            }
        }
        console.log(`[Debug] Final selection after rect select: ${Array.from(this.selectedWidgets).join(', ')}`);
        this.notifySelectionChange();
    }
    /**
     * Checks if two rectangles intersect.
     * @param rect1 - The first rectangle.
     * @param rect2 - The second rectangle.
     * @returns True if the rectangles intersect, false otherwise.
     */
    rectsIntersect(rect1, rect2) {
        const intersects = !(rect1.x > rect2.x + rect2.width ||
            rect1.x + rect1.width < rect2.x ||
            rect1.y > rect2.y + rect2.height ||
            rect1.y + rect1.height < rect2.y);
        return intersects;
    }
    /**
     * Notifies the selection change callback with the current selection.
     */
    notifySelectionChange() {
        console.log('[Debug] Notifying selection change with selected IDs:', this.getSelectedWidgetIds());
        // Dispatch a custom event that any part of the application can listen for
        const event = new CustomEvent('selection-change', {
            detail: {
                selectedIds: this.getSelectedWidgetIds()
            },
            bubbles: true
        });
        document.dispatchEvent(event);
        // Call the callback provided to the constructor
        this.onSelectionChange(this.getSelectedWidgetIds());
    }
}
//# sourceMappingURL=selection-manager.js.map