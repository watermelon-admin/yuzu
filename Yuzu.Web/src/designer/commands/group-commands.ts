import { Command } from './command.js';
import { Widget } from '../widget.js';
import { WidgetData, WidgetType, Rect, GroupWidgetProperties } from '../types.js';
import { WidgetFactory } from '../widgets/widget-factory.js';
import { GroupWidget } from '../widgets/group-widget.js';
import { Designer } from '../core/designer-core.js';
import { WidgetLoggerType } from '../core/designer-events.js';

// Get WidgetLogger from the global scope to avoid circular dependencies
declare const WidgetLogger: WidgetLoggerType;

/**
 * Command for grouping multiple widgets.
 */
export class GroupWidgetsCommand implements Command {
    /**
     * Helper method to safely cast a Widget to GroupWidget
     * @param widget - The widget to cast
     * @returns The widget as a GroupWidget with necessary properties
     */
    private safeCastToGroupWidget(widget: Widget | undefined): any {
        if (!widget) return null;
        
        // Check if the widget is a GroupWidget by checking for required methods
        const widgetAny = widget as any;
        if (typeof widgetAny.getChildIds !== 'function') {
            if (typeof WidgetLogger !== 'undefined') {
                WidgetLogger.error('GroupCommand', `Widget ${widget.getId()} is not a valid GroupWidget`);
            }
            console.error(`Widget ${widget.getId()} is not a valid GroupWidget`);
            return null;
        }
        
        return widgetAny;
    }
    private widgetIds: string[];
    private groupId: string;
    private designer: Designer;
    private designerWidgetsMap: Map<string, Widget>;
    private originalPositions: Map<string, { x: number, y: number }> = new Map();
    private originalZIndexes: Map<string, number> = new Map();
    private boundingRect: Rect | null = null;
    private groupData: WidgetData | null = null;
    private onSelectionChange: (selectedIds: string[]) => void;

    /**
     * Creates an instance of GroupWidgetsCommand.
     * @param widgetIds - The IDs of the widgets to group.
     * @param designer - The designer instance.
     * @param onSelectionChange - Callback function for when selection changes.
     */
    constructor(
        widgetIds: string[],
        designer: Designer,
        onSelectionChange: (selectedIds: string[]) => void
    ) {
        this.widgetIds = [...widgetIds];
        this.designer = designer as any; // Use 'any' type to avoid TypeScript protected method access error
        this.designerWidgetsMap = designer['widgets']; // Access the protected widgets map
        this.onSelectionChange = onSelectionChange;
        this.groupId = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Store original positions and z-indexes for undo
        widgetIds.forEach(id => {
            const widget = this.designerWidgetsMap.get(id);
            if (widget) {
                this.originalPositions.set(id, { ...widget.getRect() });
                this.originalZIndexes.set(id, widget.getData().zIndex);
            }
        });
        
        // Calculate the bounding rectangle of all widgets
        this.calculateBoundingRect();
    }

