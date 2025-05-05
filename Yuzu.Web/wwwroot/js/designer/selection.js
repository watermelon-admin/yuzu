export class SelectionManager {
    constructor(onSelectionChange = () => { }) {
        this.selectedWidgets = new Set();
        this.selectionBox = null;
        this.onSelectionChange = onSelectionChange;
    }
    selectWidget(widgetId, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }
        else if (this.isWidgetSelected(widgetId)) {
            // If widget is already selected and we're adding to selection,
            // make this the reference widget instead
            this.setReferenceWidget(widgetId);
            return;
        }
        // If it's a new selection or the first widget in a multi-select,
        // add it to the beginning of the selection
        if (!this.hasSelection()) {
            this.selectedWidgets.add(widgetId);
        }
        else {
            // If we already have selection and we're adding,
            // add it to the existing selection (not as reference)
            this.selectedWidgets.add(widgetId);
        }
        this.notifySelectionChange();
    }
    deselectWidget(widgetId) {
        this.selectedWidgets.delete(widgetId);
        this.notifySelectionChange();
    }
    toggleWidgetSelection(widgetId) {
        if (this.isWidgetSelected(widgetId)) {
            this.deselectWidget(widgetId);
        }
        else {
            this.selectWidget(widgetId, true);
        }
    }
    isWidgetSelected(widgetId) {
        return this.selectedWidgets.has(widgetId);
    }
    clearSelection() {
        if (this.selectedWidgets.size > 0) {
            this.selectedWidgets.clear();
            this.notifySelectionChange();
        }
    }
    getSelectedWidgetIds() {
        return Array.from(this.selectedWidgets);
    }
    hasSelection() {
        return this.selectedWidgets.size > 0;
    }
    getReferenceWidgetId() {
        const selectedIds = this.getSelectedWidgetIds();
        return selectedIds.length > 0 ? selectedIds[0] : null;
    }
    setReferenceWidget(widgetId) {
        if (!this.isWidgetSelected(widgetId)) {
            // Can't set a non-selected widget as reference
            return;
        }
        // Remove the widget from its current position and add it back at the beginning
        this.deselectWidget(widgetId);
        // Create a new set with the reference widget first
        const newSet = new Set([widgetId]);
        // Add the remaining widgets
        this.selectedWidgets.forEach(id => {
            newSet.add(id);
        });
        this.selectedWidgets = newSet;
        this.notifySelectionChange();
    }
    startSelectionBox(canvasElement, startPoint) {
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.left = `${startPoint.x}px`;
        this.selectionBox.style.top = `${startPoint.y}px`;
        this.selectionBox.style.width = '0';
        this.selectionBox.style.height = '0';
        canvasElement.appendChild(this.selectionBox);
    }
    updateSelectionBox(currentPoint, startPoint) {
        if (!this.selectionBox)
            return;
        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }
    endSelectionBox() {
        if (!this.selectionBox || !this.selectionBox.parentElement)
            return null;
        const rect = {
            x: parseInt(this.selectionBox.style.left),
            y: parseInt(this.selectionBox.style.top),
            width: parseInt(this.selectionBox.style.width),
            height: parseInt(this.selectionBox.style.height)
        };
        this.selectionBox.parentElement.removeChild(this.selectionBox);
        this.selectionBox = null;
        return rect;
    }
    selectWidgetsInRect(rect, widgets, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }
        widgets.forEach((widget, id) => {
            const widgetRect = widget.getRect();
            // Check if widget intersects with selection rect
            if (this.rectsIntersect(rect, widgetRect)) {
                this.selectedWidgets.add(id);
            }
        });
        this.notifySelectionChange();
    }
    rectsIntersect(rect1, rect2) {
        return !(rect1.x > rect2.x + rect2.width ||
            rect1.x + rect1.width < rect2.x ||
            rect1.y > rect2.y + rect2.height ||
            rect1.y + rect1.height < rect2.y);
    }
    notifySelectionChange() {
        this.onSelectionChange(this.getSelectedWidgetIds());
    }
}
//# sourceMappingURL=selection.js.map