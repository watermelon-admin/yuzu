/**
* Module: Undo
* Executes the undo and redo commands.
*/
import { globals } from "./globals.js";
import { Undo, Redo } from "./commands.js";
/**
 * Executes the undo command.
 */
export function executeUndo() {
    if (globals.undoStack.isEmpty())
        return;
    const undoResult = Undo();
}
/**
 * Executes the redo command.
 */
export function executeRedo() {
    if (globals.redoStack.isEmpty())
        return;
    const redoResult = Redo();
}
//# sourceMappingURL=undo.js.map