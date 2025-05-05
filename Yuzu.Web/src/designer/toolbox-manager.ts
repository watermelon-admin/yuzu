import { Point } from './types.js';

export class ToolboxManager {
    private toolboxElements: Map<string, HTMLElement> = new Map();
    private toolboxPositions: Map<string, Point> = new Map();
    private activeToolbox: HTMLElement | null = null;
    private activeToolboxId: string | null = null;
    private initialPosition: Point = { x: 0, y: 0 };
    private initialMousePosition: Point = { x: 0, y: 0 };
    private canvasElement: HTMLElement;
    private localStorageKey: string = 'designer-toolbox-positions';

    // Bound event handlers to ensure they can be properly removed
    private boundMouseMoveHandler: (e: MouseEvent) => void;
    private boundMouseUpHandler: (e: MouseEvent) => void;

    /**
     * Constructor for the ToolboxManager class.
     * @param canvasElement - The canvas element where toolboxes will be placed.
     */
    constructor(canvasElement: HTMLElement) {
        this.canvasElement = canvasElement;

        // Bind event handlers to maintain context
        this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
        this.boundMouseUpHandler = this.handleMouseUp.bind(this);

        // Load saved positions from localStorage
        this.loadPositions();
    }

    /**
     * Registers a toolbox element to make it draggable.
     * @param id - Unique identifier for the toolbox.
     * @param element - The HTML element to be made draggable.
     */
    public registerToolbox(id: string, element: HTMLElement): void {

        // Get the first div element with a toolbox-handle class
        const handleElement = element.querySelector('.toolbox-handle');

        // Set initial styles for the toolbox to be movable
        element.style.position = 'absolute';
        element.style.zIndex = '1000'; // Ensure it's above canvas elements

        // Store the toolbox
        this.toolboxElements.set(id, element);

        // Apply saved position if available
        if (this.toolboxPositions.has(id)) {
            const position = this.toolboxPositions.get(id);
            if (position) {
                element.style.left = `${position.x}px`;
                element.style.top = `${position.y}px`;
            }
        }

        // Add mouse down event listener to the handle
        handleElement.addEventListener('mousedown', (e: MouseEvent) => {
            this.handleToolboxMouseDown(element, e);
        });

        // Prevent mousedown events on the toolbox from triggering canvas events
        element.addEventListener('mousedown', (e: MouseEvent) => {
            // Only stop propagation, don't start drag (that's only for the handle)
            e.stopPropagation();
        });

        // Add the toolbox to the canvas
        this.canvasElement.appendChild(element);
    }

    /**
     * Sets the position of a toolbox.
     * @param id - The ID of the toolbox.
     * @param position - The new position.
     */
    public setToolboxPosition(id: string, position: Point): void {
        const toolbox = this.toolboxElements.get(id);
        if (toolbox) {
            toolbox.style.left = `${position.x}px`;
            toolbox.style.top = `${position.y}px`;

            // Update position in our map and save
            this.toolboxPositions.set(id, { ...position });
            this.savePositions();
        }
    }

    /**
     * Resets all toolbox positions to their defaults.
     */
    public resetToolboxPositions(): void {
        // Default positions
        const defaultPositions: Record<string, Point> = {
            'main-toolbar': { x: 20, y: 20 },
            'align-toolbar': { x: 20, y: 80 }
        };

        // Apply default positions
        Object.entries(defaultPositions).forEach(([id, position]) => {
            this.setToolboxPosition(id, position);
        });

        // Clear localStorage
        localStorage.removeItem(this.localStorageKey);
    }

    /**
     * Handles the mousedown event on a toolbox handle.
     * @param toolbox - The toolbox element.
     * @param e - The mouse event.
     */
    private handleToolboxMouseDown(toolbox: HTMLElement, e: MouseEvent): void {
        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();

        this.activeToolbox = toolbox;

        // Find the toolbox id
        let foundId: string | null = null;
        this.toolboxElements.forEach((element, id) => {
            if (element === toolbox) {
                foundId = id;
            }
        });

        if (foundId) {
            this.activeToolboxId = foundId;
        }

        // Compute initial position
        const rect = toolbox.getBoundingClientRect();
        const canvasRect = this.canvasElement.getBoundingClientRect();

        this.initialPosition = {
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top
        };

        this.initialMousePosition = {
            x: e.clientX,
            y: e.clientY
        };

        // Set active class for styling
        toolbox.classList.add('toolbox-dragging');

        // Bring toolbox to front
        toolbox.style.zIndex = '1001';

        // Add event listeners for drag operations
        document.addEventListener('mousemove', this.boundMouseMoveHandler);
        document.addEventListener('mouseup', this.boundMouseUpHandler);
    }

    /**
     * Handles the mousemove event during a toolbox drag.
     * @param e - The mouse event.
     */
    private handleMouseMove(e: MouseEvent): void {
        if (!this.activeToolbox) return;

        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - this.initialMousePosition.x;
        const dy = e.clientY - this.initialMousePosition.y;

        const newX = this.initialPosition.x + dx;
        const newY = this.initialPosition.y + dy;

        // Apply new position
        this.activeToolbox.style.left = `${newX}px`;
        this.activeToolbox.style.top = `${newY}px`;
    }

    /**
     * Handles the mouseup event at the end of a toolbox drag.
     * @param e - The mouse event.
     */
    private handleMouseUp(e: MouseEvent): void {
        if (!this.activeToolbox || !this.activeToolboxId) return;

        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();

        // Get final position
        const rect = this.activeToolbox.getBoundingClientRect();
        const canvasRect = this.canvasElement.getBoundingClientRect();

        const finalPosition = {
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top
        };

        // Update position in our map
        this.toolboxPositions.set(this.activeToolboxId, finalPosition);

        // Save positions to localStorage
        this.savePositions();

        // Remove active class
        this.activeToolbox.classList.remove('toolbox-dragging');

        // Clear active toolbox
        this.activeToolbox = null;
        this.activeToolboxId = null;

        // Remove event listeners
        document.removeEventListener('mousemove', this.boundMouseMoveHandler);
        document.removeEventListener('mouseup', this.boundMouseUpHandler);
    }

    /**
     * Saves toolbox positions to localStorage.
     */
    private savePositions(): void {
        const positions: Record<string, Point> = {};

        this.toolboxPositions.forEach((position, id) => {
            positions[id] = position;
        });

        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(positions));
        } catch (error) {
            console.error('Error saving toolbox positions:', error);
        }
    }

    /**
     * Loads toolbox positions from localStorage.
     */
    private loadPositions(): void {
        try {
            const savedPositions = localStorage.getItem(this.localStorageKey);

            if (savedPositions) {
                const positions = JSON.parse(savedPositions) as Record<string, Point>;

                Object.entries(positions).forEach(([id, position]) => {
                    this.toolboxPositions.set(id, position);
                });
            }
        } catch (error) {
            console.error('Error loading toolbox positions:', error);
        }
    }

    /**
     * Hide all toolboxes for preview mode
     */
    public hideAllToolboxes(): void {
        this.toolboxElements.forEach((toolbox) => {
            toolbox.style.display = 'none';
        });
    }

    /**
     * Show all toolboxes when exiting preview mode
     */
    public showAllToolboxes(): void {
        this.toolboxElements.forEach((toolbox) => {
            toolbox.style.display = 'block';
        });
    }
}