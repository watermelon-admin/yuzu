/**
 * Module: QRWidget
 * Class representing a QRWidget that extends the Widget class.
 * This class includes an additional text attribute.
 */
import { createResizable, removeInteraction } from "./interaction.js";
import { Widget } from "./widget.js";
export class QRWidget extends Widget {
    /**
     * Constructor for the QRWidget class.
     * @param x - The x-coordinate of the widget.
     * @param y - The y-coordinate of the widget.
     * @param width - The width of the widget.
     * @param height - The height of the widget.
     * @param selectionOrder - The order in which the widget was selected.
     * @param groupNumber - The group number to which the widget belongs.
     * @param stackOrder - The stack order of the widget.
     * @param text - The text content of the QR code.
     */
    constructor(x, y, width, height, selectionOrder = 0, groupNumber = 0, stackOrder = 0, text = 'empty-qr-code') {
        super(x, y, width, height, selectionOrder, groupNumber, stackOrder);
        this.widgetType = 'QRWidget';
        this._text = text;
    }
    /**
     * Initializes the QRWidget.
     * This method should be called to set up the widget.
     */
    init() {
        // Create the element and render the widget
        this.createElement();
        this.render();
    }
    /**
     * Renders the QRWidget by setting its position and size.
     */
    render() {
        super.render();
    }
    /**
     * Clones the QRWidget instance.
     * @returns A new QRWidget instance with the same properties as the original.
     */
    clone() {
        return new QRWidget(this._x, this._y, this._width, this._height, this._selectionOrder, this._groupNumber, this._stackOrder, this._text);
    }
    /**
     * Creates the HTML element for the QRWidget.
     */
    createElement() {
        super.createElement();
    }
    // Accessor and Mutator for text
    get text() {
        return this._text;
    }
    set text(value) {
        this._text = value;
    }
    /**
     * Enables or disables preview mode for the QRWidget.
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
//# sourceMappingURL=qrwidget.js.map