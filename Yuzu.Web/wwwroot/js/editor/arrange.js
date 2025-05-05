/**
* Module: Arrange
* Implements arranging and distributing widgets.
*/
import { globals } from './globals.js';
import { Execute } from './commands.js';
import { MoveResizeCommand } from './moveresize.js';
/**
 * Arranges the selected widgets based on the specified alignment mode.
 *
 * @param {'left' | 'right' | 'top' | 'bottom' | 'same-size' | 'same-width' | 'same-height' | 'center-horizontal' | 'center-vertical'} alignmentMode - The alignment mode.
 */
export function arrangeSelectedWidgets(alignmentMode) {
    console.debug('arrangeSelectedWidgets() called.');
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    if (selectedWidgets.length === 0) {
        return;
    }
    Execute(new MoveResizeCommand(selectedWidgets));
    arrangeWidgets(selectedWidgets, alignmentMode);
}
/**
 * Aligns all widgets based on the specified alignment mode..
 * The widget with selection order 1 remains in place, and all other widgets align to it.
 * If there are fewer than 2 widgets or any widget has a selection order of 0, an error is thrown.
 *
 * @param {Widget[]} widgets - Array of widget instances to be aligned.
 * @param {'left' | 'right' | 'top' | 'bottom' | 'same-size' | 'same-width' | 'same-height' | 'center-horizontal' | 'center-vertical'} alignmentMode - The alignment mode.
 * @throws {Error} If there are fewer than 2 widgets or any widget has a selection order of 0.
 */
function arrangeWidgets(widgets, alignmentMode) {
    // Need at least two widgets to align
    if (widgets.length < 2 || widgets.some(widget => widget.selectionOrder === 0)) {
        return;
    }
    // Find the widget with selectionOrder 1
    const leadingWidget = widgets.find(widget => widget.selectionOrder === 1);
    if (!leadingWidget) {
        throw new Error("There must be a widget with selection order 1.");
    }
    // Get the leading widget's bounding rectangle
    const leadingRect = leadingWidget.getRectangle();
    // Align all widgets to the leading widget based on the specified alignment mode
    widgets.forEach(widget => {
        if (widget.selectionOrder !== 1) { // Skip the leading widget
            const rect = widget.getRectangle();
            switch (alignmentMode) {
                case 'left':
                    widget.setRectangle(leadingRect.x, rect.y, rect.width, rect.height);
                    break;
                case 'right':
                    widget.setRectangle(leadingRect.x + leadingRect.width - rect.width, rect.y, rect.width, rect.height);
                    break;
                case 'top':
                    widget.setRectangle(rect.x, leadingRect.y, rect.width, rect.height);
                    break;
                case 'bottom':
                    widget.setRectangle(rect.x, leadingRect.y + leadingRect.height - rect.height, rect.width, rect.height);
                    break;
                case 'same-size':
                    widget.setRectangle(rect.x, rect.y, leadingRect.width, leadingRect.height);
                    break;
                case 'same-width':
                    widget.setRectangle(rect.x, rect.y, leadingRect.width, rect.height);
                    break;
                case 'same-height':
                    widget.setRectangle(rect.x, rect.y, rect.width, leadingRect.height);
                    break;
                case 'center-horizontal':
                    widget.setRectangle(leadingRect.x + (leadingRect.width - rect.width) / 2, rect.y, rect.width, rect.height);
                    break;
                case 'center-vertical':
                    widget.setRectangle(rect.x, leadingRect.y + (leadingRect.height - rect.height) / 2, rect.width, rect.height);
                    break;
                default:
                    throw new Error("Invalid alignment mode.");
            }
        }
    });
}
/**
 * Distributes the selected widgets based on the specified distribution mode.
 *
 * @param {'vertical' | 'horizontal'} distributionMode - The distribution mode.
 */
export function distributeSelectedWidgets(distributionMode) {
    console.debug('distributeSelectedWidgets() called.');
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    if (selectedWidgets.length === 0) {
        return;
    }
    Execute(new MoveResizeCommand(selectedWidgets));
    distributeWidgets(selectedWidgets, distributionMode);
}
/**
 * Distribute widgets within a container either vertically or horizontally based on provided alignment.
 *
 * @param {Widget[]} widgets - The list of widgets to be distributed.
 * @param {'vertical' | 'horizontal'} distributionMode - The distribution direction.
 */
export function distributeWidgets(widgets, distributionMode) {
    if (widgets.length === 0) {
        return;
    }
    if (distributionMode === 'vertical' || distributionMode === 'horizontal') {
        distributeVerticallyOrHorizontally(widgets, distributionMode);
    }
    else {
        console.warn('Invalid distribution direction.');
    }
}
/*/**
 * Distributes widgets either vertically or horizontally.
 *
 * @param {Widget[]} widgets - The list of widgets to be distributed.
 * @param {'vertical' | 'horizontal'} direction - The distribution direction.
 */
function distributeVerticallyOrHorizontally(widgets, direction) {
    // Need more than two widgets to distribute
    if (widgets.length <= 2) {
        return;
    }
    // Define axis, edge, and dimension based on alignment direction
    const isVertical = direction === 'vertical';
    const edgeStart = isVertical ? 'y' : 'x';
    const dimension = isVertical ? 'height' : 'width';
    // Get the start and end edge positions
    let startEdge = Infinity;
    let endEdge = -Infinity;
    widgets.forEach(widget => {
        const rect = widget.getRectangle();
        startEdge = Math.min(startEdge, rect[edgeStart]);
        endEdge = Math.max(endEdge, rect[edgeStart] + rect[dimension]);
    });
    // Sort widgets by their position
    const sortedWidgets = [...widgets].sort((a, b) => {
        const rectA = a.getRectangle;
        const rectB = b.getRectangle;
        return rectA[edgeStart] - rectB[edgeStart];
    });
    // Calculate the total dimension of all widgets
    let totalDimension = 0;
    sortedWidgets.forEach(widget => {
        totalDimension += widget.getRectangle()[dimension];
    });
    // Calculate the total space available for gaps
    const totalGapDistance = (endEdge - startEdge) - totalDimension;
    // Calculate the gap distance between the widgets
    const numberOfGaps = sortedWidgets.length - 1;
    const singleGapDistance = numberOfGaps > 0 ? totalGapDistance / numberOfGaps : 0;
    // Start with the position of the first widget
    let currentPosition = startEdge;
    // Position widgets using their new calculated positions
    sortedWidgets.forEach(widget => {
        const rect = widget.getRectangle();
        const newPosition = isVertical ? { x: rect.x, y: currentPosition } : { x: currentPosition, y: rect.y };
        widget.setRectangle(newPosition.x, newPosition.y, rect.width, rect.height);
        // Move the current position forward by the dimension of the current widget plus the gap
        currentPosition += rect[dimension] + singleGapDistance;
    });
}
//# sourceMappingURL=arrange.js.map