/**
 * Module: Widget
 * Defines the abstract Widget class.
 */
import { globals } from './globals.js';
import { createResizable, removeInteraction } from './interaction.js';
import { padNumberWithZeroes } from './tools.js';
/**
 * Abstract class representing a Widget.
 * This class provides the basic structure and functionality for widgets.
 */
export class Widget {
    /**
     * Constructor for the Widget class.
     * @param _x - The x-coordinate of the widget.
     * @param _y - The y-coordinate of the widget.
     * @param _width - The width of the widget.
     * @param _height - The height of the widget.
     * @param _selectionOrder - The order in which the widget was selected.
     * @param _groupNumber - The group number to which the widget belongs.
     * @param _stackOrder - The stack order of the widget.
     */
    constructor(_x, _y, _width, _height, _selectionOrder = 0, _groupNumber = 0, _stackOrder = 0) {
        this._x = _x;
        this._y = _y;
        this._width = _width;
        this._height = _height;
        this._selectionOrder = _selectionOrder;
        this._groupNumber = _groupNumber;
        this._stackOrder = _stackOrder;
        this._isMoving = false; // Flag indicating whether the widget is currently moving
    }
    // Accessors
    get x() {
        return this._x;
    }
    set x(value) {
        this._x = value;
        this.updateDebugInfo();
    }
    get y() {
        return this._y;
    }
    set y(value) {
        this._y = value;
        this.updateDebugInfo();
    }
    get width() {
        return this._width;
    }
    set width(value) {
        this._width = value;
        this.updateDebugInfo();
    }
    get height() {
        return this._height;
    }
    set height(value) {
        this._height = value;
        this.updateDebugInfo();
    }
    get selectionOrder() {
        return this._selectionOrder;
    }
    set selectionOrder(value) {
        this._selectionOrder = value;
        this.updateDebugInfo();
    }
    get groupNumber() {
        return this._groupNumber;
    }
    set groupNumber(value) {
        this._groupNumber = value;
        this.updateDebugInfo();
    }
    get stackOrder() {
        return this._stackOrder;
    }
    set stackOrder(value) {
        this._stackOrder = value;
        this.updateZIndex();
        this.updateDebugInfo();
    }
    get element() {
        return this._element;
    }
    set element(value) {
        this._element = value;
        this.updateDebugInfo();
    }
    set interactable(value) {
        this._interactable = value;
    }
    get interactable() {
        return this._interactable;
    }
    get isMoving() {
        return this._isMoving;
    }
    set isMoving(value) {
        this._isMoving = value;
        this.updateDebugInfo();
    }
    get isLeadingSelection() {
        return this._selectionOrder === 1;
    }
    get isTrailingSelection() {
        return this._selectionOrder > 1;
    }
    get isSelection() {
        return this.selectionOrder > 0;
    }
    // Methods
    /**
     * Gets the rectangle dimensions of the widget.
     * @returns An object containing the x, y, width, and height of the widget.
     */
    getRectangle() {
        return {
            x: this._x,
            y: this._y,
            width: this._width,
            height: this._height
        };
    }
    /**
    * Sets the rectangle dimensions of the widget.
    * @param x - The x-coordinate of the widget.
    * @param y - The y-coordinate of the widget.
    * @param width - The width of the widget.
    * @param height - The height of the widget.
    */
    setRectangle(x, y, width, height) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this.setElementRectangle(x, y, width, height);
        this.updateDebugInfo();
    }
    /**
      * Sets the element's rectangle dimensions.
      * @param x - The x-coordinate of the widget.
      * @param y - The y-coordinate of the widget.
      * @param width - The width of the widget.
      * @param height - The height of the widget.
      */
    setElementRectangle(x, y, width, height) {
        this._element.style.left = `${x}px`;
        this._element.style.top = `${y}px`;
        this._element.style.width = `${width}px`;
        this._element.style.height = `${height}px`;
    }
    /**
     * Updates the element's rectangle dimensions based on the DOM.
     */
    updateElementRectangle() {
        const rect = this.element.getBoundingClientRect();
        this.setRectangle(rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height);
    }
    /**
     * Renders the widget by setting its position and size.
     */
    render() {
        this.element.style.position = 'absolute';
        this.setRectangle(this.x, this.y, this.width, this.height);
        this.updateDebugInfoElement();
    }
    /**
     * Creates the HTML element for the widget.
     */
    createElement() {
        // Check if element already exists
        if (this._element)
            return;
        // Get the template element
        const typeName = this.constructor.name;
        const elementTemplateName = `${typeName}Template`;
        const elementTemplate = document.getElementById(elementTemplateName);
        // Check if the template element exists
        if (!elementTemplate) {
            console.error(`Template with id "${elementTemplateName}" not found.`);
            return;
        }
        // Clone the content of the template
        const clonedElement = elementTemplate.content.cloneNode(true);
        const newElement = clonedElement.firstElementChild;
        // Assign unique ID to new element
        globals.elementCounter++;
        const newElementId = `widget-${padNumberWithZeroes(globals.elementCounter, 5)}`;
        newElement.id = newElementId;
        // Append the element to the DOM
        this._element = document.body.appendChild(newElement);
        // Add element event handlers
        this._element.setAttribute('onclick', 'Editor.handleWidgetElementClick(this, event);');
        if (this.widgetType === 'TextWidget') {
            this._element.firstElementChild.setAttribute('ondblclick', 'Editor.handleTextWidgetElementDoubleClick(this, event);');
            this._element.firstElementChild.setAttribute('onfocusout', 'Editor.handleTextWidgetElementFocusOut(this, event);');
            this._element.firstElementChild.setAttribute('onkeydown', 'Editor.handleTextWidgetElementKeyDown(this, event);');
        }
        // Add interaction
        this._interactable = createResizable(this._element);
        this._interactable.on('doubletap', (event) => {
            console.info('Double-tapped widget.');
            event.stopPropagation();
            event.preventDefault();
        });
    }
    /**
     * Removes the widget's HTML element from the DOM.
     */
    removeElement() {
        if (this._element) {
            this._element.remove();
        }
    }
    /**
     * Reattaches the widget's HTML element to the DOM.
     */
    reattachElement() {
        // Check if element already exists
        if (!this._element)
            return;
        // Append the element to the DOM
        document.body.appendChild(this._element);
    }
    /**
    * Updates the z-index of the widget element based on the stack order.
    */
    updateZIndex() {
        if (this._element) {
            this._element.style.zIndex = this._stackOrder.toString();
        }
    }
    /**
     * Sets the interaction status of the widget.
     * @param isActive - Flag indicating whether the interaction should be active.
     */
    setInteractionStatus(isActive) {
        if (isActive) {
            // Add interaction
            createResizable(this._element);
        }
        else {
            // Remove interaction
            removeInteraction(this._element);
        }
    }
    /**
     * Conditionally updates the debug information based on the debug mode flag.
     */
    updateDebugInfo() {
        if (globals.isDebugMode) {
            this.updateDebugInfoElement();
        }
    }
    /**
     * Updates the debug information element with the widget's current state.
     */
    updateDebugInfoElement() {
        // Return early if the main element does not exist
        if (!this.element)
            return;
        // Determine the appropriate debug info selector based on the widget type
        const debugInfoSelector = this.widgetType === 'GroupWidget' ? '.group-debug-info' : '.debug-info';
        // Query the debug info element from the main element
        const debugInfoElement = this.element.querySelector(debugInfoSelector);
        // Show debug info if debug mode is enabled
        if (globals.isDebugMode) {
            // Show the debug info element
            if (debugInfoElement)
                debugInfoElement.hidden = false;
        }
        else {
            // Hide the debug info element and return early
            if (debugInfoElement)
                debugInfoElement.hidden = true;
            return;
        }
        // Return early if the debug info element is not found
        if (!debugInfoElement)
            return;
        // Construct the debug string based on the widget type
        const debugString = this.widgetType === 'GroupWidget'
            ? `GROUP ${this.groupNumber} [${this.element.id}] sel:${this.selectionOrder} stk:${this.stackOrder} | x:${Math.floor(this.x)} y:${Math.floor(this.y)}, w:${this.width}, h:${this.height}`
            : `[${this.element.id}] sel:${this.selectionOrder} stk:${this.stackOrder} | x:${Math.floor(this.x)} y:${Math.floor(this.y)}, w:${this.width}, h:${this.height}`;
        // Update the inner text of the debug info element with the constructed debug string
        debugInfoElement.innerText = debugString;
    }
    /**
     * Toggles the visibility of the debug information element.
     *
     * @param {boolean} isVisible - A flag indicating whether the debug information should be visible.
     */
    showDebugInfo(isVisible = true) {
        var _a;
        (_a = this.element.querySelector('.debug-info')) === null || _a === void 0 ? void 0 : _a.classList.toggle('hidden', !isVisible);
    }
    // Handle preview mode
    enablePreviewMode(previewEnabled) {
        globals.isPreviewMode = previewEnabled;
        // Toggle the preview mode class on the widget element
        if (previewEnabled)
            this.element.classList.add('preview-mode');
        else
            this.element.classList.remove('preview-mode');
    }
}
//# sourceMappingURL=widget.js.map