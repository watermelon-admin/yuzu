/**
 * Command to align multiple widgets' edges.
 */
export class AlignWidgetsCommand {
    /**
     * Constructor for AlignWidgetsCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be aligned.
     * @param oldPositions - Array of old positions of the widgets.
     * @param newPositions - Array of new positions of the widgets.
     * @param alignmentType - Type of alignment (e.g., left, right, top, bottom).
     */
    constructor(designerReference, widgetIds, oldPositions, newPositions, alignmentType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        this.alignmentType = alignmentType;
    }
    /**
     * Executes the alignment command, setting widgets to their new positions.
     */
    execute() {
        this.newPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    /**
     * Undoes the alignment command, resetting widgets to their old positions.
     */
    undo() {
        this.oldPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    getDescription() {
        return `Align ${this.widgetIds.length} widget(s) ${this.alignmentType}`;
    }
}
/**
 * Command to distribute multiple widgets evenly.
 */
export class DistributeWidgetsCommand {
    /**
     * Constructor for DistributeWidgetsCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be distributed.
     * @param oldPositions - Array of old positions of the widgets.
     * @param newPositions - Array of new positions of the widgets.
     * @param distributionType - Type of distribution (e.g., horizontal, vertical).
     */
    constructor(designerReference, widgetIds, oldPositions, newPositions, distributionType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        this.distributionType = distributionType;
    }
    /**
     * Executes the distribution command, setting widgets to their new positions.
     */
    execute() {
        this.newPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    /**
     * Undoes the distribution command, resetting widgets to their old positions.
     */
    undo() {
        this.oldPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    getDescription() {
        return `Distribute ${this.widgetIds.length} widget(s) ${this.distributionType}`;
    }
}
/**
 * Command to make multiple widgets the same size.
 */
export class MakeSameSizeCommand {
    /**
     * Constructor for MakeSameSizeCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be resized.
     * @param oldSizes - Array of old sizes of the widgets.
     * @param newSize - New size to be applied to the widgets.
     * @param sizeType - Type of size adjustment (e.g., width, height, both).
     */
    constructor(designerReference, widgetIds, oldSizes, newSize, sizeType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldSizes = [...oldSizes];
        this.newSize = newSize;
        this.sizeType = sizeType;
    }
    /**
     * Executes the resize command, setting widgets to the new size.
     */
    execute() {
        this.widgetIds.forEach(id => {
            if (this.sizeType === 'width') {
                const oldSize = this.oldSizes.find(s => s.id === id);
                if (oldSize) {
                    this.designerReference.setWidgetSize(id, {
                        width: this.newSize.width,
                        height: oldSize.height
                    });
                }
            }
            else if (this.sizeType === 'height') {
                const oldSize = this.oldSizes.find(s => s.id === id);
                if (oldSize) {
                    this.designerReference.setWidgetSize(id, {
                        width: oldSize.width,
                        height: this.newSize.height
                    });
                }
            }
            else {
                // Both width and height
                this.designerReference.setWidgetSize(id, this.newSize);
            }
        });
    }
    /**
     * Undoes the resize command, resetting widgets to their old sizes.
     */
    undo() {
        this.oldSizes.forEach(sizeData => {
            const size = { width: sizeData.width, height: sizeData.height };
            this.designerReference.setWidgetSize(sizeData.id, size);
        });
    }
    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    getDescription() {
        return `Make ${this.widgetIds.length} widget(s) same ${this.sizeType}`;
    }
}
//# sourceMappingURL=alignment-commands.js.map