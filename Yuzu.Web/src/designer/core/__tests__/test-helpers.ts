import { DesignerEvents } from '../designer-events.js';
import { SelectionManager } from '../../selection-manager.js';
import { CommandManager } from '../../commands/command.js';
import { PropertiesManager } from '../../properties-manager.js';
import { ToolboxManager } from '../../toolbox-manager.js';
import { Widget } from '../../widget.js';

// Mock the PropertiesManager and ToolboxManager
jest.mock('../../properties-manager.js');
jest.mock('../../toolbox-manager.js');

/**
 * TestableDesigner class extends DesignerEvents to expose protected properties for testing
 */
export class TestableDesigner extends DesignerEvents {
  // Expose protected properties
  public exposedSelectionManager!: SelectionManager;
  public exposedCommandManager!: CommandManager;
  public exposedWidgets!: Map<string, Widget>;
  
  constructor(canvasElementId: string) {
    // Create the canvas element
    const canvas = document.createElement('div');
    canvas.id = canvasElementId;
    document.body.appendChild(canvas);
    
    // Mock implementation of PropertiesManager and ToolboxManager before calling super
    (PropertiesManager as jest.Mock).mockImplementation(() => ({
      setSelectedWidgets: jest.fn(),
      showPropertiesPanel: jest.fn(),
      hidePropertiesPanel: jest.fn()
    }));
    
    (ToolboxManager as jest.Mock).mockImplementation(() => ({
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