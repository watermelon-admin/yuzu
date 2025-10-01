import { Point, Size, Rect, WidgetData, DragState, DragType, ResizeHandlePosition, WidgetType } from '../types.js';
import { Widget } from '../widget.js';
import { CommandManager } from '../commands/command.js';
import { IDesignerCommands } from '../commands/basic-commands.js';
import { GroupWidgetsCommand, UngroupWidgetsCommand } from '../commands/group-commands.js';
import { getClipboard } from '../clipboard.js';
import { SelectionManager } from '../selection-manager.js';
import { ToolboxManager } from '../toolbox-manager.js';
import { PropertiesManager } from '../properties-manager.js';
import { WidgetFactory } from '../widgets/widget-factory.js';
import { GroupWidget } from '../widgets/group-widget.js';
import { WidgetLoggerType } from './designer-events.js';

// Get WidgetLogger from the global scope to avoid circular dependencies
declare const WidgetLogger: WidgetLoggerType;

// Core Designer class with shared functionality
export class Designer implements IDesignerCommands {
    /**
     * Helper method to safely cast a Widget to GroupWidget
     * @param widget - The widget to cast
     * @returns The widget as a GroupWidget with necessary properties
     */
    protected safeCastToGroupWidget(widget: Widget | undefined): any {
        if (!widget) return null;
        
        // Check if the widget is a GroupWidget by checking for required methods
        const widgetAny = widget as any;
        if (typeof widgetAny.getChildIds !== 'function') {
            if (typeof WidgetLogger !== 'undefined') {
                WidgetLogger.error('Designer', `Widget ${widget.getId()} is not a valid GroupWidget`);
            }
            console.error(`Widget ${widget.getId()} is not a valid GroupWidget`);
            return null;
        }
        
        return widgetAny;
    }
    protected canvasElement: HTMLElement;
    protected widgets: Map<string, Widget> = new Map();
    protected nextZIndex: number = 1;
    protected commandManager: CommandManager;
    protected selectionManager: SelectionManager;
    // Make managers public to allow direct access
    public toolboxManager: ToolboxManager;
    public propertiesManager: PropertiesManager;
    protected clipboard = getClipboard();
    protected dragState: DragState | null = null;
    protected previewMode: boolean = false;
    protected dragTimeout: ReturnType<typeof setTimeout> | null = null; // Safety timeout for drag operations
    protected maintenanceInterval: ReturnType<typeof setInterval> | null = null; // Track maintenance interval for cleanup

    // Bound event handlers to ensure they can be properly removed
    protected boundPointerMoveHandler: (e: PointerEvent) => void;
    protected boundPointerUpHandler: (e: PointerEvent) => void;
    protected boundPointerCancelHandler: (e: PointerEvent) => void;

    /**
     * Constructor for the Designer class.
     * @param canvasElementId - The ID of the canvas element where widgets will be placed.
     */
    constructor(canvasElementId: string) {
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
        this.boundPointerMoveHandler = this.handleCanvasPointerMove.bind(this);
        this.boundPointerUpHandler = this.handleCanvasPointerUp.bind(this);
        this.boundPointerCancelHandler = this.handleCanvasPointerCancel.bind(this);

        this.initEventListeners();
        
        // Set up periodic maintenance to prevent performance degradation
        this.setupPeriodicMaintenance();
    }
    
