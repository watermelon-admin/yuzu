import { DesignerEvents } from '../designer-events.js';
import { PropertiesManager } from '../../properties-manager.js';
import { ToolboxManager } from '../../toolbox-manager.js';
// Mock the PropertiesManager and ToolboxManager
jest.mock('../../properties-manager.js');
jest.mock('../../toolbox-manager.js');
/**
 * TestableDesigner class extends DesignerEvents to expose protected properties for testing
 */
export class TestableDesigner extends DesignerEvents {
    constructor(canvasElementId) {
        // Create the canvas element
        const canvas = document.createElement('div');
        canvas.id = canvasElementId;
        document.body.appendChild(canvas);
        // Mock implementation of PropertiesManager and ToolboxManager before calling super
        PropertiesManager.mockImplementation(() => ({
            setSelectedWidgets: jest.fn(),
            showPropertiesPanel: jest.fn(),
            hidePropertiesPanel: jest.fn()
        }));
        ToolboxManager.mockImplementation(() => ({
            registerToolbox: jest.fn(),
            setToolboxPosition: jest.fn(),
            hideAllToolboxes: jest.fn(),
            showAllToolboxes: jest.fn()
        }));
        super(canvasElementId);
        // Make protected properties accessible through public properties
        this.exposedSelectionManager = this.selectionManager;
        this.exposedCommandManager = this.commandManager;
        this.exposedWidgets = this.widgets;
    }
}
// Add a dummy test to prevent Jest from failing when it discovers this file
describe('TestHelpers', () => {
    it('should exist', () => {
        expect(TestableDesigner).toBeDefined();
    });
});
//# sourceMappingURL=test-helpers.js.map