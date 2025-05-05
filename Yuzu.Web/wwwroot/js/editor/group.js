/**
* Module: GroupWidget
* Implements the GroupCommand and UngroupCommand classes.
*/
import { globals } from './globals.js';
/**
 * Base command class for group and ungroup operations.
 * Provides common functionalities shared by GroupCommand and UngroupCommand.
 */
class BaseGroupCommand {
    constructor(widget) {
        this._target = widget;
    }
    /**
     * Adds the group widget to the global store.
     */
    addGroupToStore() {
        globals.widgets.addWidgets([this._target]);
    }
    /**
     * Removes the group widget from the global store.
     */
    removeGroupFromStore() {
        globals.widgets.removeWidgets([this._target]);
    }
    /**
     * Re-parents the selected widgets to the group widget container.
     * Also updates the group number display and clears all widget selections.
     */
    reparentWidgetsToGroup() {
        const targetWidgets = this._target.childWidgets;
        globals.widgets.groupWidgets(this._target, targetWidgets, this._target.groupNumber);
        this._target.updateGroupNumberLabel();
    }
}
/**
 * Group command.
 * Handles the grouping of selected widgets into a single group.
 */
export class GroupCommand extends BaseGroupCommand {
    /**
     * Executes the group command.
     * Initializes the group and assigns a new group number if not redoing.
     * @param isRedo - Indicates if the command is being re-executed.
     * @returns CommandResult object indicating success status and optional error text.
     */
    execute(isRedo = false) {
        // If redoing, reattach the elements and update the group rectangle
        if (isRedo) {
            this.reattachElements();
        }
        // Otherwise, initialize the group and assign a new group number
        else {
            this.initializeGroup();
        }
        this.addGroupToStore();
        this.reparentWidgetsToGroup();
        this._target.updateElementRectangle();
        console.log('GroupCommand executed.');
        return;
    }
    // Reattaches the child widget elements to the group widget element
    reattachElements() {
        this._target.reattachElement();
    }
    // Initializes the group widget and assigns a new group number
    initializeGroup() {
        this._target.assignNewGroupNumber();
        this._target.init();
        this._target.render();
    }
    /**
     * Undoes the group command.
     * Ungroups the child widgets and removes the group widget from the store.
     * @returns CommandResult object indicating success status.
     */
    undo() {
        globals.widgets.ungroupWidgets(this._target, this._target.childWidgets, this._target.groupNumber);
        this.removeGroupFromStore();
        return;
    }
}
/**
 * Ungroup command.
 * Handles the ungrouping of a grouped widget, separating its child widgets.
 */
export class UngroupCommand extends BaseGroupCommand {
    /**
     * Executes the ungroup command.
     * Removes the group and reassigns the child widgets back to their original state.
     * @param isRedo - Indicates if the command is being re-executed.
     * @returns CommandResult object indicating success status.
     */
    execute(isRedo = false) {
        globals.widgets.ungroupWidgets(this._target, this._target.childWidgets, this._target.groupNumber);
        this.removeGroupFromStore();
        return;
    }
    /**
     * Undoes the ungroup command.
     * Recreates the group with its child widgets and reassigns the group number.
     * @returns CommandResult object indicating success status.
     */
    undo() {
        this._target.reattachElement();
        this.addGroupToStore();
        this.reparentWidgetsToGroup();
        return;
    }
}
//# sourceMappingURL=group.js.map