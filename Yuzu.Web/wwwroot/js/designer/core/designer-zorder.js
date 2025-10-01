import { DesignerDrag } from './designer-drag.js';
import { ChangeZOrderCommand } from '../commands/z-order-commands.js';
import { WidgetType } from '../types.js';
// Functionality related to z-ordering of widgets
export class DesignerZOrder extends DesignerDrag {
    /**
     * Brings the selected widgets to the front.
     */
    bringSelectionToFrontCommand() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        console.log('Bringing to front:', selectedIds);
        // Expand the selection to include all child widgets of selected groups
        const allAffectedIds = this.expandSelectionWithGroupChildren(selectedIds);
        console.log('All affected IDs:', allAffectedIds);
        // Store the original z-indices
        const oldZIndices = allAffectedIds.map(id => {
            const widget = this.widgets.get(id);
            return {
                id,
                zIndex: widget ? widget.getData().zIndex : 0
            };
        });
        // First find the highest z-index of all widgets
        let highestZIndex = 0;
        this.widgets.forEach(widget => {
            highestZIndex = Math.max(highestZIndex, widget.getData().zIndex);
        });
        // Calculate new z-indices starting above the highest existing z-index
        let startZIndex = highestZIndex + 1;
        // Group widgets and their children need to be placed together in the z-order
        // First organize widgets by group
        const widgetGroups = [];
        // Add standalone widgets first (not part of a group)
        const standaloneWidgets = [];
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (!widget)
                return;
            if (widget.getData().type === WidgetType.Group) {
                // Get child IDs using the getChildIds method from GroupWidget
                const groupWidget = widget; // Cast to any to access GroupWidget methods
                if (typeof groupWidget.getChildIds === 'function') {
                    const childIds = groupWidget.getChildIds();
                    widgetGroups.push({
                        groupId: id,
                        widgetIds: [id, ...childIds]
                    });
                }
                else {
                    standaloneWidgets.push(id);
                }
            }
            else {
                // Check if this widget is part of a selected group
                const isPartOfSelectedGroup = selectedIds.some(groupId => {
                    const potentialGroup = this.widgets.get(groupId);
                    if (potentialGroup && potentialGroup.getData().type === WidgetType.Group) {
                        const groupWidget = potentialGroup;
                        if (typeof groupWidget.getChildIds === 'function') {
                            return groupWidget.getChildIds().includes(id);
                        }
                    }
                    return false;
                });
                if (!isPartOfSelectedGroup) {
                    standaloneWidgets.push(id);
                }
            }
        });
        console.log('Widget groups:', widgetGroups);
        console.log('Standalone widgets:', standaloneWidgets);
        // Calculate new z-indices, keeping groups and their children together
        const newZIndices = [];
        // First process standalone widgets
        standaloneWidgets.forEach(id => {
            newZIndices.push({
                id,
                zIndex: startZIndex++
            });
        });
        // Then process groups and their children
        widgetGroups.forEach(group => {
            // Get the widgets in the group
            const { groupId, widgetIds } = group;
            // Group comes first (above its children)
            newZIndices.push({
                id: groupId,
                zIndex: startZIndex++
            });
            // Then the child widgets in their original order
            const children = widgetIds.filter(id => id !== groupId);
            // Sort children by their current z-index
            children.sort((a, b) => {
                const widgetA = this.widgets.get(a);
                const widgetB = this.widgets.get(b);
                if (!widgetA || !widgetB)
                    return 0;
                return widgetA.getData().zIndex - widgetB.getData().zIndex;
            });
            children.forEach(childId => {
                newZIndices.push({
                    id: childId,
                    zIndex: startZIndex++
                });
            });
        });
        // Update nextZIndex to be one higher than the highest assigned z-index
        this.nextZIndex = startZIndex;
        // Create and execute command
        const command = new ChangeZOrderCommand(this, allAffectedIds, oldZIndices, newZIndices, 'front');
        this.commandManager.execute(command);
    }
    /**
     * Sends the selected widgets to the back.
     */
    sendSelectionToBackCommand() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        console.log('Sending to back:', selectedIds);
        // Expand the selection to include all child widgets of selected groups
        const allAffectedIds = this.expandSelectionWithGroupChildren(selectedIds);
        console.log('All affected IDs:', allAffectedIds);
        // Store the original z-indices
        const oldZIndices = allAffectedIds.map(id => {
            const widget = this.widgets.get(id);
            return {
                id,
                zIndex: widget ? widget.getData().zIndex : 0
            };
        });
        // Get a set of non-affected widget IDs
        const nonAffectedWidgetIds = new Set();
        this.widgets.forEach((widget, id) => {
            if (!allAffectedIds.includes(id)) {
                nonAffectedWidgetIds.add(id);
            }
        });
        // Group widgets and their children need to be placed together in the z-order
        // First organize widgets by group
        const widgetGroups = [];
        // Add standalone widgets first (not part of a group)
        const standaloneWidgets = [];
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (!widget)
                return;
            if (widget.getData().type === WidgetType.Group) {
                // Get child IDs using the getChildIds method from GroupWidget
                const groupWidget = widget; // Cast to any to access GroupWidget methods
                if (typeof groupWidget.getChildIds === 'function') {
                    const childIds = groupWidget.getChildIds();
                    widgetGroups.push({
                        groupId: id,
                        widgetIds: [id, ...childIds]
                    });
                }
                else {
                    standaloneWidgets.push(id);
                }
            }
            else {
                // Check if this widget is part of a selected group
                const isPartOfSelectedGroup = selectedIds.some(groupId => {
                    const potentialGroup = this.widgets.get(groupId);
                    if (potentialGroup && potentialGroup.getData().type === WidgetType.Group) {
                        const groupWidget = potentialGroup;
                        if (typeof groupWidget.getChildIds === 'function') {
                            return groupWidget.getChildIds().includes(id);
                        }
                    }
                    return false;
                });
                if (!isPartOfSelectedGroup) {
                    standaloneWidgets.push(id);
                }
            }
        });
        console.log('Widget groups:', widgetGroups);
        console.log('Standalone widgets:', standaloneWidgets);
        // First, shift all non-affected widgets up to make room at the bottom
        const shiftAmount = allAffectedIds.length;
        const allZIndexUpdates = [];
        // Shift all non-affected widgets up
        nonAffectedWidgetIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                const currentZIndex = widget.getData().zIndex;
                allZIndexUpdates.push({
                    id,
                    zIndex: currentZIndex + shiftAmount
                });
            }
        });
        // Place selected widgets at the bottom, keeping groups together
        const newZIndices = [];
        let startZIndex = 0;
        // Process groups first
        widgetGroups.forEach(group => {
            // Get the widgets in the group
            const { groupId, widgetIds } = group;
            // Group comes first (below its children)
            newZIndices.push({
                id: groupId,
                zIndex: startZIndex++
            });
            // Then the child widgets in their original order
            const children = widgetIds.filter(id => id !== groupId);
            // Sort children by their current z-index
            children.sort((a, b) => {
                const widgetA = this.widgets.get(a);
                const widgetB = this.widgets.get(b);
                if (!widgetA || !widgetB)
                    return 0;
                return widgetA.getData().zIndex - widgetB.getData().zIndex;
            });
            children.forEach(childId => {
                newZIndices.push({
                    id: childId,
                    zIndex: startZIndex++
                });
            });
        });
        // Then process standalone widgets
        standaloneWidgets.forEach(id => {
            newZIndices.push({
                id,
                zIndex: startZIndex++
            });
        });
        // Execute command to update all z-indices at once
        const command = new ChangeZOrderCommand(this, [...allAffectedIds, ...Array.from(nonAffectedWidgetIds)], [...oldZIndices, ...allZIndexUpdates.map(item => {
                var _a;
                return ({
                    id: item.id,
                    zIndex: ((_a = this.widgets.get(item.id)) === null || _a === void 0 ? void 0 : _a.getData().zIndex) || 0
                });
            })], [...newZIndices, ...allZIndexUpdates], 'back');
        this.commandManager.execute(command);
    }
    /**
     * Expands a selection to include all child widgets of any groups in the selection.
     * @param selectedIds - The IDs of the selected widgets.
     * @returns An array of all widget IDs that should be affected by the operation.
     */
    expandSelectionWithGroupChildren(selectedIds) {
        const expandedIds = new Set();
        // Add all selected IDs first
        selectedIds.forEach(id => expandedIds.add(id));
        // Then add children of any groups
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (widget && widget.getData().type === WidgetType.Group) {
                // Get child IDs using the getChildIds method from GroupWidget
                const groupWidget = widget; // Cast to any to access GroupWidget methods
                if (typeof groupWidget.getChildIds === 'function') {
                    const childIds = groupWidget.getChildIds();
                    childIds.forEach(childId => expandedIds.add(childId));
                }
            }
        });
        return Array.from(expandedIds);
    }
}
//# sourceMappingURL=designer-zorder.js.map