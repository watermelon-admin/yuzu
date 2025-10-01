import { Point, Size, Rect, WidgetData, ResizeHandlePosition, WidgetType } from './types.js';
import { WidgetLoggerType } from './core/designer-events.js';
import { safeLogger } from './core/logger-utils.js';

/**
 * Represents a widget in the designer.
 */
export class Widget {
    protected element: HTMLElement;
    protected data: WidgetData;
    protected selected: boolean = false;
    protected isReference: boolean = false;
    protected resizeHandles: Map<ResizeHandlePosition, HTMLElement> = new Map();
    protected boundResizeHandlers: Map<ResizeHandlePosition, (e: PointerEvent) => void> = new Map(); // Store bound handlers for cleanup
    protected onResizeStart: ((widgetId: string, handlePosition: ResizeHandlePosition, event: PointerEvent) => void) | null = null;
    protected contentElement: HTMLElement | null = null;

    /**
     * Creates an instance of Widget.
     * @param data - The data for the widget.
     */
    constructor(data: WidgetData) {
        console.log(`[Debug] Creating widget: id=${data.id}, type=${data.type}`, data);
        this.data = { ...data }; // Clone the data
        this.element = this.createDomElement();
        this.updateDomFromData();
        console.log(`[Debug] Widget created: id=${data.id}`);
    }

    /**
     * Sets the handler for the resize start event.
     * @param handler - The handler function.
     */
    public setResizeStartHandler(handler: (widgetId: string, handlePosition: ResizeHandlePosition, event: PointerEvent) => void): void {
        this.onResizeStart = handler;
    }

    /**
     * Sets whether this widget is a reference widget.
     * @param isReference - True if the widget is a reference widget, false otherwise.
     */
    public setReferenceWidget(isReference: boolean): void {
        this.isReference = isReference;

        if (isReference) {
            this.element.classList.add('reference-widget');
        } else {
            this.element.classList.remove('reference-widget');
        }
    }

    /**
     * Checks if this widget is a reference widget.
     * @returns True if the widget is a reference widget, false otherwise.
     */
    public isReferenceWidget(): boolean {
        return this.isReference;
    }

    /**
     * Gets the ID of the widget.
     * @returns The widget ID.
     */
    public getId(): string {
        return this.data.id;
    }

    /**
     * Gets the data of the widget.
     * @returns A copy of the widget data.
     */
    public getData(): WidgetData {
        return { ...this.data }; // Return a copy to prevent direct modification
    }

    /**
     * Gets the DOM element of the widget.
     * @returns The DOM element.
     */
    public getElement(): HTMLElement {
        return this.element;
    }

    /**
     * Gets the rectangle representing the widget's position and size.
     * @param useDomBounds - Whether to use the DOM element's bounding rect (true) or the data values (false)
     * @returns The rectangle.
     */
    public getRect(useDomBounds: boolean = false): Rect {
        if (useDomBounds) {
            try {
                // Get the actual DOM position and size
                const boundingRect = this.element.getBoundingClientRect();
                
                // Convert client coordinates to canvas-relative coordinates
                const canvasElement = document.querySelector('.canvas');
                if (canvasElement) {
                    const canvasRect = canvasElement.getBoundingClientRect();
                    
                    // Calculate the scroll offsets
                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    
                    // Get the element's computed style
                    const style = window.getComputedStyle(this.element);
                    const transform = style.transform || style.webkitTransform;
                    
                    // Log detailed positioning information for debugging
                    console.log(`Widget ${this.data.id} position details:`, {
                        elementRect: boundingRect,
                        canvasRect: canvasRect,
                        scrollOffsets: { left: scrollLeft, top: scrollTop },
                        computedLeft: style.left,
                        computedTop: style.top,
                        transform: transform
                    });
                    
                    // Use direct DOM position and convert to canvas coordinates
                    return {
                        x: parseFloat(style.left), // Use computed style directly
                        y: parseFloat(style.top),  // Use computed style directly
                        width: boundingRect.width,
                        height: boundingRect.height
                    };
                }
            } catch (e) {
                console.error("Error calculating DOM-based rectangle:", e);
            }
        }
        
        // Fall back to the stored data values
        return {
            x: this.data.position.x,
            y: this.data.position.y,
            width: this.data.size.width,
            height: this.data.size.height
        };
    }