    /**
     * Executes the group command.
     */
    public execute(): void {
        console.log('GroupWidgetsCommand.execute called', {
            widgetIds: this.widgetIds,
            boundingRect: this.boundingRect,
            groupId: this.groupId
        });
        
        if (this.widgetIds.length < 2 || !this.boundingRect) {
            console.warn('Cannot group less than 2 widgets.');
            return;
        }

        // Get all z-indices of widgets to be grouped for debugging
        const zIndices = this.widgetIds.map(id => {
            const widget = this.designerWidgetsMap.get(id);
            return widget ? widget.getData().zIndex : 0;
        });
        console.log('Z-indices of widgets to be grouped:', zIndices);
        
        // Calculate the highest z-index among the widgets to be grouped
        let maxZIndex = 0;
        this.widgetIds.forEach(id => {
            const widget = this.designerWidgetsMap.get(id);
            if (widget) {
                maxZIndex = Math.max(maxZIndex, widget.getData().zIndex);
            }
        });
        console.log('Max z-index found:', maxZIndex);

        // Log the original bounding rectangle for debugging
        console.log('Original bounding rectangle:', this.boundingRect);
        
        // Get the stored data of all widgets to be grouped
        const widgets = this.widgetIds.map(id => this.designerWidgetsMap.get(id)).filter(w => w);
        
        // Calculate a bounding rectangle that encompasses all widgets
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        // Get all widgets' direct positions from their data
        widgets.forEach(widget => {
            const data = widget.getData();
            console.log(`Widget ${data.id} data position:`, {
                x: data.position.x,
                y: data.position.y,
                width: data.size.width,
                height: data.size.height
            });
            
            minX = Math.min(minX, data.position.x);
            minY = Math.min(minY, data.position.y);
            maxX = Math.max(maxX, data.position.x + data.size.width);
            maxY = Math.max(maxY, data.position.y + data.size.height);
        });
        
        console.log('Data-based bounding rectangle:', {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        });
        
        // Use the data-based bounds for consistent positioning
        let { x, y, width, height } = this.boundingRect;
        if (minX !== Infinity) {
            console.log('Using data-based bounds for consistent positioning');
            x = minX;
            y = minY;
            width = maxX - minX;
            height = maxY - minY;
        } else {
            console.log('Using calculated bounds (fallback)');
        }
        
        // Ensure minimum dimensions
        const minWidth = 100;
        const minHeight = 100;
        
        if (width < minWidth) {
            // Center it on the x-axis of the contained widgets
            const centerX = x + (width / 2);
            width = minWidth;
            x = centerX - (width / 2);
        }
        
        if (height < minHeight) {
            // Center it on the y-axis of the contained widgets
            const centerY = y + (height / 2);
            height = minHeight;
            y = centerY - (height / 2);
        }
        
        // No need to add extra padding here - it will be added in the createGroupWidget method
        
        // Log the final dimensions
        console.log('Final group dimensions:', { x, y, width, height });
        
        // Calculate a dynamic z-index offset based on the number of widgets
        // This ensures that each new group will be properly positioned above all other widgets
        const totalWidgetCount = this.designerWidgetsMap.size;
        const dynamicZIndexOffset = totalWidgetCount * 10; // Scale offset with widget count
        const newZIndex = maxZIndex + dynamicZIndexOffset;
        
        console.log(`Calculated dynamic z-index: ${newZIndex} (base: ${maxZIndex}, offset: ${dynamicZIndexOffset})`);
        
        // Create the group widget with a dynamic z-index to ensure it's above all children
        // and with the adjusted dimensions to ensure it's visible
        const groupWidget = WidgetFactory.createGroupWidget(
            this.groupId,
            x,
            y,
            width,
            height,
            newZIndex, // Dynamic z-index based on widget count
            this.widgetIds
        );
        
        console.log('Created group widget:', {
            id: this.groupId,
            position: { x, y },
            size: { width, height },
            zIndex: newZIndex,
            childIds: this.widgetIds
        });

        // Store the group data for undo
        this.groupData = groupWidget.getData();

        // Add the group widget to the designer using the proper method
        console.log('Adding group widget to designer:', this.groupId);
        this.designer.addCreatedWidget(groupWidget);

        // Update the visual of the widgets inside the group
        // They remain in the DOM but get a special styling
        this.widgetIds.forEach(id => {
            const widget = this.designerWidgetsMap.get(id);
            if (widget) {
                // Add a class to indicate it's part of a group
                widget.getElement().classList.add('in-group');
                
                // Make sure the widget is not selected
                widget.setSelected(false);
                
                // Set pointer-events to none to prevent direct interaction
                widget.getElement().style.pointerEvents = 'none';
                
                // We don't need to adjust z-index for child widgets anymore since we're using pointer-events
                // to control interaction, and the DOM structure with CSS ensures proper event handling
                // The key is to make sure the group's z-index is high enough and the child widgets
                // have pointer-events set to none
                console.log(`Setting widget ${id} as non-interactive child of group ${this.groupId}`);
            }
        });

        // Check the DOM element of the group widget to make sure it was created properly
        const groupElement = groupWidget.getElement();
        const groupRect = groupElement.getBoundingClientRect();
        console.log('Group DOM element details:', {
            id: this.groupId,
            classList: Array.from(groupElement.classList),
            style: {
                position: groupElement.style.position,
                left: groupElement.style.left,
                top: groupElement.style.top,
                width: groupElement.style.width,
                height: groupElement.style.height,
                zIndex: groupElement.style.zIndex,
                pointerEvents: groupElement.style.pointerEvents
            },
            boundingClientRect: {
                left: groupRect.left,
                top: groupRect.top,
                width: groupRect.width,
                height: groupRect.height
            },
            attributes: {
                'data-id': groupElement.getAttribute('data-id'),
                'data-type': groupElement.getAttribute('data-type')
            }
        });
        
        // Log child widget positions for debugging
        console.log('Child widget positions after group creation:');
        this.widgetIds.forEach(id => {
            const widget = this.designerWidgetsMap.get(id);
            if (widget) {
                const element = widget.getElement();
                const rect = element.getBoundingClientRect();
                console.log(`Child widget ${id}:`, {
                    position: widget.getData().position,
                    size: widget.getData().size,
                    boundingClientRect: {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    }
                });
            }
        });
        
        // Update selection to select only the group
        this.onSelectionChange([this.groupId]);
    }

