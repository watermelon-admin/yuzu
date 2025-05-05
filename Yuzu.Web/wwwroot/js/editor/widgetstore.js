import { TextWidget } from './textwidget.js';
import { QRWidget } from './qrwidget.js';
import { BoxWidget } from './boxwidget.js';
import { LEADING_SELECTION_MARKER_CLASS, TRAILING_SELECTION_MARKER_CLASS, SELECTION_BORDER_WIDTH } from './constants.js';
export class WidgetStore {
    constructor(globals) {
        this._widgets = [];
        this.globals = globals;
    }
    // ------ Accessors ------#
    get count() {
        return this._widgets.length;
    }
    get collection() {
        return this._widgets;
    }
    set collection(widgets) {
        this._widgets = widgets;
    }
    // ------ Widget Management ------
    addWidgets(widgets) {
        this._widgets.push(...widgets);
    }
    removeWidgets(widgets) {
        widgets.forEach(widget => {
            this.deselectWidget(widget);
            const index = this._widgets.indexOf(widget);
            if (index !== -1) {
                this._widgets.splice(index, 1);
                widget.removeElement();
            }
            else {
                console.warn("Widget not found in the store:", widget);
            }
        });
    }
    removeWidgetByElement(element) {
        const widget = this.findWidgetByElement(element);
        this.removeWidgets([widget]);
    }
    // ------ Widget Selection ------
    selectWidgets(widgets) {
        const newSelectionOrders = [];
        widgets.forEach(widget => {
            if ((widget.groupNumber > 0) && (widget.widgetType !== "GroupWidget")) {
                newSelectionOrders.push(0);
                return;
            }
            if (widget.isSelection) {
                newSelectionOrders.push(widget.selectionOrder);
                return;
            }
            const highestSelectionOrder = this.getHighestSelectionOrder();
            const newSelectionOrder = highestSelectionOrder + 1;
            widget.selectionOrder = newSelectionOrder;
            newSelectionOrders.push(newSelectionOrder);
        });
        this.updateSelectionMarkers();
        return newSelectionOrders;
    }
    selectWidgetByElement(element) {
        const widget = this.findWidgetByElement(element);
        this.selectWidgets([widget]);
        return;
    }
    selectAllWidgets() {
        const selectedWidgets = this._widgets.filter(widget => widget.selectionOrder > 0)
            .sort((a, b) => a.selectionOrder - b.selectionOrder);
        let currentSelectionOrder = this.getHighestSelectionOrder();
        this._widgets.forEach(widget => {
            if (widget.selectionOrder === 0) {
                currentSelectionOrder++;
                widget.selectionOrder = currentSelectionOrder;
            }
        });
        this.updateSelectionMarkers();
    }
    selectWidgetsByRectangle(startX, startY, endX, endY) {
        this.deselectAllWidgets();
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        this._widgets.forEach(widget => {
            const rect = widget.getRectangle();
            if (rect.x >= minX &&
                rect.x + rect.width <= maxX &&
                rect.y >= minY &&
                rect.y + rect.height <= maxY) {
                this.selectWidgets([widget]);
            }
        });
    }
    getCurrentlyEditedTextWidget() {
        for (const widget of this._widgets) {
            if (widget.widgetType === 'TextWidget' && widget.isEditing) {
                return widget;
            }
        }
        return null;
    }
    deselectWidget(targetWidget) {
        if (targetWidget.selectionOrder === 0)
            return;
        this._widgets.forEach(widget => {
            if (widget !== targetWidget && widget.selectionOrder > targetWidget.selectionOrder) {
                widget.selectionOrder -= 1;
            }
        });
        targetWidget.selectionOrder = 0;
        this.updateSelectionMarkers();
    }
    deselectWidgetByElement(element) {
        const widget = this.findWidgetByElement(element);
        this.selectWidgets([widget]);
    }
    deselectAllWidgets() {
        this._widgets.forEach(widget => {
            widget.selectionOrder = 0;
        });
        this.updateSelectionMarkers();
    }
    updateSelectionMarkers() {
        this._widgets.forEach(widget => {
            const { element, selectionOrder } = widget;
            element.classList.toggle(LEADING_SELECTION_MARKER_CLASS, selectionOrder === 1);
            element.classList.toggle(TRAILING_SELECTION_MARKER_CLASS, selectionOrder > 1);
        });
    }
    // ------ Widget Grouping ------
    groupWidgets(groupWidget, childWidgets, groupNumber) {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        groupWidget.groupNumber = groupNumber;
        groupWidget.updateGroupNumberLabel();
        this.removeWidgets(childWidgets);
        childWidgets.forEach(widget => {
            const rect = widget.getRectangle();
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
        });
        childWidgets.forEach(widget => {
            if (widget !== groupWidget) {
                const rect = widget.getRectangle();
                const containerElement = groupWidget.element.querySelector('.widget-container');
                containerElement.appendChild(widget.element);
                widget.setRectangle(rect.x - minX + SELECTION_BORDER_WIDTH, rect.y - minY + SELECTION_BORDER_WIDTH, rect.width, rect.height);
                widget.groupNumber = groupNumber;
                widget.selectionOrder = 0;
                widget.setInteractionStatus(false);
            }
        });
    }
    ungroupWidgets(groupWidget, childWidgets, groupNumber) {
        const groupHTMDivElement = groupWidget.element.querySelector('.widget-container');
        const containerRect = groupHTMDivElement.getBoundingClientRect();
        this.addWidgets(childWidgets);
        this.resetGroupedWidgets(childWidgets, containerRect, groupNumber);
    }
    ungroupSelectedWidgets(targetElement, groupNumber) {
        const containerRect = targetElement.getBoundingClientRect();
        this.resetGroupedWidgets(this._widgets, containerRect, groupNumber);
    }
    resetGroupedWidgets(widgets, containerRect, groupNumber) {
        widgets.forEach(widget => {
            if ((widget.groupNumber === groupNumber) && widget.widgetType !== 'GroupWidget') {
                widget.groupNumber = 0;
                const widgetRect = widget.getRectangle();
                widget.setRectangle(widget.element.offsetLeft + containerRect.x, widget.element.offsetTop + containerRect.y, widgetRect.width, widgetRect.height);
                document.body.appendChild(widget.element);
                widget.setInteractionStatus(true);
            }
        });
        this.deselectAllWidgets();
    }
    // ------ Widget Retrieval ------
    findWidgetByElement(element) {
        for (const widget of this._widgets) {
            if (widget.element === element) {
                return widget;
            }
        }
        return null;
    }
    findGroupWidgetByGroupNumber(groupNumber) {
        for (const widget of this._widgets) {
            if (widget.groupNumber === groupNumber && widget.widgetType === 'GroupWidget') {
                return widget;
            }
        }
        return null;
    }
    findWidgetsByGroupNumber(groupNumber) {
        return this._widgets.filter(widget => widget.groupNumber === groupNumber &&
            widget.widgetType !== 'GroupWidget');
    }
    getWidgetsByTrailingSelection(isSelection) {
        return this._widgets.filter(widget => widget.isSelection === isSelection);
    }
    getWidgetsByLeadingSelection() {
        return (this._widgets.filter(widget => widget.isLeadingSelection))[0];
    }
    getWidgetsBySelection() {
        return (this._widgets.filter(widget => widget.isSelection));
    }
    getWidgetsByGroupNumber(groupNumber) {
        return this._widgets.filter(widget => widget.groupNumber === groupNumber);
    }
    getSelectedBoundingRectangle() {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        this._widgets.forEach(widget => {
            if (widget.isSelection && widget.groupNumber === 0) {
                const rect = widget.getRectangle();
                minX = Math.min(minX, rect.x);
                minY = Math.min(minY, rect.y);
                maxX = Math.max(maxX, rect.x + rect.width);
                maxY = Math.max(maxY, rect.y + rect.height);
            }
        });
        const width = maxX - minX;
        const height = maxY - minY;
        return {
            x: minX,
            y: minY,
            width,
            height
        };
    }
    getRectangleFromWidgets(targetWidgets) {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        targetWidgets.forEach(widget => {
            const rect = widget.getRectangle();
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.width);
            maxY = Math.max(maxY, rect.y + rect.height);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        return {
            x: minX,
            y: minY,
            width,
            height
        };
    }
    // ------ Widget Selection Order ------
    getHighestSelectionOrder() {
        return this._widgets.reduce((highestSelectionOrder, widget) => Math.max(highestSelectionOrder, widget.selectionOrder), Number.MIN_SAFE_INTEGER);
    }
    // ------ Widget Group Order ------
    getHighestGroupNumber() {
        return this._widgets.reduce((highestGroupNumber, widget) => Math.max(highestGroupNumber, widget.groupNumber), 0);
    }
    // ------ Widget Positioning and Stacking -----
    moveAllSelected(targetWidget, newX, newY) {
        if (!targetWidget.isSelection) {
            const { width, height } = targetWidget.getRectangle();
            targetWidget.setRectangle(newX, newY, width, height);
        }
        else {
            const selectedWidgets = this.getWidgetsBySelection();
            const initialRect = targetWidget.getRectangle();
            const deltaX = newX - initialRect.x;
            const deltaY = newY - initialRect.y;
            selectedWidgets.forEach(widget => {
                const { x, y, width, height } = widget.getRectangle();
                widget.setRectangle(x + deltaX, y + deltaY, width, height);
            });
        }
    }
    bringToFront(widgets) {
        const maxStackOrder = this.getMaxStackOrder();
        widgets.forEach(widget => {
            widget.stackOrder = maxStackOrder + 1;
            this._widgets.splice(this._widgets.indexOf(widget), 1);
            this._widgets.push(widget);
        });
        this.updateWidgetZOrders();
    }
    sendToBack(widgets) {
        this._widgets.forEach(widget => {
            if (!widgets.includes(widget)) {
                widget.stackOrder += widgets.length;
            }
        });
        widgets.forEach((widget, index) => {
            widget.stackOrder = index + 1;
            this._widgets.splice(this._widgets.indexOf(widget), 1);
            this._widgets.unshift(widget);
        });
        this.updateWidgetZOrders();
    }
    updateWidgetZOrders() {
        this._widgets.forEach(widget => {
            widget.stackOrder = this._widgets.indexOf(widget) + 1;
        });
    }
    sortWidgetsByStackOrder() {
        this._widgets.sort((a, b) => a.stackOrder - b.stackOrder);
    }
    getMaxStackOrder() {
        return this._widgets.reduce((maxOrder, widget) => Math.max(maxOrder, widget.stackOrder), 0);
    }
    findEmptySpot(length, width) {
        const usableWidth = window.innerWidth - 40;
        const usableHeight = window.innerHeight - 40;
        let found = false;
        let x = 20;
        let y = 20;
        while (!found) {
            let overlaps = false;
            for (const widget of this._widgets) {
                const rect = widget.getRectangle();
                if (!(x + length < rect.x || x > rect.x + rect.width ||
                    y + width < rect.y || y > rect.y + rect.height)) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps && x + length <= usableWidth && y + width <= usableHeight) {
                found = true;
            }
            else {
                x += 10;
                y += 10;
                if (x + length > usableWidth) {
                    x = 20;
                    y += 10;
                }
                if (y + width > usableHeight) {
                    y = 20;
                    x += 10;
                }
            }
        }
        return { x, y };
    }
    enablePreviewMode(enable) {
        this._widgets.forEach(widget => {
            widget.enablePreviewMode(enable);
        });
    }
    // ------ Serialization and Deserialization ------.
    serialize() {
        const widgetData = this._widgets.map(widget => ({
            type: widget.widgetType,
            x: widget.x,
            y: widget.y,
            width: widget.width,
            height: widget.height,
            // ... other properties based on widget type
        }));
        return JSON.stringify(widgetData);
    }
    deserialize(json) {
        if (!json) {
            console.warn('No JSON data provided to deserialize');
            return;
        }
        try {
            const widgetData = JSON.parse(json);
            this._widgets = widgetData.map(data => {
                let widget;
                switch (data.type) {
                    case 'BoxWidget':
                        widget = new BoxWidget(data.x, data.y, data.width, data.height, data.color);
                        break;
                    case 'TextWidget':
                        widget = new TextWidget(data.x, data.y, data.width, data.height, data.color, data.fontFamily, data.fontSize);
                        widget.text = data.text;
                        break;
                    case 'QRWidget':
                        widget = new QRWidget(data.x, data.y, data.width, data.height);
                        widget.text = data.text;
                        break;
                    // ... other widget types
                }
                widget.init();
                return widget;
            });
        }
        catch (error) {
            console.error('Error deserializing widget data:', error);
            this._widgets = [];
        }
    }
}
//# sourceMappingURL=widgetstore.js.map