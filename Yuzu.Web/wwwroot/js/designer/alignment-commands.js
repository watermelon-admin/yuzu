// Alignment command for aligning widget edges
export class AlignWidgetsCommand {
    constructor(designerReference, widgetIds, oldPositions, newPositions, alignmentType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        this.alignmentType = alignmentType;
    }
    execute() {
        this.newPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    undo() {
        this.oldPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    getDescription() {
        return `Align ${this.widgetIds.length} widget(s) ${this.alignmentType}`;
    }
}
// Distribution command for distributing widgets evenly
export class DistributeWidgetsCommand {
    constructor(designerReference, widgetIds, oldPositions, newPositions, distributionType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        this.distributionType = distributionType;
    }
    execute() {
        this.newPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    undo() {
        this.oldPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }
    getDescription() {
        return `Distribute ${this.widgetIds.length} widget(s) ${this.distributionType}`;
    }
}
// Resize command for making widgets the same size
export class MakeSameSizeCommand {
    constructor(designerReference, widgetIds, oldSizes, newSize, sizeType) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldSizes = [...oldSizes];
        this.newSize = newSize;
        this.sizeType = sizeType;
    }
    execute() {
        this.widgetIds.forEach(id => {
            this.designerReference.setWidgetSize(id, this.newSize);
        });
    }
    undo() {
        this.oldSizes.forEach(sizeData => {
            const size = { width: sizeData.width, height: sizeData.height };
            this.designerReference.setWidgetSize(sizeData.id, size);
        });
    }
    getDescription() {
        return `Make ${this.widgetIds.length} widget(s) same ${this.sizeType}`;
    }
}
//# sourceMappingURL=alignment-commands.js.map