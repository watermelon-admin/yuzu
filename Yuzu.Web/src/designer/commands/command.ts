// Command interface for undo/redo functionality
export interface Command {
    /**
     * Executes the command.
     */
    execute(): void;

    /**
     * Undoes the command.
     */
    undo(): void;

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    getDescription(): string;
}

// Command manager to handle undo/redo operations
export class CommandManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxStackSize: number = 50;
    private onStackChange: () => void;

    /**
     * Constructor for CommandManager.
     * @param onStackChange - Callback function to be called when the stack changes.
     */
    constructor(onStackChange: () => void = () => { }) {
        console.log('[Debug] CommandManager initialized');
        this.onStackChange = onStackChange;
    }

    /**
     * Executes a command and adds it to the undo stack.
     * Clears the redo stack and limits the undo stack size.
     * @param command - The command to be executed.
     */
    public execute(command: Command): void {
        console.log(`[Debug] Executing command: ${command.getDescription()}`);
        
        try {
            command.execute();
            console.log(`[Debug] Command executed successfully: ${command.getDescription()}`);
            
            this.undoStack.push(command);
            console.log(`[Debug] Command added to undo stack. Undo stack size: ${this.undoStack.length}`);

            // Clear redo stack when a new command is executed
            if (this.redoStack.length > 0) {
                console.log(`[Debug] Clearing redo stack of ${this.redoStack.length} commands`);
                this.redoStack = [];
            }

            // Limit stack size
            if (this.undoStack.length > this.maxStackSize) {
                console.log(`[Debug] Undo stack exceeds max size (${this.maxStackSize}). Removing oldest command.`);
                const removed = this.undoStack.shift();
                console.log(`[Debug] Removed command: ${removed?.getDescription()}`);
            }

            this.onStackChange();
            console.log('[Debug] Command manager state updated');
        } catch (error) {
            console.error(`[Debug] Error executing command: ${command.getDescription()}`, error);
            throw error; // Re-throw to notify caller
        }
    }

    /**
     * Undoes the last executed command and moves it to the redo stack.
     */
    public undo(): void {
        console.log('[Debug] Undo requested');
        
        if (this.canUndo()) {
            const command = this.undoStack.pop()!;
            console.log(`[Debug] Undoing command: ${command.getDescription()}`);
            
            try {
                command.undo();
                console.log(`[Debug] Command undone successfully: ${command.getDescription()}`);
                
                this.redoStack.push(command);
                console.log(`[Debug] Command added to redo stack. Redo stack size: ${this.redoStack.length}`);
                
                this.onStackChange();
                console.log('[Debug] Command manager state updated after undo');
            } catch (error) {
                console.error(`[Debug] Error undoing command: ${command.getDescription()}`, error);
                // Add the command back to the undo stack to maintain consistency
                this.undoStack.push(command);
                console.log('[Debug] Command restored to undo stack due to error');
                throw error; // Re-throw to notify caller
            }
        } else {
            console.log('[Debug] Cannot undo - undo stack is empty');
        }
    }

    /**
     * Redoes the last undone command and moves it back to the undo stack.
     */
    public redo(): void {
        console.log('[Debug] Redo requested');
        
        if (this.canRedo()) {
            const command = this.redoStack.pop()!;
            console.log(`[Debug] Redoing command: ${command.getDescription()}`);
            
            try {
                command.execute();
                console.log(`[Debug] Command redone successfully: ${command.getDescription()}`);
                
                this.undoStack.push(command);
                console.log(`[Debug] Command added to undo stack. Undo stack size: ${this.undoStack.length}`);
                
                this.onStackChange();
                console.log('[Debug] Command manager state updated after redo');
            } catch (error) {
                console.error(`[Debug] Error redoing command: ${command.getDescription()}`, error);
                // Add the command back to the redo stack to maintain consistency
                this.redoStack.push(command);
                console.log('[Debug] Command restored to redo stack due to error');
                throw error; // Re-throw to notify caller
            }
        } else {
            console.log('[Debug] Cannot redo - redo stack is empty');
        }
    }

    /**
     * Checks if there are commands to undo.
     * @returns True if there are commands to undo, false otherwise.
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Checks if there are commands to redo.
     * @returns True if there are commands to redo, false otherwise.
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Gets the description of the last command in the undo stack.
     * @returns Description string or null if there are no commands to undo.
     */
    public getUndoDescription(): string | null {
        if (this.canUndo()) {
            return this.undoStack[this.undoStack.length - 1].getDescription();
        }
        return null;
    }

    /**
     * Gets the description of the last command in the redo stack.
     * @returns Description string or null if there are no commands to redo.
     */
    public getRedoDescription(): string | null {
        if (this.canRedo()) {
            return this.redoStack[this.redoStack.length - 1].getDescription();
        }
        return null;
    }

    /**
     * Clears both the undo and redo stacks.
     * Calls the onStackChange callback.
     */
    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.onStackChange();
    }
}
