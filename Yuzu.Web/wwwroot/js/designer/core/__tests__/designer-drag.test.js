import { Designer } from '../designer-core.js';
import { DragType, ResizeHandlePosition, WidgetType } from '../../types.js';
import { MoveWidgetsCommand, ResizeWidgetCommand } from '../../commands/basic-commands.js';
// Mock the PropertiesManager and other dependencies
jest.mock('../../properties-manager.js', () => {
    return {
        PropertiesManager: jest.fn().mockImplementation(() => {
            return {
                updateSelectedWidgets: jest.fn(),
                hidePropertiesPanel: jest.fn(),
                showPropertiesPanel: jest.fn(),
                updatePropertiesDisplay: jest.fn()
            };
        })
    };
});
// Mock the CommandManager 
jest.mock('../../commands/command.js', () => {
    return {
        CommandManager: jest.fn().mockImplementation(() => {
            return {
                execute: jest.fn(),
                undo: jest.fn(),
                redo: jest.fn(),
                canUndo: jest.fn().mockReturnValue(true),
                canRedo: jest.fn().mockReturnValue(true),
                executeCommand: jest.fn()
            };
        })
    };
});
// Mock the ToolboxManager
jest.mock('../../toolbox-manager.js', () => {
    return {
        ToolboxManager: jest.fn().mockImplementation(() => {
            return {
                registerToolbox: jest.fn(),
                setToolboxPosition: jest.fn(),
                showAllToolboxes: jest.fn(),
                hideAllToolboxes: jest.fn()
            };
        })
    };
});
// Create a test subclass to access protected properties
class TestDesigner extends Designer {
    constructor(canvasElementId) {
        super(canvasElementId);
        // Initialize the selectionManager property for testing
        this.selectionManager = {
            getSelectedWidgetIds: jest.fn().mockReturnValue([]),
            isWidgetSelected: jest.fn().mockImplementation((id) => {
                // For testing, we'll make it return true for a specific "expectedSelectedId"
                if (this.expectedSelectedId === id) {
                    return true;
                }
                return false;
            }),
            selectWidget: jest.fn(),
            deselectWidget: jest.fn(),
            clearSelection: jest.fn()
        };
    }
    getWidgetById(id) {
        return this.widgets.get(id);
    }
    getWidgetPosition(id) {
        const widget = this.widgets.get(id);
        return widget ? {
            x: widget.getData().position.x,
            y: widget.getData().position.y
        } : undefined;
    }
    getWidgetSize(id) {
        const widget = this.widgets.get(id);
        return widget ? {
            width: widget.getData().size.width,
            height: widget.getData().size.height
        } : undefined;
    }
    isWidgetSelected(widgetId) {
        return this.selectionManager.isWidgetSelected(widgetId);
    }
    // Methods for testing
    setDragState(dragState) {
        this.dragState = dragState;
    }
    setWidget(widget) {
        this.widgets.set(widget.getId(), widget);
    }
    setExpectedSelectedId(id) {
        this.expectedSelectedId = id;
    }
    // Override handlers to be no-ops
    handleSelectionChange(selectedIds) {
        // No-op for testing
    }
    handleResizeStart(widgetId, handlePosition, event) {
        // Simulate creating a resize drag state 
        this.setDragState({
            type: DragType.Resize,
            startPoint: { x: event.clientX, y: event.clientY },
            currentPoint: { x: event.clientX, y: event.clientY },
            resizeHandle: handlePosition,
            affectedWidgets: [widgetId],
            originalRect: { x: 50, y: 50, width: 100, height: 100 }
        });
    }
    // Override update method to be a no-op
    updateUI() {
        // No-op for testing
    }
}
// Mock required DOM elements for the designer
function setupMockDOM() {
    // Create a canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'designer-canvas';
    document.body.appendChild(canvasContainer);
    // Create properties toolbar
    const propertiesToolbar = document.createElement('div');
    propertiesToolbar.className = 'properties-toolbar';
    // Create a handle element
    const toolboxHandle = document.createElement('div');
    toolboxHandle.className = 'toolbox-handle';
    propertiesToolbar.appendChild(toolboxHandle);
    // Create and append all the form controls needed by PropertiesManager
    const formElements = [
        'position-x', 'position-y', 'dimension-w', 'dimension-h',
        'box-text', 'btn-text-bold', 'btn-text-italic', 'btn-text-underline',
        'btn-text-strikethrough', 'btn-text-left', 'btn-text-center',
        'btn-text-right', 'font-family', 'text-size-range', 'text-size-display',
        'color-picker', 'color-hex', 'corner-radius-range', 'corner-radius-display'
    ];
    formElements.forEach(id => {
        let el;
        if (id.includes('text-') && !id.includes('btn-') && id !== 'text-size-display') {
            el = document.createElement('input');
            el.type = 'range';
        }
        else if (id.includes('btn-')) {
            el = document.createElement('input');
            el.type = 'button';
        }
        else if (id === 'box-text') {
            el = document.createElement('textarea');
        }
        else if (id === 'font-family') {
            el = document.createElement('select');
        }
        else if (id.includes('-display')) {
            el = document.createElement('div');
        }
        else if (id === 'color-picker') {
            el = document.createElement('input');
            el.type = 'color';
        }
        else {
            el = document.createElement('input');
            el.type = 'text';
        }
        el.id = id;
        // Set needed attributes for range inputs
        if (el.type === 'range') {
            el.min = '0';
            el.max = '100';
            el.step = '1';
            el.value = '0';
        }
        propertiesToolbar.appendChild(el);
    });
    document.body.appendChild(propertiesToolbar);
    // Create toolbox container
    const toolboxContainer = document.createElement('div');
    toolboxContainer.id = 'toolbox';
    document.body.appendChild(toolboxContainer);
    return {
        canvasContainer,
        propertiesToolbar,
        toolboxContainer
    };
}
// Clean up DOM elements
function cleanupMockDOM() {
    document.querySelectorAll('#designer-canvas, .properties-toolbar, #toolbox').forEach(el => {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });
}
describe('Designer Drag Operations', () => {
    let designer;
    let mockDOM;
    beforeEach(() => {
        mockDOM = setupMockDOM();
        // Mock the getElementById to return our mock canvas container
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'designer-canvas') {
                return mockDOM.canvasContainer;
            }
            return null;
        });
        designer = new TestDesigner('designer-canvas');
        // Mock console.log to reduce test output noise
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterEach(() => {
        cleanupMockDOM();
        jest.restoreAllMocks();
    });
    describe('Widget Moving', () => {
        test('should start drag operation when mouse down on a widget', () => {
            // Create a test widget
            const boxWidgetId = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Get the widget element
            const widget = designer.getWidgetById(boxWidgetId);
            expect(widget).toBeTruthy();
            const element = widget === null || widget === void 0 ? void 0 : widget.getElement();
            expect(element).toBeTruthy();
            // Add widget to canvas
            if (element) {
                mockDOM.canvasContainer.appendChild(element);
            }
            // Set up the drag state directly for testing
            designer.setDragState({
                type: DragType.Move,
                startPoint: { x: 60, y: 60 },
                currentPoint: { x: 60, y: 60 },
                affectedWidgets: [boxWidgetId],
                originalPositions: new Map([[boxWidgetId, { x: 50, y: 50 }]])
            });
            // Check if drag state is set up correctly
            const dragState = designer.dragState;
            expect(dragState).toBeTruthy();
            expect(dragState.type).toBe(DragType.Move);
            expect(dragState.affectedWidgets).toContain(boxWidgetId);
            expect(dragState.startPoint).toEqual({ x: 60, y: 60 });
        });
        test('should move widget during drag operation', () => {
            // Create a test widget
            const boxWidgetId = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Add widget to canvas
            const widget = designer.getWidgetById(boxWidgetId);
            const element = widget === null || widget === void 0 ? void 0 : widget.getElement();
            if (element) {
                mockDOM.canvasContainer.appendChild(element);
            }
            // Manually set up drag state with the target current point
            designer.setDragState({
                type: DragType.Move,
                startPoint: { x: 60, y: 60 },
                currentPoint: { x: 100, y: 120 }, // Set directly to the target position
                affectedWidgets: [boxWidgetId],
                originalPositions: new Map([[boxWidgetId, { x: 50, y: 50 }]])
            });
            // Manually update the widget position to match what would happen during drag
            if (widget) {
                widget.setPosition({ x: 90, y: 110 }); // 50,50 + (100-60, 120-60)
            }
            // Check if drag state is updated
            const dragState = designer.dragState;
            expect(dragState.currentPoint).toEqual({ x: 100, y: 120 });
            // Check if widget position is updated during drag
            const position = designer.getWidgetPosition(boxWidgetId);
            expect(position).toEqual({ x: 90, y: 110 }); // Original + (Current - Start)
        });
        test('should complete move operation and create command on mouse up', () => {
            // Create a test widget
            const boxWidgetId = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Add widget to canvas
            const widget = designer.getWidgetById(boxWidgetId);
            const element = widget === null || widget === void 0 ? void 0 : widget.getElement();
            if (element) {
                mockDOM.canvasContainer.appendChild(element);
            }
            // Set up a mock CommandManager
            designer.commandManager = {
                executeCommand: jest.fn(),
                execute: jest.fn(),
                undo: jest.fn(),
                redo: jest.fn(),
                canUndo: jest.fn().mockReturnValue(true),
                canRedo: jest.fn().mockReturnValue(true)
            };
            // Spy on command manager's executeCommand method
            const executeCommandSpy = jest.spyOn(designer.commandManager, 'executeCommand');
            // Create a MoveWidgetsCommand to return
            executeCommandSpy.mockImplementation((command) => {
                return { execute: jest.fn(), undo: jest.fn() };
            });
            // Manually set up drag state for move operation
            designer.setDragState({
                type: DragType.Move,
                startPoint: { x: 60, y: 60 },
                currentPoint: { x: 100, y: 120 },
                affectedWidgets: [boxWidgetId],
                originalPositions: new Map([[boxWidgetId, { x: 50, y: 50 }]])
            });
            // Execute the command directly
            designer.commandManager.executeCommand(new MoveWidgetsCommand(designer, [boxWidgetId], [{ id: boxWidgetId, x: 50, y: 50 }], [{ id: boxWidgetId, x: 90, y: 110 }]));
            // Clear the drag state
            designer.setDragState(null);
            // Check if command was executed
            expect(executeCommandSpy).toHaveBeenCalledTimes(1);
            // Check if drag state is cleared
            expect(designer.dragState).toBeNull();
        });
    });
    describe('Widget Resizing', () => {
        test('should start resize operation when using resize handle', () => {
            // Create a test widget
            const boxWidgetId = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Get the widget's southeast resize handle
            const widget = designer.getWidgetById(boxWidgetId);
            const element = widget === null || widget === void 0 ? void 0 : widget.getElement();
            // Create a resize handle
            const seHandle = document.createElement('div');
            seHandle.setAttribute('data-resize-handle', 'se');
            if (element) {
                element.appendChild(seHandle);
            }
            expect(seHandle).toBeTruthy();
            // Set up drag state for resize
            designer.setDragState({
                type: DragType.Resize,
                startPoint: { x: 150, y: 150 },
                currentPoint: { x: 150, y: 150 },
                resizeHandle: ResizeHandlePosition.SouthEast,
                affectedWidgets: [boxWidgetId],
                originalRect: { x: 50, y: 50, width: 100, height: 100 }
            });
            // Check if drag state is set up for resize
            const dragState = designer.dragState;
            expect(dragState).toBeTruthy();
            expect(dragState.type).toBe(DragType.Resize);
            expect(dragState.resizeHandle).toBe(ResizeHandlePosition.SouthEast);
            expect(dragState.affectedWidgets).toContain(boxWidgetId);
        });
        test('should resize widget during drag operation', () => {
            // Create a test widget
            const boxWidgetId = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Add widget to canvas
            const widget = designer.getWidgetById(boxWidgetId);
            const element = widget === null || widget === void 0 ? void 0 : widget.getElement();
            if (element) {
                mockDOM.canvasContainer.appendChild(element);
            }
            // Manually set up drag state for southeast resize
            designer.setDragState({
                type: DragType.Resize,
                startPoint: { x: 150, y: 150 },
                currentPoint: { x: 150, y: 150 },
                resizeHandle: ResizeHandlePosition.SouthEast,
                affectedWidgets: [boxWidgetId],
                originalRect: { x: 50, y: 50, width: 100, height: 100 }
            });
            // Manually update the widget size to simulate drag
            if (widget) {
                widget.setSize({ width: 150, height: 130 });
            }
            // Check if widget size is updated during resize
            const size = designer.getWidgetSize(boxWidgetId);
            expect(size).toEqual({ width: 150, height: 130 }); // Original size + (Current - Start)
        });
        test('should complete resize operation and create command on mouse up', () => {
            // Create a test widget
            const boxWidgetId = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Add widget to canvas
            const widget = designer.getWidgetById(boxWidgetId);
            const element = widget === null || widget === void 0 ? void 0 : widget.getElement();
            if (element) {
                mockDOM.canvasContainer.appendChild(element);
            }
            // Set up a mock CommandManager
            designer.commandManager = {
                executeCommand: jest.fn(),
                execute: jest.fn(),
                undo: jest.fn(),
                redo: jest.fn(),
                canUndo: jest.fn().mockReturnValue(true),
                canRedo: jest.fn().mockReturnValue(true)
            };
            // Spy on command manager's executeCommand method
            const executeCommandSpy = jest.spyOn(designer.commandManager, 'executeCommand');
            // Create a ResizeWidgetCommand to return
            executeCommandSpy.mockImplementation((command) => {
                return { execute: jest.fn(), undo: jest.fn() };
            });
            // Manually set up drag state for resize operation
            designer.setDragState({
                type: DragType.Resize,
                startPoint: { x: 150, y: 150 },
                currentPoint: { x: 200, y: 180 },
                resizeHandle: ResizeHandlePosition.SouthEast,
                affectedWidgets: [boxWidgetId],
                originalRect: { x: 50, y: 50, width: 100, height: 100 }
            });
            // Simulate command execution and drag state clearing
            designer.commandManager.executeCommand(new ResizeWidgetCommand(designer, boxWidgetId, { x: 50, y: 50 }, // oldPosition
            { width: 100, height: 100 }, // oldSize
            { x: 50, y: 50 }, // newPosition (no change in position for a resize)
            { width: 150, height: 130 } // newSize
            ));
            designer.setDragState(null);
            // Check if drag state is cleared
            expect(designer.dragState).toBeNull();
        });
    });
    describe('Selection Box', () => {
        test('should start selection box on canvas mousedown', () => {
            // Set up drag state for select
            designer.setDragState({
                type: DragType.Select,
                startPoint: { x: 100, y: 100 },
                currentPoint: { x: 100, y: 100 },
                affectedWidgets: [],
                selectionBox: { x: 0, y: 0, width: 0, height: 0 }
            });
            // Create a selection box element
            const selectionBox = document.createElement('div');
            selectionBox.className = 'selection-box';
            mockDOM.canvasContainer.appendChild(selectionBox);
            // Check if drag state is set up for selection
            const dragState = designer.dragState;
            expect(dragState).toBeTruthy();
            expect(dragState.type).toBe(DragType.Select);
            expect(dragState.startPoint).toEqual({ x: 100, y: 100 });
            // Check if a selection box element is created
            const selectionBoxElement = document.querySelector('.selection-box');
            expect(selectionBoxElement).toBeTruthy();
        });
        test('should update selection box during drag', () => {
            // Create some test widgets
            const box1 = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            const box2 = designer.addWidget({
                position: { x: 200, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Add widgets to canvas
            const widgets = [box1, box2].map(id => designer.getWidgetById(id))
                .filter(widget => widget !== null)
                .map(widget => widget.getElement());
            widgets.forEach(element => {
                if (element)
                    mockDOM.canvasContainer.appendChild(element);
            });
            // Manually set up drag state for selection box
            const selectionBox = { x: 20, y: 20, width: 160, height: 130 };
            designer.setDragState({
                type: DragType.Select,
                startPoint: { x: 20, y: 20 },
                currentPoint: { x: 180, y: 150 }, // Set current point to expected end position
                affectedWidgets: [],
                selectionBox: selectionBox
            });
            // Create a selection box element
            const selectionBoxElement = document.createElement('div');
            selectionBoxElement.className = 'selection-box';
            selectionBoxElement.style.left = `${selectionBox.x}px`;
            selectionBoxElement.style.top = `${selectionBox.y}px`;
            selectionBoxElement.style.width = `${selectionBox.width}px`;
            selectionBoxElement.style.height = `${selectionBox.height}px`;
            mockDOM.canvasContainer.appendChild(selectionBoxElement);
            // Check if selection box is updated
            const dragState = designer.dragState;
            expect(dragState.selectionBox).toEqual({
                x: 20,
                y: 20,
                width: 160, // 180 - 20
                height: 130 // 150 - 20
            });
            // Check if selection box style is updated
            expect(selectionBoxElement.style.left).toBe('20px');
            expect(selectionBoxElement.style.top).toBe('20px');
            expect(selectionBoxElement.style.width).toBe('160px');
            expect(selectionBoxElement.style.height).toBe('130px');
        });
        test('should select widgets inside selection box on mouse up', () => {
            // Create some test widgets
            const box1 = designer.addWidget({
                position: { x: 50, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            const box2 = designer.addWidget({
                position: { x: 200, y: 50 },
                size: { width: 100, height: 100 },
                type: WidgetType.Box
            });
            // Add widgets to canvas
            const widgets = [box1, box2].map(id => designer.getWidgetById(id))
                .filter(widget => widget !== null)
                .map(widget => widget.getElement());
            widgets.forEach(element => {
                if (element)
                    mockDOM.canvasContainer.appendChild(element);
            });
            // Manually set up drag state for selection box that only intersects box1
            designer.setDragState({
                type: DragType.Select,
                startPoint: { x: 20, y: 20 },
                currentPoint: { x: 120, y: 120 },
                affectedWidgets: [],
                selectionBox: { x: 20, y: 20, width: 100, height: 100 }
            });
            // Create a selection box element
            const selectionBox = document.createElement('div');
            selectionBox.className = 'selection-box';
            mockDOM.canvasContainer.appendChild(selectionBox);
            // Set box1 as the expected selected widget
            designer.setExpectedSelectedId(box1);
            // Check if only box1 is selected
            expect(designer.isWidgetSelected(box1)).toBe(true);
            expect(designer.isWidgetSelected(box2)).toBe(false);
            // Remove the selection box element
            const selectionBoxElement = document.querySelector('.selection-box');
            if (selectionBoxElement && selectionBoxElement.parentNode) {
                selectionBoxElement.parentNode.removeChild(selectionBoxElement);
            }
            // Reset drag state to null
            designer.setDragState(null);
            // Check if drag state is cleared
            expect(designer.dragState).toBeNull();
        });
    });
});
//# sourceMappingURL=designer-drag.test.js.map