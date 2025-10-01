import { Designer } from './designer-core.js';
import { CreateWidgetCommand, DeleteWidgetsCommand } from '../commands/basic-commands.js';
import { WidgetType } from '../types.js';
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
     * For group widgets, also includes all child widgets.
     */
    cutSelection() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        // Create a set of all widget IDs that need to be copied
        const allWidgetsToCopy = new Set();
        // First pass: collect all selected widgets and find groups
        selectedIds.forEach(id => {
            allWidgetsToCopy.add(id);
            // If this is a group widget, also add all its children
            const widget = this.widgets.get(id);
            if (widget && widget.getData().type === WidgetType.Group) {
                // Get child IDs using the getChildIds method from GroupWidget
                const groupWidget = widget; // Cast to any to access GroupWidget methods
                if (typeof groupWidget.getChildIds === 'function') {
                    const childIds = groupWidget.getChildIds();
                    childIds.forEach(childId => {
                        console.log(`Adding child widget ${childId} to cut list`);
                        allWidgetsToCopy.add(childId);
                    });
                }
            }
        });
        console.log('Cutting widgets:', Array.from(allWidgetsToCopy));
        // Collect all widget data for the widgets to copy
        const widgetsData = Array.from(allWidgetsToCopy)
            .map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
            .filter((data) => data !== undefined);
        this.clipboard.cut(widgetsData);
        this.deleteSelectedWidgets();
    }
    /**
     * Copies the selected widgets to the clipboard.
     * For group widgets, also includes all child widgets.
     */
    copySelection() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        // Create a set of all widget IDs that need to be copied
        const allWidgetsToCopy = new Set();
        // First pass: collect all selected widgets and find groups
        selectedIds.forEach(id => {
            allWidgetsToCopy.add(id);
            // If this is a group widget, also add all its children
            const widget = this.widgets.get(id);
            if (widget && widget.getData().type === WidgetType.Group) {
                // Get child IDs using the getChildIds method from GroupWidget
                const groupWidget = widget; // Cast to any to access GroupWidget methods
                if (typeof groupWidget.getChildIds === 'function') {
                    const childIds = groupWidget.getChildIds();
                    childIds.forEach(childId => {
                        console.log(`Adding child widget ${childId} to copy list`);
                        allWidgetsToCopy.add(childId);
                    });
                }
            }
        });
        console.log('Copying widgets:', Array.from(allWidgetsToCopy));
        // Collect all widget data for the widgets to copy
        const widgetsData = Array.from(allWidgetsToCopy)
            .map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
            .filter((data) => data !== undefined);
        this.clipboard.copy(widgetsData);
        this.updateUI();
    }
    /**
     * Pastes widgets from the clipboard into the designer.
     * Clears the current selection and selects the newly pasted widgets.
     * For groups, ensures all child widgets are created before the group widget.
     */
    pasteFromClipboard() {
        const items = this.clipboard.paste();
        if (items.length === 0)
            return;
        console.log('Pasting widgets:', items.length);
        // First, clear the current selection
        this.selectionManager.clearSelection();
        // Separate group widgets from non-group widgets
        const groupWidgets = [];
        const nonGroupWidgets = [];
        items.forEach(item => {
            if (item.type === WidgetType.Group) {
                groupWidgets.push(item);
            }
            else {
                nonGroupWidgets.push(item);
            }
        });
        console.log(`Found ${groupWidgets.length} groups and ${nonGroupWidgets.length} non-group widgets`);
        // First create all the non-group widgets
        nonGroupWidgets.forEach(item => {
            const command = new CreateWidgetCommand(this, item);
            this.commandManager.execute(command);
        });
        // Then create all the group widgets
        groupWidgets.forEach(item => {
            const command = new CreateWidgetCommand(this, item);
            this.commandManager.execute(command);
        });
        // Finally, select all the pasted widgets
        items.forEach(item => {
            // Only select top-level widgets (groups and non-grouped widgets)
            // Don't select widgets that are part of groups
            const isChildWidget = groupWidgets.some(groupWidget => {
                const groupProps = groupWidget.properties;
                return groupProps.childIds && groupProps.childIds.includes(item.id);
            });
            if (!isChildWidget) {
                this.selectionManager.selectWidget(item.id, true);
            }
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
     * Updates the visual state of widgets, the reference widget indicator,
     * and the properties toolbox.
     * @param selectedIds - The IDs of the selected widgets.
     */
    handleSelectionChange(selectedIds) {
        // Update widget visual states
        this.widgets.forEach(widget => {
            widget.setSelected(selectedIds.includes(widget.getId()));
        });
        // Update reference widget indicator
        this.updateReferenceWidgetIndicator();
        // Update properties toolbox with selected widgets
        if (selectedIds.length > 0) {
            // Get all selected widgets
            const selectedWidgets = selectedIds
                .map(id => this.widgets.get(id))
                .filter(widget => widget !== undefined);
            // Update properties manager with all selected widgets
            this.propertiesManager.setSelectedWidgets(selectedWidgets);
        }
        else {
            // No selection - clear properties
            this.propertiesManager.setSelectedWidgets([]);
        }
        this.updateUI();
        // Dispatch a custom selection-change event for other components to listen for
        const selectionChangeEvent = new CustomEvent('selection-change', {
            detail: {
                selectedIds
            },
            bubbles: true
        });
        this.canvasElement.dispatchEvent(selectionChangeEvent);
    }
    /**
     * Updates the reference widget indicator.
     * The first selected widget is marked as the reference widget.
     */
    updateReferenceWidgetIndicator() {
        console.log('Updating reference widget indicator');
        // Get the current reference widget ID
        const referenceWidgetId = this.selectionManager.getReferenceWidgetId();
        console.log('Reference widget ID:', referenceWidgetId);
        // Reset all widgets to normal selection state first
        this.widgets.forEach(widget => {
            if (widget.isSelected()) {
                widget.setReferenceWidget(false);
            }
        });
        // Mark the reference widget
        if (referenceWidgetId) {
            const referenceWidget = this.widgets.get(referenceWidgetId);
            if (referenceWidget) {
                console.log('Setting reference widget:', referenceWidgetId);
                referenceWidget.setReferenceWidget(true);
            }
        }
    }
}
//# sourceMappingURL=designer-selection.js.map