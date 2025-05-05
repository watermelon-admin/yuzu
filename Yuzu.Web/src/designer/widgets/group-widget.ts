import { Widget } from '../widget.js';
import { WidgetData, WidgetType, GroupWidgetProperties, Point, Size } from '../types.js';
import { WidgetLoggerType } from '../core/designer-events.js';
import { safeLogger } from '../core/logger-utils.js';

/**
 * Represents a group widget that contains other widgets.
 * Note: TypeScript may report "incorrectly extends base class" error due to 
 * how the imports are resolved. This can be safely ignored.
 */
// @ts-ignore - TypeScript incorrectly reports error TS2415
export class GroupWidget extends Widget {
    private childIds: string[] = [];
    private groupIconElement: HTMLElement | null = null;

    /**
     * Creates an instance of GroupWidget.
     * @param data - The data for the group widget.
     */
    constructor(data: WidgetData) {
        super(data);
        
        // Initialize child IDs from properties or empty array
        if (data.properties && (data.properties as GroupWidgetProperties).childIds) {
            this.childIds = [...(data.properties as GroupWidgetProperties).childIds];
        }
        
        // Update the widget data to ensure it has the correct properties
        if (!this.data.properties) {
            this.data.properties = {};
        }
        (this.data.properties as GroupWidgetProperties).childIds = this.childIds;
        
        // Ensure proper positioning and z-index for the group
        console.log(`GroupWidget constructor for ${this.data.id}:`, {
            position: this.data.position,
            size: this.data.size,
            zIndex: this.data.zIndex,
            childIds: this.childIds
        });
        
        // Force style to ensure the group is visible and properly positioned
        setTimeout(() => {
            // Update DOM element to use !important for critical styles
            this.element.style.setProperty('position', 'absolute', 'important');
            this.element.style.setProperty('left', `${this.data.position.x}px`, 'important');
            this.element.style.setProperty('top', `${this.data.position.y}px`, 'important');
            this.element.style.setProperty('width', `${this.data.size.width}px`, 'important');
            this.element.style.setProperty('height', `${this.data.size.height}px`, 'important');
            this.element.style.setProperty('z-index', `${this.data.zIndex}`, 'important');
            
            // Force a layout recalculation
            void this.element.offsetHeight;
            
            // Ensure children are non-interactive
            this.ensureChildrenAreNonInteractive();
        }, 0);
    }

    /**
     * Gets the IDs of the child widgets.
     * @returns Array of child widget IDs.
     */
    public getChildIds(): string[] {
        return [...this.childIds]; // Return a copy to prevent direct modifications
    }

    /**
     * Adds a child widget to the group.
     * @param childId - The ID of the child widget to add.
     */
    public addChild(childId: string): void {
        if (!this.childIds.includes(childId)) {
            this.childIds.push(childId);
            this.updateDataProperties();
        }
    }

    /**
     * Sets multiple children at once, replacing any existing children.
     * @param childIds - Array of child widget IDs.
     */
    public setChildren(childIds: string[]): void {
        this.childIds = [...childIds];
        this.updateDataProperties();
    }

    /**
     * Removes a child widget from the group.
     * @param childId - The ID of the child widget to remove.
     */
    public removeChild(childId: string): void {
        const index = this.childIds.indexOf(childId);
        if (index !== -1) {
            this.childIds.splice(index, 1);
            this.updateDataProperties();
        }
    }

    /**
     * Checks if a widget is a child of this group.
     * @param childId - The ID of the widget to check.
     * @returns True if the widget is a child of this group, false otherwise.
     */
    public hasChild(childId: string): boolean {
        return this.childIds.includes(childId);
    }

