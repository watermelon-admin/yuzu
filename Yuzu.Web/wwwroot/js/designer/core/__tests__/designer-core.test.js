import { Designer } from '../designer-core.js';
// Mock required DOM elements and modules
beforeEach(() => {
    // Mock the properties toolbox and form elements
    const mockPropertiesToolbar = document.createElement('div');
    mockPropertiesToolbar.className = 'properties-toolbar';
    // Create a handle element
    const toolboxHandle = document.createElement('div');
    toolboxHandle.className = 'toolbox-handle';
    mockPropertiesToolbar.appendChild(toolboxHandle);
    // Create and append all the form controls needed by PropertiesManager
    const mockFormElements = [
        'position-x', 'position-y', 'dimension-w', 'dimension-h',
        'box-text', 'btn-text-bold', 'btn-text-italic', 'btn-text-underline',
        'btn-text-strikethrough', 'btn-text-left', 'btn-text-center',
        'btn-text-right', 'font-family', 'text-size-range', 'text-size-display',
        'color-picker', 'color-hex', 'corner-radius-range', 'corner-radius-display'
    ];
    mockFormElements.forEach(id => {
        const el = document.createElement(id.includes('text-') && !id.includes('btn-') ? 'textarea' :
            id.includes('font-family') ? 'select' : 'input');
        el.id = id;
        // Set the correct type for input elements
        if (el.tagName === 'INPUT') {
            if (id.includes('range')) {
                el.setAttribute('type', 'range');
            }
            else if (id.includes('color')) {
                el.setAttribute('type', 'color');
            }
            else if (id.includes('btn-')) {
                el.setAttribute('type', 'checkbox');
            }
            else {
                el.setAttribute('type', 'text');
            }
        }
        // Create display elements
        if (id.endsWith('-display')) {
            const display = document.createElement('span');
            display.id = id;
            mockPropertiesToolbar.appendChild(display);
        }
        else {
            mockPropertiesToolbar.appendChild(el);
        }
    });
    document.body.appendChild(mockPropertiesToolbar);
});
afterEach(() => {
    // Clean up the mocked elements
    const propertiesToolbar = document.querySelector('.properties-toolbar');
    if (propertiesToolbar) {
        document.body.removeChild(propertiesToolbar);
    }
    // Clean up any widgets that might have been added
    document.querySelectorAll('.widget').forEach(el => {
        var _a;
        (_a = el.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(el);
    });
});
describe('Designer', () => {
    let designer;
    let container;
    beforeEach(() => {
        // Create container for designer
        container = document.createElement('div');
        container.id = 'designer-container';
        document.body.appendChild(container);
        // Mock document.getElementById for the constructor
        const originalGetElementById = document.getElementById;
        jest.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'designer-container') {
                return container;
            }
            return originalGetElementById.call(document, id);
        });
        // Create designer instance
        designer = new Designer('designer-container');
    });
    afterEach(() => {
        // Cleanup container after test
        if (container.parentNode) {
            document.body.removeChild(container);
        }
        // Restore original getElementById
        jest.restoreAllMocks();
    });
    test('should initialize properly', () => {
        expect(designer).toBeDefined();
        expect(designer.toolboxManager).toBeDefined();
        expect(designer.propertiesManager).toBeDefined();
    });
    test('should add a widget with default settings', () => {
        const widgetId = designer.addWidget();
        expect(widgetId).toBeDefined();
        expect(typeof widgetId).toBe('string');
        // Get the widget data and verify default properties
        const widgetData = designer.getWidgetData(widgetId);
        expect(widgetData).not.toBeNull();
        expect(widgetData === null || widgetData === void 0 ? void 0 : widgetData.id).toBe(widgetId);
        expect(widgetData === null || widgetData === void 0 ? void 0 : widgetData.position).toEqual(expect.objectContaining({
            x: 100,
            y: 100
        }));
        expect(widgetData === null || widgetData === void 0 ? void 0 : widgetData.size).toEqual(expect.objectContaining({
            width: 150,
            height: 100
        }));
    });
});
//# sourceMappingURL=designer-core.test.js.map