    /**
     * Checks if a point is inside the widget.
     * @param point - The point to check.
     * @returns True if the point is inside the widget, false otherwise.
     */
    public isPointInside(point: Point): boolean {
        const rect = this.getRect();
        
        // Log detailed information about point check
        console.log(`[Debug] Point check for widget ${this.data.id}: point=(${point.x},${point.y}), widget=(${rect.x},${rect.y},${rect.width},${rect.height})`);
        
        const isInside = point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height;
            
        if (isInside) {
            console.log(`[Debug] Point (${point.x},${point.y}) is INSIDE widget ${this.data.id}`);
        }
        
        return isInside;
    }

    /**
     * Checks if the widget is selected.
     * @returns True if the widget is selected, false otherwise.
     */
    public isSelected(): boolean {
        return this.selected;
    }

    /**
     * Sets the selected state of the widget.
     * @param selected - True to select the widget, false to deselect it.
     */
    public setSelected(selected: boolean): void {
        console.log(`[Debug] setSelected called on widget ${this.data.id}: selected=${selected}, was=${this.selected}`);
        
        this.selected = selected;
        if (selected) {
            console.log(`[Debug] Selecting widget ${this.data.id}`);
            this.element.classList.add('selected');
            this.showResizeHandles();
            
            // Apply type-specific properties to ensure border radius is maintained
            this.updateSpecificProperties();
        } else {
            console.log(`[Debug] Deselecting widget ${this.data.id}`);
            this.element.classList.remove('selected');
            this.element.classList.remove('reference-widget');
            this.isReference = false;
            this.hideResizeHandles();
            
            // Apply type-specific properties to ensure border radius is maintained
            this.updateSpecificProperties();
        }
        
        console.log(`[Debug] Widget ${this.data.id} selection state updated: selected=${this.selected}, isReference=${this.isReference}`);
    }

    /**
     * Sets the position of the widget.
     * @param position - The new position.
     */
    public setPosition(position: Point): void {
        // Get the call stack to help identify where position changes are coming from
        const stack = new Error().stack || '';
        
        // Use the safe logger
        const logger = safeLogger();
        logger.info('Position', `Setting position for widget ${this.data.id}: x=${position.x}, y=${position.y}`, {
            widgetId: this.data.id,
            widgetType: this.data.type,
            newPosition: { ...position },
            isSelected: this.selected,
            isReference: this.isReference,
            callStack: stack
        });
        
        const oldPosition = { ...this.data.position };
        
        this.data.position = { ...position };
        this.updateDomFromData();
        
        // Dispatch an event for position updates
        const updateEvent = new CustomEvent('widget-position-update', {
            detail: {
                id: this.data.id,
                position: this.data.position,
                oldPosition
            },
            bubbles: true
        });
        this.element.dispatchEvent(updateEvent);
        
        // Check if the change is significant
        const deltaX = Math.abs(oldPosition.x - position.x);
        const deltaY = Math.abs(oldPosition.y - position.y);
        
        if (deltaX > 0.1 || deltaY > 0.1) {
            logger.debug('Position', `Widget ${this.data.id} position changed: (${oldPosition.x},${oldPosition.y}) → (${position.x},${position.y})`, {
                widgetId: this.data.id,
                oldPosition,
                newPosition: { ...position },
                deltaX,
                deltaY,
                timestamp: Date.now()
            });
            
            // If this isn't a drag operation and the position changed significantly,
            // log with higher level to make it more visible in logs
            if (stack && !stack.includes('handleDocumentMouseMove') && !stack.includes('handleResizeStart') && (deltaX > 1 || deltaY > 1)) {
                logger.warn('Position', `Widget ${this.data.id} position unexpectedly changed outside drag operation`, {
                    widgetId: this.data.id,
                    oldPosition,
                    newPosition: { ...position },
                    deltaX,
                    deltaY,
                    callStackExcerpt: stack.split('\n').slice(0, 5).join('\n')
                });
            }
        }
    }