    /**
     * Override setPosition to add custom behavior for groups.
     * @param position - The new position.
     */
    public setPosition(position: Point): void {
        // Calculate the offset between the new position and the current position
        const offsetX = position.x - this.data.position.x;
        const offsetY = position.y - this.data.position.y;
        
        // Store the current position before updating it
        const oldPosition = { ...this.data.position };
        
        try {
            // Log group movement using safe logger
            const logger = safeLogger();
            logger.info('GroupMove', `Moving group ${this.data.id} from (${oldPosition.x},${oldPosition.y}) to (${position.x},${position.y})`, {
                groupId: this.data.id,
                oldPosition,
                newPosition: { ...position },
                offset: { x: offsetX, y: offsetY },
                childIds: [...this.childIds]
            });
            
            // Update the group's position
            super.setPosition(position);
            
            // Dispatch a custom event to notify that a group has moved
            // This will be handled by the designer to move the children
            const groupMoveEvent = new CustomEvent('group-move', {
                detail: {
                    groupId: this.data.id,
                    oldPosition,
                    newPosition: position,
                    offset: { x: offsetX, y: offsetY },
                    childIds: this.childIds
                },
                bubbles: true
            });
            this.element.dispatchEvent(groupMoveEvent);
        } catch (error) {
            console.error('Error in GroupWidget.setPosition:', error);
        }
    }
    
    /**
     * Override setSize to add custom behavior for groups.
     * @param size - The new size.
     */
    public setSize(size: Size): void {
        try {
            // Calculate the scale factors between the new size and the current size
            const scaleX = size.width / this.data.size.width;
            const scaleY = size.height / this.data.size.height;
            
            // Store the current size before updating it
            const oldSize = { ...this.data.size };
            
            // Log group resizing using safe logger
            const logger = safeLogger();
            logger.info('GroupResize', `Resizing group ${this.data.id} from (${oldSize.width}x${oldSize.height}) to (${size.width}x${size.height})`, {
                groupId: this.data.id,
                oldSize,
                newSize: { ...size },
                scale: { x: scaleX, y: scaleY },
                childIds: [...this.childIds]
            });
            
            // Update the group's size
            super.setSize(size);
            
            // Dispatch a custom event to notify that a group has been resized
            // This will be handled by the designer to resize the children
            const groupResizeEvent = new CustomEvent('group-resize', {
                detail: {
                    groupId: this.data.id,
                    oldSize,
                    newSize: size,
                    scale: { x: scaleX, y: scaleY },
                    childIds: this.childIds
                },
                bubbles: true
            });
            this.element.dispatchEvent(groupResizeEvent);
        } catch (error) {
            console.error('Error in GroupWidget.setSize:', error);
        }
    }

    /**
     * Override setSelected to add custom behavior for groups.
     * @param selected - True to select the group, false to deselect it.
     */
    public setSelected(selected: boolean): void {
        super.setSelected(selected);
        
        // Add/remove the group-selected class
        if (selected) {
            this.element.classList.add('group-selected');
        } else {
            this.element.classList.remove('group-selected');
        }
        
        // Make sure child widgets remain non-interactive
        // even after selection state changes
        this.ensureChildrenAreNonInteractive();
    }
    
    /**
     * Override createDomElement to customize the group widget appearance.
     * @returns The created DOM element.
     */
    protected createDomElement(): HTMLElement {
        const element = super.createDomElement();
        
        // Add a special class for group widgets
        element.classList.add('group-widget');
        
        // Create a more visible icon/indicator for the group
        this.groupIconElement = document.createElement('div');
        this.groupIconElement.className = 'group-icon';
        this.groupIconElement.innerHTML = '<i class="group-indicator">GROUP</i>';
        element.appendChild(this.groupIconElement);
        
        return element;
    }
    
