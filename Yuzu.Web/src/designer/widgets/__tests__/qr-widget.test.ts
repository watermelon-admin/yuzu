import { QRWidget } from '../qr-widget.js';
import { WidgetData, WidgetType, QRWidgetProperties, Size } from '../../types.js';

// Create a DOM element for testing
function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  return container;
}

// Clean up DOM after tests
function removeTestContainer(container: HTMLElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

describe('QRWidget', () => {
  let container: HTMLElement;
  let widgetData: WidgetData;
  
  beforeEach(() => {
    container = createTestContainer();
    
    // Create basic widget data for testing
    widgetData = {
      id: 'test-qr-widget',
      position: { x: 30, y: 40 },
      size: { width: 100, height: 100 },
      zIndex: 1,
      type: WidgetType.QR,
      properties: {
        imageUrl: 'img/dummy-qr.svg'
      } as QRWidgetProperties
    };
  });
  
  afterEach(() => {
    removeTestContainer(container);
  });
  
  describe('Constructor and Initialization', () => {
    test('should create a QR widget with default properties', () => {
      const minimalData: WidgetData = {
        id: 'minimal-qr-widget',
        position: { x: 0, y: 0 },
        size: { width: 120, height: 100 }, // Different width/height to test square enforcement
        zIndex: 1,
        type: WidgetType.QR
      };
      
      const widget = new QRWidget(minimalData);
      const element = widget.getElement();
      
      expect(element).toBeTruthy();
      expect(element.classList.contains('widget')).toBe(true);
      expect(element.getAttribute('data-id')).toBe('minimal-qr-widget');
      
      // QR widget should be square with the larger dimension
      expect(element.style.width).toBe('120px');
      expect(element.style.height).toBe('120px');
      
      // Should contain an image with the default image URL
      const imgElement = element.querySelector('img');
      expect(imgElement).toBeTruthy();
      expect(imgElement?.getAttribute('src')).toBe('img/dummy-qr.svg');
    });
    
    test('should create a QR widget with provided properties', () => {
      const widget = new QRWidget(widgetData);
      const element = widget.getElement();
      
      expect(element).toBeTruthy();
      expect(element.getAttribute('data-id')).toBe('test-qr-widget');
      expect(element.style.left).toBe('30px');
      expect(element.style.top).toBe('40px');
      
      // Check if content has the image
      const imgElement = element.querySelector('img');
      expect(imgElement).toBeTruthy();
      expect(imgElement?.getAttribute('src')).toBe('img/dummy-qr.svg');
    });
  });
  
  describe('Size Management', () => {
    test('should maintain square proportions when resizing', () => {
      const widget = new QRWidget(widgetData);
      const element = widget.getElement();
      container.appendChild(element);
      
      // Initial size should be square
      expect(element.style.width).toBe('100px');
      expect(element.style.height).toBe('100px');
      
      // Resize with non-square dimensions
      widget.setSize({ width: 150, height: 100 });
      
      // Should use the larger dimension for both width and height
      expect(element.style.width).toBe('150px');
      expect(element.style.height).toBe('150px');
      
      // Try another resize with height larger than width
      widget.setSize({ width: 80, height: 120 });
      
      // Should use the larger dimension again
      expect(element.style.width).toBe('120px');
      expect(element.style.height).toBe('120px');
    });
    
    test('should enforce minimum size', () => {
      const widget = new QRWidget(widgetData);
      const element = widget.getElement();
      container.appendChild(element);
      
      // Try to set a very small size
      widget.setSize({ width: 5, height: 5 });
      
      // Should enforce minimum size (10px according to implementation)
      expect(element.style.width).toBe('10px');
      expect(element.style.height).toBe('10px');
    });
    
    test('should dispatch size update events when resizing', () => {
      const widget = new QRWidget(widgetData);
      const element = widget.getElement();
      container.appendChild(element);
      
      // Set up event listeners
      const sizeUpdateSpy = jest.fn();
      const qrResizeSpy = jest.fn();
      
      element.addEventListener('widget-size-update', sizeUpdateSpy);
      document.addEventListener('qr-widget-resize', qrResizeSpy);
      
      // Resize the widget
      widget.setSize({ width: 200, height: 150 });
      
      // Check if events were dispatched
      expect(sizeUpdateSpy).toHaveBeenCalledTimes(1);
      expect(qrResizeSpy).toHaveBeenCalledTimes(1);
      
      // Check event details
      const sizeUpdateEvent = sizeUpdateSpy.mock.calls[0][0];
      expect(sizeUpdateEvent.detail.id).toBe('test-qr-widget');
      expect(sizeUpdateEvent.detail.size.width).toBe(200);
      expect(sizeUpdateEvent.detail.size.height).toBe(200);
      
      const qrResizeEvent = qrResizeSpy.mock.calls[0][0];
      expect(qrResizeEvent.detail.id).toBe('test-qr-widget');
      expect(qrResizeEvent.detail.size).toBe(200);
      
      // Clean up event listeners
      element.removeEventListener('widget-size-update', sizeUpdateSpy);
      document.removeEventListener('qr-widget-resize', qrResizeSpy);
    });
  });
  
  describe('Image Management', () => {
    test('should update image URL', () => {
      const widget = new QRWidget(widgetData);
      const element = widget.getElement();
      container.appendChild(element);
      
      // Initial image URL
      let imgElement = element.querySelector('img');
      expect(imgElement?.getAttribute('src')).toBe('img/dummy-qr.svg');
      
      // Update image URL
      const newImageUrl = 'img/new-qr.svg';
      widget.setImageUrl(newImageUrl);
      
      // Check if image URL was updated
      imgElement = element.querySelector('img');
      expect(imgElement?.getAttribute('src')).toBe(newImageUrl);
    });
  });
});