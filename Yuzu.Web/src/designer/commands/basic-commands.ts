import { Command } from './command.js';
import { Point, Size } from '../types.js';

// Designer interface for basic operations needed by commands
export interface IDesignerCommands {
    setWidgetPosition(widgetId: string, position: Point): void;
    setWidgetSize(widgetId: string, size: Size): void;
    setWidgetZIndex(widgetId: string, zIndex: number): void; // Added method
    addWidget(widgetData: any): string;
    addWidgetWithId(widgetData: any): void;
    removeWidget(widgetId: string): void;
    getWidgetData(widgetId: string): any | null;
}

// Specific command implementations

/**
 * Command to move multiple widgets to new positions.
 */
export class MoveWidgetsCommand implements Command {
    private widgetIds: string[];
    private oldPositions: { id: string, x: number, y: number }[];
    private newPositions: { id: string, x: number, y: number }[];
    private designerReference: IDesignerCommands;

    /**
     * Constructor for MoveWidgetsCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be moved.
     * @param oldPositions - Array of old positions of the widgets.
     * @param newPositions - Array of new positions of the widgets.
     */
    constructor(
        designerReference: IDesignerCommands,
        widgetIds: string[],
        oldPositions: { id: string, x: number, y: number }[],
        newPositions: { id: string, x: number, y: number }[]
    ) {
        console.log(`[Debug] Creating MoveWidgetsCommand for ${widgetIds.length} widgets`);
        
        this.designerReference = designerReference;
        this.widgetIds = [...widgetIds];
        this.oldPositions = [...oldPositions];
        this.newPositions = [...newPositions];
        
        console.log(`[Debug] Move command details:`, {
            widgetIds: this.widgetIds,
            oldPositions: this.oldPositions.map(p => `${p.id}: (${p.x}, ${p.y})`),
            newPositions: this.newPositions.map(p => `${p.id}: (${p.x}, ${p.y})`)
        });
    }