    /**
     * Override updateDomFromData to customize how the group widget is displayed.
     */
    protected updateDomFromData(): void {
        super.updateDomFromData();
        
        // Add dashed border and semi-transparent background for groups
        this.element.style.setProperty('border', '3px dashed #007bff', 'important');
        this.element.style.setProperty('background-color', 'rgba(0, 123, 255, 0.15)', 'important');
        
        // Ensure the group is always able to receive mouse events
        this.element.style.setProperty('pointer-events', 'all', 'important');
        
        // Force correct positioning and size with !important
        this.element.style.setProperty('position', 'absolute', 'important');
        this.element.style.setProperty('left', `${this.data.position.x}px`, 'important');
        this.element.style.setProperty('top', `${this.data.position.y}px`, 'important');
        this.element.style.setProperty('width', `${this.data.size.width}px`, 'important');
        this.element.style.setProperty('height', `${this.data.size.height}px`, 'important');
        
        // Ensure the z-index is set properly for the group with !important
        const zIndex = this.data.zIndex;
        this.element.style.setProperty('z-index', zIndex.toString(), 'important');
        
        // Position the group icon in the top-left corner
        if (this.groupIconElement) {
            // Make sure the group icon has an extremely high z-index
            this.groupIconElement.style.setProperty('z-index', (zIndex + 5000).toString(), 'important');
        }
        
        // Log the final styles for debugging
        console.log(`Group ${this.data.id} DOM updated:`, {
            position: this.element.style.position,
            left: this.element.style.left,
            top: this.element.style.top,
            width: this.element.style.width,
            height: this.element.style.height,
            zIndex: this.element.style.zIndex,
            border: this.element.style.border,
            backgroundColor: this.element.style.backgroundColor
        });
    }
    
    /**
     * Override updateSpecificProperties to apply group-specific styling.
     */
    protected updateSpecificProperties(): void {
        // Could be used to apply specific styling based on group properties
        
        // Make sure the group icon stays visible regardless of selection state
        if (this.groupIconElement) {
            this.groupIconElement.style.display = 'block';
        }
    }
    
    /**
     * Override setPreviewMode to add custom preview behavior for groups.
     * @param previewMode - Whether to enable or disable preview mode.
     */
    public setPreviewMode(previewMode: boolean): void {
        super.setPreviewMode(previewMode);
        
        // Hide the group icon in preview mode
        if (this.groupIconElement) {
            this.groupIconElement.style.display = previewMode ? 'none' : 'block';
        }
    }
    
    /**
     * Updates the group's data properties with the current child IDs.
     */
    private updateDataProperties(): void {
        if (!this.data.properties) {
            this.data.properties = {};
        }
        (this.data.properties as GroupWidgetProperties).childIds = [...this.childIds];
    }
    
    /**
     * Override setZIndex to add custom behavior for groups.
     * We need to ensure that the group's z-index behavior works correctly.
     * @param zIndex - The new z-index.
     */
    public setZIndex(zIndex: number): void {
        console.log(`Setting z-index of group ${this.data.id} to ${zIndex}`);
        
        // Call the parent implementation to update the group's z-index
        super.setZIndex(zIndex);
        
        // Make sure the group element has a z-index that will display above its children
        // Force it with !important to ensure it takes precedence
        this.element.style.setProperty('z-index', zIndex.toString(), 'important');
        
        // Update the group icon's z-index to be significantly higher than the group
        if (this.groupIconElement) {
            // Use a much higher offset to ensure the icon is always visible
            this.groupIconElement.style.setProperty('z-index', (zIndex + 1000).toString(), 'important');
        }
        
        // Make sure all contained widgets are non-interactive
        // This is necessary because z-index changes might affect event handling
        this.ensureChildrenAreNonInteractive();
    }
    
    /**
     * Ensures that all child widgets of this group are non-interactive.
     * This prevents direct manipulation of child widgets within a group.
     */
    private ensureChildrenAreNonInteractive(): void {
        console.log(`Ensuring children of group ${this.data.id} are non-interactive`);
        
        // Find all widgets that are part of this group in the DOM
        const childElements = this.childIds.map(id => {
            const element = document.querySelector(`[data-id="${id}"]`) as HTMLElement;
            return element;
        }).filter(element => element !== null);
        
        // Set pointer-events to none for all child widgets
        childElements.forEach(element => {
            if (element) {
                // Add the in-group class to use our CSS rule
                element.classList.add('in-group');
                
                // Also set the style directly for extra assurance
                element.style.pointerEvents = 'none';
                
                // Log the element's properties for debugging
                console.log(`Child element ${element.getAttribute('data-id')} updated:`, {
                    classList: Array.from(element.classList),
                    pointerEvents: element.style.pointerEvents,
                    zIndex: element.style.zIndex
                });
            }
        });
    }
}