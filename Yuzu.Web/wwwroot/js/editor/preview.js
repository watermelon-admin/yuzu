/**
* Module: Preview
* Handles the preview mode of the editor.
*/
import { globals } from './globals.js';
export function showEditorPreview() {
    // Enter preview mode
    globals.widgets.enablePreviewMode(true);
    // Get all div elements that have the tool-widget class set and cast them to HTMLDivElement
    const toolWidgets = document.querySelectorAll('.tool-widget');
    // Hide all tool widgets
    toolWidgets.forEach(widget => widget.style.display = 'none');
    // Show the button with id 'show-preview'
    const showPreviewButton = document.getElementById('exitPreview');
    if (showPreviewButton) {
        // Show the button
        showPreviewButton.style.display = 'block';
    }
}
export function exitEditorPreview() {
    // Exit preview mode
    globals.widgets.enablePreviewMode(false);
    // Get all div elements that have the tool-widget class set and cast them to HTMLDivElement
    const toolWidgets = document.querySelectorAll('.tool-widget');
    // Show all tool widgets
    toolWidgets.forEach(widget => widget.style.display = 'block');
    // Hide the button with id 'show-preview'
    const showPreviewButton = document.getElementById('exitPreview');
    if (showPreviewButton) {
        // Hide the button
        showPreviewButton.style.display = 'none';
    }
}
//# sourceMappingURL=preview.js.map