    /**
     * Executes the move command, setting widgets to their new positions.
     */
    public execute(): void {
        console.log(`[Debug] Executing move command for ${this.widgetIds.length} widgets`);
        
        this.newPositions.forEach(pos => {
            console.log(`[Debug] Moving widget ${pos.id} to (${pos.x}, ${pos.y})`);
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
        
        console.log(`[Debug] Move command execution completed`);
    }

    /**
     * Undoes the move command, resetting widgets to their old positions.
     */
    public undo(): void {
        console.log(`[Debug] Undoing move command for ${this.widgetIds.length} widgets`);
        
        this.oldPositions.forEach(pos => {
            console.log(`[Debug] Restoring widget ${pos.id} to original position (${pos.x}, ${pos.y})`);
            this.designerReference.setWidgetPosition(pos.id, { x: pos.x, y: pos.y });
        });
        
        console.log(`[Debug] Move command undo completed`);
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        return `Move ${this.widgetIds.length} widget(s)`;
    }
}

/**
 * Command to resize a widget and optionally move it to a new position.
 */
export class ResizeWidgetCommand implements Command {
    private widgetId: string;
    private oldSize: { width: number, height: number };
    private oldPosition: { x: number, y: number };
    private newSize: { width: number, height: number };
    private newPosition: { x: number, y: number };
    private designerReference: IDesignerCommands;

    /**
     * Constructor for ResizeWidgetCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetId - ID of the widget to be resized.
     * @param oldPosition - Old position of the widget.
     * @param oldSize - Old size of the widget.
     * @param newPosition - New position of the widget.
     * @param newSize - New size of the widget.
     */
    constructor(
        designerReference: IDesignerCommands,
        widgetId: string,
        oldPosition: { x: number, y: number },
        oldSize: { width: number, height: number },
        newPosition: { x: number, y: number },
        newSize: { width: number, height: number }
    ) {
        console.log(`[Debug] Creating ResizeWidgetCommand for widget ${widgetId}`);
        
        this.designerReference = designerReference;
        this.widgetId = widgetId;
        this.oldPosition = oldPosition;
        this.oldSize = oldSize;
        this.newPosition = newPosition;
        this.newSize = newSize;
        
        console.log(`[Debug] Resize command details:`, {
            widgetId,
            oldPosition: `(${oldPosition.x}, ${oldPosition.y})`,
            oldSize: `${oldSize.width}x${oldSize.height}`,
            newPosition: `(${newPosition.x}, ${newPosition.y})`,
            newSize: `${newSize.width}x${newSize.height}`,
            positionDelta: {
                dx: newPosition.x - oldPosition.x,
                dy: newPosition.y - oldPosition.y
            },
            sizeDelta: {
                dWidth: newSize.width - oldSize.width,
                dHeight: newSize.height - oldSize.height
            }
        });
    }

    /**
     * Executes the resize command, setting the widget to its new size and position.
     */
    public execute(): void {
        console.log(`[Debug] Executing resize command for widget ${this.widgetId}`);
        
        console.log(`[Debug] Setting widget position to (${this.newPosition.x}, ${this.newPosition.y})`);
        this.designerReference.setWidgetPosition(this.widgetId, this.newPosition);
        
        console.log(`[Debug] Setting widget size to ${this.newSize.width}x${this.newSize.height}`);
        this.designerReference.setWidgetSize(this.widgetId, this.newSize);
        
        console.log(`[Debug] Resize command execution completed`);
    }

    /**
     * Undoes the resize command, resetting the widget to its old size and position.
     */
    public undo(): void {
        console.log(`[Debug] Undoing resize command for widget ${this.widgetId}`);
        
        console.log(`[Debug] Restoring widget position to (${this.oldPosition.x}, ${this.oldPosition.y})`);
        this.designerReference.setWidgetPosition(this.widgetId, this.oldPosition);
        
        console.log(`[Debug] Restoring widget size to ${this.oldSize.width}x${this.oldSize.height}`);
        this.designerReference.setWidgetSize(this.widgetId, this.oldSize);
        
        console.log(`[Debug] Resize command undo completed`);
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        return `Resize widget ${this.widgetId}`;
    }
}

/**
 * Command to create a new widget.
 */
export class CreateWidgetCommand implements Command {
    private widgetData: any;
    private designerReference: IDesignerCommands;
    private createdWidgetId: string | null = null;

    /**
     * Constructor for CreateWidgetCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetData - Data for the widget to be created.
     */
    constructor(designerReference: IDesignerCommands, widgetData: any) {
        console.log('[Debug] Creating CreateWidgetCommand');
        
        this.designerReference = designerReference;
        this.widgetData = { ...widgetData };
        
        console.log('[Debug] Widget data for creation:', this.widgetData);
    }

    /**
     * Executes the create command, adding a new widget to the designer.
     */
    public execute(): void {
        console.log('[Debug] Executing create widget command');
        
        try {
            this.createdWidgetId = this.designerReference.addWidget(this.widgetData);
            console.log(`[Debug] Widget created successfully with ID: ${this.createdWidgetId}`);
        } catch (error) {
            console.error('[Debug] Error creating widget:', error);
            throw error;
        }
    }

    /**
     * Undoes the create command, removing the newly created widget.
     */
    public undo(): void {
        console.log(`[Debug] Undoing create widget command for widget ID: ${this.createdWidgetId}`);
        
        if (this.createdWidgetId) {
            try {
                this.designerReference.removeWidget(this.createdWidgetId);
                console.log(`[Debug] Widget ${this.createdWidgetId} removed successfully`);
            } catch (error) {
                console.error(`[Debug] Error removing widget ${this.createdWidgetId}:`, error);
                throw error;
            }
        } else {
            console.warn('[Debug] Cannot undo widget creation - no widget ID stored');
        }
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        const widgetType = this.widgetData.type || 'unknown';
        return `Create new ${widgetType} widget`;
    }
}

/**
 * Command to delete multiple widgets.
 */
export class DeleteWidgetsCommand implements Command {
    private widgetsData: any[];
    private designerReference: IDesignerCommands;
    private deletedWidgetIds: string[];

    /**
     * Constructor for DeleteWidgetsCommand.
     * @param designerReference - Reference to the designer implementing IDesignerCommands.
     * @param widgetIds - Array of widget IDs to be deleted.
     */
    constructor(designerReference: IDesignerCommands, widgetIds: string[]) {
        console.log(`[Debug] Creating DeleteWidgetsCommand for ${widgetIds.length} widgets: ${widgetIds.join(', ')}`);
        
        this.designerReference = designerReference;
        this.deletedWidgetIds = [...widgetIds];
        
        // Save the full data of widgets before deletion for restoration
        console.log('[Debug] Saving widget data for future restoration');
        this.widgetsData = widgetIds.map(id => {
            const data = this.designerReference.getWidgetData(id);
            console.log(`[Debug] Saved data for widget ${id}:`, data ? 'found' : 'not found');
            return data;
        }).filter(data => {
            if (data === null) {
                console.warn('[Debug] Widget data was null, cannot save for restoration');
            }
            return data !== null;
        });
        
        console.log(`[Debug] Saved data for ${this.widgetsData.length} widgets`);
    }

    /**
     * Executes the delete command, removing the specified widgets from the designer.
     */
    public execute(): void {
        console.log(`[Debug] Executing delete command for ${this.deletedWidgetIds.length} widgets`);
        
        this.deletedWidgetIds.forEach(id => {
            console.log(`[Debug] Removing widget ${id}`);
            try {
                this.designerReference.removeWidget(id);
                console.log(`[Debug] Widget ${id} removed successfully`);
            } catch (error) {
                console.error(`[Debug] Error removing widget ${id}:`, error);
            }
        });
        
        console.log('[Debug] Delete command execution completed');
    }

    /**
     * Undoes the delete command, restoring the previously deleted widgets.
     */
    public undo(): void {
        console.log(`[Debug] Undoing delete command, restoring ${this.widgetsData.length} widgets`);
        
        this.widgetsData.forEach(data => {
            console.log(`[Debug] Restoring widget ${data.id} of type ${data.type}`);
            try {
                this.designerReference.addWidgetWithId(data);
                console.log(`[Debug] Widget ${data.id} restored successfully`);
            } catch (error) {
                console.error(`[Debug] Error restoring widget ${data.id}:`, error);
            }
        });
        
        console.log('[Debug] Undo delete completed');
    }

    /**
     * Returns a description of the command.
     * @returns Description string.
     */
    public getDescription(): string {
        return `Delete ${this.deletedWidgetIds.length} widget(s)`;
    }
}