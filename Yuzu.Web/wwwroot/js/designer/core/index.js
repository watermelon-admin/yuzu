// Export the fully assembled Designer class
import { DesignerEvents } from './designer-events.js';
// Re-export as Designer for backward compatibility
export class Designer extends DesignerEvents {
}
// Also export the original class for those who want to access it
export { DesignerEvents };
//# sourceMappingURL=index.js.map