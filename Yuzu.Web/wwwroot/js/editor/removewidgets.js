/**
 * Module: RemoveWidgets
 * Implements the RemoveWidgetsCommand class.
 */
import { globals } from './globals.js';
/**
 * RemoveWidgets command.
 * Implements ICommand for removing widgets.
 */
export class RemoveWidgetsCommand {
    constructor(widgets) {
        this._targets = [];
        this._targets = widgets;
    }
    /**
     * Executes the RemoveWidgets command.
     * Removes the widgets from the store.
     * @param isRedo Indicates if the command is being re-executed.
     */
    execute(isRedo) {
        // Remove the widgets
        this._targets.forEach(widget => {
            if (widget.widgetType === 'GroupWidget') {
                let groupWidget = widget;
                groupWidget.childWidgets.forEach(childWidget => {
                    globals.widgets.removeWidgets([childWidget]);
                });
                globals.widgets.removeWidgets([groupWidget]);
            }
            else {
                // 
                if (widget.groupNumber === 0) {
                    // Remove the widget from the store
                    globals.widgets.removeWidgets([widget]);
                }
                else {
                    // Cannot delete grouped widgets
                    console.warn('Cannot delete grouped widgets');
                }
            }
        });
    }
    /**
     * Undoes the RemoveWidgets command.
     * Re-attaches the widgets to the store.
     */
    undo() {
        // Undo the removal of the widgets
        this._targets.forEach(widget => {
            // Re-attach the widget to the store
            widget.reattachElement();
            globals.widgets.addWidgets([widget]);
            // If the widget is a group widget, also re-attach the child widgets
            if (widget.widgetType === 'GroupWidget') {
                let groupWidget = widget;
                const childWidgets = groupWidget.childWidgets;
                childWidgets.forEach(childWidget => {
                    childWidget.reattachElement();
                    globals.widgets.addWidgets([childWidget]);
                });
                // Re-group the widgets
                globals.widgets.groupWidgets(groupWidget, childWidgets, widget.groupNumber);
            }
        });
    }
}
//# sourceMappingURL=removewidgets.js.map