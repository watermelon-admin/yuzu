import { Command } from './command.js';
import { IDesignerCommands } from './basic-commands.js';
import { Point, Size, WidgetType } from '../types.js';

/**
 * Command to align multiple widgets' edges.
 */
export class AlignWidgetsCommand implements Command {
    private widgetIds: string[];
    private oldPositions: { id: string, x: number, y: number }[];
    private newPositions: { id: string, x: number, y: number }[];
    private designerReference: IDesignerCommands;
    private alignmentType: string;

    /**
     * Constructor for AlignWidgetsCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be aligned.
     * @param oldPositions - Array of old positions of the widgets.
     * @param newPositions - Array of new positions of the widgets.
     * @param alignmentType - Type of alignment (e.g., left, right, top, bottom).
     */
    constructor(
        designerReference: IDesignerCommands,
        widgetIds: string[],
        oldPositions: { id: string, x: number, y: number }[],
        newPositions: { id: string, x: number, y: number }[],
        alignmentType: string
    ) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        this.alignmentType = alignmentType;
    }

    /**
     * Executes the alignment command, setting widgets to their new positions.
     */
    public execute(): void {
        this.newPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }

    /**
     * Undoes the alignment command, resetting widgets to their old positions.
     */
    public undo(): void {
        this.oldPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        return `Align ${this.widgetIds.length} widget(s) ${this.alignmentType}`;
    }
}

/**
 * Command to distribute multiple widgets evenly.
 */
export class DistributeWidgetsCommand implements Command {
    private widgetIds: string[];
    private oldPositions: { id: string, x: number, y: number }[];
    private newPositions: { id: string, x: number, y: number }[];
    private designerReference: IDesignerCommands;
    private distributionType: string;

    /**
     * Constructor for DistributeWidgetsCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be distributed.
     * @param oldPositions - Array of old positions of the widgets.
     * @param newPositions - Array of new positions of the widgets.
     * @param distributionType - Type of distribution (e.g., horizontal, vertical).
     */
    constructor(
        designerReference: IDesignerCommands,
        widgetIds: string[],
        oldPositions: { id: string, x: number, y: number }[],
        newPositions: { id: string, x: number, y: number }[],
        distributionType: string
    ) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        this.distributionType = distributionType;
    }

    /**
     * Executes the distribution command, setting widgets to their new positions.
     */
    public execute(): void {
        this.newPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }

    /**
     * Undoes the distribution command, resetting widgets to their old positions.
     */
    public undo(): void {
        this.oldPositions.forEach(pos => {
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        return `Distribute ${this.widgetIds.length} widget(s) ${this.distributionType}`;
    }
}

/**
 * Command to make multiple widgets the same size.
 */
export class MakeSameSizeCommand implements Command {
    private widgetIds: string[];
    private oldSizes: { id: string, width: number, height: number }[];
    private newSize: { width: number, height: number };
    private designerReference: IDesignerCommands;
    private sizeType: string;

    /**
     * Constructor for MakeSameSizeCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be resized.
     * @param oldSizes - Array of old sizes of the widgets.
     * @param newSize - New size to be applied to the widgets.
     * @param sizeType - Type of size adjustment (e.g., width, height, both).
     */
    constructor(
        designerReference: IDesignerCommands,
        widgetIds: string[],
        oldSizes: { id: string, width: number, height: number }[],
        newSize: { width: number, height: number },
        sizeType: string
    ) {
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldSizes = [...oldSizes];
        this.newSize = newSize;
        this.sizeType = sizeType;
    }

    /**
     * Executes the resize command, setting widgets to the new size.
     */
    public execute(): void {
        this.widgetIds.forEach(id => {
            if (this.sizeType === 'width') {
                const oldSize = this.oldSizes.find(s => s.id === id);
                if (oldSize) {
                    this.designerReference.setWidgetSize(id, {
                        width: this.newSize.width,
                        height: oldSize.height
                    });
                }
            } else if (this.sizeType === 'height') {
                const oldSize = this.oldSizes.find(s => s.id === id);
                if (oldSize) {
                    this.designerReference.setWidgetSize(id, {
                        width: oldSize.width,
                        height: this.newSize.height
                    });
                }
            } else {
                // Both width and height
                this.designerReference.setWidgetSize(id, this.newSize);
            }
        });
    }

    /**
     * Undoes the resize command, resetting widgets to their old sizes.
     */
    public undo(): void {
        this.oldSizes.forEach(sizeData => {
            const size = { width: sizeData.width, height: sizeData.height };
            this.designerReference.setWidgetSize(sizeData.id, size);
        });
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        return `Make ${this.widgetIds.length} widget(s) same ${this.sizeType}`;
    }
}
