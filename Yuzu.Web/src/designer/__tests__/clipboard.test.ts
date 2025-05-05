import { Clipboard, getClipboard } from '../clipboard.js';
import { WidgetData, WidgetType, GroupWidgetProperties } from '../types.js';

describe('Clipboard', () => {
  let clipboard: Clipboard;
  let mockCallback: jest.Mock;
  
  beforeEach(() => {
    // Reset the singleton instance between tests
    // @ts-ignore - private field access
    Clipboard.instance = undefined;
    
    mockCallback = jest.fn();
    clipboard = getClipboard(mockCallback);
  });
  
  test('should create a singleton instance', () => {
    const clipboard1 = getClipboard();
    const clipboard2 = getClipboard();
    expect(clipboard1).toBe(clipboard2);
  });
  
  test('should be empty initially', () => {
    expect(clipboard.isEmpty()).toBe(true);
    expect(clipboard.getItemCount()).toBe(0);
  });
  
  test('should copy items and trigger callback', () => {
    const mockItems: WidgetData[] = [
      {
        id: 'widget-1',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        type: WidgetType.Box,
        properties: { backgroundColor: 'red' }
      }
    ];
    
    clipboard.copy(mockItems);
    
    expect(clipboard.isEmpty()).toBe(false);
    expect(clipboard.getItemCount()).toBe(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
  
  test('should cut items and trigger callback', () => {
    const mockItems: WidgetData[] = [
      {
        id: 'widget-1',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        type: WidgetType.Box,
        properties: { backgroundColor: 'red' }
      }
    ];
    
    clipboard.cut(mockItems);
    
    expect(clipboard.isEmpty()).toBe(false);
    expect(clipboard.getItemCount()).toBe(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
  
  test('should paste items with new IDs and offsets', () => {
    const mockItems: WidgetData[] = [
      {
        id: 'widget-1',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        type: WidgetType.Box,
        properties: { backgroundColor: 'red' }
      }
    ];
    
    clipboard.copy(mockItems);
    const pasted = clipboard.paste();
    
    expect(pasted.length).toBe(1);
    expect(pasted[0].id).not.toBe('widget-1');
    expect(pasted[0].position.x).toBe(mockItems[0].position.x + 20); // Default offset is 20
    expect(pasted[0].position.y).toBe(mockItems[0].position.y + 20);
    expect(pasted[0].type).toBe(WidgetType.Box);
    expect(pasted[0].properties).toEqual(mockItems[0].properties);
  });
  
  test('should return empty array when pasting from empty clipboard', () => {
    const pasted = clipboard.paste();
    expect(pasted).toEqual([]);
  });
  
  test('should create deep copies of items to avoid reference issues', () => {
    const mockItems: WidgetData[] = [
      {
        id: 'widget-1',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        type: WidgetType.Box,
        properties: { backgroundColor: 'red' }
      }
    ];
    
    clipboard.copy(mockItems);
    
    // Modify the original items
    mockItems[0].position.x = 50;
    mockItems[0].position.y = 60;
    
    const pasted = clipboard.paste();
    
    // The pasted items should have the original values plus offset
    expect(pasted[0].position.x).toBe(10 + 20);
    expect(pasted[0].position.y).toBe(20 + 20);
  });
  
  test('should handle complex group widgets correctly', () => {
    // Create a mock group with child widgets
    const childWidget1: WidgetData = {
      id: 'child-1',
      position: { x: 20, y: 30 },
      size: { width: 50, height: 50 },
      zIndex: 1,
      type: WidgetType.Box,
      properties: { backgroundColor: 'blue' }
    };
    
    const childWidget2: WidgetData = {
      id: 'child-2',
      position: { x: 80, y: 30 },
      size: { width: 50, height: 50 },
      zIndex: 2,
      type: WidgetType.Box,
      properties: { backgroundColor: 'green' }
    };
    
    const groupWidget: WidgetData = {
      id: 'group-1',
      position: { x: 10, y: 10 },
      size: { width: 150, height: 100 },
      zIndex: 3,
      type: WidgetType.Group,
      properties: {
        childIds: ['child-1', 'child-2']
      } as GroupWidgetProperties
    };
    
    // Copy all items to clipboard
    clipboard.copy([groupWidget, childWidget1, childWidget2]);
    
    // Paste and verify
    const pasted = clipboard.paste();
    
    expect(pasted.length).toBe(3);
    
    // Find the group widget in pasted items
    const pastedGroup = pasted.find(item => item.type === WidgetType.Group);
    expect(pastedGroup).toBeDefined();
    
    if (pastedGroup) {
      // Get the new child IDs
      const pastedChildIds = (pastedGroup.properties as GroupWidgetProperties).childIds;
      
      // Verify that child IDs in group have been updated
      expect(pastedChildIds.length).toBe(2);
      expect(pastedChildIds.includes('child-1')).toBe(false);
      expect(pastedChildIds.includes('child-2')).toBe(false);
      
      // Find the pasted child widgets
      const pastedChildren = pasted.filter(item => item.type === WidgetType.Box);
      expect(pastedChildren.length).toBe(2);
      
      // Verify that the child IDs in the group match the actual pasted child widget IDs
      pastedChildren.forEach(child => {
        expect(pastedChildIds.includes(child.id)).toBe(true);
      });
    }
  });
  
  test('should maintain correct group references with multiple groups', () => {
    // Create two separate groups, each with their own children
    const group1Child1: WidgetData = {
      id: 'g1-child-1',
      position: { x: 20, y: 30 },
      size: { width: 50, height: 50 },
      zIndex: 1,
      type: WidgetType.Box,
      properties: { backgroundColor: 'blue' }
    };
    
    const group1Child2: WidgetData = {
      id: 'g1-child-2',
      position: { x: 80, y: 30 },
      size: { width: 50, height: 50 },
      zIndex: 2,
      type: WidgetType.Box,
      properties: { backgroundColor: 'green' }
    };
    
    const group1: WidgetData = {
      id: 'group-1',
      position: { x: 10, y: 10 },
      size: { width: 150, height: 100 },
      zIndex: 3,
      type: WidgetType.Group,
      properties: {
        childIds: ['g1-child-1', 'g1-child-2']
      } as GroupWidgetProperties
    };
    
    const group2Child1: WidgetData = {
      id: 'g2-child-1',
      position: { x: 220, y: 30 },
      size: { width: 50, height: 50 },
      zIndex: 4,
      type: WidgetType.Box,
      properties: { backgroundColor: 'yellow' }
    };
    
    const group2Child2: WidgetData = {
      id: 'g2-child-2',
      position: { x: 280, y: 30 },
      size: { width: 50, height: 50 },
      zIndex: 5,
      type: WidgetType.Box,
      properties: { backgroundColor: 'purple' }
    };
    
    const group2: WidgetData = {
      id: 'group-2',
      position: { x: 210, y: 10 },
      size: { width: 150, height: 100 },
      zIndex: 6,
      type: WidgetType.Group,
      properties: {
        childIds: ['g2-child-1', 'g2-child-2']
      } as GroupWidgetProperties
    };
    
    // Copy all items to clipboard
    clipboard.copy([group1, group1Child1, group1Child2, group2, group2Child1, group2Child2]);
    
    // Paste and verify
    const pasted = clipboard.paste();
    
    expect(pasted.length).toBe(6);
    
    // Find the pasted groups
    const pastedGroups = pasted.filter(item => item.type === WidgetType.Group);
    expect(pastedGroups.length).toBe(2);
    
    // Find the pasted child widgets
    const pastedChildren = pasted.filter(item => item.type === WidgetType.Box);
    expect(pastedChildren.length).toBe(4);
    
    // Get new IDs
    const newChildIds = pastedChildren.map(child => child.id);
    
    // For each group, verify its children are in the pasted items and references are correct
    pastedGroups.forEach(group => {
      const groupChildIds = (group.properties as GroupWidgetProperties).childIds;
      expect(groupChildIds.length).toBe(2);
      
      // All child IDs should be in the set of new child IDs
      groupChildIds.forEach(childId => {
        expect(newChildIds.includes(childId)).toBe(true);
      });
      
      // Each group should have distinct children
      const otherGroup = pastedGroups.find(g => g.id !== group.id);
      if (otherGroup) {
        const otherGroupChildIds = (otherGroup.properties as GroupWidgetProperties).childIds;
        // No child IDs should be shared between groups
        expect(groupChildIds.some(id => otherGroupChildIds.includes(id))).toBe(false);
      }
    });
  });
  
  test('should paste items multiple times with different IDs each time', () => {
    const mockItems: WidgetData[] = [
      {
        id: 'widget-1',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        type: WidgetType.Box,
        properties: { backgroundColor: 'red' }
      }
    ];
    
    clipboard.copy(mockItems);
    
    const firstPaste = clipboard.paste();
    const secondPaste = clipboard.paste();
    
    expect(firstPaste[0].id).not.toBe(secondPaste[0].id);
    
    // Both pastes receive the same offset from the original (offset is always 20,20)
    // The clipboard doesn't track previous paste operations
    expect(secondPaste[0].position.x).toBe(mockItems[0].position.x + 20);
    expect(secondPaste[0].position.y).toBe(mockItems[0].position.y + 20);
  });
});