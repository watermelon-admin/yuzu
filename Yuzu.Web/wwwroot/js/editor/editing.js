/**
 * Module: Editing
 * Implements editing actions in the editor.
 */
import { globals } from './globals.js';
/**
 * Enables edit mode for the leading TextWidget in the editor.
 */
export function editLeadingTextWidget() {
    // Get the leading TextWidget from global widgets
    const leadingWidget = globals.widgets.getWidgetsByLeadingSelection();
    // Check if a leading TextWidget is found
    if (leadingWidget && leadingWidget.widgetType === 'TextWidget') {
        // Cast to TextWidget type
        const leadingTextWidget = leadingWidget;
        // Enable edit mode for the leading TextWidget
        leadingTextWidget.enableEditMode(true);
    }
}
/**
 * Disables edit mode for the currently edited TextWidget in the editor.
 */
export function finishEditingTextWidget() {
    // Get the currently edited TextWidget from global widgets
    const editedTextWidget = globals.widgets.getCurrentlyEditedTextWidget();
    // Check if there is a currently edited TextWidget
    if (editedTextWidget) {
        // Disable edit mode for the currently edited TextWidget
        editedTextWidget.enableEditMode(false);
    }
}
//# sourceMappingURL=editing.js.map