    /**
     * Sets up periodic maintenance to keep the designer responsive
     * by cleaning up stale state and forcing DOM synchronization.
     */
    private setupPeriodicMaintenance(): void {
        // Run maintenance every 30 seconds
        const MAINTENANCE_INTERVAL = 30000; // 30 seconds

        console.log(`[Debug] Setting up periodic maintenance every ${MAINTENANCE_INTERVAL/1000} seconds`);

        this.maintenanceInterval = setInterval(() => {
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
                    // Just in case, remove canvas pointer event listeners as safety
                    this.canvasElement.removeEventListener('pointermove', this.boundPointerMoveHandler);
                    this.canvasElement.removeEventListener('pointerup', this.boundPointerUpHandler);
                    this.canvasElement.removeEventListener('pointercancel', this.boundPointerCancelHandler);
                }
            }
        }, MAINTENANCE_INTERVAL);
    }

    /**
     * Registers a toolbox element to make it draggable.
     * @param id - Unique identifier for the toolbox.
     * @param element - The HTML element to be made draggable.
     */
    public registerToolbox(id: string, element: HTMLElement): void {
        this.toolboxManager.registerToolbox(id, element);
    }

    /**
     * Sets the position of a toolbox.
     * @param id - The ID of the toolbox.
     * @param position - The new position.
     */
    public setToolboxPosition(id: string, position: Point): void {
        this.toolboxManager.setToolboxPosition(id, position);
    }

    // IDesignerCommands implementation

    /**
     * Adds a new widget to the designer.
     * @param widgetData - Partial data for the widget to be added.
     * @returns The ID of the newly added widget.
     */
    public addWidget(widgetData: Partial<WidgetData> = {}): string {
        const id = widgetData.id || `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const defaultData: WidgetData = {
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
        const mergedData: WidgetData = { ...defaultData, ...widgetData, id, type };
        
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
    public addWidgetWithId(widgetData: WidgetData): void {
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
    public addCreatedWidget(widget: Widget): void {
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
    public removeWidget(widgetId: string): void {
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
    public getWidgetData(widgetId: string): WidgetData | null {
        const widget = this.widgets.get(widgetId);
        return widget ? widget.getData() : null;
    }

    /**
     * Sets the position of a widget.
     * @param widgetId - The ID of the widget.
     * @param position - The new position of the widget.
     */
    public setWidgetPosition(widgetId: string, position: Point): void {
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
    public setWidgetSize(widgetId: string, size: Size): void {
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
    public setWidgetZIndex(widgetId: string, zIndex: number): void {
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
    public bringToFront(widgetId: string): void {
        this.setWidgetZIndex(widgetId, this.nextZIndex++);
    }

    // Public helper methods

    /**
     * Gets the reference widget, which is the first selected widget.
     * @returns The reference widget or null if no widget is selected.
     */
    public getReferenceWidget(): Widget | null {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0) return null;

        const referenceId = selectedIds[0]; // First selected is the reference
        return this.widgets.get(referenceId) || null;
    }

    /**
     * Converts a mouse event to a client point relative to the canvas.
     * @param e - The mouse event.
     * @returns The client point.
     */
    public getClientPointFromEvent(e: MouseEvent): Point {
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
    public findWidgetAtPoint(point: Point): Widget | null {
        console.log(`[Debug] findWidgetAtPoint called with point (${point.x}, ${point.y})`);
        
        // Check for widgets in reverse z-index order (top to bottom visually)
        const sortedWidgets = Array.from(this.widgets.values()).sort((a, b) =>
            b.getData().zIndex - a.getData().zIndex
        );
        
        console.log(`[Debug] Checking ${sortedWidgets.length} widgets for hit detection`);
        
        // Add a small tolerance for hit detection (5px in each direction)
        const tolerance = 5;
        
        for (const widget of sortedWidgets) {
            const rect = widget.getRect();
            
            // Check with tolerance
            const isInside = 
                point.x >= rect.x - tolerance &&
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
    protected handleSelectionChange(selectedIds: string[]): void { /* Will be overridden */ }

    /**
     * Handles the start of a resize event.
     * @param widgetId - The ID of the widget being resized.
     * @param handlePosition - The position of the resize handle.
     * @param event - The mouse event.
     */
    protected handleResizeStart(widgetId: string, handlePosition: ResizeHandlePosition, event: MouseEvent): void { /* Will be overridden */ }

    /**
     * Handles mouse move events on the document.
     * @param e - The mouse event.
     */
    protected handleDocumentMouseMove(e: MouseEvent): void { /* Will be overridden */ }

    /**
     * Handles mouse up events on the document.
     * @param e - The mouse event.
     */
    protected handleDocumentMouseUp(e: MouseEvent): void { /* Will be overridden */ }

    /**
     * Handles mouse down events on the canvas.
     * @param e - The mouse event.
     */
    protected handleCanvasMouseDown(e: MouseEvent): void { /* Will be overridden */ }

    /**
     * Updates the UI. This method should be overridden by subclasses.
     */
    protected updateUI(): void { /* Will be overridden */ }

    /**
     * Initializes event listeners. This method should be overridden by subclasses.
     */
    protected initEventListeners(): void { /* Will be overridden */ }

    /**
     * Updates the state of a button. This method should be overridden by subclasses.
     * @param buttonId - The ID of the button.
     * @param enabled - Whether the button should be enabled or disabled.
     */
    protected updateButtonState(buttonId: string, enabled: boolean): void { /* Will be overridden */ }

    /**
     * Enters preview mode where all editing controls are hidden and widgets are locked
     */
    public enterPreviewMode(): void {
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
            } else {
                widget.setPreviewMode(true);
            }
        });
        
        // Add preview-mode class to canvas and body for CSS styling
        this.canvasElement.classList.add('preview-mode');
        document.body.classList.add('preview-mode');
        
        // Force hide the main toolbar (may not be registered with toolboxManager)
        const mainToolbar = document.querySelector('.toolbar') as HTMLElement;
        if (mainToolbar) {
            // Store original display value in a data attribute for restoration
            if (!mainToolbar.getAttribute('data-original-display')) {
                mainToolbar.setAttribute('data-original-display', 
                    window.getComputedStyle(mainToolbar).display);
            }
            mainToolbar.style.display = 'none';
        }
        
        // Hide action buttons
        const actionButtons = document.querySelector('.action-buttons') as HTMLElement;
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
        } else {
            exitPreviewButton.style.display = 'block';
        }
    }

    /**
     * Exits preview mode and restores all editing controls
     */
    public exitPreviewMode(): void {
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
        const mainToolbar = document.querySelector('.toolbar') as HTMLElement;
        if (mainToolbar) {
            const originalDisplay = mainToolbar.getAttribute('data-original-display') || 'flex';
            mainToolbar.style.display = originalDisplay;
        }
        
        // Show action buttons
        const actionButtons = document.querySelector('.action-buttons') as HTMLElement;
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
    public isInPreviewMode(): boolean {
        return this.previewMode;
    }
    
    // Track if there are unsaved changes
    public hasChanges: boolean = false;
    
    /**
     * Checks if there are unsaved changes
     * @returns True if there are unsaved changes, false otherwise
     */
    public hasUnsavedChanges(): boolean {
        return this.hasChanges;
    }
    
    /**
     * Marks the designer as having unsaved changes
     * This can be called from outside the class to indicate changes 
     * that wouldn't otherwise be tracked, like background changes
     */
    public markAsChanged(): void {
        this.hasChanges = true;
    }
    
    /**
     * Serialize the entire canvas state to JSON for saving
     * @returns A JSON string representing the entire canvas state
     */
    public saveDesign(): string {
        const widgetDataArray: WidgetData[] = [];
        
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
    public loadDesign(jsonData: string): void {
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
            
            console.log(`Loaded design with ${canvasData.widgets?.length || 0} widgets`);
        } catch (error) {
            console.error('Error loading design:', error);
            throw new Error('Failed to load design data: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    
    /**
     * Clears all widgets from the canvas
     */
    public clearAllWidgets(): void {
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
    public resetDesignerState(): void {
        console.log(`[Debug] Performing full designer state reset`);
        
        // 1. Clear any existing drag state
        if (this.dragState) {
            this.canvasElement.removeEventListener('pointermove', this.boundPointerMoveHandler);
            this.canvasElement.removeEventListener('pointerup', this.boundPointerUpHandler);
            this.canvasElement.removeEventListener('pointercancel', this.boundPointerCancelHandler);
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
        } catch (e) {
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
    public groupSelectedWidgets(): void {
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
        const command = new GroupWidgetsCommand(
            selectedIds,
            this,
            (ids) => {
                this.selectionManager.clearSelection();
                ids.forEach(id => this.selectionManager.selectWidget(id, true));
            }
        );
        
        this.commandManager.execute(command);
    }
    
    /**
     * Ungroups the selected group widgets.
     * Removes the group widgets and restores their contained widgets.
     */
    public ungroupSelectedWidgets(): void {
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
        const command = new UngroupWidgetsCommand(
            groupWidgetIds,
            this,
            (ids) => {
                this.selectionManager.clearSelection();
                ids.forEach(id => this.selectionManager.selectWidget(id, true));
            }
        );
        
        this.commandManager.execute(command);
    }
    
    /**
     * Checks if the selected widgets can be grouped.
     * @returns True if the selected widgets can be grouped, false otherwise.
     */
    public canGroupSelectedWidgets(): boolean {
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
    public canUngroupSelectedWidgets(): boolean {
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
    private handleGroupMove(groupId: string, offset: Point): void {
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
    private addGroupEventListeners(widget: Widget): void {
        if (widget.getData().type !== WidgetType.Group) {
            return;
        }

        const element = widget.getElement();

        // Listen for group move events
        element.addEventListener('group-move', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const offset = detail.offset;
            this.handleGroupMove(detail.groupId, offset);
        });

        // Listen for group resize events (if we implement this feature)
        element.addEventListener('group-resize', (e: Event) => {
            // Handle group resize if we implement this feature
        });
    }

    /**
     * Cleans up drag event listeners (for issue #2 fix)
     */
    protected cleanupDragListeners(): void {
        this.canvasElement.removeEventListener('pointermove', this.boundPointerMoveHandler);
        this.canvasElement.removeEventListener('pointerup', this.boundPointerUpHandler);
        this.canvasElement.removeEventListener('pointercancel', this.boundPointerCancelHandler);

        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
            this.dragTimeout = null;
        }
    }

    /**
     * Stub methods that will be implemented in DesignerDrag subclass
     * These are here to satisfy TypeScript's type checking for the bound handlers
     */
    protected handleCanvasPointerDown(_e: PointerEvent): void {
        // Implemented in DesignerDrag
    }

    protected handleCanvasPointerMove(_e: PointerEvent): void {
        // Implemented in DesignerDrag
    }

    protected handleCanvasPointerUp(_e: PointerEvent): void {
        // Implemented in DesignerDrag
    }

    protected handleCanvasPointerCancel(_e: PointerEvent): void {
        // Implemented in DesignerDrag
    }

    /**
     * Cleanup method to properly dispose of Designer instance and prevent memory leaks
     * Call this when the Designer is no longer needed (e.g., page navigation, component unmount)
     */
    public destroy(): void {
        console.log('[Debug] Destroying Designer instance');

        // Clear maintenance interval
        if (this.maintenanceInterval) {
            clearInterval(this.maintenanceInterval);
            this.maintenanceInterval = null;
        }

        // Clean up drag listeners
        this.cleanupDragListeners();
        this.dragState = null;

        // Destroy all widgets
        this.widgets.forEach(widget => widget.destructor());
        this.widgets.clear();

        // Clear command history
        this.commandManager.clear();

        // Clear selection
        this.selectionManager.clearSelection();

        console.log('[Debug] Designer instance destroyed successfully');
    }
}