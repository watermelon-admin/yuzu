/**
* Module: Clipboard
* Handles clipboard actions in the editor.
*/
import { globals } from './globals.js';
import { Execute } from './commands.js';
import { AddWidgetCommand } from './addwidget.js';
import { RemoveWidgetsCommand } from './removewidgets.js';
/**
 * Cuts the selected widgets to the clipboard.
 */
export function cutSelectedWidgets() {
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    if (selectedWidgets.length === 0) {
        return;
    }
    // Clone the selected widgets
    let clonedWidgets = [];
    for (const widget of selectedWidgets) {
        const clonedWidget = widget.clone();
        clonedWidgets.push(clonedWidget);
    }
    // Set the cloned widgets as the clipboard content
    globals.clipboard = clonedWidgets;
    // Remove the selected widgets
    Execute(new RemoveWidgetsCommand(selectedWidgets));
}
/**
 * Copies the selected widgets to the clipboard.
 */
export function copySelectedWidgets() {
    // Get the selected widgets
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    if (selectedWidgets.length === 0) {
        console.warn('No widgets selected.');
        return;
    }
    // Clone the selected widgets
    let clonedWidgets = [];
    for (const widget of selectedWidgets) {
        const clonedWidget = widget.clone();
        clonedWidgets.push(clonedWidget);
    }
    // Set the cloned widgets as the clipboard content
    globals.clipboard = clonedWidgets;
    // Clear all widget selections
    globals.widgets.deselectAllWidgets();
}
/**
 * Clones the selected widgets.
 */
export function cloneSelectedWidgets() {
    // Get the selected widgets
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    if (selectedWidgets.length === 0) {
        return;
    }
    let clonedWidgets = [];
    // Iterate over the widgets in the clipboard
    for (const widget of selectedWidgets) {
        // Add the widget to the widgets collection
        let clonedWidget = widget.clone();
        // Unselect the spurce widget
        widget.selectionOrder = 0;
        // Move the cloned widget
        clonedWidget.x += 40;
        clonedWidget.y += 40;
        Execute(new AddWidgetCommand(clonedWidget));
        // Add the cloned widget to the collection
        clonedWidgets.push(clonedWidget);
    }
    // Clear all widget selections
    globals.widgets.updateSelectionMarkers();
    // Bring the cloned widgets to the front
    globals.widgets.bringToFront(clonedWidgets);
}
/**
 * Pastes the widgets from the clipboard to the canvas.
 */
export function pasteWidgets() {
    // Array to record cloned widgets
    let clonedWidgets = [];
    if (globals.clipboard.length === 0) {
        return;
    }
    // Iterate over the widgets in the clipboard
    for (const widget of globals.clipboard) {
        // Add the widget to the widgets collection
        let clonedWidget = widget.clone();
        clonedWidget.x += 40;
        clonedWidget.y += 40;
        Execute(new AddWidgetCommand(clonedWidget));
        clonedWidgets.push(clonedWidget);
    }
    // Clear all widget selections
    globals.widgets.updateSelectionMarkers();
    // Select the cloned widgets
    globals.widgets.selectWidgets(clonedWidgets);
    // Bring the cloned widgets to the front
    globals.widgets.bringToFront(clonedWidgets);
}
//# sourceMappingURL=clipboard.js.map