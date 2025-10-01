import { SelectionManager } from '../selection-manager.js';
// Create a single instance of SelectionManager for all tests
// to avoid test interference with selection state
let globalSelectionManager = null;
let globalSelectionChangeCallback;
describe('SelectionManager', () => {
    let selectionManager;
    let selectionChangeCallback;
    beforeEach(() => {
        // Reset callbacks between tests
        selectionChangeCallback = jest.fn();
        // Create a new instance for each test to ensure clean state
        selectionManager = new SelectionManager(selectionChangeCallback);
    });
    test('should initially have no selected widgets', () => {
        expect(selectionManager.getSelectedWidgetIds()).toEqual([]);
        expect(selectionManager.hasSelection()).toBe(false);
    });
    test('should select a widget', () => {
        const widgetId = 'widget-1';
        selectionManager.selectWidget(widgetId);
        expect(selectionManager.getSelectedWidgetIds()).toEqual([widgetId]);
        expect(selectionManager.hasSelection()).toBe(true);
        expect(selectionManager.isWidgetSelected(widgetId)).toBe(true);
        expect(selectionChangeCallback).toHaveBeenCalledWith([widgetId]);
    });
    test('should deselect a widget', () => {
        const widgetId = 'widget-1';
        selectionManager.selectWidget(widgetId);
        selectionManager.deselectWidget(widgetId);
        expect(selectionManager.getSelectedWidgetIds()).toEqual([]);
        expect(selectionManager.hasSelection()).toBe(false);
        expect(selectionManager.isWidgetSelected(widgetId)).toBe(false);
        expect(selectionChangeCallback).toHaveBeenCalledTimes(2);
    });
    test('should handle multi-select', () => {
        const widgetIds = ['widget-1', 'widget-2', 'widget-3'];
        // Select first widget
        selectionManager.selectWidget(widgetIds[0]);
        // Add additional widgets with addToSelection=true
        selectionManager.selectWidget(widgetIds[1], true);
        selectionManager.selectWidget(widgetIds[2], true);
        expect(selectionManager.getSelectedWidgetIds()).toEqual(widgetIds);
        expect(selectionManager.hasSelection()).toBe(true);
        expect(selectionChangeCallback).toHaveBeenCalledTimes(3);
    });
    test('should clear selection', () => {
        const widgetIds = ['widget-1', 'widget-2', 'widget-3'];
        // Select multiple widgets
        widgetIds.forEach(id => selectionManager.selectWidget(id, true));
        // Clear selection
        selectionManager.clearSelection();
        expect(selectionManager.getSelectedWidgetIds()).toEqual([]);
        expect(selectionManager.hasSelection()).toBe(false);
        expect(selectionChangeCallback).toHaveBeenCalledTimes(4); // 3 selects + 1 clear
    });
    test('should replace selection correctly', () => {
        // Create a fresh instance for this test
        const localCallback = jest.fn();
        const localManager = new SelectionManager(localCallback);
        const firstWidgetId = 'widget-1';
        const secondWidgetId = 'widget-2';
        // Select first widget
        localManager.selectWidget(firstWidgetId);
        // Select second widget without addToSelection flag (should replace)
        localManager.selectWidget(secondWidgetId);
        expect(localManager.getSelectedWidgetIds()).toEqual([secondWidgetId]);
        expect(localManager.isWidgetSelected(firstWidgetId)).toBe(false);
        expect(localManager.isWidgetSelected(secondWidgetId)).toBe(true);
        // Verify callback calls
        expect(localCallback.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    test('should handle selecting the same widget twice', () => {
        // Create a fresh instance for this test
        const localCallback = jest.fn();
        const localManager = new SelectionManager(localCallback);
        const widgetId = 'widget-1';
        // Select widget
        localManager.selectWidget(widgetId);
        // Verify widget is selected
        expect(localManager.isWidgetSelected(widgetId)).toBe(true);
        // Select same widget again
        localManager.selectWidget(widgetId);
        // Should still be selected
        expect(localManager.isWidgetSelected(widgetId)).toBe(true);
        expect(localManager.getSelectedWidgetIds()).toEqual([widgetId]);
    });
    test('should remember selection order for reference widget', () => {
        const widgetIds = ['widget-1', 'widget-2', 'widget-3'];
        // Select widgets in order
        widgetIds.forEach(id => selectionManager.selectWidget(id, true));
        // First widget should be the reference widget
        expect(selectionManager.getSelectedWidgetIds()[0]).toBe('widget-1');
    });
    test('should toggle widget selection', () => {
        const widgetId = 'widget-1';
        // Toggle selection on (should select)
        selectionManager.toggleWidgetSelection(widgetId);
        expect(selectionManager.isWidgetSelected(widgetId)).toBe(true);
        // Toggle selection again (should deselect)
        selectionManager.toggleWidgetSelection(widgetId);
        expect(selectionManager.isWidgetSelected(widgetId)).toBe(false);
    });
});
//# sourceMappingURL=selection-manager.test.js.map