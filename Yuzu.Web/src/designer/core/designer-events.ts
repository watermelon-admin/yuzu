import { DesignerZOrder } from './designer-zorder.js';
import { CreateWidgetCommand } from '../commands/basic-commands.js';

// Debug logging utility for tracking widget events and operations
// We must export this as a type and a const to avoid circular dependencies
export type WidgetLoggerType = {
    enabled: boolean;
    logLevel: string;
    logs: Array<{timestamp: number, level: string, category: string, message: string, data?: any}>;
    maxLogs: number;
    debug(category: string, message: string, data?: any): void;
    info(category: string, message: string, data?: any): void;
    warn(category: string, message: string, data?: any): void;
    error(category: string, message: string, data?: any): void;
    _log(level: string, category: string, message: string, data?: any): void;
    getFormattedLogs(): string;
    downloadLogs(): void;
    clearLogs(): void;
};

export const WidgetLogger: WidgetLoggerType = {
    enabled: true,
    logLevel: 'debug', // 'debug', 'info', 'warn', 'error'
    
    // Log storage to collect logs for analysis
    logs: [] as Array<{timestamp: number, level: string, category: string, message: string, data?: any}>,
    
    // Max logs to keep in memory (to prevent memory issues)
    maxLogs: 1000,
    
    // Log a debug message
    debug(category: string, message: string, data?: any) {
        if (!this.enabled || this.logLevel !== 'debug') return;
        this._log('debug', category, message, data);
    },
    
    // Log an info message
    info(category: string, message: string, data?: any) {
        if (!this.enabled || (this.logLevel !== 'debug' && this.logLevel !== 'info')) return;
        this._log('info', category, message, data);
    },
    
    // Log a warning message
    warn(category: string, message: string, data?: any) {
        if (!this.enabled || this.logLevel === 'error') return;
        this._log('warn', category, message, data);
    },
    
    // Log an error message
    error(category: string, message: string, data?: any) {
        if (!this.enabled) return;
        this._log('error', category, message, data);
    },
    
    // Internal logging function
    _log(level: string, category: string, message: string, data?: any) {
        const logEntry = {
            timestamp: Date.now(),
            level,
            category,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : undefined
        };
        
        // Add to logs array
        this.logs.unshift(logEntry);
        
        // Trim logs if needed
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // Also log to console
        const formattedMessage = `[${level.toUpperCase()}][${category}] ${message}`;
        switch (level) {
            case 'debug':
                console.debug(formattedMessage, data);
                break;
            case 'info':
                console.info(formattedMessage, data);
                break;
            case 'warn':
                console.warn(formattedMessage, data);
                break;
            case 'error':
                console.error(formattedMessage, data);
                break;
        }
    },
    
    // Get all logs as formatted strings
    getFormattedLogs() {
        return this.logs.map(log => {
            const date = new Date(log.timestamp);
            const timeString = date.toISOString();
            let dataString = '';
            
            if (log.data) {
                try {
                    dataString = JSON.stringify(log.data);
                } catch (e) {
                    dataString = '[Complex Object]';
                }
            }
            
            return `${timeString} [${log.level.toUpperCase()}][${log.category}] ${log.message} ${dataString}`;
        }).join('\n');
    },
    
    // Download logs as a text file
    downloadLogs() {
        const logText = this.getFormattedLogs();
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `widget-logs-${new Date().toISOString().replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Clear all logs
    clearLogs() {
        this.logs = [];
    }
};

// Add download logs button to UI and make WidgetLogger globally available
document.addEventListener('DOMContentLoaded', () => {
    // Make WidgetLogger available globally to avoid "not defined" errors
    (window as any).WidgetLogger = WidgetLogger;
    
    const btnGroup = document.querySelector('.btn-group');
    if (btnGroup) {
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'btn-download-logs';
        downloadBtn.className = 'btn btn-secondary';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Logs';
        downloadBtn.title = 'Download Widget Operation Logs';
        downloadBtn.onclick = () => WidgetLogger.downloadLogs();
        btnGroup.appendChild(downloadBtn);
    }
});

// Final Designer class with event handling and UI updates
export class DesignerEvents extends DesignerZOrder {
    /**
     * Updates the UI based on the current state of the designer.
     * Enables or disables buttons based on the current selection, clipboard content, and undo/redo stack.
     */
    protected updateUI(): void {
        console.log('[Debug] updateUI called');
        
        const hasSelection = this.selectionManager.hasSelection();
        const selectedWidgetIds = this.selectionManager.getSelectedWidgetIds();
        const hasMultipleSelection = selectedWidgetIds.length > 1;
        const hasThreeOrMoreSelection = selectedWidgetIds.length >= 3;
        const canUndo = this.commandManager.canUndo();
        const canRedo = this.commandManager.canRedo();
        const hasClipboardContent = !this.clipboard.isEmpty();
        
        console.log('[Debug] UI state:', {
            hasSelection,
            selectedWidgetCount: selectedWidgetIds.length,
            selectedWidgetIds,
            hasMultipleSelection,
            hasThreeOrMoreSelection,
            canUndo,
            canRedo,
            hasClipboardContent
        });

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
        
        console.log('[Debug] updateUI completed');
    }

    /**
     * Updates the state of a button (enabled or disabled).
     * @param buttonId - The ID of the button to update.
     * @param enabled - Whether the button should be enabled or disabled.
     */
    protected updateButtonState(buttonId: string, enabled: boolean): void {
        const button = document.getElementById(buttonId);
        if (button) {
            console.log(`[Debug] Updating button state: ${buttonId}, enabled: ${enabled}`);
            // Set disabled attribute for Bootstrap buttons
            if (enabled) {
                button.removeAttribute('disabled');
            } else {
                button.setAttribute('disabled', '');
            }
        } else {
            console.warn(`[Debug] Button not found: ${buttonId}`);
        }
    }

    /**
     * Initializes event listeners for the canvas, buttons, and keyboard.
     */
    protected initEventListeners(): void {
        console.log('[Debug] Initializing event listeners');
        // Canvas pointer events
        this.canvasElement.addEventListener('pointerdown', this.handleCanvasPointerDown.bind(this));
        console.log('[Debug] Added pointerdown event listener to canvas');

        // Button events
        this.setupButtonListeners();

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        console.log('[Debug] Added keydown event listener to document');
        
        console.log('[Debug] Event listeners initialized');
    }

    /**
     * Sets up event listeners for buttons.
     */
    private setupButtonListeners(): void {
        console.log('[Debug] Setting up button listeners');
        
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

        let buttonsFound = 0;
        let buttonsMissing = 0;
        
        Object.entries(buttons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', (e) => {
                    console.log(`[Debug] Button clicked: ${id}`);
                    handler();
                });
                buttonsFound++;
            } else {
                console.warn(`[Debug] Button not found: ${id}`);
                buttonsMissing++;
            }
        });
        
        console.log(`[Debug] Button setup complete. Found: ${buttonsFound}, Missing: ${buttonsMissing}`);
    }

    /**
     * Creates a new widget with random position and default content.
     */
    private createNewWidget(): void {
        console.log('[Debug] Creating new widget');
        
        const widgetData = {
            position: {
                x: Math.max(50, Math.floor(Math.random() * (this.canvasElement.clientWidth - 200))),
                y: Math.max(50, Math.floor(Math.random() * (this.canvasElement.clientHeight - 150)))
            },
            content: 'New Widget'
        };
        
        console.log('[Debug] New widget data:', widgetData);

        console.log('[Debug] Creating CreateWidgetCommand');
        const command = new CreateWidgetCommand(this, widgetData);
        
        console.log('[Debug] Executing CreateWidgetCommand');
        this.commandManager.execute(command);
        
        console.log('[Debug] New widget created');
    }

    /**
     * Handles keyboard shortcuts for common actions like undo, redo, cut, copy, paste, and delete.
     * @param e - The keyboard event.
     */
    private handleKeyDown(e: KeyboardEvent): void {
        console.log(`[Debug] Key pressed: ${e.key}, ctrl/cmd: ${e.ctrlKey || e.metaKey}, shift: ${e.shiftKey}, target:`, e.target);
        
        // Ignore keyboard shortcuts in preview mode except for Escape to exit preview
        if (this.previewMode) {
            console.log('[Debug] In preview mode - limited keyboard handling');
            if (e.key === 'Escape') {
                console.log('[Debug] Escape pressed in preview mode - exiting preview');
                this.exitPreviewMode();
            }
            return;
        }
        
        const ctrlKey = e.ctrlKey || e.metaKey;
        const isInputFocused = this.isInputElement(document.activeElement);
        
        console.log(`[Debug] Input element focused: ${isInputFocused}, active element:`, document.activeElement);

        // Handle keyboard shortcuts
        if (ctrlKey) {
            console.log(`[Debug] Processing ctrl/cmd + ${e.key} shortcut`);
            switch (e.key.toLowerCase()) {
                case 'a':
                    console.log('[Debug] Ctrl+A: Select all');
                    e.preventDefault();
                    this.selectAll();
                    break;

                case 'c':
                    console.log('[Debug] Ctrl+C: Copy selection');
                    e.preventDefault();
                    this.copySelection();
                    break;

                case 'v':
                    console.log('[Debug] Ctrl+V: Paste from clipboard');
                    e.preventDefault();
                    this.pasteFromClipboard();
                    break;

                case 'x':
                    console.log('[Debug] Ctrl+X: Cut selection');
                    e.preventDefault();
                    this.cutSelection();
                    break;

                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        console.log('[Debug] Ctrl+Shift+Z: Redo');
                        this.redo();
                    } else {
                        console.log('[Debug] Ctrl+Z: Undo');
                        this.undo();
                    }
                    break;

                case 'y':
                    console.log('[Debug] Ctrl+Y: Redo');
                    e.preventDefault();
                    this.redo();
                    break;

                case ']':
                    console.log('[Debug] Ctrl+]: Bring to front');
                    e.preventDefault();
                    this.bringSelectionToFrontCommand();
                    break;

                case '[':
                    console.log('[Debug] Ctrl+[: Send to back');
                    e.preventDefault();
                    this.sendSelectionToBackCommand();
                    break;
                    
                default:
                    console.log(`[Debug] Unhandled ctrl/cmd + ${e.key} combination`);
                    break;
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            console.log(`[Debug] ${e.key} pressed`);
            if (this.selectionManager.hasSelection() && !isInputFocused) {
                console.log('[Debug] Deleting selected widgets');
                e.preventDefault();
                this.deleteSelectedWidgets();
            } else {
                console.log(`[Debug] ${e.key} not handled: hasSelection=${this.selectionManager.hasSelection()}, inputFocused=${isInputFocused}`);
            }
        } else if (e.key === 'Escape') {
            console.log('[Debug] Escape pressed - deselecting all');
            this.deselectAll();
        }
    }

    /**
     * Checks if the given element is an input element (input, textarea, select, or contenteditable).
     * @param element - The element to check.
     * @returns True if the element is an input element, false otherwise.
     */
    private isInputElement(element: Element | null): boolean {
        if (!element) return false;
        const tagName = element.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select' ||
            (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false');
            
        console.log(`[Debug] Element check: tagName=${tagName}, isContentEditable=${element.hasAttribute('contenteditable')}, isInput=${isInput}`);
        return isInput;
    }
}