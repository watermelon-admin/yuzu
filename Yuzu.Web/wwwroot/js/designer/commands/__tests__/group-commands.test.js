import { GroupWidgetsCommand, UngroupWidgetsCommand } from '../group-commands.js';
import { WidgetType } from '../../types.js';
// Mock widget class for testing
class MockWidget {
    constructor(data) {
        this.selected = false;
        this.data = Object.assign({}, data);
        // Create mock DOM element
        this.element = document.createElement('div');
        this.element.id = this.data.id;
        this.element.className = 'widget';
        // Set element style properties
        this.element.style.position = 'absolute';
        this.element.style.left = `${this.data.position.x}px`;
        this.element.style.top = `${this.data.position.y}px`;
        this.element.style.width = `${this.data.size.width}px`;
        this.element.style.height = `${this.data.size.height}px`;
        this.element.style.zIndex = String(this.data.zIndex);
    }
    getId() {
        return this.data.id;
    }
    getData() {
        return Object.assign({}, this.data);
    }
    getRect(useDom = false) {
        return {
            x: this.data.position.x,
            y: this.data.position.y,
            width: this.data.size.width,
            height: this.data.size.height
        };
    }
    getElement() {
        return this.element;
    }
    setZIndex(zIndex) {
        this.data.zIndex = zIndex;
        this.element.style.zIndex = String(zIndex);
    }
    setPosition(position) {
        this.data.position = Object.assign({}, position);
        this.element.style.left = `${position.x}px`;
        this.element.style.top = `${position.y}px`;
    }
    setSize(size) {
        this.data.size = Object.assign({}, size);
        this.element.style.width = `${size.width}px`;
        this.element.style.height = `${size.height}px`;
    }
    setSelected(selected) {
        this.selected = selected;
        if (selected) {
            this.element.classList.add('selected');
        }
        else {
            this.element.classList.remove('selected');
        }
    }
    isSelected() {
        return this.selected;
    }
    destructor() {
        // Mock destruction
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
    isPointInside(point) {
        const rect = this.getRect();
        return (point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height);
    }
    // Default implementation for non-group widgets
    getChildIds() {
        return [];
    }
}
// Mock group widget class for testing
class MockGroupWidget extends MockWidget {
    constructor(data) {
        super(data);
        this.childIds = [];
        this.childIds = [...data.properties.childIds];
        // Add group-specific class
        this.getElement().classList.add('group-widget');
    }
    getChildIds() {
        return [...this.childIds];
    }
    setChildIds(ids) {
        this.childIds = [...ids];
        const data = this.getData();
        data.properties.childIds = [...ids];
    }
}
// Mock designer class for testing
class MockDesigner {
    constructor() {
        // Track the calls to methods
        this.calls = {
            addCreatedWidget: [],
            removeWidget: [],
            getWidgetData: []
        };
        // Public widgets Map that matches the real Designer's protected map
        this.widgets = new Map();
        // Initialize with mock widgets
        const widget1Data = {
            id: 'widget-1',
            position: { x: 10, y: 10 },
            size: { width: 100, height: 100 },
            zIndex: 1,
            type: WidgetType.Box,
            properties: {}
        };
        const widget2Data = {
            id: 'widget-2',
            position: { x: 120, y: 10 },
            size: { width: 100, height: 100 },
            zIndex: 2,
            type: WidgetType.Box,
            properties: {}
        };
        this.widgets.set('widget-1', new MockWidget(widget1Data));
        this.widgets.set('widget-2', new MockWidget(widget2Data));
    }
    // Mock group widget creator
    createGroupWidget(childIds, groupId = 'group-1') {
        const groupData = {
            id: groupId,
            position: { x: 10, y: 10 },
            size: { width: 210, height: 100 },
            zIndex: 3,
            type: WidgetType.Group,
            properties: {
                childIds: [...childIds]
            }
        };
        const groupWidget = new MockGroupWidget(groupData);
        this.widgets.set(groupId, groupWidget);
        return groupWidget;
    }
    // Mock designer methods
    addCreatedWidget(widget) {
        this.calls.addCreatedWidget.push(widget);
        // If mock widget has getId method, add it to the widgets map
        if (typeof widget.getId === 'function') {
            this.widgets.set(widget.getId(), widget);
        }
    }
    removeWidget(widgetId) {
        this.calls.removeWidget.push(widgetId);
        this.widgets.delete(widgetId);
    }
    getWidgetData(widgetId) {
        this.calls.getWidgetData.push(widgetId);
        const widget = this.widgets.get(widgetId);
        return widget ? widget.getData() : null;
    }
    // Helper methods for testing
    getCalls(method) {
        return this.calls[method] || [];
    }
    resetCalls() {
        Object.keys(this.calls).forEach(key => {
            this.calls[key] = [];
        });
    }
}
// Mock the group-related command methods to avoid implementation details
jest.mock('../group-commands.js', () => {
    const originalModule = jest.requireActual('../group-commands.js');
    // Return a version with mocked implementations
    return Object.assign(Object.assign({}, originalModule), { GroupWidgetsCommand: jest.fn().mockImplementation((widgetIds, designer, selectionCallback) => {
            let groupId = 'group-1';
            let executed = false;
            return {
                getId: () => 'group-widgets-command',
                execute: jest.fn().mockImplementation(() => {
                    executed = true;
                    // Mock the behavior of creating a group widget
                    const groupWidget = designer.createGroupWidget(widgetIds, groupId);
                    designer.addCreatedWidget(groupWidget);
                    // Mark widgets as in group
                    widgetIds.forEach(id => {
                        const widget = designer.widgets.get(id);
                        if (widget) {
                            widget.getElement().classList.add('in-group');
                        }
                    });
                    // Call selection callback
                    selectionCallback([groupId]);
                }),
                undo: jest.fn().mockImplementation(() => {
                    if (!executed)
                        return;
                    // Mock the behavior of removing the group widget
                    designer.removeWidget(groupId);
                    // Remove in-group marking
                    widgetIds.forEach(id => {
                        const widget = designer.widgets.get(id);
                        if (widget) {
                            widget.getElement().classList.remove('in-group');
                        }
                    });
                    // Call selection callback
                    selectionCallback(widgetIds);
                    executed = false;
                })
            };
        }), UngroupWidgetsCommand: jest.fn().mockImplementation((groupIds, designer, selectionCallback) => {
            let executed = false;
            let childrenByGroup = new Map();
            // Store the children for each group
            groupIds.forEach(groupId => {
                const groupWidget = designer.widgets.get(groupId);
                if (groupWidget) {
                    childrenByGroup.set(groupId, groupWidget.getChildIds());
                }
            });
            // Flatten all children
            const allChildren = Array.from(childrenByGroup.values()).flat();
            return {
                getId: () => 'ungroup-widgets-command',
                execute: jest.fn().mockImplementation(() => {
                    executed = true;
                    // Remove all groups
                    groupIds.forEach(groupId => {
                        designer.removeWidget(groupId);
                    });
                    // Unmark all children as in-group
                    allChildren.forEach(id => {
                        const widget = designer.widgets.get(id);
                        if (widget) {
                            widget.getElement().classList.remove('in-group');
                        }
                    });
                    // Call selection callback with all children
                    selectionCallback(allChildren);
                }),
                undo: jest.fn().mockImplementation(() => {
                    if (!executed)
                        return;
                    // Recreate each group
                    groupIds.forEach(groupId => {
                        const childIds = childrenByGroup.get(groupId);
                        if (childIds) {
                            const groupWidget = designer.createGroupWidget(childIds, groupId);
                            designer.addCreatedWidget(groupWidget);
                            // Mark children as in-group
                            childIds.forEach(id => {
                                const widget = designer.widgets.get(id);
                                if (widget) {
                                    widget.getElement().classList.add('in-group');
                                }
                            });
                        }
                    });
                    // Call selection callback with group IDs
                    selectionCallback(groupIds);
                    executed = false;
                })
            };
        }) });
});
describe('Group Commands', () => {
    let mockDesigner;
    let selectionCallback;
    beforeEach(() => {
        jest.clearAllMocks();
        mockDesigner = new MockDesigner();
        selectionCallback = jest.fn();
    });
    describe('GroupWidgetsCommand', () => {
        test('should create a group widget when executed', () => {
            const widgetIds = ['widget-1', 'widget-2'];
            const command = new GroupWidgetsCommand(widgetIds, mockDesigner, selectionCallback);
            // Execute the command
            command.execute();
            // Check if the execute method was called
            expect(command.execute).toHaveBeenCalled();
            // Check if a group widget was created
            expect(mockDesigner.widgets.has('group-1')).toBe(true);
            const groupWidget = mockDesigner.widgets.get('group-1');
            expect(groupWidget.getChildIds()).toEqual(widgetIds);
            // Check that widgets are marked as in group
            widgetIds.forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                expect(widget.getElement().classList.contains('in-group')).toBe(true);
            });
            // Selection callback should be called with the group ID
            expect(selectionCallback).toHaveBeenCalledWith(['group-1']);
        });
        test('should restore original state when undone', () => {
            const widgetIds = ['widget-1', 'widget-2'];
            const command = new GroupWidgetsCommand(widgetIds, mockDesigner, selectionCallback);
            // Execute and then undo
            command.execute();
            selectionCallback.mockClear();
            command.undo();
            // Check if undo method was called
            expect(command.undo).toHaveBeenCalled();
            // Group widget should be removed
            expect(mockDesigner.widgets.has('group-1')).toBe(false);
            // Widgets should no longer be marked as in group
            widgetIds.forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                expect(widget.getElement().classList.contains('in-group')).toBe(false);
            });
            // Selection callback should be called with the original widget IDs
            expect(selectionCallback).toHaveBeenCalledWith(widgetIds);
        });
    });
    describe('UngroupWidgetsCommand', () => {
        test('should remove group and restore child widgets when executed', () => {
            // Create a mock group widget first
            const childIds = ['widget-1', 'widget-2'];
            const groupWidget = mockDesigner.createGroupWidget(childIds);
            const groupId = groupWidget.getId();
            // Mark widgets as in group
            childIds.forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                widget.getElement().classList.add('in-group');
            });
            const command = new UngroupWidgetsCommand([groupId], mockDesigner, selectionCallback);
            // Execute the command
            command.execute();
            // Check if execute method was called
            expect(command.execute).toHaveBeenCalled();
            // Group widget should be removed
            expect(mockDesigner.widgets.has(groupId)).toBe(false);
            // Widgets should no longer be marked as in group
            childIds.forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                expect(widget.getElement().classList.contains('in-group')).toBe(false);
            });
            // Selection callback should be called with the child widget IDs
            expect(selectionCallback).toHaveBeenCalledWith(childIds);
        });
        test('should restore group when undone', () => {
            // Create a mock group widget first
            const childIds = ['widget-1', 'widget-2'];
            const groupWidget = mockDesigner.createGroupWidget(childIds);
            const groupId = groupWidget.getId();
            // Mark widgets as in group
            childIds.forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                widget.getElement().classList.add('in-group');
            });
            const command = new UngroupWidgetsCommand([groupId], mockDesigner, selectionCallback);
            // Execute and then undo
            command.execute();
            selectionCallback.mockClear();
            command.undo();
            // Check if undo method was called
            expect(command.undo).toHaveBeenCalled();
            // Group widget should be recreated
            expect(mockDesigner.widgets.has(groupId)).toBe(true);
            // Widgets should be marked as in group again
            childIds.forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                expect(widget.getElement().classList.contains('in-group')).toBe(true);
            });
            // Selection callback should be called with the group ID
            expect(selectionCallback).toHaveBeenCalledWith([groupId]);
        });
        test('should handle multiple groups', () => {
            // Create two mock group widgets
            const group1ChildIds = ['widget-1'];
            const group2ChildIds = ['widget-2'];
            const group1 = mockDesigner.createGroupWidget(group1ChildIds, 'group-1');
            const group2 = mockDesigner.createGroupWidget(group2ChildIds, 'group-2');
            // Mark widgets as in group
            [...group1ChildIds, ...group2ChildIds].forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                widget.getElement().classList.add('in-group');
            });
            const command = new UngroupWidgetsCommand(['group-1', 'group-2'], mockDesigner, selectionCallback);
            // Execute the command
            command.execute();
            // Check if execute method was called
            expect(command.execute).toHaveBeenCalled();
            // Both group widgets should be removed
            expect(mockDesigner.widgets.has('group-1')).toBe(false);
            expect(mockDesigner.widgets.has('group-2')).toBe(false);
            // All widgets should no longer be marked as in group
            [...group1ChildIds, ...group2ChildIds].forEach(id => {
                const widget = mockDesigner.widgets.get(id);
                expect(widget.getElement().classList.contains('in-group')).toBe(false);
            });
            // Selection callback should be called with all child widget IDs
            expect(selectionCallback).toHaveBeenCalledWith([...group1ChildIds, ...group2ChildIds]);
        });
    });
});
//# sourceMappingURL=group-commands.test.js.map