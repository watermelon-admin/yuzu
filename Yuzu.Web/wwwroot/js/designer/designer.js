import { Widget } from './widget.js';
import { CommandManager, CreateWidgetCommand, DeleteWidgetsCommand } from './command.js';
import { AlignWidgetsCommand, DistributeWidgetsCommand, MakeSameSizeCommand } from './alignment-commands.js';
import { getClipboard } from './clipboard.js';
import { SelectionManager } from './selection.js';
export class Designer {
    constructor(canvasElementId) {
        this.widgets = new Map();
        this.nextZIndex = 1;
        this.clipboard = getClipboard();
        this.dragState = null;
        const element = document.getElementById(canvasElementId);
        if (!element) {
            throw new Error(`Element with ID ${canvasElementId} not found`);
        }
        this.canvasElement = element;
        this.commandManager = new CommandManager(() => this.updateUI());
        this.selectionManager = new SelectionManager((selectedIds) => this.handleSelectionChange(selectedIds));
        // Bind event handlers to maintain context
        this.boundMouseMoveHandler = this.handleDocumentMouseMove.bind(this);
        this.boundMouseUpHandler = this.handleDocumentMouseUp.bind(this);
        this.initEventListeners();
    }
    // Public methods for widget manipulation
    addWidget(widgetData = {}) {
        const id = widgetData.id || `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const defaultData = {
            id,
            position: { x: 100, y: 100 },
            size: { width: 150, height: 100 },
            zIndex: this.nextZIndex++,
            type: 'basic',
            content: 'New Widget'
        };
        const mergedData = Object.assign(Object.assign(Object.assign({}, defaultData), widgetData), { id });
        const widget = new Widget(mergedData);
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        this.widgets.set(id, widget);
        this.canvasElement.appendChild(widget.getElement());
        return id;
    }
    addWidgetWithId(widgetData) {
        if (this.widgets.has(widgetData.id)) {
            console.warn(`Widget with ID ${widgetData.id} already exists`);
            return;
        }
        const widget = new Widget(widgetData);
        // Set up resize handler
        widget.setResizeStartHandler((widgetId, handlePosition, event) => {
            this.handleResizeStart(widgetId, handlePosition, event);
        });
        this.widgets.set(widgetData.id, widget);
        this.canvasElement.appendChild(widget.getElement());
        // Update next z-index if needed
        this.nextZIndex = Math.max(this.nextZIndex, widgetData.zIndex + 1);
    }
    removeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.destructor();
            this.widgets.delete(widgetId);
            if (this.selectionManager.isWidgetSelected(widgetId)) {
                this.selectionManager.deselectWidget(widgetId);
            }
        }
    }
    getWidgetData(widgetId) {
        const widget = this.widgets.get(widgetId);
        return widget ? widget.getData() : null;
    }
    setWidgetPosition(widgetId, position) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.setPosition(position);
        }
    }
    setWidgetSize(widgetId, size) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.setSize(size);
        }
    }
    bringToFront(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.setZIndex(this.nextZIndex++);
        }
    }
    bringSelectionToFront() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        selectedIds.forEach(id => this.bringToFront(id));
    }
    deleteSelectedWidgets() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length > 0) {
            const command = new DeleteWidgetsCommand(this, selectedIds);
            this.commandManager.execute(command);
        }
    }
    // Clipboard operations
    cutSelection() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        const widgetsData = selectedIds.map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
            .filter((data) => data !== undefined);
        this.clipboard.cut(widgetsData);
        this.deleteSelectedWidgets();
    }
    copySelection() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return;
        const widgetsData = selectedIds.map(id => { var _a; return (_a = this.widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getData(); })
            .filter((data) => data !== undefined);
        this.clipboard.copy(widgetsData);
        this.updateUI();
    }
    pasteFromClipboard() {
        const items = this.clipboard.paste();
        if (items.length === 0)
            return;
        // First, clear the current selection
        this.selectionManager.clearSelection();
        // Create a composite command for all paste operations
        items.forEach(item => {
            const command = new CreateWidgetCommand(this, item);
            this.commandManager.execute(command);
            // Select the newly created widget
            this.selectionManager.selectWidget(item.id, true);
        });
    }
    // Undo/redo operations
    undo() {
        this.commandManager.undo();
    }
    redo() {
        this.commandManager.redo();
    }
    // Selection methods
    selectAll() {
        this.selectionManager.clearSelection();
        this.widgets.forEach((_, id) => {
            this.selectionManager.selectWidget(id, true);
        });
    }
    deselectAll() {
        this.selectionManager.clearSelection();
    }
    /**
     * Gets the reference widget (first selected widget)
     */
    getReferenceWidget() {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length === 0)
            return null;
        const referenceId = selectedIds[0]; // First selected is the reference
        return this.widgets.get(referenceId) || null;
    }
    /**
     * Align selected widgets to a specific edge of the reference widget
     */
    alignWidgets(alignType) {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length < 2)
            return; // Need at least two widgets
        const referenceWidget = this.getReferenceWidget();
        if (!referenceWidget)
            return;
        const referenceRect = referenceWidget.getRect();
        const oldPositions = [];
        const newPositions = [];
        // Capture original positions for all widgets
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                const pos = widget.getData().position;
                oldPositions.push({ id, x: pos.x, y: pos.y });
            }
        });
        // Calculate new positions based on alignment type
        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            const widget = this.widgets.get(id);
            if (!widget)
                continue;
            const widgetRect = widget.getRect();
            const currentPos = Object.assign({}, widget.getData().position);
            let newPos = Object.assign({}, currentPos);
            switch (alignType) {
                case 'left':
                    newPos.x = referenceRect.x;
                    break;
                case 'right':
                    newPos.x = referenceRect.x + referenceRect.width - widgetRect.width;
                    break;
                case 'top':
                    newPos.y = referenceRect.y;
                    break;
                case 'bottom':
                    newPos.y = referenceRect.y + referenceRect.height - widgetRect.height;
                    break;
                case 'centerH':
                    newPos.x = referenceRect.x + (referenceRect.width - widgetRect.width) / 2;
                    break;
                case 'centerV':
                    newPos.y = referenceRect.y + (referenceRect.height - widgetRect.height) / 2;
                    break;
            }
            newPositions.push({ id, x: newPos.x, y: newPos.y });
        }
        // Create and execute command
        const command = new AlignWidgetsCommand(this, selectedIds, oldPositions, newPositions, alignType);
        this.commandManager.execute(command);
    }
    /**
     * Distribute widgets evenly
     */
    distributeWidgets(distributeType) {
        var _a, _b, _c, _d;
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length < 3)
            return; // Need at least three widgets for distribution
        // Collect widget information
        const widgetsInfo = [];
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                widgetsInfo.push({
                    id,
                    rect: widget.getRect()
                });
            }
        });
        // Sort widgets based on position
        if (distributeType === 'horizontal') {
            widgetsInfo.sort((a, b) => a.rect.x - b.rect.x);
        }
        else {
            widgetsInfo.sort((a, b) => a.rect.y - b.rect.y);
        }
        // Calculate total space and spacing
        const oldPositions = [];
        const newPositions = [];
        // Store original positions
        widgetsInfo.forEach(info => {
            const widget = this.widgets.get(info.id);
            if (widget) {
                const pos = widget.getData().position;
                oldPositions.push({ id: info.id, x: pos.x, y: pos.y });
            }
        });
        if (distributeType === 'horizontal') {
            // Find leftmost and rightmost widgets
            const leftmostWidget = widgetsInfo[0];
            const rightmostWidget = widgetsInfo[widgetsInfo.length - 1];
            // Calculate available space
            const totalWidth = (rightmostWidget.rect.x + rightmostWidget.rect.width) - leftmostWidget.rect.x;
            // Calculate sum of all widget widths
            const totalWidgetWidth = widgetsInfo.reduce((sum, info) => sum + info.rect.width, 0);
            // Calculate equal spacing
            const availableSpace = totalWidth - totalWidgetWidth;
            const spacing = availableSpace / (widgetsInfo.length - 1);
            // Apply new positions (keep first and last widgets in place)
            let currentX = leftmostWidget.rect.x + leftmostWidget.rect.width + spacing;
            for (let i = 1; i < widgetsInfo.length - 1; i++) {
                const info = widgetsInfo[i];
                const widget = this.widgets.get(info.id);
                if (widget) {
                    const newPos = {
                        x: currentX,
                        y: widget.getData().position.y
                    };
                    newPositions.push({ id: info.id, x: newPos.x, y: newPos.y });
                    currentX += info.rect.width + spacing;
                }
            }
            // Add first and last widgets to positions (unchanged)
            newPositions.push({
                id: leftmostWidget.id,
                x: leftmostWidget.rect.x,
                y: ((_a = this.widgets.get(leftmostWidget.id)) === null || _a === void 0 ? void 0 : _a.getData().position.y) || 0
            });
            newPositions.push({
                id: rightmostWidget.id,
                x: rightmostWidget.rect.x,
                y: ((_b = this.widgets.get(rightmostWidget.id)) === null || _b === void 0 ? void 0 : _b.getData().position.y) || 0
            });
        }
        else {
            // Vertical distribution
            const topmostWidget = widgetsInfo[0];
            const bottommostWidget = widgetsInfo[widgetsInfo.length - 1];
            // Calculate available space
            const totalHeight = (bottommostWidget.rect.y + bottommostWidget.rect.height) - topmostWidget.rect.y;
            // Calculate sum of all widget heights
            const totalWidgetHeight = widgetsInfo.reduce((sum, info) => sum + info.rect.height, 0);
            // Calculate equal spacing
            const availableSpace = totalHeight - totalWidgetHeight;
            const spacing = availableSpace / (widgetsInfo.length - 1);
            // Apply new positions (keep first and last widgets in place)
            let currentY = topmostWidget.rect.y + topmostWidget.rect.height + spacing;
            for (let i = 1; i < widgetsInfo.length - 1; i++) {
                const info = widgetsInfo[i];
                const widget = this.widgets.get(info.id);
                if (widget) {
                    const newPos = {
                        x: widget.getData().position.x,
                        y: currentY
                    };
                    newPositions.push({ id: info.id, x: newPos.x, y: newPos.y });
                    currentY += info.rect.height + spacing;
                }
            }
            // Add first and last widgets to positions (unchanged)
            newPositions.push({
                id: topmostWidget.id,
                x: ((_c = this.widgets.get(topmostWidget.id)) === null || _c === void 0 ? void 0 : _c.getData().position.x) || 0,
                y: topmostWidget.rect.y
            });
            newPositions.push({
                id: bottommostWidget.id,
                x: ((_d = this.widgets.get(bottommostWidget.id)) === null || _d === void 0 ? void 0 : _d.getData().position.x) || 0,
                y: bottommostWidget.rect.y
            });
        }
        // Create and execute command
        const command = new DistributeWidgetsCommand(this, selectedIds, oldPositions, newPositions, distributeType);
        this.commandManager.execute(command);
    }
    /**
     * Make widgets the same size
     */
    makeSameSize(sizeType) {
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length < 2)
            return; // Need at least two widgets
        const referenceWidget = this.getReferenceWidget();
        if (!referenceWidget)
            return;
        const referenceSize = referenceWidget.getData().size;
        const oldSizes = [];
        // Store original sizes
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                const size = widget.getData().size;
                oldSizes.push({ id, width: size.width, height: size.height });
            }
        });
        // Determine new size based on reference widget and sizeType
        let newSize;
        switch (sizeType) {
            case 'width':
                newSize = {
                    width: referenceSize.width,
                    height: 0 // Will be ignored and widgets will keep their heights
                };
                break;
            case 'height':
                newSize = {
                    width: 0, // Will be ignored and widgets will keep their widths
                    height: referenceSize.height
                };
                break;
            case 'both':
            default:
                newSize = {
                    width: referenceSize.width,
                    height: referenceSize.height
                };
                break;
        }
        // Create and execute command
        const command = new MakeSameSizeCommand(this, selectedIds, oldSizes, newSize, sizeType);
        this.commandManager.execute(command);
    }
}
//# sourceMappingURL=designer.js.map