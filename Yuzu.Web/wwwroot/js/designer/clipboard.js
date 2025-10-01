import { WidgetType } from './types.js';
export class Clipboard {
    /**
     * Private constructor to enforce singleton pattern.
     * @param onClipboardChange - Callback function to be called when the clipboard content changes.
     */
    constructor(onClipboardChange = () => { }) {
        this.items = [];
        this.onClipboardChange = onClipboardChange;
        this.registerKeyboardShortcuts();
    }
    /**
     * Gets the singleton instance of the Clipboard.
     * @param onClipboardChange - Optional callback function to be called when the clipboard content changes.
     * @returns The singleton instance of the Clipboard.
     */
    static getInstance(onClipboardChange) {
        if (!Clipboard.instance) {
            Clipboard.instance = new Clipboard(onClipboardChange);
        }
        return Clipboard.instance;
    }
    /**
     * Copies the provided items to the clipboard.
     * @param items - The items to be copied to the clipboard.
     */
    copy(items) {
        // Deep clone the items to avoid reference issues
        this.items = items.map(item => JSON.parse(JSON.stringify(item)));
        this.onClipboardChange();
    }
    /**
     * Cuts the provided items to the clipboard.
     * This method copies the items to the clipboard and expects the actual deletion to be handled by the designer.
     * @param items - The items to be cut to the clipboard.
     */
    cut(items) {
        this.copy(items);
        // The actual deletion will be handled by the designer
    }
    /**
     * Pastes the items from the clipboard.
     * Creates new IDs for the pasted items to avoid duplicates and offsets their positions slightly.
     * @returns The pasted items with new IDs and positions.
     */
    paste() {
        if (this.isEmpty()) {
            return [];
        }
        // Create new IDs for the pasted items to avoid duplicates
        const currentTime = Date.now();
        const offset = { x: 20, y: 20 }; // Offset for pasted items
        // Create an ID mapping table for group widgets
        const idMapping = new Map();
        // First pass: Generate new IDs and create the mapping
        const newItems = this.items.map(item => {
            const newId = `widget-${currentTime}-${Math.floor(Math.random() * 1000)}`;
            idMapping.set(item.id, newId);
            return Object.assign(Object.assign({}, JSON.parse(JSON.stringify(item))), { id: newId, position: {
                    x: item.position.x + offset.x,
                    y: item.position.y + offset.y
                } });
        });
        // Second pass: Update group references using the mapping
        return newItems.map(item => {
            // If this is a group widget, update child IDs using the mapping
            if (item.type === WidgetType.Group && item.properties) {
                const groupProps = item.properties;
                if (groupProps.childIds) {
                    // Map old child IDs to new child IDs
                    const newChildIds = groupProps.childIds
                        .map(oldId => idMapping.get(oldId) || oldId)
                        .filter(id => id !== undefined);
                    // Update the properties
                    item.properties = Object.assign(Object.assign({}, item.properties), { childIds: newChildIds });
                }
            }
            return item;
        });
    }
    /**
     * Checks if the clipboard is empty.
     * @returns True if the clipboard is empty, false otherwise.
     */
    isEmpty() {
        return this.items.length === 0;
    }
    /**
     * Gets the number of items in the clipboard.
     * @returns The number of items in the clipboard.
     */
    getItemCount() {
        return this.items.length;
    }
    /**
     * Registers keyboard shortcuts for clipboard operations.
     * This method is intended to be connected to the designer's keyboard handler.
     */
    registerKeyboardShortcuts() {
        // This will be connected to the designer's keyboard handler
    }
}
// Export a factory function to get the singleton instance
export function getClipboard(onClipboardChange) {
    return Clipboard.getInstance(onClipboardChange);
}
//# sourceMappingURL=clipboard.js.map