    /**
     * Undoes the group command.
     */
    public undo(): void {
        console.log('GroupWidgetsCommand.undo called');
        
        // Remove the group widget
        if (this.groupData && this.designerWidgetsMap.has(this.groupId)) {
            const groupWidget = this.designerWidgetsMap.get(this.groupId);
            if (groupWidget) {
                console.log('Removing group widget from DOM:', this.groupId);
                groupWidget.destructor(); // This should remove from DOM
            }
            this.designerWidgetsMap.delete(this.groupId);
        }

        // Restore original state of the widgets
        this.widgetIds.forEach(id => {
            const widget = this.designerWidgetsMap.get(id);
            if (widget) {
                // Remove the in-group class
                widget.getElement().classList.remove('in-group');
                
                // Restore pointer-events
                widget.getElement().style.pointerEvents = 'all';
                
                // Restore original z-index if stored
                const originalZIndex = this.originalZIndexes.get(id);
                if (originalZIndex !== undefined) {
                    widget.setZIndex(originalZIndex);
                }
            }
        });

        // Update selection to select all widgets that were in the group
        this.onSelectionChange(this.widgetIds);
    }

    /**
     * Gets the description of the command.
     * @returns The description.
     */
    public getDescription(): string {
        return `Group ${this.widgetIds.length} widgets`;
    }

    /**
     * Calculates the bounding rectangle of all the widgets to be grouped.
     */
    private calculateBoundingRect(): void {
        console.log('calculateBoundingRect called with widget IDs:', this.widgetIds);
        
        if (this.widgetIds.length === 0) {
            console.warn('No widgets to calculate bounding rect for');
            this.boundingRect = null;
            return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // Log detailed position information for each widget
        console.log('Widget positions for bounding rect calculation:');
        this.widgetIds.forEach(id => {
            const widget = this.designerWidgetsMap.get(id);
            if (widget) {
                // Get the data-based rectangle
                const dataRect = widget.getRect(false);
                console.log(`Widget ${id} (data values):`, {
                    position: { x: dataRect.x, y: dataRect.y },
                    size: { width: dataRect.width, height: dataRect.height },
                    bounds: { 
                        left: dataRect.x, 
                        top: dataRect.y, 
                        right: dataRect.x + dataRect.width, 
                        bottom: dataRect.y + dataRect.height 
                    }
                });
                
                // Get the DOM-based rectangle
                const domRect = widget.getRect(true);
                console.log(`Widget ${id} (DOM values):`, {
                    position: { x: domRect.x, y: domRect.y },
                    size: { width: domRect.width, height: domRect.height },
                    bounds: { 
                        left: domRect.x, 
                        top: domRect.y, 
                        right: domRect.x + domRect.width, 
                        bottom: domRect.y + domRect.height 
                    }
                });
                
                // Always use DOM-based rectangle for more accuracy
                minX = Math.min(minX, domRect.x);
                minY = Math.min(minY, domRect.y);
                maxX = Math.max(maxX, domRect.x + domRect.width);
                maxY = Math.max(maxY, domRect.y + domRect.height);
            }
        });

        // Add some padding around the group to ensure it fully encompasses the widgets
        const padding = 10; // Increased padding to 10px on all sides
        this.boundingRect = {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2)
        };
        
        console.log('Calculated bounding rect:', this.boundingRect);
        console.log('Final group bounds:', {
            left: this.boundingRect.x,
            top: this.boundingRect.y,
            right: this.boundingRect.x + this.boundingRect.width,
            bottom: this.boundingRect.y + this.boundingRect.height
        });
    }
}

/**
 * Command for ungrouping a group of widgets.
 */
