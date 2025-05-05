import { Widget } from '../widget.js';
import { CommandManager } from '../commands/command.js';
import { getClipboard } from '../clipboard.js';
import { SelectionManager } from '../selection-manager.js';
import { ToolboxManager } from '../toolbox-manager.js';
// Core Designer class with shared functionality
export class Designer {
    /**
     * Constructor for the Designer class.
     * @param canvasElementId - The ID of the canvas element where widgets will be placed.
     */
    constructor(canvasElementId) {
        this.widgets = new Map();
        this.nextZIndex = 1;
        this.clipboard = getClipboard();
        this.dragState = null;
        const element = document.getElementById(canvasElementId);
        if (!element) {
            throw new Error(`Element with ID ${canvasElementId} not found`);
        }
        this.canvasElement = element;
        this.commandManager = new CommandManager(() => this.updateUI());
        this.selectionManager = new SelectionManager((selectedIds) => this.handleSelectionChange(selectedIds));
        this.toolboxManager = new ToolboxManager(this.canvasElement);
        // Bind event handlers to maintain context
        this.boundMouseMoveHandler = this.handleDocumentMouseMove.bind(this);
        this.boundMouseUpHandler = this.handleDocumentMouseUp.bind(this);
        this.initEventListeners();
    }
    /**
     * Registers a toolbox element to make it draggable.
     * @param id - Unique identifier for the toolbox.
     * @param element - The HTML element to be made draggable.
     */
    registerToolbox(id, element) {
        this.toolboxManager.registerToolbox(id, element);
    }
    /**
     * Sets the position of a toolbox.
     * @param id - The ID of the toolbox.
     * @param position - The new position.
     */
    setToolboxPosition(id, position) {
        this.toolboxManager.setToolboxPosition(id, position);
    }
    // IDesignerCommands implementation
    /**
     * Adds a new widget to the designer.
     * @param widgetData - Partial data for the widget to be added.
     * @returns The ID of the newly added widget.
     */
    addWidget(widgetData = {}) {
        const id = widgetData.id || `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const defaultData = {
            id,
            position: { x: 100, y: 100 },
            size: { width: 150, height: 100 },
            zIndex: this.nextZIndex++,
            type: 'basic',
            content: 'New Widget'
        };
        const mergedData = Object.assign(Object.assign(Object.assign({}, defaultData), widgetData), { id });
        const widget = new Widget(mergedData);
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        this.widgets.set(id, widget);
        this.canvasElement.appendChild(widget.getElement());
        return id;
    }
    /**
     * Adds a widget with a specific ID to the designer.
     * @param widgetData - Data for the widget to be added.
     */
    addWidgetWithId(widgetData) {
        if (this.widgets.has(widgetData.id)) {
            console.warn(`Widget with ID ${widgetData.id} already exists`);
            return;
        }
        const widget = new Widget(widgetData);
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        this.widgets.set(widgetData.id, widget);
        this.canvasElement.appendChild(widget.getElement());
        // Update next z-index if needed
        this.nextZIndex = Math.max(this.nextZIndex, widgetData.zIndex + 1);
    }
    /**
     * Removes a widget from the designer.
     * @param widgetId - The ID of the widget to be removed.
     */
    removeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.destructor();
            this.widgets.delete(widgetId);
            if (this.selectionManager.isWidgetSelected(widgetId)) {
                this.selectionManager.deselectWidget(widgetId);
            }
        }
    }
    /**
     * Gets the data of a widget.
     * @param widgetId - The ID of the widget.
     * @returns The data of the widget or null if the widget does not exist.
     */
    getWidgetData(widgetId) {
        const widget = this.widgets.get(widgetId);
        return widget ? widget.getData() : null;
    }
    /**
     * Sets the position of a widget.
     * @param widgetId - The ID of the widget.
     * @param position - The new position of the widget.
     */
    setWidgetPosition(widgetId, position) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.setPosition(position);
        }
    }
    /**
     * Sets the size of a widget.
     * @param widgetId - The ID of the widget.
     * @param size - The new size of the widget.
     */
    setWidgetSize(widgetId, size) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.setSize(size);
        }
    }
    /**
     * Sets the z-index of a widget.
     * @param widgetId - The ID of the widget.
     * @param zIndex - The new z-index of the widget.
     */
    setWidgetZIndex(widgetId, zIndex) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.setZIndex(zIndex);
            // Update nextZIndex if needed
            this.nextZIndex = Math.max(this.nextZIndex, zIndex + 1);
        }
    }
    /**
     * Brings a widget to the front by setting its z-index.
     * @param widgetId - The ID of the widget.
     */
    bringToFront(widgetId) {
        this.setWidgetZIndex(widgetId, this.nextZIndex++);
    }
    // Public helper methods
    /**
     * Gets the reference widget, which is the first selected widget.
     * @returns The reference widget or null if no widget is selected.
     */
    getReferenceWidget() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return null;
        const referenceId = selectedIds[0]; // First selected is the reference
        return this.widgets.get(referenceId) || null;
    }
    /**
     * Converts a mouse event to a client point relative to the canvas.
     * @param e - The mouse event.
     * @returns The client point.
     */
    getClientPointFromEvent(e) {
        const rect = this.canvasElement.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    /**
     * Finds a widget at a specific point.
     * @param point - The point to check.
     * @returns The widget at the point or null if no widget is found.
     */
    findWidgetAtPoint(point) {
        // Check for widgets in reverse z-index order
        const sortedWidgets = Array.from(this.widgets.values()).sort((a, b) => b.getData().zIndex - a.getData().zIndex);
        for (const widget of sortedWidgets) {
            if (widget.isPointInside(point)) {
                return widget;
            }
        }
        return null;
    }
    // These methods will be implemented in the extended classes
    /**
     * Handles selection change events.
     * @param selectedIds - The IDs of the selected widgets.
     */
    handleSelectionChange(selectedIds) { }
    /**
     * Handles the start of a resize event.
     * @param widgetId - The ID of the widget being resized.
     * @param handlePosition - The position of the resize handle.
     * @param event - The mouse event.
     */
    handleResizeStart(widgetId, handlePosition, event) { }
    /**
     * Handles mouse move events on the document.
     * @param e - The mouse event.
     */
    handleDocumentMouseMove(e) { }
    /**
     * Handles mouse up events on the document.
     * @param e - The mouse event.
     */
    handleDocumentMouseUp(e) { }
    /**
     * Handles mouse down events on the canvas.
     * @param e - The mouse event.
     */
    handleCanvasMouseDown(e) { }
    /**
     * Updates the UI. This method should be overridden by subclasses.
     */
    updateUI() { }
    /**
     * Initializes event listeners. This method should be overridden by subclasses.
     */
    initEventListeners() { }
    /**
     * Updates the state of a button. This method should be overridden by subclasses.
     * @param buttonId - The ID of the button.
     * @param enabled - Whether the button should be enabled or disabled.
     */
    updateButtonState(buttonId, enabled) { }
}
//# sourceMappingURL=designer-core.js.map