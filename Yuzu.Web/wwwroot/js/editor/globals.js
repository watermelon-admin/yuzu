import { Stack } from './stack.js';
export class Globals {
    constructor() {
        this.widgets = null; // Will be initialized later
        this.backgroundImage = '';
        this.undoStack = new Stack();
        this.redoStack = new Stack();
        this.wasLastActionUndo = false;
        this.clipboard = [];
        this.elementCounter = 0;
        this.canvas = {
            element: null,
            ctx: null,
            isMouseDown: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
        };
        this.isDebugMode = false;
        this.isPreviewMode = false;
        this.isDirty = false;
        this.originalFormData = {};
    }
}
export const globals = new Globals();
//# sourceMappingURL=globals.js.map