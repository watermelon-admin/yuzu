import { DesignerDrag } from './designer-drag.js';
import { ChangeZOrderCommand } from '../commands/z-order-commands.js';
// Functionality related to z-ordering of widgets
export class DesignerZOrder extends DesignerDrag {
    /**
     * Brings the selected widgets to the front.
     */
    bringSelectionToFrontCommand() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        // Store the original z-indices
        const oldZIndices = selectedIds.map(id => {
            const widget = this.widgets.get(id);
            return {
                id,
                zIndex: widget ? widget.getData().zIndex : 0
            };
        });
        // Calculate new z-indices starting from the current nextZIndex
        let currentZIndex = this.nextZIndex;
        const newZIndices = selectedIds.map(id => {
            return {
                id,
                zIndex: currentZIndex++
            };
        });
        // Update nextZIndex
        this.nextZIndex = currentZIndex;
        // Create and execute command
        const command = new ChangeZOrderCommand(this, selectedIds, oldZIndices, newZIndices, 'front');
        this.commandManager.execute(command);
    }
    /**
     * Sends the selected widgets to the back.
     */
    sendSelectionToBackCommand() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        // Get all widgets and sort them by current z-index
        const allWidgets = Array.from(this.widgets.entries()).map(([id, widget]) => ({
            id,
            zIndex: widget.getData().zIndex
        }));
        allWidgets.sort((a, b) => a.zIndex - b.zIndex);
        // Find the lowest z-index
        const lowestZIndex = allWidgets.length > 0 ? allWidgets[0].zIndex : 0;
        // Store the original z-indices
        const oldZIndices = selectedIds.map(id => {
            const widget = this.widgets.get(id);
            return {
                id,
                zIndex: widget ? widget.getData().zIndex : 0
            };
        });
        // Calculate new z-indices for selected widgets, starting from lowestZIndex - selectedIds.length
        let startZIndex = Math.max(0, lowestZIndex - selectedIds.length);
        const newZIndices = selectedIds.map(id => {
            return {
                id,
                zIndex: startZIndex++
            };
        });
        // Create and execute command
        const command = new ChangeZOrderCommand(this, selectedIds, oldZIndices, newZIndices, 'back');
        this.commandManager.execute(command);
    }
}
//# sourceMappingURL=designer-zorder.js.map