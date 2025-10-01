/**
 * Command to change the z-order of widgets.
 */
export class ChangeZOrderCommand {
    /**
     * Constructor for ChangeZOrderCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to change z-order.
     * @param oldZIndices - Array of old z-indices of the widgets.
     * @param newZIndices - Array of new z-indices of the widgets.
     * @param operationType - Type of z-order operation (e.g., 'front', 'back').
     */
    constructor(designerReference, widgetIds, oldZIndices, newZIndices, operationType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldZIndices = [...oldZIndices];
        this.newZIndices = [...newZIndices];
        this.operationType = operationType;
    }
    /**
     * Executes the z-order change command, setting widgets to their new z-indices.
     */
    execute() {
        this.newZIndices.forEach(item => {
            this.designerReference.setWidgetZIndex(item.id, item.zIndex);
        });
    }
    /**
     * Undoes the z-order change command, resetting widgets to their old z-indices.
     */
    undo() {
        this.oldZIndices.forEach(item => {
            this.designerReference.setWidgetZIndex(item.id, item.zIndex);
        });
    }
    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    getDescription() {
        return `${this.operationType === 'front' ? 'Bring to front' : 'Send to back'} ${this.widgetIds.length} widget(s)`;
    }
}
//# sourceMappingURL=z-order-commands.js.map