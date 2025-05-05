/**
* Module: SetAppearance
*  Implements the SetAppearanceCommand class
*/
/**
 * Command to set appearance properties for a widget.
 */
export class SetAppearanceCommand {
    constructor(widgets, color, fontFamily, fontSize) {
        this._appearanceValues = [];
        this._widgets = widgets;
        this._color = color;
        this._fontFamily = fontFamily;
        this._fontSize = fontSize;
    }
    /**
     * Executes the SetAppearance command.
     * Sets the appearance properties for the widgets.
     * @param isRedo Indicates if the command is being re-executed.
     * @returns CommandResult object indicating success status.
     */
    execute(isRedo = false) {
        this._widgets.forEach(widget => {
            // Set appearance properties according to widgetType
            switch (widget.widgetType) {
                case 'BoxWidget': {
                    let boxWidget = widget;
                    // Save the current appearance values
                    let appearanceValues = new Map();
                    appearanceValues.set('color', boxWidget.color);
                    this._appearanceValues.push(appearanceValues);
                    // Set new appearance values
                    boxWidget.color = this._color;
                    break;
                }
                case 'TextWidget': {
                    let textWidget = widget;
                    // Save the current appearance values
                    let appearanceValues = new Map();
                    appearanceValues.set('color', textWidget.color);
                    appearanceValues.set('fontFamily', textWidget.fontFamily);
                    appearanceValues.set('fontSize', textWidget.fontSize);
                    this._appearanceValues.push(appearanceValues);
                    // Set new appearance values
                    textWidget.color = this._color;
                    textWidget.fontFamily = this._fontFamily;
                    textWidget.fontSize = this._fontSize;
                    break;
                }
                default:
                    break;
            }
        });
    }
    /**
     * Undoes the SetAppearance command.
     * Resets the appearance properties for the widgets.
     * @returns CommandResult object indicating success status.
     */
    undo() {
        let count = 0;
        this._widgets.forEach(widget => {
            // Reset appearance properties according to widgetType
            switch (widget.widgetType) {
                case 'BoxWidget': {
                    let boxWidget = widget;
                    // Restore the saved appearance values
                    let appearanceValues = this._appearanceValues[count];
                    boxWidget.color = appearanceValues.get('color');
                    break;
                }
                case 'TextWidget': {
                    let textWidget = widget;
                    // Restore the saved appearance values
                    let appearanceValues = this._appearanceValues[count];
                    textWidget.color = appearanceValues.get('color');
                    textWidget.fontFamily = appearanceValues.get('fontFamily');
                    textWidget.fontSize = appearanceValues.get('fontSize');
                    break;
                }
                default:
                    break;
            }
            // Increment the count
            count++;
        });
    }
}
//# sourceMappingURL=setappearance.js.map