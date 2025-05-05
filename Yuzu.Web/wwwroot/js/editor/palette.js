/**
 * Module: Palette
 * Handles the palette buttons and their interactions.
 */
import { globals } from './globals.js';
/**
 * Updates the status of palette buttons based on various conditions.
 * Disables or enables buttons depending on widget selections and other states.
 */
export function updateButtonStatus() {
    // Mapping of class names to their corresponding condition checks
    const buttonConditions = {
        // Disables the button if there are no widgets selected
        'req-selected': () => globals.widgets.getWidgetsBySelection().length === 0,
        // Disables the button if fewer than two widgets are selected
        'req-two-selected': () => globals.widgets.getWidgetsBySelection().length < 2,
        // Disables the button if fewer than three widgets are selected
        'req-multi-selected': () => globals.widgets.getWidgetsBySelection().length < 3,
        // Disables the button if the leading selection is not a GroupWidget
        'req-group-selected': () => {
            const leadingSelection = globals.widgets.getWidgetsByLeadingSelection();
            const selectedWidgets = globals.widgets.getWidgetsBySelection();
            return !leadingSelection || leadingSelection.widgetType !== 'GroupWidget' || selectedWidgets.length > 1;
        },
        'req-two-no-group-selected': () => {
            const selectedWidgets = globals.widgets.getWidgetsBySelection();
            // Disables the button if fewer than two widgets are selected or any widget of selection is a GroupWidget
            return selectedWidgets.length < 2 || selectedWidgets.some(widget => widget.widgetType === 'GroupWidget');
        },
        // Disables the button if there are no actions to undo
        'req-undo-available': () => globals.undoStack.size() === 0,
        // Disables the button if there are no actions to redo
        'req-redo-available': () => globals.redoStack.size() === 0,
        // Disables the button if the clipboard is empty
        'req-clipboard-available': () => globals.clipboard.length === 0,
    };
    // Iterate over all palette buttons and apply the appropriate condition check
    document.querySelectorAll('.palette-button').forEach((button) => {
        for (const [className, condition] of Object.entries(buttonConditions)) {
            // If the button has a class that matches one of the conditions, apply the condition
            if (button.classList.contains(className)) {
                button.disabled = condition();
                break; // Exit the loop early since we've found the relevant condition
            }
        }
    });
    // Get the selected widgets
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    // Check if any of the selected widgets is a text widget
    const isTextWidgetSelected = selectedWidgets.some(widget => widget.widgetType === 'TextWidget');
    // Check of any of the selected widgets is a box widget
    const isBoxWidgetSelected = selectedWidgets.some(widget => widget.widgetType === 'BoxWidget');
    // Enable color picker depending on whether a box or text widget is selected
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.disabled = !(isTextWidgetSelected || isBoxWidgetSelected);
    // Enable font appearance controls depending on whether a text widget is selected
    const fontSelector = document.getElementById('fontSelector');
    fontSelector.disabled = !isTextWidgetSelected;
    const fontSizeInput = document.getElementById('fontSizeInput');
    fontSizeInput.disabled = !isTextWidgetSelected;
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    fontSizeSlider.disabled = !isTextWidgetSelected;
}
/**
 * Updates the appearance controls based on the selected widgets.
 */
export function updateAppearanceControls() {
    // Get the currently selected widgets
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    // If no widgets are selected, do nothing
    if (selectedWidgets.length === 0) {
        return;
    }
    // Initialize appearance properties
    let selectedColor = null;
    let selectedFontSize = null;
    let selectedFontFamily = null;
    // Iterate through each selected widget
    for (const widget of selectedWidgets) {
        if (widget.widgetType === 'TextWidget') {
            const textWidget = widget;
            // Determine if the color should be set or reset to null
            if (selectedColor === null) {
                selectedColor = textWidget.color;
            }
            else if (selectedColor !== textWidget.color) {
                selectedColor = null;
            }
            // Determine if the font size should be set or reset to null
            if (selectedFontSize === null) {
                selectedFontSize = textWidget.fontSize;
            }
            else if (selectedFontSize !== textWidget.fontSize) {
                selectedFontSize = null;
            }
            // Determine if the font family should be set or reset to null
            if (selectedFontFamily === null) {
                selectedFontFamily = textWidget.fontFamily;
            }
            else if (selectedFontFamily !== textWidget.fontFamily) {
                selectedFontFamily = null;
            }
        }
        else if (widget.widgetType === 'BoxWidget') {
            const boxWidget = widget;
            // Determine if the color should be set or reset to null
            if (selectedColor === null) {
                selectedColor = boxWidget.color;
            }
            else if (selectedColor !== boxWidget.color) {
                selectedColor = null;
            }
        }
    }
    // Get the appearance control elements from the DOM
    const colorPicker = document.getElementById('colorPicker');
    const fontSelector = document.getElementById('fontSelector');
    const fontSizeInput = document.getElementById('fontSizeInput');
    // Update the appearance controls with the selected values 
    if (selectedColor)
        colorPicker.value = selectedColor;
    if (selectedFontFamily)
        fontSelector.value = selectedFontFamily;
    if (selectedFontSize)
        fontSizeInput.value = selectedFontSize.toString();
}
//# sourceMappingURL=palette.js.map