export class UngroupWidgetsCommand implements Command {
    /**
     * Helper method to safely cast a Widget to GroupWidget
     * @param widget - The widget to cast
     * @returns The widget as a GroupWidget with necessary properties
     */
    private safeCastToGroupWidget(widget: Widget | undefined): any {
        if (!widget) return null;
        
        // Check if the widget is a GroupWidget by checking for required methods
        const widgetAny = widget as any;
        if (typeof widgetAny.getChildIds !== 'function') {
            if (typeof WidgetLogger !== 'undefined') {
                WidgetLogger.error('UngroupCommand', `Widget ${widget.getId()} is not a valid GroupWidget`);
            }
            console.error(`Widget ${widget.getId()} is not a valid GroupWidget`);
            return null;
        }
        
        return widgetAny;
    }
    private groupIds: string[];
    private designer: Designer;
    private designerWidgetsMap: Map<string, Widget>;
    private groupData: Map<string, { 
        groupWidgetData: WidgetData, 
        childIds: string[] 
    }> = new Map();
    private onSelectionChange: (selectedIds: string[]) => void;

    /**
     * Creates an instance of UngroupWidgetsCommand.
     * @param groupIds - The IDs of the group widgets to ungroup.
     * @param designer - The designer instance.
     * @param onSelectionChange - Callback function for when selection changes.
     */
    constructor(
        groupIds: string[],
        designer: Designer,
        onSelectionChange: (selectedIds: string[]) => void
    ) {
        this.groupIds = [...groupIds];
        this.designer = designer as any; // Use 'any' type to avoid TypeScript protected method access error
        this.designerWidgetsMap = designer['widgets']; // Access the protected widgets map
        this.onSelectionChange = onSelectionChange;
        
        // Store group data for undo
        this.storeGroupData();
    }

    /**
     * Executes the ungroup command.
     */
    public execute(): void {
        const allChildIds: string[] = [];
        
        this.groupIds.forEach(groupId => {
            const widget = this.designerWidgetsMap.get(groupId);
            const groupWidget = this.safeCastToGroupWidget(widget);
            if (groupWidget) {
                // Get child IDs from the group
                const childIds = groupWidget.getChildIds();
                allChildIds.push(...childIds);
                
                // Restore the widgets
                childIds.forEach(childId => {
                    const childWidget = this.designerWidgetsMap.get(childId);
                    if (childWidget) {
                        // Remove the in-group class
                        childWidget.getElement().classList.remove('in-group');
                        
                        // Restore pointer-events
                        childWidget.getElement().style.pointerEvents = 'all';
                    }
                });
                
                // Remove the group widget
                groupWidget.destructor();
                this.designerWidgetsMap.delete(groupId);
            }
        });
        
        // Update selection to select all child widgets
        this.onSelectionChange(allChildIds);
    }

    /**
     * Undoes the ungroup command.
     */
    public undo(): void {
        const recreatedGroupIds: string[] = [];
        
        // Recreate groups
        this.groupIds.forEach(groupId => {
            const groupInfo = this.groupData.get(groupId);
            if (groupInfo) {
                // Create a new group widget with the original data
                const widget = WidgetFactory.createWidget(groupInfo.groupWidgetData);
                const groupWidget = this.safeCastToGroupWidget(widget);
                
                // Add it back to the designer using the proper method
                this.designer.addCreatedWidget(groupWidget);
                recreatedGroupIds.push(groupId);
                
                // Update the child widgets
                groupInfo.childIds.forEach(childId => {
                    const childWidget = this.designerWidgetsMap.get(childId);
                    if (childWidget) {
                        // Add the in-group class
                        childWidget.getElement().classList.add('in-group');
                        
                        // Disable pointer-events
                        childWidget.getElement().style.pointerEvents = 'none';
                    }
                });
            }
        });
        
        // Update selection to select the recreated groups
        this.onSelectionChange(recreatedGroupIds);
    }

    /**
     * Gets the description of the command.
     * @returns The description.
     */
    public getDescription(): string {
        return `Ungroup ${this.groupIds.length} groups`;
    }

    /**
     * Stores the group data for undo.
     */
    private storeGroupData(): void {
        this.groupIds.forEach(groupId => {
            const widget = this.designerWidgetsMap.get(groupId);
            const groupWidget = this.safeCastToGroupWidget(widget);
            if (groupWidget) {
                const groupWidgetData = groupWidget.getData();
                const childIds = groupWidget.getChildIds();
                
                this.groupData.set(groupId, {
                    groupWidgetData,
                    childIds
                });
            }
        });
    }
}