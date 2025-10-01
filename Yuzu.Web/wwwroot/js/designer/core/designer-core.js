import { WidgetType } from '../types.js';
import { CommandManager } from '../commands/command.js';
import { GroupWidgetsCommand, UngroupWidgetsCommand } from '../commands/group-commands.js';
import { getClipboard } from '../clipboard.js';
import { SelectionManager } from '../selection-manager.js';
import { ToolboxManager } from '../toolbox-manager.js';
import { PropertiesManager } from '../properties-manager.js';
import { WidgetFactory } from '../widgets/widget-factory.js';
// Core Designer class with shared functionality
export class Designer {
    /**
     * Helper method to safely cast a Widget to GroupWidget
     * @param widget - The widget to cast
     * @returns The widget as a GroupWidget with necessary properties
     */
    safeCastToGroupWidget(widget) {
        if (!widget)
            return null;
        // Check if the widget is a GroupWidget by checking for required methods
        const widgetAny = widget;
        if (typeof widgetAny.getChildIds !== 'function') {
            if (typeof WidgetLogger !== 'undefined') {
                WidgetLogger.error('Designer', `Widget ${widget.getId()} is not a valid GroupWidget`);
            }
            console.error(`Widget ${widget.getId()} is not a valid GroupWidget`);
            return null;
        }
        return widgetAny;
    }
    /**
     * Constructor for the Designer class.
     * @param canvasElementId - The ID of the canvas element where widgets will be placed.
     */
    constructor(canvasElementId) {
        this.widgets = new Map();
        this.nextZIndex = 1;
        this.clipboard = getClipboard();
        this.dragState = null;
        this.previewMode = false;
        // Track if there are unsaved changes
        this.hasChanges = false;
        const element = document.getElementById(canvasElementId);
        if (!element) {
            throw new Error(`Element with ID ${canvasElementId} not found`);
        }
        this.canvasElement = element;
        this.commandManager = new CommandManager(() => this.updateUI());
        this.selectionManager = new SelectionManager((selectedIds) => this.handleSelectionChange(selectedIds));
        this.toolboxManager = new ToolboxManager(this.canvasElement);
        this.propertiesManager = new PropertiesManager(this.canvasElement);
        // Bind event handlers to maintain context
        this.boundMouseMoveHandler = this.handleDocumentMouseMove.bind(this);
        this.boundMouseUpHandler = this.handleDocumentMouseUp.bind(this);
        this.initEventListeners();
        // Set up periodic maintenance to prevent performance degradation
        this.setupPeriodicMaintenance();
    }
    /**
     * Sets up periodic maintenance to keep the designer responsive
     * by cleaning up stale state and forcing DOM synchronization.
     */
    setupPeriodicMaintenance() {
        // Run maintenance every 30 seconds
        const MAINTENANCE_INTERVAL = 30000; // 30 seconds
        console.log(`[Debug] Setting up periodic maintenance every ${MAINTENANCE_INTERVAL / 1000} seconds`);
        setInterval(() => {
            console.log(`[Debug] Running periodic maintenance`);
            // If no drag is in progress, perform maintenance
            if (!this.dragState) {
                // Force DOM state refresh for all widgets
                this.widgets.forEach(widget => {
                    widget.updateDomFromData();
                });
                // Update cached positions
                const canvasRect = this.canvasElement.getBoundingClientRect();
                console.log(`[Debug] Refreshed canvas position: x=${canvasRect.left}, y=${canvasRect.top}`);
                // Clean any stale event listeners
                if (this.dragState === null) {
                    // Just in case, remove document event listeners as safety
                    document.removeEventListener('mousemove', this.boundMouseMoveHandler);
                    document.removeEventListener('mouseup', this.boundMouseUpHandler);
                }
            }
        }, MAINTENANCE_INTERVAL);
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
            type: WidgetType.Box,
            properties: {
                backgroundColor: '#3498db',
                borderRadius: 0
            }
        };
        // Ensure the type is set (default to Box if not specified)
        const type = widgetData.type || WidgetType.Box;
        const mergedData = Object.assign(Object.assign(Object.assign({}, defaultData), widgetData), { id, type });
        // Create widget using factory
        const widget = WidgetFactory.createWidget(mergedData);
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        // Add group-specific event listeners if it's a group widget
        this.addGroupEventListeners(widget);
        this.widgets.set(id, widget);
        this.canvasElement.appendChild(widget.getElement());
        // Mark that there are unsaved changes
        this.hasChanges = true;
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
        // Create widget using factory
        const widget = WidgetFactory.createWidget(widgetData);
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        // Add group-specific event listeners if it's a group widget
        this.addGroupEventListeners(widget);
        this.widgets.set(widgetData.id, widget);
        this.canvasElement.appendChild(widget.getElement());
        // Update next z-index if needed
        this.nextZIndex = Math.max(this.nextZIndex, widgetData.zIndex + 1);
        console.log(`Widget added with ID ${widgetData.id}, type ${widgetData.type}`);
    }
    /**
     * Adds a pre-created widget to the designer.
     * This is used by commands that need to add widgets directly.
     * @param widget - The widget to add
     */
    addCreatedWidget(widget) {
        const id = widget.getId();
        if (this.widgets.has(id)) {
            console.warn(`Widget with ID ${id} already exists`);
            return;
        }
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        // Add group-specific event listeners if it's a group widget
        this.addGroupEventListeners(widget);
        this.widgets.set(id, widget);
        this.canvasElement.appendChild(widget.getElement());
        // Update next z-index if needed
        const zIndex = widget.getData().zIndex;
        this.nextZIndex = Math.max(this.nextZIndex, zIndex + 1);
        console.log(`Created widget added with ID ${id}, type ${widget.getData().type}`);
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
        console.log(`[Debug] findWidgetAtPoint called with point (${point.x}, ${point.y})`);
        // Check for widgets in reverse z-index order (top to bottom visually)
        const sortedWidgets = Array.from(this.widgets.values()).sort((a, b) => b.getData().zIndex - a.getData().zIndex);
        console.log(`[Debug] Checking ${sortedWidgets.length} widgets for hit detection`);
        // Add a small tolerance for hit detection (5px in each direction)
        const tolerance = 5;
        for (const widget of sortedWidgets) {
            const rect = widget.getRect();
            // Check with tolerance
            const isInside = point.x >= rect.x - tolerance &&
                point.x <= rect.x + rect.width + tolerance &&
                point.y >= rect.y - tolerance &&
                point.y <= rect.y + rect.height + tolerance;
            if (isInside) {
                console.log(`[Debug] Found widget ${widget.getId()} at point (${point.x}, ${point.y}) with tolerance`);
                return widget;
            }
            // Standard check through the widget itself (uses widget's implementation)
            if (widget.isPointInside(point)) {
                console.log(`[Debug] Found widget ${widget.getId()} at point (${point.x}, ${point.y})`);
                return widget;
            }
        }
        console.log(`[Debug] No widget found at point (${point.x}, ${point.y})`);
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
    /**
     * Enters preview mode where all editing controls are hidden and widgets are locked
     */
    enterPreviewMode() {
        this.previewMode = true;
        // Clear any current selection
        this.selectionManager.clearSelection();
        // Hide all toolboxes
        this.toolboxManager.hideAllToolboxes();
        // Hide property panel
        this.propertiesManager.hidePropertiesPanel();
        // Hide all widget handles and make them uninteractive
        this.widgets.forEach(widget => {
            // Hide group widgets completely in preview mode
            if (widget.getData().type === WidgetType.Group) {
                widget.getElement().style.display = 'none';
            }
            else {
                widget.setPreviewMode(true);
            }
        });
        // Add preview-mode class to canvas and body for CSS styling
        this.canvasElement.classList.add('preview-mode');
        document.body.classList.add('preview-mode');
        // Force hide the main toolbar (may not be registered with toolboxManager)
        const mainToolbar = document.querySelector('.toolbar');
        if (mainToolbar) {
            // Store original display value in a data attribute for restoration
            if (!mainToolbar.getAttribute('data-original-display')) {
                mainToolbar.setAttribute('data-original-display', window.getComputedStyle(mainToolbar).display);
            }
            mainToolbar.style.display = 'none';
        }
        // Hide action buttons
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
        // Create exit preview button if it doesn't exist
        let exitPreviewButton = document.getElementById('exit-preview-button');
        if (!exitPreviewButton) {
            exitPreviewButton = document.createElement('button');
            exitPreviewButton.id = 'exit-preview-button';
            exitPreviewButton.className = 'exit-preview-btn';
            exitPreviewButton.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Exit Preview';
            exitPreviewButton.setAttribute('aria-label', 'Exit Preview Mode');
            exitPreviewButton.addEventListener('click', () => this.exitPreviewMode());
            document.body.appendChild(exitPreviewButton);
        }
        else {
            exitPreviewButton.style.display = 'block';
        }
    }
    /**
     * Exits preview mode and restores all editing controls
     */
    exitPreviewMode() {
        this.previewMode = false;
        // Show all toolboxes
        this.toolboxManager.showAllToolboxes();
        // Show property panel if needed
        this.propertiesManager.showPropertiesPanel();
        // Restore widget functionality
        this.widgets.forEach(widget => {
            // Restore display of group widgets
            if (widget.getData().type === WidgetType.Group) {
                widget.getElement().style.display = 'block';
            }
            widget.setPreviewMode(false);
        });
        // Remove preview-mode class from canvas and body
        this.canvasElement.classList.remove('preview-mode');
        document.body.classList.remove('preview-mode');
        // Restore the main toolbar with its original display value
        const mainToolbar = document.querySelector('.toolbar');
        if (mainToolbar) {
            const originalDisplay = mainToolbar.getAttribute('data-original-display') || 'flex';
            mainToolbar.style.display = originalDisplay;
        }
        // Show action buttons
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'flex';
        }
        // Hide exit preview button
        const exitPreviewButton = document.getElementById('exit-preview-button');
        if (exitPreviewButton) {
            exitPreviewButton.style.display = 'none';
        }
    }
    /**
     * Check if designer is in preview mode
     * @returns whether the designer is currently in preview mode
     */
    isInPreviewMode() {
        return this.previewMode;
    }
    /**
     * Checks if there are unsaved changes
     * @returns True if there are unsaved changes, false otherwise
     */
    hasUnsavedChanges() {
        return this.hasChanges;
    }
    /**
     * Marks the designer as having unsaved changes
     * This can be called from outside the class to indicate changes
     * that wouldn't otherwise be tracked, like background changes
     */
    markAsChanged() {
        this.hasChanges = true;
    }
    /**
     * Serialize the entire canvas state to JSON for saving
     * @returns A JSON string representing the entire canvas state
     */
    saveDesign() {
        const widgetDataArray = [];
        // Collect data from all widgets
        this.widgets.forEach(widget => {
            widgetDataArray.push(widget.getData());
        });
        // Create a serializable object with all canvas data
        const canvasData = {
            widgets: widgetDataArray,
            nextZIndex: this.nextZIndex
        };
        // Reset the changes flag once we save
        this.hasChanges = false;
        return JSON.stringify(canvasData);
    }
    /**
     * Load a design from serialized JSON data
     * @param jsonData - The serialized JSON data representing the canvas state
     */
    loadDesign(jsonData) {
        var _a;
        try {
            // Parse the JSON data
            const canvasData = JSON.parse(jsonData);
            // Clear existing widgets
            this.clearAllWidgets();
            // Set the nextZIndex from the data
            if (canvasData.nextZIndex) {
                this.nextZIndex = canvasData.nextZIndex;
            }
            // Add all widgets from the data
            if (Array.isArray(canvasData.widgets)) {
                canvasData.widgets.forEach(widgetData => {
                    this.addWidgetWithId(widgetData);
                });
            }
            // Update UI state
            this.updateUI();
            // Reset the changes flag after loading a design
            this.hasChanges = false;
            console.log(`Loaded design with ${((_a = canvasData.widgets) === null || _a === void 0 ? void 0 : _a.length) || 0} widgets`);
        }
        catch (error) {
            console.error('Error loading design:', error);
            throw new Error('Failed to load design data: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    /**
     * Clears all widgets from the canvas
     */
    clearAllWidgets() {
        // Remove all widgets
        this.widgets.forEach(widget => {
            widget.destructor();
        });
        // Clear the widgets map
        this.widgets.clear();
        // Clear selection
        this.selectionManager.clearSelection();
        // Reset z-index counter
        this.nextZIndex = 1;
    }
    /**
     * Performs a complete reset of the designer state to clear any potential
     * stale state, event handlers, or memory issues.
     */
    resetDesignerState() {
        console.log(`[Debug] Performing full designer state reset`);
        // 1. Clear any existing drag state
        if (this.dragState) {
            document.removeEventListener('mousemove', this.boundMouseMoveHandler);
            document.removeEventListener('mouseup', this.boundMouseUpHandler);
            this.dragState = null;
            console.log(`[Debug] Cleared drag state and removed event listeners`);
        }
        // 2. Clear selection
        this.selectionManager.clearSelection();
        // 3. Force refresh DOM-related caches
        const canvasRect = this.canvasElement.getBoundingClientRect();
        console.log(`[Debug] Refreshed canvas rect: x=${canvasRect.left}, y=${canvasRect.top}, w=${canvasRect.width}, h=${canvasRect.height}`);
        // 4. Perform garbage collection hint (if available in debug mode)
        // Note: this is non-standard and only available in some debug environments
        try {
            console.log(`[Debug] Attempting to request garbage collection`);
            // @ts-ignore: gc is a non-standard debug function
            if (window.gc) {
                // @ts-ignore: gc is a non-standard debug function
                window.gc();
            }
        }
        catch (e) {
            console.log(`[Debug] Garbage collection not available`);
        }
        // 5. Force redraw of all widgets to ensure DOM is in sync
        console.log(`[Debug] Forcing redraw of all widgets`);
        this.widgets.forEach(widget => {
            widget.updateDomFromData();
        });
        console.log(`[Debug] Designer state reset complete`);
    }
    /**
     * Groups the currently selected widgets.
     * Creates a group widget containing the selected widgets.
     */
    groupSelectedWidgets() {
        console.log('groupSelectedWidgets called');
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        console.log('Selected IDs in groupSelectedWidgets:', selectedIds);
        // Check if we have at least 2 widgets selected
        if (selectedIds.length < 2) {
            console.warn('At least 2 widgets must be selected to create a group');
            return;
        }
        // Check if any of the selected widgets is already in a group
        const hasGroupInSelection = selectedIds.some(id => {
            const widget = this.widgets.get(id);
            return widget && widget.getElement().classList.contains('in-group');
        });
        if (hasGroupInSelection) {
            console.warn('Cannot group widgets that are already part of a group');
            return;
        }
        // Check if any of the selected widgets is a group
        const hasGroupWidget = selectedIds.some(id => {
            const widget = this.widgets.get(id);
            return widget && widget.getData().type === WidgetType.Group;
        });
        if (hasGroupWidget) {
            console.warn('Cannot nest groups - select only non-group widgets');
            return;
        }
        // Log the current state before grouping
        console.log('Before grouping - selected widgets info:');
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                console.log(`Widget ${id}:`, {
                    position: widget.getData().position,
                    size: widget.getData().size,
                    zIndex: widget.getData().zIndex,
                    type: widget.getData().type
                });
            }
        });
        // Execute the group command
        const command = new GroupWidgetsCommand(selectedIds, this, (ids) => {
            this.selectionManager.clearSelection();
            ids.forEach(id => this.selectionManager.selectWidget(id, true));
        });
        this.commandManager.execute(command);
    }
    /**
     * Ungroups the selected group widgets.
     * Removes the group widgets and restores their contained widgets.
     */
    ungroupSelectedWidgets() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        // Filter out non-group widgets
        const groupWidgetIds = selectedIds.filter(id => {
            const widget = this.widgets.get(id);
            return widget && widget.getData().type === WidgetType.Group;
        });
        if (groupWidgetIds.length === 0) {
            console.warn('No group widgets selected');
            return;
        }
        // Execute the ungroup command
        const command = new UngroupWidgetsCommand(groupWidgetIds, this, (ids) => {
            this.selectionManager.clearSelection();
            ids.forEach(id => this.selectionManager.selectWidget(id, true));
        });
        this.commandManager.execute(command);
    }
    /**
     * Checks if the selected widgets can be grouped.
     * @returns True if the selected widgets can be grouped, false otherwise.
     */
    canGroupSelectedWidgets() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        // Need at least 2 widgets to create a group
        if (selectedIds.length < 2) {
            return false;
        }
        // Check if any of the selected widgets is already in a group
        const hasGroupInSelection = selectedIds.some(id => {
            const widget = this.widgets.get(id);
            return widget && widget.getElement().classList.contains('in-group');
        });
        if (hasGroupInSelection) {
            return false;
        }
        // Check if any of the selected widgets is a group
        const hasGroupWidget = selectedIds.some(id => {
            const widget = this.widgets.get(id);
            return widget && widget.getData().type === WidgetType.Group;
        });
        return !hasGroupWidget;
    }
    /**
     * Checks if the selected widgets can be ungrouped.
     * @returns True if the selected widgets can be ungrouped, false otherwise.
     */
    canUngroupSelectedWidgets() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        // Check if any of the selected widgets is a group
        const hasGroupWidget = selectedIds.some(id => {
            const widget = this.widgets.get(id);
            return widget && widget.getData().type === WidgetType.Group;
        });
        return hasGroupWidget;
    }
    /**
     * Handles group movement events.
     * When a group is moved, all its children should move with it.
     * @param groupId - The ID of the group.
     * @param offset - The offset to apply to the children.
     */
    handleGroupMove(groupId, offset) {
        const widget = this.widgets.get(groupId);
        const groupWidget = this.safeCastToGroupWidget(widget);
        if (!groupWidget || groupWidget.getData().type !== WidgetType.Group) {
            return;
        }
        const childIds = groupWidget.getChildIds();
        childIds.forEach(childId => {
            const childWidget = this.widgets.get(childId);
            if (childWidget) {
                const currentPos = childWidget.getRect();
                childWidget.setPosition({
                    x: currentPos.x + offset.x,
                    y: currentPos.y + offset.y
                });
            }
        });
    }
    /**
     * Handles event listeners for group-specific events.
     * @param widget - The widget to add event listeners to.
     */
    addGroupEventListeners(widget) {
        if (widget.getData().type !== WidgetType.Group) {
            return;
        }
        const element = widget.getElement();
        // Listen for group move events
        element.addEventListener('group-move', (e) => {
            const detail = e.detail;
            const offset = detail.offset;
            this.handleGroupMove(detail.groupId, offset);
        });
        // Listen for group resize events (if we implement this feature)
        element.addEventListener('group-resize', (e) => {
            // Handle group resize if we implement this feature
        });
    }
}
//# sourceMappingURL=designer-core.js.map