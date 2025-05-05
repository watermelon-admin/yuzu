// Command manager to handle undo/redo operations
export class CommandManager {
    constructor(onStackChange = () => { }) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50;
        this.onStackChange = onStackChange;
    }
    execute(command) {
        command.execute();
        this.undoStack.push(command);
        // Clear redo stack when a new command is executed
        this.redoStack = [];
        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
        this.onStackChange();
    }
    undo() {
        if (this.canUndo()) {
            const command = this.undoStack.pop();
            command.undo();
            this.redoStack.push(command);
            this.onStackChange();
        }
    }
    redo() {
        if (this.canRedo()) {
            const command = this.redoStack.pop();
            command.execute();
            this.undoStack.push(command);
            this.onStackChange();
        }
    }
    canUndo() {
        return this.undoStack.length > 0;
    }
    canRedo() {
        return this.redoStack.length > 0;
    }
    getUndoDescription() {
        if (this.canUndo()) {
            return this.undoStack[this.undoStack.length - 1].getDescription();
        }
        return null;
    }
    getRedoDescription() {
        if (this.canRedo()) {
            return this.redoStack[this.redoStack.length - 1].getDescription();
        }
        return null;
    }
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.onStackChange();
    }
}
// Specific command implementations
export class MoveWidgetsCommand {
    constructor(designerReference, widgetIds, oldPositions, newPositions) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
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
        return `Move ${this.widgetIds.length} widget(s)`;
    }
}
export class ResizeWidgetCommand {
    constructor(designerReference, widgetId, oldPosition, oldSize, newPosition, newSize) {
        this.designerReference = designerReference;
        this.widgetId = widgetId;
        this.oldPosition = oldPosition;
        this.oldSize = oldSize;
        this.newPosition = newPosition;
        this.newSize = newSize;
    }
    execute() {
        this.designerReference.setWidgetPosition(this.widgetId, this.newPosition);
        this.designerReference.setWidgetSize(this.widgetId, this.newSize);
    }
    undo() {
        this.designerReference.setWidgetPosition(this.widgetId, this.oldPosition);
        this.designerReference.setWidgetSize(this.widgetId, this.oldSize);
    }
    getDescription() {
        return `Resize widget ${this.widgetId}`;
    }
}
export class CreateWidgetCommand {
    constructor(designerReference, widgetData) {
        this.createdWidgetId = null;
        this.designerReference = designerReference;
        this.widgetData = Object.assign({}, widgetData);
    }
    execute() {
        this.createdWidgetId = this.designerReference.addWidget(this.widgetData);
    }
    undo() {
        if (this.createdWidgetId) {
            this.designerReference.removeWidget(this.createdWidgetId);
        }
    }
    getDescription() {
        return 'Create new widget';
    }
}
export class DeleteWidgetsCommand {
    constructor(designerReference, widgetIds) {
        this.designerReference = designerReference;
        this.deletedWidgetIds = [...widgetIds];
        // Save the full data of widgets before deletion for restoration
        this.widgetsData = widgetIds.map(id => this.designerReference.getWidgetData(id));
    }
    execute() {
        this.deletedWidgetIds.forEach(id => {
            this.designerReference.removeWidget(id);
        });
    }
    undo() {
        this.widgetsData.forEach(data => {
            this.designerReference.addWidgetWithId(data);
        });
    }
    getDescription() {
        return `Delete ${this.deletedWidgetIds.length} widget(s)`;
    }
}
//# sourceMappingURL=command.js.map