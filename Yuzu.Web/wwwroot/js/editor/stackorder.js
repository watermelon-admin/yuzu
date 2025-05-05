/**
 * Module: StackOrder
 * Implements the StackOrderCommand class.
 */
import { globals } from './globals.js';
/**
 * StackOrder command.
 * Implements ICommand for changing the stack order of widgets.
 */
export class StackOrderCommand {
    constructor(widgets, stackMode) {
        this._targets = widgets;
        this._previousPositions = new Map();
        this._stackMode = stackMode;
        // Store the current positions of the widgets in the collection array
        widgets.forEach(widget => {
            this._previousPositions.set(widget, globals.widgets.collection.indexOf(widget));
        });
    }
    /**
     * Executes the StackOrder command.
     * Changes the stack order of the widgets.
     * @param isRedo Indicates if the command is being re-executed.
     */
    execute(isRedo = false) {
        if (this._stackMode === 'bring-to-front') {
            globals.widgets.bringToFront(this._targets);
        }
        else if (this._stackMode === 'send-to-back') {
            globals.widgets.sendToBack(this._targets);
        }
    }
    /**
     * Undoes the StackOrder command.
     * Resets the stack order of the widgets.
     */
    undo() {
        // Restore the previous positions of the widgets in the collection array
        const collection = globals.widgets.collection;
        // Remove the target widgets from the collection first
        this._targets.forEach(widget => {
            const index = collection.indexOf(widget);
            if (index !== -1) {
                collection.splice(index, 1);
            }
        });
        // Reinsert the target widgets at their original positions
        this._previousPositions.forEach((position, widget) => {
            collection.splice(position, 0, widget);
        });
        // Ensure the collection is consistent with the new widget positions
        globals.widgets.updateWidgetZOrders();
    }
}
//# sourceMappingURL=stackorder.js.map