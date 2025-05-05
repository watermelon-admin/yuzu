/**
* Module: AddWidget
*  Implements the AddWidgetCommand class.
*/
import { globals } from './globals.js';
/**
 * AddWidget command.
 * Implements ICommand for adding a widget.
 */
export class AddWidgetCommand {
    constructor(widget) {
        this._target = widget;
    }
    /**
     * Executes the AddWidget command.
     * Initializes the widget and adds it to the store.
     * @param isRedo Indicates if the command is being re-executed.
     * @returns CommandResult object indicating success status.
     */
    execute(isRedo = false) {
        if (isRedo)
            this._target.reattachElement();
        else
            this._target.init();
        this._target.render();
        // Add the widget to the store
        globals.widgets.addWidgets([this._target]);
        // Group the child widgets if the target is a GroupWidget
        if (this._target.widgetType === 'GroupWidget') {
            const groupWidget = this._target;
            const newGroupNumber = globals.widgets.getHighestGroupNumber() + 1;
            globals.widgets.groupWidgets(groupWidget, groupWidget.childWidgets, newGroupNumber);
        }
    }
    /**
     * Undoes the AddWidget command.
     * Deletes the widget and removes it from the store.
     * @returns CommandResult object indicating success status.
     */
    undo() {
        globals.widgets.removeWidgets([this._target]);
    }
}
//# sourceMappingURL=addwidget.js.map