import { Designer } from './designer-core.js';
import { CreateWidgetCommand, DeleteWidgetsCommand } from '../commands/basic-commands.js';
// Functionality related to selection and clipboard operations
export class DesignerSelection extends Designer {
    // Selection methods
    /**
     * Selects all widgets in the designer.
     */
    selectAll() {
        this.selectionManager.clearSelection();
        this.widgets.forEach((_, id) => {
            this.selectionManager.selectWidget(id, true);
        });
    }
    /**
     * Deselects all widgets in the designer.
     */
    deselectAll() {
        this.selectionManager.clearSelection();
    }
    /**
     * Brings all selected widgets to the front by increasing their z-index.
     */
    bringSelectionToFront() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        selectedIds.forEach(id => this.bringToFront(id));
    }
    /**
     * Deletes all selected widgets from the designer.
     */
    deleteSelectedWidgets() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length > 0) {
            const command = new DeleteWidgetsCommand(this, selectedIds);
            this.commandManager.execute(command);
        }
    }
    // Clipboard operations
    /**
     * Cuts the selected widgets, copying them to the clipboard and then deleting them.
     */
    cutSelection() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        const widgetsData = selectedIds.map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
            .filter((data) => data !== undefined);
        this.clipboard.cut(widgetsData);
        this.deleteSelectedWidgets();
    }
    /**
     * Copies the selected widgets to the clipboard.
     */
    copySelection() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        const widgetsData = selectedIds.map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
            .filter((data) => data !== undefined);
        this.clipboard.copy(widgetsData);
        this.updateUI();
    }
    /**
     * Pastes widgets from the clipboard into the designer.
     * Clears the current selection and selects the newly pasted widgets.
     */
    pasteFromClipboard() {
        const items = this.clipboard.paste();
        if (items.length === 0)
            return;
        // First, clear the current selection
        this.selectionManager.clearSelection();
        // Create a composite command for all paste operations
        items.forEach(item => {
            const command = new CreateWidgetCommand(this, item);
            this.commandManager.execute(command);
            // Select the newly created widget
            this.selectionManager.selectWidget(item.id, true);
        });
    }
    // Undo/redo operations
    /**
     * Undoes the last command executed.
     */
    undo() {
        this.commandManager.undo();
    }
    /**
     * Redoes the last command undone.
     */
    redo() {
        this.commandManager.redo();
    }
    /**
     * Handles changes in the selection of widgets.
     * Updates the visual state of widgets and the reference widget indicator.
     * @param selectedIds - The IDs of the selected widgets.
     */
    handleSelectionChange(selectedIds) {
        // Update widget visual states
        this.widgets.forEach(widget => {
            widget.setSelected(selectedIds.includes(widget.getId()));
        });
        // Update reference widget indicator
        this.updateReferenceWidgetIndicator();
        this.updateUI();
    }
    /**
     * Updates the reference widget indicator.
     * The first selected widget is marked as the reference widget.
     */
    updateReferenceWidgetIndicator() {
        // Reset all widgets to normal selection state first
        this.widgets.forEach(widget => {
            if (widget.isSelected()) {
                widget.setReferenceWidget(false);
            }
        });
        // Mark the first selected widget as the reference widget
        const referenceWidget = this.getReferenceWidget();
        if (referenceWidget) {
            referenceWidget.setReferenceWidget(true);
        }
    }
}
//# sourceMappingURL=designer-selection.js.map