    /**
     * Sets the size of the widget.
     * @param size - The new size.
     */
    public setSize(size: Size): void {
        // Get the call stack to help identify where size changes are coming from
        const stack = new Error().stack || '';
        
        // Use the safe logger
        const logger = safeLogger();
        logger.info('Size', `Setting size for widget ${this.data.id}: width=${size.width}, height=${size.height}`, {
            widgetId: this.data.id,
            widgetType: this.data.type,
            newSize: { ...size },
            isSelected: this.selected,
            isReference: this.isReference,
            callStack: stack
        });
        
        const oldSize = { ...this.data.size };
        
        // Enforce minimum size
        this.data.size = {
            width: Math.max(size.width, 10),
            height: Math.max(size.height, 10)
        };
        
        logger.debug('Size', `After min size enforcement: width=${this.data.size.width}, height=${this.data.size.height}`, {
            widgetId: this.data.id,
            requestedSize: { ...size },
            enforcedSize: { ...this.data.size }
        });
        
        this.updateDomFromData();
        
        // Dispatch an event for size updates
        const updateEvent = new CustomEvent('widget-size-update', {
            detail: {
                id: this.data.id,
                size: this.data.size,
                oldSize
            },
            bubbles: true
        });
        this.element.dispatchEvent(updateEvent);
        
        // Check if the change is significant
        const deltaWidth = Math.abs(oldSize.width - this.data.size.width);
        const deltaHeight = Math.abs(oldSize.height - this.data.size.height);
        
        if (deltaWidth > 0.1 || deltaHeight > 0.1) {
            logger.debug('Size', `Widget ${this.data.id} size changed: (${oldSize.width}x${oldSize.height}) → (${this.data.size.width}x${this.data.size.height})`, {
                widgetId: this.data.id,
                oldSize,
                newSize: { ...this.data.size },
                deltaWidth,
                deltaHeight,
                timestamp: Date.now()
            });
            
            // If this isn't a resize operation and the size changed significantly,
            // log with higher level to make it more visible in logs
            if (stack && !stack.includes('handleDocumentMouseMove') && !stack.includes('handleResizeStart') && (deltaWidth > 1 || deltaHeight > 1)) {
                logger.warn('Size', `Widget ${this.data.id} size unexpectedly changed outside resize operation`, {
                    widgetId: this.data.id,
                    oldSize,
                    newSize: { ...this.data.size },
                    deltaWidth,
                    deltaHeight,
                    callStackExcerpt: stack.split('\n').slice(0, 5).join('\n')
                });
            }
        }
    }

    /**
     * Sets the z-index of the widget.
     * @param zIndex - The new z-index.
     */
    public setZIndex(zIndex: number): void {
        this.data.zIndex = zIndex;
        this.updateDomFromData();
    }

    /**
     * Sets the content of the widget.
     * @param content - The new content.
     */
    public setContent(content: string): void {
        this.data.content = content;
        this.updateDomFromData();
    }

