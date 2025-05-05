/**
 * Module: Commands
 * Implementations of commands for the editor.
 */
import { globals } from './globals.js';
import { updateButtonStatus } from './palette.js';
/**
 * Executes the provided command.
 * @param command The command to execute.
 * @returns CommandResult object indicating success status and optional error text.
 */
export function Execute(command) {
    // Execute the command.
    const result = command.execute();
    // If the last action was an undo, clear the redo stack.
    // Note: Once a user undoes an action and then performs a new action, 
    // the state of the application has diverged from the state 
    // that existed when the redoable actions were performed.
    // Allowing the user to redo actions after this point can lead to 
    // unexpected or undefined behavior, because those actions 
    // were performed under a different state context.
    if (globals.wasLastActionUndo) {
        globals.redoStack.clear();
        globals.wasLastActionUndo = false; // reset the flag  
    }
    // Add the command to the undo stack.
    globals.undoStack.push(command);
    updateButtonStatus();
    updateAppearanceControls();
}
/**
 * Undoes the last executed command.
 * @returns CommandResult object indicating success status and optional error text.
 */
export function Undo() {
    if (globals.undoStack.isEmpty()) {
        console.warn('Undo stack is empty');
    }
    // Pop the last command from the undo stack.
    const command = globals.undoStack.pop();
    // console.debug(command);
    // Undo the command.
    command.undo();
    globals.redoStack.push(command);
    globals.wasLastActionUndo = true;
    updateButtonStatus();
    updateAppearanceControls();
}
/**
 * Redoes the last undone command.
 * @returns CommandResult object indicating success status and optional error text.
 */
export function Redo() {
    // console.debug('Redo() called.');
    if (globals.redoStack.isEmpty()) {
        console.warn('Redo stack is empty');
    }
    // Pop the last command from the redo stack.
    const command = globals.redoStack.pop();
    console.log(command);
    // Execute the command.
    command.execute(true);
    globals.undoStack.push(command);
    updateButtonStatus();
    updateAppearanceControls();
}
/**
* Updates the appearance controls based on the selected widgets.
*/
export function updateAppearanceControls() {
    // Get the currently selected widgets
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    // If no widgets are selected, log an error and return
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
//# sourceMappingURL=commands.js.map