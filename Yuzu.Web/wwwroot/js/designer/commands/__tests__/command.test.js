import { CommandManager } from '../command.js';
// Mock command implementation for testing
class MockCommand {
    constructor(id = 'mock-command') {
        this.executeCalled = false;
        this.undoCalled = false;
        this._id = id;
    }
    getId() {
        return this._id;
    }
    getDescription() {
        return `Mock command: ${this._id}`;
    }
    execute() {
        this.executeCalled = true;
    }
    undo() {
        this.undoCalled = true;
    }
    wasExecuteCalled() {
        return this.executeCalled;
    }
    wasUndoCalled() {
        return this.undoCalled;
    }
    reset() {
        this.executeCalled = false;
        this.undoCalled = false;
    }
}
describe('CommandManager', () => {
    let commandManager;
    let updateCallback;
    beforeEach(() => {
        updateCallback = jest.fn();
        commandManager = new CommandManager(updateCallback);
    });
    test('should execute a command', () => {
        const mockCommand = new MockCommand();
        commandManager.execute(mockCommand);
        expect(mockCommand.wasExecuteCalled()).toBe(true);
        expect(updateCallback).toHaveBeenCalledTimes(1);
    });
    test('should track command in history', () => {
        const mockCommand = new MockCommand();
        commandManager.execute(mockCommand);
        expect(commandManager.canUndo()).toBe(true);
        expect(commandManager.canRedo()).toBe(false);
    });
    test('should undo a command', () => {
        const mockCommand = new MockCommand();
        commandManager.execute(mockCommand);
        commandManager.undo();
        expect(mockCommand.wasUndoCalled()).toBe(true);
        expect(updateCallback).toHaveBeenCalledTimes(2); // Once for execute, once for undo
        expect(commandManager.canUndo()).toBe(false);
        expect(commandManager.canRedo()).toBe(true);
    });
    test('should redo a command', () => {
        const mockCommand = new MockCommand();
        commandManager.execute(mockCommand);
        commandManager.undo();
        commandManager.redo();
        expect(mockCommand.wasExecuteCalled()).toBe(true);
        expect(mockCommand.wasUndoCalled()).toBe(true);
        expect(updateCallback).toHaveBeenCalledTimes(3); // Execute, undo, redo
        expect(commandManager.canUndo()).toBe(true);
        expect(commandManager.canRedo()).toBe(false);
    });
    test('should clear redo stack when new command is executed after undo', () => {
        const firstCommand = new MockCommand('first');
        const secondCommand = new MockCommand('second');
        commandManager.execute(firstCommand);
        commandManager.undo();
        expect(commandManager.canRedo()).toBe(true);
        // Execute a new command after undo
        commandManager.execute(secondCommand);
        // Redo should no longer be possible
        expect(commandManager.canRedo()).toBe(false);
    });
    test('should handle multiple commands correctly', () => {
        const commands = [
            new MockCommand('cmd1'),
            new MockCommand('cmd2'),
            new MockCommand('cmd3')
        ];
        // Execute all commands
        commands.forEach(cmd => commandManager.execute(cmd));
        // Undo all commands
        commands.forEach(() => commandManager.undo());
        // All commands should have been undone
        commands.forEach(cmd => {
            expect(cmd.wasExecuteCalled()).toBe(true);
            expect(cmd.wasUndoCalled()).toBe(true);
        });
        // Redo all commands
        commands.forEach(() => commandManager.redo());
        // canUndo should be true, canRedo should be false
        expect(commandManager.canUndo()).toBe(true);
        expect(commandManager.canRedo()).toBe(false);
    });
    test('should not undo when there are no commands', () => {
        expect(commandManager.canUndo()).toBe(false);
        commandManager.undo();
        expect(updateCallback).not.toHaveBeenCalled();
    });
    test('should not redo when there are no undone commands', () => {
        expect(commandManager.canRedo()).toBe(false);
        commandManager.redo();
        expect(updateCallback).not.toHaveBeenCalled();
    });
    // Note: The CommandManager doesn't have a clearHistory method, so
    // this test is just for illustrative purposes of what a complete
    // command manager should be able to do
    test('should handle multiple operations', () => {
        const mockCommand = new MockCommand();
        commandManager.execute(mockCommand);
        commandManager.undo();
        // After undo, redo should be available
        expect(commandManager.canUndo()).toBe(false);
        expect(commandManager.canRedo()).toBe(true);
        // After executing a new command, redo should be unavailable
        const newCommand = new MockCommand('new-command');
        commandManager.execute(newCommand);
        expect(commandManager.canUndo()).toBe(true);
        expect(commandManager.canRedo()).toBe(false);
    });
});
//# sourceMappingURL=command.test.js.map