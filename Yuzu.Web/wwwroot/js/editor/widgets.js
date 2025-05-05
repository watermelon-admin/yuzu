/**
 * Module: Widgets
 * Handles widget-related actions in the editor.
 */
import { globals } from './globals.js';
import { SELECTION_BORDER_WIDTH } from './constants.js';
import { Execute } from './commands.js';
import { AddWidgetCommand } from './addwidget.js';
import { RemoveWidgetsCommand } from './removewidgets.js';
import { StackOrderCommand } from './stackorder.js';
import { BoxWidget } from './boxwidget.js';
import { QRWidget } from './qrwidget.js';
import { TextWidget } from './textwidget.js';
import { GroupWidget } from './groupwidget.js';
import { getRandomColor } from './tools.js';
import { GroupCommand, UngroupCommand } from './group.js';
/**
 * Selects all widgets in the editor.
 */
export function selectAllWidgets() {
    globals.widgets.selectAllWidgets();
}
export function deleteSelectedWidgets() {
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    let deleteCommand = new RemoveWidgetsCommand(selectedWidgets);
    Execute(deleteCommand);
}
/**
 * Sends the selected widgets to the back of the stack.
 */
export function sendSelectedWidgetsToBack() {
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    let orderCommand = new StackOrderCommand(selectedWidgets, 'send-to-back');
    Execute(orderCommand);
}
/**
 * Brings the selected widgets to the front of the stack.
 */
export function bringSelectedWidgetsToFront() {
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    let orderCommand = new StackOrderCommand(selectedWidgets, 'bring-to-front');
    Execute(orderCommand);
}
/**
 * Adds a new box widget  and updates the selection markers.
 */
export function addBoxWidget() {
    // Clear all widget selections
    globals.widgets.deselectAllWidgets();
    // If debug mode is enabled, create a random color
    let initialColor;
    if (globals.isDebugMode) {
        initialColor = getRandomColor();
    }
    else {
        initialColor = '#FFFFFF';
    }
    const BOX_WIDTH = 410;
    const BOX_HEIGHT = 100;
    let initialCoordinates = globals.widgets.findEmptySpot(BOX_WIDTH, BOX_HEIGHT);
    const initialX = initialCoordinates.x;
    const initialY = initialCoordinates.y;
    // Add box widget (selected by default)
    const boxWidget = new BoxWidget(initialX, // x    
    initialY, // y
    BOX_WIDTH, // width
    BOX_HEIGHT, // height
    initialColor, // color
    1, // selectionOrder
    0, // groupNumber
    0); // stackOrder
    // Execute the AddWidget command
    Execute(new AddWidgetCommand(boxWidget));
    // Bring the new widget to the front
    globals.widgets.bringToFront([boxWidget]);
    // Update the selection markers
    globals.widgets.updateSelectionMarkers();
}
/**
 * Adds a new text widget and updates the selection markers.
 */
export function addQRWidget() {
    // Clear all widget selections
    globals.widgets.deselectAllWidgets();
    // Add box widget (selected by default)
    const qrWidget = new QRWidget(20, // x    
    20, // y
    150, // width
    150, // height
    1, // selectionOrder
    0, // groupNumber
    0);
    // Execute the AddWidget command
    Execute(new AddWidgetCommand(qrWidget));
    // Bring the new widget to the front
    globals.widgets.bringToFront([qrWidget]);
    // Update the selection markers
    globals.widgets.updateSelectionMarkers(); // stackOrder
}
/**
 * Adds a new text widget and updates the selection markers.
 */
export function addTextWidget() {
    const FONT_SIZE = 50;
    const FONT_FAMILY = 'Roboto';
    const BOX_WIDTH = 410;
    const BOX_HEIGHT = 100;
    let initialCoordinates = globals.widgets.findEmptySpot(BOX_WIDTH, BOX_HEIGHT);
    const initialX = initialCoordinates.x;
    const initialY = initialCoordinates.y;
    // Clear all widget selections
    globals.widgets.deselectAllWidgets();
    // If debug mode is enabled, create a random color
    let initialColor;
    if (globals.isDebugMode) {
        initialColor = getRandomColor();
    }
    else {
        initialColor = '#000000';
    }
    // Add box widget (selected by default)
    const textWidget = new TextWidget(initialX, // x    
    initialY, // y
    BOX_WIDTH, // width
    BOX_HEIGHT, // height
    initialColor, // color
    FONT_FAMILY, // fontFamily
    FONT_SIZE, // fontSize
    1, // selectionOrder
    0, // groupNumber
    0);
    // Execute the AddWidget command
    Execute(new AddWidgetCommand(textWidget));
    // Bring the new widget to the front
    globals.widgets.bringToFront([textWidget]);
    // Update the selection markers
    globals.widgets.updateSelectionMarkers();
}
export function groupSelectedWidgets() {
    // Get all selected widgets except group widgets
    const selectedWidgets = globals.widgets.getWidgetsBySelection().filter(widget => {
        return widget.widgetType !== 'GroupWidget';
    });
    // Need more than one selected widget to group
    if (selectedWidgets.length <= 1) {
        console.warn('Need more than one widget to group');
        return;
    }
    // Get the bounding rectangle of the selected widgets
    const selectionRect = globals.widgets.getSelectedBoundingRectangle();
    // Create a new group widget
    const groupWidget = new GroupWidget(selectionRect.x - SELECTION_BORDER_WIDTH, selectionRect.y - SELECTION_BORDER_WIDTH, selectionRect.width + SELECTION_BORDER_WIDTH * 2, selectionRect.height + SELECTION_BORDER_WIDTH * 2, selectedWidgets, 1, 0, 0);
    Execute(new GroupCommand(groupWidget));
    // Bring the new widget to the front
    globals.widgets.bringToFront([groupWidget]);
    // Update the selection markers
    globals.widgets.updateSelectionMarkers();
}
export function ungroupWidgets() {
    const ungroupWidget = globals.widgets.getWidgetsByLeadingSelection();
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    // Need selected group widget to ungroup, no other widgets must be selected
    if (!ungroupWidget || selectedWidgets.length > 1) {
        return;
    }
    Execute(new UngroupCommand(ungroupWidget));
}
//# sourceMappingURL=widgets.js.map