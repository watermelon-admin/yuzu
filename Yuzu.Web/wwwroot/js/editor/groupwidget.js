/**
 * Module: GroupWidget
 * Class representing a GroupWidget that extends the Widget class.
 * This class includes an array of child widgets.
 */
import { Widget } from "./widget.js";
import { globals } from "./globals.js";
import { padNumberWithZeroes } from "./tools.js";
import { createDraggable, removeInteraction } from "./interaction.js";
export class GroupWidget extends Widget {
    /**
     * Constructor for the GroupWidget class.
     * @param x - The x-coordinate of the widget.
     * @param y - The y-coordinate of the widget.
     * @param width - The width of the widget.
     * @param height - The height of the widget.
     * @param childWidgets - Array of child widgets.
     * @param selectionOrder - The order in which the widget was selected.
     * @param groupNumber - The group number to which the widget belongs.
     * @param stackOrder - The stack order of the widget.
     */
    constructor(x, y, width, height, childWidgets = [], selectionOrder = 0, groupNumber = 0, stackOrder = 0) {
        super(x, y, width, height, selectionOrder, groupNumber, stackOrder);
        this.widgetType = 'GroupWidget';
        this._childWidgets = childWidgets;
    }
    /**
     * Initializes the GroupWidget.
     * This method should be called to set up the widget.
     */
    init() {
        // Create the element and render the widgets
        this.createElement(); // Create the HTML element
        this.childWidgets.forEach(widget => widget.init()); // Initialize child widgets
    }
    /**
     * Clones the GroupWidget instance.
     * @returns A new GroupWidget instance with the same properties as the original.
     */
    clone() {
        return new GroupWidget(this._x, this._y, this._width, this._height, this._childWidgets.map(widget => widget.clone()), // Clone child widgets
        this._selectionOrder, this._groupNumber, this._stackOrder);
    }
    /**
     * Creates the HTML element for the GroupWidget.
     */
    createElement() {
        super.createElement();
    }
    /**
     * Renders the GroupWidget by setting its position and size.
     */
    render() {
        super.render();
        this.childWidgets.forEach(widget => widget.render()); // Render child widgets
    }
    // Accessor and Mutator for childWidgets
    get childWidgets() {
        return this._childWidgets;
    }
    set childWidgets(value) {
        this._childWidgets = value;
    }
    /**
     * Updates the displayed group number on the group widget element.
     */
    updateGroupNumberLabel() {
        const groupNumberElement = this.element.querySelector('.group-number');
        groupNumberElement.innerText = padNumberWithZeroes(this.groupNumber, 2);
    }
    // Shows or hides the group number label
    showGroupNumberLabel(show) {
        const groupNumberElement = this.element.querySelector('.group-number');
        groupNumberElement.style.display = show ? 'block' : 'none';
    }
    /**
     * Assigns a new unique group number to the target group widget.
     */
    assignNewGroupNumber() {
        const newGroupNumber = globals.widgets.getHighestGroupNumber() + 1;
        this.groupNumber = newGroupNumber;
    }
    /**
     * Enables or disables preview mode for the GroupWidget.
     * @param previewEnabled - A boolean value indicating whether preview mode is enabled.
     */
    enablePreviewMode(previewEnabled) {
        super.enablePreviewMode(previewEnabled);
        // Enable or disable preview mode for child widgets
        this.childWidgets.forEach(widget => widget.enablePreviewMode(previewEnabled));
        // Show or hide the group number label
        this.showGroupNumberLabel(!previewEnabled);
        // Enable or disable interactions based on the preview mode
        if (previewEnabled)
            removeInteraction(this._element);
        else
            this._interactable = createDraggable(this._element);
    }
}
//# sourceMappingURL=groupwidget.js.map