import { updateButtonStatus, updateAppearanceControls } from './palette.js';
import { executeAction } from './actions.js';
/**
 * Handles editor keyboard commands
 *
 * @param {KeyboardEvent} event - The keyboard event object.
 */
export function handleKeyCommand(event) {
    console.debug("handleKeyCommand() called.");
    // Helper function to prevent default behavior and stop propagation.
    function preventDefaultAndStopPropagation() {
        event.preventDefault();
        event.stopPropagation();
    }
    const isCtrl = event.ctrlKey;
    const isShift = event.shiftKey;
    const isAlt = event.altKey;
    // Undo: Ctrl+Z - Reverts the last action.
    if (isCtrl && event.key === 'z' && !isShift) {
        preventDefaultAndStopPropagation();
        executeAction('undo');
    }
    // Redo: Ctrl+Y - Reapplies the last undone action.
    if (isCtrl && event.key === 'y') {
        preventDefaultAndStopPropagation();
        executeAction('redo');
    }
    // Copy: Ctrl+C - Copies the selected item to the clipboard.
    if (isCtrl && event.key === 'c') {
        preventDefaultAndStopPropagation();
        executeAction('copy_selected');
    }
    // Paste: Ctrl+V - Pastes the copied item from the clipboard.
    if (isCtrl && event.key === 'v') {
        preventDefaultAndStopPropagation();
        executeAction('paste');
    }
    // Cut: Ctrl+X - Cuts the selected item and copies it to the clipboard.
    if (isCtrl && event.key === 'x') {
        preventDefaultAndStopPropagation();
        executeAction('cut_selected');
    }
    // Select All: Ctrl+A - Selects all items in the current document or window.
    if (isCtrl && event.key === 'a') {
        preventDefaultAndStopPropagation();
        executeAction('select_all');
    }
    // Deselect All: Ctrl+Shift+D - Deselects all selected items.
    if (isCtrl && (event.key === 'd' || event.key === 'D') && isShift) {
        preventDefaultAndStopPropagation();
        // TODO: Implement deselect all functionality if needed
    }
    // Group: Ctrl+K - Groups the selected items into a single group.
    if (isCtrl && event.key === 'k') {
        preventDefaultAndStopPropagation();
        executeAction('group_selected');
    }
    // Ungroup: Ctrl+Shift+U - Ungroups the selected group of items.
    if (isCtrl && (event.key === 'u' || event.key === 'U') && isShift) {
        preventDefaultAndStopPropagation();
        executeAction('ungroup');
    }
    // Align Left: Ctrl+Alt+L - Aligns the selected items to the left.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'l' || event.key === 'L')) {
        preventDefaultAndStopPropagation();
        executeAction('align_left');
    }
    // Align Center: Ctrl+Alt+C - Aligns the selected items to the center.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'c' || event.key === 'C')) {
        preventDefaultAndStopPropagation();
        executeAction('align_center-horizontal');
    }
    // Align Right: Ctrl+Alt+R- Aligns the selected items to the right.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'r' || event.key === 'R')) {
        preventDefaultAndStopPropagation();
        executeAction('align_right');
    }
    // Align Top: Ctrl+Alt+T - Aligns the selected items to the top.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 't' || event.key === 'T')) {
        preventDefaultAndStopPropagation();
        executeAction('align_top');
    }
    // Align Middle: Ctrl+Alt+H - Aligns the selected items to the middle horizontally.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'h' || event.key === 'H')) {
        preventDefaultAndStopPropagation();
        executeAction('align_center-vertical');
    }
    // Align Bottom: Ctrl+Alt+B - Aligns the selected items to the bottom.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'b' || event.key === 'B')) {
        preventDefaultAndStopPropagation();
        executeAction('align_bottom');
    }
    // Distribute Horizontally: Ctrl+Shift+H - Evenly distributes the selected items horizontally.
    if (isCtrl && (event.key === 'h' || event.key === 'H') && isShift) {
        preventDefaultAndStopPropagation();
        executeAction('distribute-horizontal');
    }
    // Distribute Vertically: Ctrl+Shift+V - Evenly distributes the selected items vertically.
    if (isCtrl && (event.key === 'v' || event.key === 'V') && isShift) {
        preventDefaultAndStopPropagation();
        executeAction('distribute-vertical');
    }
    // Bring to Front: Ctrl+Shift+F - Brings the selected item to the front of all other items.
    if (isCtrl && (event.key === 'f' || event.key === 'F') && isShift) {
        preventDefaultAndStopPropagation();
        // TODO: Implement bring to front functionality 
    }
    // Send to Back: Ctrl+Shift+B - Sends the selected item to the back of all other items.
    if (isCtrl && (event.key === 'b' || event.key === 'B') && isShift) {
        preventDefaultAndStopPropagation();
        // TODO: Implement send to back functionality 
    }
    // Make Same Size: Ctrl+Shift+S - Makes the selected items the same size.
    if (isCtrl && (event.key === 's' || event.key === 'S') && isShift) {
        preventDefaultAndStopPropagation();
        executeAction('align_same-size');
    }
    // Make Same Height: Ctrl+Alt+Y- Makes the selected items the same height.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'y' || event.key === 'Y')) {
        preventDefaultAndStopPropagation();
        executeAction('align_same-height');
    }
    // Make Same Width: Ctrl+Alt+X - Makes the selected items the same width.
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'x' || event.key === 'X')) {
        preventDefaultAndStopPropagation();
        executeAction('align_same-width');
    }
    // Clone: Ctrl+D - Duplicates the selected item.
    if (isCtrl && event.key === 'd' && !isShift) {
        preventDefaultAndStopPropagation();
        executeAction('clone_selected');
        // TODO: Implement clone functionality if needed
    }
    // Delete: Delete - Deletes the selected item.
    if (event.code === 'Delete') {
        preventDefaultAndStopPropagation();
        executeAction('delete');
    }
    // Save: Ctrl+S - Saves the current document or project.
    if (isCtrl && event.key === 's' && !isShift) {
        preventDefaultAndStopPropagation();
        // TODO: Implement save functionality if needed
    }
    // Load: Ctrl+O - Opens a dialog to load a document or project.
    if (isCtrl && event.key === 'o') {
        preventDefaultAndStopPropagation();
        // TODO: Implement load functionality if needed
    }
    // Add Box Widget: Alt+1 - Adds a new box widget to the document.
    if (event.altKey && event.key === '1' && !isShift) {
        preventDefaultAndStopPropagation();
        executeAction('add_box');
        // TODO: Implement add box widget functionality if needed
    }
    // Add Text Widget: Alt+2 - Adds a new text widget to the document.
    if (event.altKey && event.key === '2' && !isShift) {
        preventDefaultAndStopPropagation();
        // TODO: Implement add text widget functionality if needed
    }
    // Add QR Code Widget: Alt+3 - Adds a new QR code widget to the document.
    if (event.altKey && event.key === '3' && !isShift) {
        preventDefaultAndStopPropagation();
        // TODO: Implement add QR code widget functionality if needed
    }
    // Edit Text: Ctrl+E - Enters text editing mode for the selected text widget.
    if (isCtrl && event.key === 'e') {
        preventDefaultAndStopPropagation();
        // TODO: Implement edit text functionality if needed
    }
    updateButtonStatus();
    updateAppearanceControls();
}
//# sourceMappingURL=keys.js.map