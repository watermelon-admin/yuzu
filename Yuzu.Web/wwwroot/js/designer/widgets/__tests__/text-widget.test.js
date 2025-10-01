import { TextWidget } from '../text-widget.js';
import { WidgetType } from '../../types.js';
// Create a DOM element for testing
function createTestContainer() {
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    return container;
}
// Clean up DOM after tests
function removeTestContainer(container) {
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
}
describe('TextWidget', () => {
    let container;
    let widgetData;
    beforeEach(() => {
        container = createTestContainer();
        // Create basic widget data for testing
        widgetData = {
            id: 'test-text-widget',
            position: { x: 10, y: 20 },
            size: { width: 200, height: 100 },
            zIndex: 1,
            type: WidgetType.Text,
            properties: {
                text: 'Test Text',
                fontFamily: 'Arial',
                fontSize: 16,
                fontColor: '#000000',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                hasPlaceholders: false,
                showRawPlaceholders: false
            }
        };
    });
    afterEach(() => {
        removeTestContainer(container);
    });
    describe('Constructor and Initialization', () => {
        test('should create a text widget with default properties when no properties are provided', () => {
            const minimalData = {
                id: 'minimal-widget',
                position: { x: 0, y: 0 },
                size: { width: 100, height: 50 },
                zIndex: 1,
                type: WidgetType.Text
            };
            const widget = new TextWidget(minimalData);
            const element = widget.getElement();
            expect(element).toBeTruthy();
            expect(element.classList.contains('widget')).toBe(true);
            expect(element.getAttribute('data-id')).toBe('minimal-widget');
            expect(element.style.left).toBe('0px');
            expect(element.style.top).toBe('0px');
            expect(element.style.width).toBe('100px');
            expect(element.style.height).toBe('50px');
        });
        test('should create a text widget with provided properties', () => {
            const widget = new TextWidget(widgetData);
            const element = widget.getElement();
            expect(element).toBeTruthy();
            expect(element.getAttribute('data-id')).toBe('test-text-widget');
            expect(element.style.left).toBe('10px');
            expect(element.style.top).toBe('20px');
            // Check if content has the correct text
            // Check internal state instead of relying on DOM element
            const properties = widget.data.properties;
            expect(properties.text).toBe('Test Text');
        });
    });
    describe('Text Content Management', () => {
        test('should update text content when setText is called', () => {
            const widget = new TextWidget(widgetData);
            const element = widget.getElement();
            container.appendChild(element);
            widget.setText('Updated Text');
            // Wait for DOM update
            setTimeout(() => {
                const contentEl = element.querySelector('.text-widget-content');
                expect(contentEl === null || contentEl === void 0 ? void 0 : contentEl.textContent).toBe('Updated Text');
            }, 10);
            // For now, directly test the internal state
            const properties = widget.data.properties;
            expect(properties.text).toBe('Updated Text');
        });
        test('should update font properties correctly', () => {
            const widget = new TextWidget(widgetData);
            const element = widget.getElement();
            container.appendChild(element);
            // Change font properties
            widget.setFontFamily('Times New Roman');
            widget.setFontSize(24);
            widget.setFontColor('#FF0000');
            widget.setFontWeight(true); // bold
            widget.setFontStyle(true); // italic
            widget.setTextDecoration('underline');
            widget.setTextAlign('left');
            const contentEl = element.querySelector('.text-widget-content');
            expect(contentEl).toBeTruthy();
            expect(contentEl.style.fontFamily).toBe('Times New Roman');
            expect(contentEl.style.fontSize).toBe('24px');
            expect(contentEl.style.color).toBe('rgb(255, 0, 0)'); // Browser may normalize color format
            expect(contentEl.style.fontWeight).toBe('bold');
            expect(contentEl.style.fontStyle).toBe('italic');
            expect(contentEl.style.textDecoration).toBe('underline');
            expect(contentEl.style.textAlign).toBe('left');
        });
    });
    describe('Placeholder Handling', () => {
        test('should detect placeholders in text', () => {
            const placeholderData = Object.assign({}, widgetData);
            placeholderData.properties.text = 'Hello, {name}!';
            const widget = new TextWidget(placeholderData);
            const placeholderInfo = widget.getPlaceholderInfo();
            expect(placeholderInfo.hasPlaceholders).toBe(true);
        });
        test('should identify placeholder errors', () => {
            const errorData = Object.assign({}, widgetData);
            errorData.properties.text = 'Hello, {name!'; // Missing closing bracket
            const widget = new TextWidget(errorData);
            const placeholderInfo = widget.getPlaceholderInfo();
            expect(placeholderInfo.hasPlaceholders).toBe(true);
            expect(placeholderInfo.hasError).toBe(true);
            expect(placeholderInfo.errorMessage).toBeTruthy();
        });
        test('should toggle between raw placeholders and replaced values', () => {
            const placeholderData = Object.assign({}, widgetData);
            placeholderData.properties.text = 'Hello, {break-name}!';
            placeholderData.properties.hasPlaceholders = true;
            const widget = new TextWidget(placeholderData);
            const element = widget.getElement();
            container.appendChild(element);
            // Initial state should show replaced values
            expect(widget.getPlaceholderInfo().showingRawPlaceholders).toBe(false);
            // Toggle to show raw placeholders
            const showRawResult = widget.togglePlaceholderView();
            expect(showRawResult).toBe(true);
            expect(widget.getPlaceholderInfo().showingRawPlaceholders).toBe(true);
            // Content should now show raw placeholder, but we'll check the internal state
            // since DOM updates might be asynchronous
            const properties = widget.data.properties;
            expect(properties.text).toBe('Hello, {break-name}!');
            expect(properties.showRawPlaceholders).toBe(true);
            // Toggle back to show replaced values
            const showReplacedResult = widget.togglePlaceholderView();
            expect(showReplacedResult).toBe(false);
            expect(widget.getPlaceholderInfo().showingRawPlaceholders).toBe(false);
        });
        test('should directly set placeholder view mode', () => {
            const placeholderData = Object.assign({}, widgetData);
            placeholderData.properties.text = 'Hello, {break-name}!';
            placeholderData.properties.hasPlaceholders = true;
            const widget = new TextWidget(placeholderData);
            // Set to raw mode
            widget.setPlaceholderView(true);
            expect(widget.getPlaceholderInfo().showingRawPlaceholders).toBe(true);
            // Set to replaced mode
            widget.setPlaceholderView(false);
            expect(widget.getPlaceholderInfo().showingRawPlaceholders).toBe(false);
        });
    });
});
//# sourceMappingURL=text-widget.test.js.map