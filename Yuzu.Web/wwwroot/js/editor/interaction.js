/**
 * Module: Interaction
 */
// Globals
import { globals } from './globals.js';
import { Execute } from './commands.js';
import { MoveResizeCommand } from './moveresize.js';
/**
 * Remove drag and resize functionality from element
 *
 *  @param selector - Selector for interactable elements.
 */
export function removeInteraction(element) {
    interact(element).unset();
}
/**
 * Enable interaction with resizable elements and define drag behavior.
 *
 * @param selector - Selector for resizable elements.
 * @returns Interact instance for resizable elements.
 */
export const createDraggable = (element) => {
    return interact(element).draggable({
        listeners: {
            /**
             * Handler for the start of drag interaction.
             *
             * @param event - Interact event object.
             */
            start(event) {
                const target = event.target;
                const rect = target.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;
                // Add Undo command to stack.
                // If the target element is null, it is a tool window, so don't add Undo info.
                const targetElement = globals.widgets.findWidgetByElement(target);
                if (targetElement !== null) {
                    targetElement.isMoving = true;
                    const targetElements = [targetElement];
                    const moveCommand = new MoveResizeCommand(targetElements);
                    Execute(moveCommand);
                }
                // Store initial mouse position relative to the element
                target.setAttribute('data-x', (event.clientX - offsetX).toString());
                target.setAttribute('data-y', (event.clientY - offsetY).toString());
                // Store rect for use in move event
                event.rect = rect;
            },
            end(event) {
                console.log("  Draggable End (Draggable)");
            },
            /**
             * Handler for the movement during drag interaction.
             *
             * @param event - Interact event object.
             */
            move(event) {
                const target = event.target;
                const initialX = parseFloat(target.getAttribute('data-x')) || 0;
                const initialY = parseFloat(target.getAttribute('data-y')) || 0;
                const x = initialX + event.dx;
                const y = initialY + event.dy;
                // Find the target widget
                const targetWidget = globals.widgets.findWidgetByElement(target);
                if (targetWidget) {
                    // Use the widget store to move the widget and all selected widgets
                    globals.widgets.moveAllSelected(targetWidget, x, y);
                }
                // Toolbox widgets are not are not in the global widget list, 
                // so they need to be moved manually.
                else if (target.classList.contains('tool-widget')) {
                    target.style.left = x + 'px';
                    target.style.top = y + 'px';
                }
                // Update stored mouse position relative to the element
                target.setAttribute('data-x', x.toString());
                target.setAttribute('data-y', y.toString());
            }
        },
        // Keep the font size slider from moving the appearance widget
        ignoreFrom: '#fontSizeInput, #fontSizeSlider, #fontSelector, #editWidget'
    });
};
/**
 * Enable interaction with resizable elements and define drag and resize behavior.
 *
 * @param selector - Selector for resizable elements.
 * @returns Interact instance for resizable elements.
 */
export const createResizable = (element) => {
    return interact(element).draggable({
        listeners: {
            /**
             * Handler for the start of drag interaction.
             *
             * @param event - Interact event object.
             */
            start(event) {
                console.log("  Draggable Start (Resizable)");
                const target = event.target;
                const rect = target.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;
                const targetElement = globals.widgets.findWidgetByElement(target);
                // Add Undo command to stack.
                // If the target element is null, it is a tool window, so don't add Undo info.
                if (targetElement !== null) {
                    targetElement.isMoving = true;
                    const targetElements = [targetElement];
                    const moveCommand = new MoveResizeCommand(targetElements);
                    Execute(moveCommand);
                }
                // Store initial mouse position relative to the element
                target.setAttribute('data-x', (event.clientX - offsetX).toString());
                target.setAttribute('data-y', (event.clientY - offsetY).toString());
                // Store rect for use in move event
                event.rect = rect;
            },
            end(event) {
            },
            /**
             * Handler for the movement during drag interaction.
             *
             * @param event - Interact event object.
             */
            move(event) {
                const target = event.target;
                const initialX = parseFloat(target.getAttribute('data-x')) || 0;
                const initialY = parseFloat(target.getAttribute('data-y')) || 0;
                const x = initialX + event.dx;
                const y = initialY + event.dy;
                target.style.cursor = 'grabbing';
                // Find the target widget
                const targetWidget = globals.widgets.findWidgetByElement(target);
                if (targetWidget) {
                    // Use the widget store to move the widget and all selected widgets
                    globals.widgets.moveAllSelected(targetWidget, x, y);
                }
                // Toolbox widgets are not are not in the global widget list, 
                // so they need to be moved manually.
                else if (target.classList.contains('tool-widget')) {
                    target.style.left = x + 'px';
                    target.style.top = y + 'px';
                }
                // Update stored mouse position relative to the element
                target.setAttribute('data-x', x.toString());
                target.setAttribute('data-y', y.toString());
            }
        }
    }).resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
            /**
             * Handler for the start of resize interaction.
             *
             * @param event - Interact event object.
             */
            start(event) {
                console.log("  Resizable Start");
                const target = event.target;
                const rect = target.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;
                const targetElement = globals.widgets.findWidgetByElement(target);
                // Add Undo command to stack.
                // If the target element is null, it is a tool window, so don't add Undo info.
                if (targetElement !== null) {
                    targetElement.isMoving = true;
                    const targetElements = [targetElement];
                    const moveCommand = new MoveResizeCommand(targetElements);
                    Execute(moveCommand);
                }
                // Store initial mouse position relative to the element
                target.setAttribute('data-x', (event.clientX - offsetX).toString());
                target.setAttribute('data-y', (event.clientY - offsetY).toString());
                target.setAttribute('initial-x', (event.clientX - offsetX).toString());
                target.setAttribute('initial-y', (event.clientY - offsetY).toString());
                // Store rect for use in move event
                event.rect = rect;
            },
            end(event) {
                console.debug("  Resizable End");
            },
            /**
             * Handler for the movement during resize interaction.
             *
             * @param event - Interact event object.
             */
            move(event) {
                const target = event.target;
                // Calculate new position based on the movement of the cursor
                const x = parseFloat(target.getAttribute('data-x')) || 0 + event.dx;
                const y = parseFloat(target.getAttribute('data-y')) || 0 + event.dy;
                // Calculate the change in size and position
                // Need to disable strong typing to get to the deltaRect property
                const dx = event.deltaRect.left;
                const dy = event.deltaRect.top;
                // Get corresponding widget
                const widget = globals.widgets.findWidgetByElement(target);
                if (widget) {
                    // Update the size and position of the widget
                    widget.setRectangle(x + dx, y + dy, event.rect.width, event.rect.height);
                }
                // Update stored mouse position relative to the element
                target.setAttribute('data-x', (x + dx).toString());
                target.setAttribute('data-y', (y + dy).toString());
            }
        },
        ignoreFrom: '#editWidget'
    });
};
//# sourceMappingURL=interaction.js.map