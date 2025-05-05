/**
 * Module: BoxWidget
 * Class representing a BoxWidget that extends the Widget class.
 * This class includes an additional color attribute.
 */
import { Widget } from "./widget.js";
import { createResizable, removeInteraction } from "./interaction.js";
export class BoxWidget extends Widget {
    /**
     * Constructor for the BoxWidget class.
     * @param x - The x-coordinate of the widget.
     * @param y - The y-coordinate of the widget.
     * @param width - The width of the widget.
     * @param height - The height of the widget.
     * @param color - The color of the widget.
     * @param creationOrder - The order in which the widget was created.
     * @param selectionOrder - The order in which the widget was selected.
     * @param groupNumber - The group number to which the widget belongs.
     * @param stackOrder - The stack order of the widget.
     */
    constructor(x, y, width, height, color, selectionOrder = 0, groupNumber = 0, stackOrder = 0) {
        super(x, y, width, height, selectionOrder, groupNumber, stackOrder);
        this.widgetType = 'BoxWidget';
        this._color = color;
    }
    /**
     * Initializes the BoxWidget.
     * This method should be called to set up the widget.
     */
    init() {
        // Create the element and render the widget
        this.createElement();
        this.render();
        this.color = this._color; // Apply the initial color
    }
    /**
     * Creates the HTML element for the BoxWidget and applies the color.
     */
    createElement() {
        super.createElement();
        if (this._element) {
            this._element.style.backgroundColor = this._color;
        }
    }
    /**
     * Renders the BoxWidget by setting its position, size, and color.
     */
    render() {
        super.render();
        if (this._element) {
            this._element.style.backgroundColor = this._color;
        }
    }
    /**
     * Clones the BoxWidget instance.
     * @returns A new BoxWidget instance with the same properties as the original.
     */
    clone() {
        return new BoxWidget(this._x, this._y, this._width, this._height, this._color, this._selectionOrder, this._groupNumber, this._stackOrder);
    }
    /**
     * Accessor for color.
     * @returns The current color of the BoxWidget.
     */
    get color() {
        return this._color;
    }
    /**
     * Mutator for color.
     * @param value - The new color value to set.
     */
    set color(value) {
        this._color = value;
        if (this._element) {
            this._element.style.backgroundColor = value;
        }
    }
    /**
     * Enables or disables preview mode for the BoxWidget.
     * @param previewEnabled - A boolean value indicating whether preview mode is enabled.
     */
    enablePreviewMode(previewEnabled) {
        super.enablePreviewMode(previewEnabled);
        // If the widget is part of a group, do not modify interactions
        if (this.groupNumber > 0)
            return;
        // Enable or disable interactions based on the preview mode
        if (previewEnabled)
            removeInteraction(this._element);
        else
            this._interactable = createResizable(this._element);
    }
}
//# sourceMappingURL=boxwidget.js.map