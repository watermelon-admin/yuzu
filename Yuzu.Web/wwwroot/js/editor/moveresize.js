/**
* Module: MoveResize
* Implements the MoveResizeCommand class.
*/
/**
 * MoveResize command.
 * Implements ICommand for moving and resizing a widget.
 */
export class MoveResizeCommand {
    constructor(widgets) {
        this._targets = widgets;
        this._originalPositions = widgets.map(widget => ({
            x: widget.getRectangle().x,
            y: widget.getRectangle().y,
            width: widget.getRectangle().width,
            height: widget.getRectangle().height
        }));
    }
    /**
     * Executes the MoveResize command.
     * Resets the position of the widgets.
     * @param isRedo Indicates if the command is being re-executed.
     * @returns CommandResult object indicating success status.
     */
    execute(isRedo = false) {
        if (isRedo)
            this.resetPositions();
    }
    /**
     * Undoes the MoveResize command.
     * Resets the position of the widgets.
     * @returns CommandResult object indicating success status.
     */
    undo() {
        this.resetPositions();
    }
    /**
     * Resets the position of the widgets to the original values.
     */
    resetPositions() {
        this._targets.forEach((widget, index) => {
            const currentRect = widget.getRectangle();
            const originalPos = this._originalPositions[index];
            widget.setRectangle(originalPos.x, originalPos.y, originalPos.width, originalPos.height);
            // Update original positions for undo/redo
            this._originalPositions[index] = {
                x: currentRect.x,
                y: currentRect.y,
                width: currentRect.width,
                height: currentRect.height
            };
        });
    }
}
//# sourceMappingURL=moveresize.js.map