import { DesignerSelection } from './designer-selection.js';
import { Rect, Size, WidgetType } from '../types.js';
import { AlignWidgetsCommand, DistributeWidgetsCommand, MakeSameSizeCommand } from '../commands/alignment-commands.js';

// Functionality related to widget alignment, distribution, and sizing
export class DesignerAlignment extends DesignerSelection {
    /**
     * Align selected widgets to a specific edge of the reference widget.
     * @param alignType - The type of alignment ('left', 'right', 'top', 'bottom', 'centerH', 'centerV').
     */
    public alignWidgets(alignType: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'): void {
        console.log('Aligning widgets:', alignType);
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length < 2) return; // Need at least two widgets

        const referenceWidget = this.getReferenceWidget();
        if (!referenceWidget) return;

        const referenceRect = referenceWidget.getRect();
        const oldPositions: { id: string, x: number, y: number }[] = [];
        const newPositions: { id: string, x: number, y: number }[] = [];

        // Create a set to track which widgets should be processed directly
        // (to avoid processing child widgets of selected groups)
        const processedWidgets = new Set<string>();
        
        // First pass: identify which widgets should be processed directly
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (!widget) return;
            
            // Always process the widget directly if it is selected
            processedWidgets.add(id);
            
            // If it's a group widget, make sure we don't process its children directly
            if (widget.getData().type === WidgetType.Group) {
                const groupWidget = widget as any; // Use 'any' to access GroupWidget methods
                const childIds = groupWidget.getChildIds();
                
                // Make sure we don't process any children of this group
                childIds.forEach(childId => {
                    if (selectedIds.includes(childId)) {
                        // If a child is directly selected, log a warning
                        console.warn(`Child widget ${childId} is directly selected but also part of group ${id}. Will ignore direct selection.`);
                        processedWidgets.delete(childId);
                    }
                });
            }
        });
        
        console.log('Widgets to process directly:', Array.from(processedWidgets));

        // Capture original positions for all widgets that will be processed directly
        Array.from(processedWidgets).forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                const pos = widget.getData().position;
                oldPositions.push({ id, x: pos.x, y: pos.y });
            }
        });

        // Calculate new positions based on alignment type
        for (const id of processedWidgets) {
            const widget = this.widgets.get(id);
            if (!widget) continue;

            const widgetRect = widget.getRect();
            const currentPos = { ...widget.getData().position };
            let newPos = { ...currentPos };

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
     * Distribute widgets evenly.
     * @param distributeType - The type of distribution ('horizontal' or 'vertical').
     */
    public distributeWidgets(distributeType: 'horizontal' | 'vertical'): void {
        console.log('Distributing widgets:', distributeType);
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length < 3) return; // Need at least three widgets for distribution

        // Create a set to track which widgets should be processed directly
        // (to avoid processing child widgets of selected groups)
        const processedWidgets = new Set<string>();
        
        // First pass: identify which widgets should be processed directly
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (!widget) return;
            
            // Always process the widget directly if it is selected
            processedWidgets.add(id);
            
            // If it's a group widget, make sure we don't process its children directly
            if (widget.getData().type === WidgetType.Group) {
                const groupWidget = widget as any; // Use 'any' to access GroupWidget methods
                const childIds = groupWidget.getChildIds();
                
                // Make sure we don't process any children of this group
                childIds.forEach(childId => {
                    if (selectedIds.includes(childId)) {
                        // If a child is directly selected, log a warning
                        console.warn(`Child widget ${childId} is directly selected but also part of group ${id}. Will ignore direct selection.`);
                        processedWidgets.delete(childId);
                    }
                });
            }
        });
        
        console.log('Widgets to process directly:', Array.from(processedWidgets));
        
        // Ensure we still have at least 3 widgets to distribute after filtering
        if (processedWidgets.size < 3) {
            console.warn('Need at least three widgets for distribution after filtering groups');
            return;
        }

        // Collect widget information
        const widgetsInfo: { id: string, rect: Rect }[] = [];
        Array.from(processedWidgets).forEach(id => {
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
        } else {
            widgetsInfo.sort((a, b) => a.rect.y - b.rect.y);
        }

        // Calculate total space and spacing
        const oldPositions: { id: string, x: number, y: number }[] = [];
        const newPositions: { id: string, x: number, y: number }[] = [];

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
                y: this.widgets.get(leftmostWidget.id)?.getData().position.y || 0
            });

            newPositions.push({
                id: rightmostWidget.id,
                x: rightmostWidget.rect.x,
                y: this.widgets.get(rightmostWidget.id)?.getData().position.y || 0
            });
        } else {
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
                x: this.widgets.get(topmostWidget.id)?.getData().position.x || 0,
                y: topmostWidget.rect.y
            });

            newPositions.push({
                id: bottommostWidget.id,
                x: this.widgets.get(bottommostWidget.id)?.getData().position.x || 0,
                y: bottommostWidget.rect.y
            });
        }

        // Create and execute command
        const command = new DistributeWidgetsCommand(this, selectedIds, oldPositions, newPositions, distributeType);
        this.commandManager.execute(command);
    }

    /**
     * Make widgets the same size.
     * @param sizeType - The type of size adjustment ('width', 'height', 'both').
     */
    public makeSameSize(sizeType: 'width' | 'height' | 'both'): void {
        console.log('Making widgets same size:', sizeType);
        const selectedIds = this.selectionManager.getSelectedWidgetIds();
        if (selectedIds.length < 2) return; // Need at least two widgets

        const referenceWidget = this.getReferenceWidget();
        if (!referenceWidget) return;

        // Create a set to track which widgets should be processed directly
        // (to avoid processing child widgets of selected groups)
        const processedWidgets = new Set<string>();
        
        // First pass: identify which widgets should be processed directly
        selectedIds.forEach(id => {
            const widget = this.widgets.get(id);
            if (!widget) return;
            
            // Always process the widget directly if it is selected
            processedWidgets.add(id);
            
            // If it's a group widget, make sure we don't process its children directly
            if (widget.getData().type === WidgetType.Group) {
                const groupWidget = widget as any; // Use 'any' to access GroupWidget methods
                const childIds = groupWidget.getChildIds();
                
                // Make sure we don't process any children of this group
                childIds.forEach(childId => {
                    if (selectedIds.includes(childId)) {
                        // If a child is directly selected, log a warning
                        console.warn(`Child widget ${childId} is directly selected but also part of group ${id}. Will ignore direct selection.`);
                        processedWidgets.delete(childId);
                    }
                });
            }
        });
        
        console.log('Widgets to process directly:', Array.from(processedWidgets));
        
        // Ensure we still have at least 2 widgets after filtering
        if (processedWidgets.size < 2) {
            console.warn('Need at least two widgets for size adjustment after filtering groups');
            return;
        }

        const referenceSize = referenceWidget.getData().size;
        const oldSizes: { id: string, width: number, height: number }[] = [];

        // Store original sizes
        Array.from(processedWidgets).forEach(id => {
            const widget = this.widgets.get(id);
            if (widget) {
                const size = widget.getData().size;
                oldSizes.push({ id, width: size.width, height: size.height });
            }
        });

        // Determine new size based on reference widget and sizeType
        let newSize: Size;
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