    /**
     * Destroys the widget and removes it from the DOM.
     */
    public destructor(): void {
        // Remove all resize handle event listeners
        this.resizeHandles.forEach((handle, position) => {
            const boundHandler = this.boundResizeHandlers.get(position);
            if (boundHandler) {
                handle.removeEventListener('pointerdown', boundHandler);
            }
        });
        this.boundResizeHandlers.clear();
        this.resizeHandles.clear();

        // Clear references
        this.contentElement = null;
        this.onResizeStart = null;

        // Remove from DOM
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    // Private methods

    /**
     * Creates the DOM element for the widget.
     * @returns The created DOM element.
     */
    protected createDomElement(): HTMLElement {
        const widget = document.createElement('div');
        widget.className = 'widget';
        widget.setAttribute('data-id', this.data.id);
        widget.setAttribute('data-type', this.data.type);
        
        // Add pointer-events to ensure all widgets capture mouse events consistently
        widget.style.pointerEvents = 'all';

        this.contentElement = document.createElement('div');
        this.contentElement.className = 'widget-content';
        widget.appendChild(this.contentElement);

        // Create resize handles
        this.createResizeHandles(widget);

        return widget;
    }

    /**
     * Creates the resize handles for the widget.
     * @param parent - The parent element to attach the handles to.
     */
    private createResizeHandles(parent: HTMLElement): void {
        const positions: ResizeHandlePosition[] = [
            ResizeHandlePosition.NorthWest,
            ResizeHandlePosition.NorthEast,
            ResizeHandlePosition.SouthWest,
            ResizeHandlePosition.SouthEast
        ];

        positions.forEach(position => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${position}`;
            handle.setAttribute('data-resize-handle', position);

            // Create bound handler and store it for cleanup
            const boundHandler = (e: PointerEvent) => {
                e.stopPropagation(); // Prevent event from bubbling to parent
                e.preventDefault();

                if (this.onResizeStart) {
                    this.onResizeStart(this.data.id, position, e);
                }
            };
            this.boundResizeHandlers.set(position, boundHandler);

            // Add pointerdown event listener to handle
            handle.addEventListener('pointerdown', boundHandler);

            parent.appendChild(handle);
            this.resizeHandles.set(position, handle);
            handle.style.display = 'none'; // Initially hidden
        });
    }

    /**
     * Shows the resize handles.
     */
    private showResizeHandles(): void {
        this.resizeHandles.forEach(handle => {
            // Ensure handles are visible and on top
            handle.style.display = 'block';
            handle.style.zIndex = '1000';
        });
    }

    /**
     * Hides the resize handles.
     */
    private hideResizeHandles(): void {
        this.resizeHandles.forEach(handle => {
            handle.style.display = 'none';
        });
    }

    /**
     * Updates the DOM element based on the widget data.
     * Public method so that it can be called externally for maintenance.
     */
    public updateDomFromData(): void {
        console.log(`[Debug] updateDomFromData called for widget ${this.data.id}`);
        const { position, size, zIndex, content } = this.data;

        console.log(`[Debug] Setting DOM styles for widget ${this.data.id}:`, {
            position: `(${position.x}, ${position.y})`,
            size: `${size.width}x${size.height}`,
            zIndex: zIndex
        });

        // Ensure the element is visible and clickable
        this.element.style.display = 'block';
        this.element.style.pointerEvents = 'all';
        this.element.style.visibility = 'visible';
        this.element.style.opacity = '1';
        
        // Set position and dimensions
        this.element.style.left = `${position.x}px`;
        this.element.style.top = `${position.y}px`;
        this.element.style.width = `${size.width}px`;
        this.element.style.height = `${size.height}px`;
        this.element.style.zIndex = `${zIndex}`;
        
        // Make sure the widget has its data-id attribute set
        this.element.setAttribute('data-id', this.data.id);
        this.element.setAttribute('data-type', this.data.type);
        
        // Handle styling differences based on mode and selection
        if (this.element.classList.contains('preview-mode')) {
            // In preview mode, no borders or outlines - use !important to override CSS rules
            console.log(`[Debug] Widget in preview mode, clearing all border and outline properties with !important`);
            this.element.style.setProperty('border', '0', 'important');
            this.element.style.setProperty('border-width', '0', 'important');
            this.element.style.setProperty('border-style', 'none', 'important');
            this.element.style.setProperty('border-color', 'transparent', 'important');
            this.element.style.setProperty('outline', 'none', 'important');
            this.element.style.setProperty('outline-width', '0', 'important');
            this.element.style.setProperty('outline-style', 'none', 'important');
            this.element.style.setProperty('outline-color', 'transparent', 'important');
            this.element.style.setProperty('box-shadow', 'none', 'important');
            
            // Add compensation padding/margin to prevent layout shift
            this.element.style.setProperty('padding', '0 2px 2px 2px', 'important');
            this.element.style.setProperty('margin', '2px 0 0 0', 'important');
        } else if (this.data.type === WidgetType.QR && !this.selected) {
            console.log(`[Debug] Setting QR widget border to transparent (unselected state)`);
            this.element.style.border = '2px solid transparent'; // Use 2px to match CSS
            this.element.style.boxShadow = 'none';
            this.element.style.padding = '0';
            this.element.style.margin = '0';
        } else if (!this.selected) {
            console.log(`[Debug] Setting standard widget border for unselected state`);
            this.element.style.border = '2px solid #ccc'; // Use 2px to match CSS
            this.element.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
            this.element.style.padding = '0';
            this.element.style.margin = '0';
        } else {
            console.log(`[Debug] Widget is selected, border styling handled by CSS`);
            this.element.style.padding = '0';
            this.element.style.margin = '0';
        }

        // Update content if needed
        if (this.contentElement && content !== undefined) {
            console.log(`[Debug] Updating content element for widget ${this.data.id}`);
            this.contentElement.innerHTML = content;
            
            // Ensure content element is also clickable
            this.contentElement.style.pointerEvents = 'all';
        }
        
        // Apply custom styling based on widget type
        this.updateSpecificProperties();
        
        console.log(`[Debug] updateDomFromData completed for widget ${this.data.id}`);
    }
    
    /**
     * Updates properties specific to the widget type.
     * Override in subclasses to implement type-specific behavior.
     */
    protected updateSpecificProperties(): void {
        // Base implementation does nothing
    }

    /**
     * Sets the widget to preview mode, hiding all editing controls
     * @param previewMode - Whether to enable or disable preview mode
     */
    public setPreviewMode(previewMode: boolean): void {
        if (previewMode) {
            // Hide all resize handles
            this.hideResizeHandles();
            
            // Remove selected and reference styling
            this.element.classList.remove('selected');
            this.element.classList.remove('reference-widget');
            
            // Add preview mode class
            this.element.classList.add('preview-mode');
            
            // Remove all borders and compensate with padding to prevent layout shifts
            this.element.style.setProperty('border', '0', 'important');
            this.element.style.setProperty('border-width', '0', 'important');
            this.element.style.setProperty('border-style', 'none', 'important');
            this.element.style.setProperty('border-color', 'transparent', 'important');
            // Don't remove border-radius here, it will be handled by specific widget types
            
            // Add specific padding/margin to compensate for the removed 2px border
            this.element.style.setProperty('padding', '0 2px 2px 2px', 'important'); // Only add to right/bottom
            this.element.style.setProperty('margin', '2px 0 0 0', 'important'); // Add top margin to compensate
            this.element.style.setProperty('box-sizing', 'border-box', 'important');
            
            // Remove any outlines or shadows
            this.element.style.setProperty('outline', 'none', 'important');
            this.element.style.setProperty('outline-width', '0', 'important');
            this.element.style.setProperty('outline-style', 'none', 'important');
            this.element.style.setProperty('outline-color', 'transparent', 'important');
            this.element.style.setProperty('box-shadow', 'none', 'important');
            
            // Make sure content is visible but not interactive
            if (this.contentElement) {
                this.contentElement.style.pointerEvents = 'none';
            }
        } else {
            // Remove preview mode class
            this.element.classList.remove('preview-mode');
            
            // Reset any preview mode padding/margin to avoid shifts
            this.element.style.removeProperty('padding');
            this.element.style.removeProperty('margin');
            this.element.style.padding = '0';
            this.element.style.margin = '0';
            
            // Restore border and outline for edit mode
            if (!this.selected) {
                if (this.data.type === WidgetType.QR) {
                    this.element.style.border = '2px solid transparent'; // Use 2px to match CSS
                } else {
                    this.element.style.border = '2px solid #ccc'; // Use 2px to match CSS
                    this.element.style.outline = 'none'; // No outline in standard mode
                    this.element.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
                }
            } else {
                // Selected elements have their own styling through CSS
                this.element.style.outline = 'none';
            }
            
            // Restore selection state if needed
            if (this.selected) {
                this.showResizeHandles();
                if (this.isReference) {
                    this.element.classList.add('reference-widget');
                }
            }
            
            // Make content interactive again
            if (this.contentElement) {
                this.contentElement.style.pointerEvents = 'auto';
            }
        }
        
        // Apply type-specific properties
        this.updateSpecificProperties();
    }
}

