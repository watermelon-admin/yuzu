/**
 * Module: BoxWidget
 * Class representing a BoxWidget that extends the Widget class.
 * This class includes an additional color attribute.
 */
import { Widget } from "./widget.js";
import { createResizable, removeInteraction } from "./interaction.js";
import { createExampleReplacement, } from "./placeholders.js";
export class TextWidget extends Widget {
    /**
     * Constructor for the BoxWidget class.
     * @param x - The x-coordinate of the widget.
     * @param y - The y-coordinate of the widget.
     * @param width - The width of the widget.
     * @param height - The height of the widget.

     * @param creationOrder - The order in which the widget was created.
     * @param selectionOrder - The order in which the widget was selected.
     * @param groupNumber - The group number to which the widget belongs.
     * @param stackOrder - The stack order of the widget.
     */
    constructor(x, y, width, height, color, fontFamily, fontSize, selectionOrder = 0, groupNumber = 0, stackOrder = 0, text = 'Edit Me!') {
        super(x, y, width, height, selectionOrder, groupNumber, stackOrder);
        this.widgetType = 'TextWidget';
        this._isEditing = false;
        this._text = text;
        //this._previewText = this.showPreviewText(text);
        this._fontFamily = fontFamily;
        this._fontSize = fontSize;
        this._color = color;
    }
    // Accessor and Mutator for color
    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
        if (this._element)
            this.render();
    }
    // Accessor and Mutator for font family
    get fontFamily() {
        return this._fontFamily;
    }
    set fontFamily(value) {
        this._fontFamily = value;
        if (this._element)
            this.render();
    }
    // Accessor and Mutator for font size
    get fontSize() {
        return this._fontSize;
    }
    set fontSize(value) {
        this._fontSize = value;
        if (this._element)
            this.render();
    }
    // Accessor and Mutator for text
    get text() {
        return this._text;
    }
    set text(value) {
        this._text = value;
    }
    get previewText() {
        return this._previewText;
    }
    set previewText(value) {
        this._previewText = value;
    }
    // Accessor and Mutator for isEditing
    get isEditing() {
        return this._isEditing;
    }
    /**
     * Initializes the BoxWidget.
     * This method should be called to set up the widget.
     */
    init() {
        // Create the element and render the widget
        this.createElement();
        this.render();
        // Set the cursor style to move
        const textElement = this._element.firstElementChild;
        textElement.style.cursor = 'move';
    }
    /**
     * Clones the BoxWidget instance.
     * @returns A new BoxWidget instance with the same properties as the original.
     */
    clone() {
        return new TextWidget(this._x, this._y, this._width, this._height, this._color, this._fontFamily, this._fontSize, this._selectionOrder, this._groupNumber, this._stackOrder, this._text);
    }
    /**
     * Creates the HTML element for the BoxWidget and applies the color.
     */
    createElement() {
        super.createElement();
    }
    /**
     * Renders the TextWidget by setting its position, size, and color.
     */
    render() {
        super.render();
        const textElement = this._element.firstElementChild;
        textElement.style.color = this._color;
        textElement.style.fontFamily = this._fontFamily;
        textElement.style.fontSize = this._fontSize + 'px';
        textElement.value = this._previewText;
        this.showPreviewText(this._text);
        textElement.value = this._previewText;
    }
    showPreviewText(text) {
        var _a, _b;
        const result = createExampleReplacement(text);
        const errorMessageSpan = (_a = this._element) === null || _a === void 0 ? void 0 : _a.querySelector('.error-message');
        const errorBoxDiv = (_b = this._element) === null || _b === void 0 ? void 0 : _b.querySelector('.text-widget-error');
        if (result.success) {
            if (errorBoxDiv)
                errorBoxDiv.style.display = "none";
            this._previewText = result.result;
        }
        else {
            if (errorBoxDiv)
                errorBoxDiv.style.display = "block";
            if (errorMessageSpan)
                errorMessageSpan.innerHTML = "<strong>Formatting Error: </strong>" + result.error;
            this._previewText = text;
        }
    }
    /**
     * Enables or disables edit mode for the TextWidget.
     * @param {boolean} editEnabled - True to enable edit mode, false to disable it.
     */
    enableEditMode(editEnabled) {
        // Get text element
        const textElement = this._element.firstElementChild;
        if (editEnabled) {
            textElement.readOnly = false;
            textElement.style.cursor = 'text';
            textElement.value = this._text;
            this._isEditing = true;
            removeInteraction(this._element);
        }
        else {
            textElement.readOnly = true;
            textElement.style.cursor = 'move';
            this._text = textElement.value;
            this.showPreviewText(textElement.value);
            textElement.value = this._previewText;
            this._isEditing = false;
            this._interactable = createResizable(this._element);
        }
    }
    /**
     * Enables or disables preview mode for the TextWidget.
     * @param previewEnabled - A boolean value indicating whether preview mode is enabled.
     */
    enablePreviewMode(previewEnabled) {
        super.enablePreviewMode(previewEnabled);
        // If the widget is part of a group, do not modify interactions
        if (this.groupNumber > 0)
            return;
        // Get the text element
        const textElement = this._element.firstElementChild;
        // Enable or disable interactions based on the preview mode
        if (previewEnabled) {
            textElement.style.cursor = 'auto';
            removeInteraction(this._element);
        }
        else {
            textElement.style.cursor = 'move';
            this._interactable = createResizable(this._element);
        }
    }
}
//# sourceMappingURL=textwidget.js.map