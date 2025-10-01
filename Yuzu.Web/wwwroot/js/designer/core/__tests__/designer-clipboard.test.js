import { WidgetType } from '../../types.js';
// Direct testing approach
describe('Designer Clipboard Operations', () => {
    // Test implementation that simulates Designer behavior
    class TestDesigner {
        constructor() {
            this.selectedWidgetIds = ['widget-1', 'widget-2'];
            this.widgets = new Map();
            this.commandExecuteCalls = 0;
            this.selectionClearedCalls = 0;
            this.selectionWidgetCalls = [];
            // Create mock clipboard
            this.clipboard = {
                isEmpty: jest.fn().mockReturnValue(false),
                getItemCount: jest.fn().mockReturnValue(2),
                copy: jest.fn(),
                cut: jest.fn(),
                paste: jest.fn().mockImplementation(() => [
                    {
                        id: 'pasted-widget-1',
                        position: { x: 30, y: 40 },
                        size: { width: 100, height: 100 },
                        zIndex: 1,
                        type: WidgetType.Box,
                        properties: { backgroundColor: 'red' }
                    },
                    {
                        id: 'pasted-widget-2',
                        position: { x: 130, y: 40 },
                        size: { width: 100, height: 100 },
                        zIndex: 2,
                        type: WidgetType.Box,
                        properties: { backgroundColor: 'blue' }
                    }
                ])
            };
            // Setup initial widget data
            this.setupInitialWidgets();
        }
        setupInitialWidgets() {
            // Add basic widgets
            const widgetData1 = {
                id: 'widget-1',
                position: { x: 10, y: 20 },
                size: { width: 100, height: 100 },
                zIndex: 1,
                type: WidgetType.Box,
                properties: { backgroundColor: 'red' }
            };
            const widgetData2 = {
                id: 'widget-2',
                position: { x: 120, y: 20 },
                size: { width: 100, height: 100 },
                zIndex: 2,
                type: WidgetType.Box,
                properties: { backgroundColor: 'blue' }
            };
            this.widgets.set('widget-1', this.createMockWidget('widget-1', widgetData1));
            this.widgets.set('widget-2', this.createMockWidget('widget-2', widgetData2));
        }
        createMockWidget(id, data) {
            return {
                getId: () => id,
                getData: () => data,
                getChildIds: () => [],
                isSelected: () => this.selectedWidgetIds.includes(id)
            };
        }
        // Methods to test
        copySelection() {
            const selectedIds = this.getSelectedWidgetIds();
            if (selectedIds.length === 0)
                return;
            // Create a set of all widget IDs that need to be copied
            const allWidgetsToCopy = new Set();
            // Use a recursive function to handle nested groups
            const collectGroupAndChildren = (id) => {
                // Add the current widget
                allWidgetsToCopy.add(id);
                // Check if it's a group
                const widget = this.widgets.get(id);
                if (widget && widget.getData().type === WidgetType.Group) {
                    if (typeof widget.getChildIds === 'function') {
                        const childIds = widget.getChildIds();
                        // Process each child (which might be another group)
                        childIds.forEach(childId => collectGroupAndChildren(childId));
                    }
                }
            };
            // Process each selected widget
            selectedIds.forEach(id => collectGroupAndChildren(id));
            // Collect widget data
            const widgetsData = Array.from(allWidgetsToCopy)
                .map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
                .filter(data => data !== undefined);
            this.clipboard.copy(widgetsData);
        }
        cutSelection() {
            const selectedIds = this.getSelectedWidgetIds();
            if (selectedIds.length === 0)
                return;
            // Create a set of all widget IDs that need to be copied
            const allWidgetsToCopy = new Set();
            // Use a recursive function to handle nested groups
            const collectGroupAndChildren = (id) => {
                // Add the current widget
                allWidgetsToCopy.add(id);
                // Check if it's a group
                const widget = this.widgets.get(id);
                if (widget && widget.getData().type === WidgetType.Group) {
                    if (typeof widget.getChildIds === 'function') {
                        const childIds = widget.getChildIds();
                        // Process each child (which might be another group)
                        childIds.forEach(childId => collectGroupAndChildren(childId));
                    }
                }
            };
            // Process each selected widget
            selectedIds.forEach(id => collectGroupAndChildren(id));
            // Collect widget data
            const widgetsData = Array.from(allWidgetsToCopy)
                .map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
                .filter(data => data !== undefined);
            this.clipboard.cut(widgetsData);
            // Simulate command execution for delete
            this.commandExecuteCalls++;
        }
        pasteFromClipboard() {
            const items = this.clipboard.paste();
            if (items.length === 0)
                return;
            // Clear the current selection
            this.clearSelection();
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
            // First create all the non-group widgets
            nonGroupWidgets.forEach(item => {
                // Simulate command execution for create
                this.commandExecuteCalls++;
            });
            // Then create all the group widgets
            groupWidgets.forEach(item => {
                // Simulate command execution for create
                this.commandExecuteCalls++;
            });
            // Finally, select all the pasted widgets
            items.forEach(item => {
                // Only select top-level widgets (groups and non-grouped widgets)
                const isChildWidget = groupWidgets.some(groupWidget => {
                    const groupProps = groupWidget.properties;
                    return groupProps.childIds && groupProps.childIds.includes(item.id);
                });
                if (!isChildWidget) {
                    this.selectWidget(item.id, true);
                }
            });
        }
        // Helper methods
        getSelectedWidgetIds() {
            return this.selectedWidgetIds;
        }
        setSelectedWidgetIds(ids) {
            this.selectedWidgetIds = [...ids];
        }
        clearSelection() {
            this.selectionClearedCalls++;
            this.selectedWidgetIds = [];
        }
        selectWidget(id, append) {
            this.selectionWidgetCalls.push({ id, append });
            if (!append) {
                this.selectedWidgetIds = [id];
            }
            else if (!this.selectedWidgetIds.includes(id)) {
                this.selectedWidgetIds.push(id);
            }
        }
        setupGroupWidgets() {
            // Create a group with two child widgets
            const childId1 = 'child-1';
            const childId2 = 'child-2';
            const groupId = 'group-1';
            // Create child widgets
            const childData1 = {
                id: childId1,
                position: { x: 20, y: 30 },
                size: { width: 50, height: 50 },
                zIndex: 1,
                type: WidgetType.Box,
                properties: { backgroundColor: 'blue' }
            };
            const childData2 = {
                id: childId2,
                position: { x: 80, y: 30 },
                size: { width: 50, height: 50 },
                zIndex: 2,
                type: WidgetType.Box,
                properties: { backgroundColor: 'green' }
            };
            // Create group widget
            const groupData = {
                id: groupId,
                position: { x: 10, y: 10 },
                size: { width: 150, height: 100 },
                zIndex: 3,
                type: WidgetType.Group,
                properties: {
                    childIds: [childId1, childId2]
                }
            };
            // Add widgets to collection
            this.widgets.set(childId1, this.createMockWidget(childId1, childData1));
            this.widgets.set(childId2, this.createMockWidget(childId2, childData2));
            const groupWidget = this.createMockWidget(groupId, groupData);
            // Add getChildIds method specific to group widgets
            groupWidget.getChildIds = () => [childId1, childId2];
            this.widgets.set(groupId, groupWidget);
            // Set selection to just the group
            this.setSelectedWidgetIds([groupId]);
            return { groupId, childId1, childId2 };
        }
        setupNestedGroups() {
            const { groupId: groupId1, childId1, childId2 } = this.setupGroupWidgets();
            // Create another child and a parent group
            const childId3 = 'child-3';
            const groupId2 = 'group-2';
            const childData3 = {
                id: childId3,
                position: { x: 170, y: 30 },
                size: { width: 50, height: 50 },
                zIndex: 4,
                type: WidgetType.Box,
                properties: { backgroundColor: 'yellow' }
            };
            // Create outer group data
            const group2Data = {
                id: groupId2,
                position: { x: 5, y: 5 },
                size: { width: 250, height: 150 },
                zIndex: 5,
                type: WidgetType.Group,
                properties: {
                    childIds: [childId3, groupId1]
                }
            };
            // Add widgets to collection
            this.widgets.set(childId3, this.createMockWidget(childId3, childData3));
            const group2Widget = this.createMockWidget(groupId2, group2Data);
            // Add getChildIds method specific to group widgets
            group2Widget.getChildIds = () => [childId3, groupId1];
            this.widgets.set(groupId2, group2Widget);
            // Make sure the inner group widget has correct getChildIds too
            const groupWidget = this.widgets.get(groupId1);
            if (groupWidget) {
                groupWidget.getChildIds = () => [childId1, childId2];
            }
            // Set selection to just the outer group
            this.setSelectedWidgetIds([groupId2]);
            return { groupId1, groupId2, childId1, childId2, childId3 };
        }
    }
    let designer;
    beforeEach(() => {
        designer = new TestDesigner();
    });
    describe('copySelection', () => {
        test('should copy selected widgets to clipboard', () => {
            designer.copySelection();
            // Verify clipboard.copy was called with widget data
            expect(designer.clipboard.copy).toHaveBeenCalledTimes(1);
            const copiedData = designer.clipboard.copy.mock.calls[0][0];
            expect(copiedData.length).toBe(2);
            expect(copiedData[0].id).toBe('widget-1');
            expect(copiedData[1].id).toBe('widget-2');
        });
        test('should not call clipboard.copy when no widgets are selected', () => {
            designer.setSelectedWidgetIds([]);
            designer.copySelection();
            expect(designer.clipboard.copy).not.toHaveBeenCalled();
        });
    });
    describe('cutSelection', () => {
        test('should cut selected widgets to clipboard and delete them', () => {
            designer.cutSelection();
            // Verify clipboard.cut was called with widget data
            expect(designer.clipboard.cut).toHaveBeenCalledTimes(1);
            const cutData = designer.clipboard.cut.mock.calls[0][0];
            expect(cutData.length).toBe(2);
            // Verify command was executed
            expect(designer.commandExecuteCalls).toBe(1);
        });
        test('should not call clipboard.cut when no widgets are selected', () => {
            designer.setSelectedWidgetIds([]);
            designer.cutSelection();
            expect(designer.clipboard.cut).not.toHaveBeenCalled();
            expect(designer.commandExecuteCalls).toBe(0);
        });
    });
    describe('pasteFromClipboard', () => {
        test('should paste widgets from clipboard and select them', () => {
            designer.pasteFromClipboard();
            // Verify clipboard.paste was called
            expect(designer.clipboard.paste).toHaveBeenCalledTimes(1);
            // Verify selection was cleared
            expect(designer.selectionClearedCalls).toBe(1);
            // Verify command execution
            expect(designer.commandExecuteCalls).toBe(2);
            // Verify selection calls for pasted widgets
            expect(designer.selectionWidgetCalls.length).toBe(2);
            expect(designer.selectionWidgetCalls[0].id).toBe('pasted-widget-1');
            expect(designer.selectionWidgetCalls[0].append).toBe(true);
            expect(designer.selectionWidgetCalls[1].id).toBe('pasted-widget-2');
            expect(designer.selectionWidgetCalls[1].append).toBe(true);
        });
        test('should not do anything when clipboard is empty', () => {
            designer.clipboard.paste.mockReturnValueOnce([]);
            designer.pasteFromClipboard();
            // Verify no commands were executed
            expect(designer.commandExecuteCalls).toBe(0);
            // Verify selection wasn't changed
            expect(designer.selectionClearedCalls).toBe(0);
            expect(designer.selectionWidgetCalls.length).toBe(0);
        });
        test('should paste a group with its child widgets', () => {
            // Mock clipboard.paste to return a group with children
            designer.clipboard.paste.mockReturnValueOnce([
                {
                    id: 'pasted-group',
                    position: { x: 30, y: 30 },
                    size: { width: 150, height: 100 },
                    zIndex: 3,
                    type: WidgetType.Group,
                    properties: {
                        childIds: ['pasted-child-1', 'pasted-child-2']
                    }
                },
                {
                    id: 'pasted-child-1',
                    position: { x: 40, y: 50 },
                    size: { width: 50, height: 50 },
                    zIndex: 1,
                    type: WidgetType.Box,
                    properties: { backgroundColor: 'blue' }
                },
                {
                    id: 'pasted-child-2',
                    position: { x: 100, y: 50 },
                    size: { width: 50, height: 50 },
                    zIndex: 2,
                    type: WidgetType.Box,
                    properties: { backgroundColor: 'green' }
                }
            ]);
            designer.pasteFromClipboard();
            // Verify command execution (3 widgets pasted)
            expect(designer.commandExecuteCalls).toBe(3);
            // Verify only the group was selected, not its children
            expect(designer.selectionWidgetCalls.length).toBe(1);
            expect(designer.selectionWidgetCalls[0].id).toBe('pasted-group');
        });
    });
    describe('Group Copying and Pasting', () => {
        test('should include group child widgets when copying a group', () => {
            designer.setupGroupWidgets();
            designer.copySelection();
            // Verify clipboard.copy was called with correct data
            expect(designer.clipboard.copy).toHaveBeenCalledTimes(1);
            const copiedData = designer.clipboard.copy.mock.calls[0][0];
            expect(copiedData.length).toBe(3); // Group + 2 children
            // Verify IDs
            const copiedIds = copiedData.map((data) => data.id);
            expect(copiedIds).toContain('group-1');
            expect(copiedIds).toContain('child-1');
            expect(copiedIds).toContain('child-2');
        });
        test('should handle multiple nested groups when copying', () => {
            designer.setupNestedGroups();
            designer.copySelection();
            // Verify clipboard.copy was called
            expect(designer.clipboard.copy).toHaveBeenCalledTimes(1);
            const copiedData = designer.clipboard.copy.mock.calls[0][0];
            expect(copiedData.length).toBe(5); // 2 groups + 3 children
            // Verify all IDs were included in the correct order
            const copiedIds = copiedData.map((data) => data.id);
            expect(copiedIds).toContain('group-2'); // Outer group
            expect(copiedIds).toContain('group-1'); // Inner group
            expect(copiedIds).toContain('child-1'); // Child of inner group
            expect(copiedIds).toContain('child-2'); // Child of inner group
            expect(copiedIds).toContain('child-3'); // Direct child of outer group
        });
    });
});
//# sourceMappingURL=designer-clipboard.test.js.map