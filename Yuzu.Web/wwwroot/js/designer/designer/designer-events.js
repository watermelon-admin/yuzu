import { DesignerZOrder } from './designer-zorder.js';
import { CreateWidgetCommand } from '../commands/basic-commands.js';
// Final Designer class with event handling and UI updates
export class DesignerEvents extends DesignerZOrder {
    /**
     * Updates the UI based on the current state of the designer.
     * Enables or disables buttons based on the current selection, clipboard content, and undo/redo stack.
     */
    updateUI() {
        const hasSelection = this.selectionManager.hasSelection();
        const hasMultipleSelection = this.selectionManager.getSelectedWidgetIds().length > 1;
        const hasThreeOrMoreSelection = this.selectionManager.getSelectedWidgetIds().length >= 3;
        const canUndo = this.commandManager.canUndo();
        const canRedo = this.commandManager.canRedo();
        const hasClipboardContent = !this.clipboard.isEmpty();
        // Update standard button states
        this.updateButtonState('btn-undo', canUndo);
        this.updateButtonState('btn-redo', canRedo);
        this.updateButtonState('btn-cut', hasSelection);
        this.updateButtonState('btn-copy', hasSelection);
        this.updateButtonState('btn-paste', hasClipboardContent);
        this.updateButtonState('btn-delete', hasSelection);
        // Update alignment button states
        this.updateButtonState('btn-align-left', hasMultipleSelection);
        this.updateButtonState('btn-align-center-h', hasMultipleSelection);
        this.updateButtonState('btn-align-right', hasMultipleSelection);
        this.updateButtonState('btn-align-top', hasMultipleSelection);
        this.updateButtonState('btn-align-center-v', hasMultipleSelection);
        this.updateButtonState('btn-align-bottom', hasMultipleSelection);
        // Update distribution button states
        this.updateButtonState('btn-distribute-h', hasThreeOrMoreSelection);
        this.updateButtonState('btn-distribute-v', hasThreeOrMoreSelection);
        // Update sizing button states
        this.updateButtonState('btn-same-width', hasMultipleSelection);
        this.updateButtonState('btn-same-height', hasMultipleSelection);
        this.updateButtonState('btn-same-size', hasMultipleSelection);
        // Update z-order button states
        this.updateButtonState('btn-bring-to-front', hasSelection);
        this.updateButtonState('btn-send-to-back', hasSelection);
    }
    /**
     * Updates the state of a button (enabled or disabled).
     * @param buttonId - The ID of the button to update.
     * @param enabled - Whether the button should be enabled or disabled.
     */
    updateButtonState(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button && button instanceof HTMLButtonElement) {
            button.disabled = !enabled;
        }
    }
    /**
     * Initializes event listeners for the canvas, buttons, and keyboard.
     */
    initEventListeners() {
        // Canvas mouse events
        this.canvasElement.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
        // Button events
        this.setupButtonListeners();
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    /**
     * Sets up event listeners for buttons.
     */
    setupButtonListeners() {
        const buttons = {
            'btn-new-widget': () => this.createNewWidget(),
            'btn-undo': () => this.undo(),
            'btn-redo': () => this.redo(),
            'btn-cut': () => this.cutSelection(),
            'btn-copy': () => this.copySelection(),
            'btn-paste': () => this.pasteFromClipboard(),
            'btn-delete': () => this.deleteSelectedWidgets(),
            // Alignment buttons
            'btn-align-left': () => this.alignWidgets('left'),
            'btn-align-center-h': () => this.alignWidgets('centerH'),
            'btn-align-right': () => this.alignWidgets('right'),
            'btn-align-top': () => this.alignWidgets('top'),
            'btn-align-center-v': () => this.alignWidgets('centerV'),
            'btn-align-bottom': () => this.alignWidgets('bottom'),
            // Distribution buttons
            'btn-distribute-h': () => this.distributeWidgets('horizontal'),
            'btn-distribute-v': () => this.distributeWidgets('vertical'),
            // Sizing buttons
            'btn-same-width': () => this.makeSameSize('width'),
            'btn-same-height': () => this.makeSameSize('height'),
            'btn-same-size': () => this.makeSameSize('both'),
            // Z-order buttons
            'btn-bring-to-front': () => this.bringSelectionToFrontCommand(),
            'btn-send-to-back': () => this.sendSelectionToBackCommand()
        };
        Object.entries(buttons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }
    /**
     * Creates a new widget with random position and default content.
     */
    createNewWidget() {
        const widgetData = {
            position: {
                x: Math.max(50, Math.floor(Math.random() * (this.canvasElement.clientWidth - 200))),
                y: Math.max(50, Math.floor(Math.random() * (this.canvasElement.clientHeight - 150)))
            },
            content: 'New Widget'
        };
        const command = new CreateWidgetCommand(this, widgetData);
        this.commandManager.execute(command);
    }
    /**
     * Handles keyboard shortcuts for common actions like undo, redo, cut, copy, paste, and delete.
     * @param e - The keyboard event.
     */
    handleKeyDown(e) {
        const ctrlKey = e.ctrlKey || e.metaKey;
        // Handle keyboard shortcuts
        if (ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
                case 'c':
                    e.preventDefault();
                    this.copySelection();
                    break;
                case 'v':
                    e.preventDefault();
                    this.pasteFromClipboard();
                    break;
                case 'x':
                    e.preventDefault();
                    this.cutSelection();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    }
                    else {
                        this.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case ']':
                    e.preventDefault();
                    this.bringSelectionToFrontCommand();
                    break;
                case '[':
                    e.preventDefault();
                    this.sendSelectionToBackCommand();
                    break;
            }
        }
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectionManager.hasSelection() &&
                !this.isInputElement(document.activeElement)) {
                e.preventDefault();
                this.deleteSelectedWidgets();
            }
        }
        else if (e.key === 'Escape') {
            this.deselectAll();
        }
    }
    /**
     * Checks if the given element is an input element (input, textarea, select, or contenteditable).
     * @param element - The element to check.
     * @returns True if the element is an input element, false otherwise.
     */
    isInputElement(element) {
        if (!element)
            return false;
        const tagName = element.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || tagName === 'select' ||
            (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false');
    }
}
//# sourceMappingURL=designer-events.js.map