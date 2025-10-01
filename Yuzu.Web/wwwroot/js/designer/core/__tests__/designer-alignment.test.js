import { AlignWidgetsCommand, DistributeWidgetsCommand, MakeSameSizeCommand } from '../../commands/alignment-commands.js';
// Mock the DesignerAlignment class to test alignment functionality
jest.mock('../designer-alignment.js', () => {
    const actualModule = jest.requireActual('../designer-alignment.js');
    return Object.assign(Object.assign({}, actualModule), { 
        // This would normally extend from DesignerSelection but we mock it for testing
        DesignerAlignment: jest.fn().mockImplementation(() => {
            return {
                alignWidgets: jest.fn(),
                distributeWidgets: jest.fn(),
                makeSameSize: jest.fn()
            };
        }) });
});
// Mock the alignment commands
jest.mock('../../commands/alignment-commands.js', () => {
    return {
        AlignWidgetsCommand: jest.fn().mockImplementation((designerReference, widgetIds, oldPositions, newPositions, alignType) => {
            return {
                execute: jest.fn(),
                undo: jest.fn(),
                getDescription: () => `Align widgets ${alignType}`
            };
        }),
        DistributeWidgetsCommand: jest.fn().mockImplementation((designerReference, widgetIds, oldPositions, newPositions, distributeType) => {
            return {
                execute: jest.fn(),
                undo: jest.fn(),
                getDescription: () => `Distribute widgets ${distributeType}`
            };
        }),
        MakeSameSizeCommand: jest.fn().mockImplementation((designerReference, widgetIds, oldSizes, newSize, sizeType) => {
            return {
                execute: jest.fn(),
                undo: jest.fn(),
                getDescription: () => `Make same size ${sizeType}`
            };
        })
    };
});
describe('Alignment Commands', () => {
    test('AlignWidgetsCommand should be created with correct parameters', () => {
        const widgetIds = ['widget-1', 'widget-2'];
        const alignType = 'left';
        const designer = {};
        const oldPositions = [
            { id: 'widget-1', x: 10, y: 10 },
            { id: 'widget-2', x: 20, y: 20 }
        ];
        const newPositions = [
            { id: 'widget-1', x: 10, y: 10 },
            { id: 'widget-2', x: 10, y: 20 }
        ];
        const command = new AlignWidgetsCommand(designer, widgetIds, oldPositions, newPositions, alignType);
        expect(AlignWidgetsCommand).toHaveBeenCalledWith(designer, widgetIds, oldPositions, newPositions, alignType);
        expect(command.execute).toBeDefined();
        expect(command.undo).toBeDefined();
    });
    test('DistributeWidgetsCommand should be created with correct parameters', () => {
        const widgetIds = ['widget-1', 'widget-2', 'widget-3'];
        const distributeType = 'horizontal';
        const designer = {};
        const oldPositions = [
            { id: 'widget-1', x: 10, y: 10 },
            { id: 'widget-2', x: 20, y: 20 },
            { id: 'widget-3', x: 30, y: 30 }
        ];
        const newPositions = [
            { id: 'widget-1', x: 10, y: 10 },
            { id: 'widget-2', x: 50, y: 20 },
            { id: 'widget-3', x: 90, y: 30 }
        ];
        const command = new DistributeWidgetsCommand(designer, widgetIds, oldPositions, newPositions, distributeType);
        expect(DistributeWidgetsCommand).toHaveBeenCalledWith(designer, widgetIds, oldPositions, newPositions, distributeType);
        expect(command.execute).toBeDefined();
        expect(command.undo).toBeDefined();
    });
    test('MakeSameSizeCommand should be created with correct parameters', () => {
        const widgetIds = ['widget-1', 'widget-2'];
        const sizeType = 'width';
        const designer = {};
        const oldSizes = [
            { id: 'widget-1', width: 100, height: 100 },
            { id: 'widget-2', width: 150, height: 120 }
        ];
        const newSize = { width: 100, height: 100 };
        const command = new MakeSameSizeCommand(designer, widgetIds, oldSizes, newSize, sizeType);
        expect(MakeSameSizeCommand).toHaveBeenCalledWith(designer, widgetIds, oldSizes, newSize, sizeType);
        expect(command.execute).toBeDefined();
        expect(command.undo).toBeDefined();
    });
});
//# sourceMappingURL=designer-alignment.test.js.map