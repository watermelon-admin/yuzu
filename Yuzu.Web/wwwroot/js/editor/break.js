/**
 * Module: Break
 * Main entry point for break screen functionality
 */
import { globals } from './globals.js';
import { WidgetStore } from './widgetstore.js';
import { initCanvas } from './canvas';
// Initialize the widgets property
globals.widgets = new WidgetStore(globals);
// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas using existing functionality
    initCanvas();
    // Initialize break screen
    initBreakScreen();
});
function initBreakScreen() {
    if (breakType) {
        console.log('Break type:', breakType);
        // Check if components exists
        if (breakType.Components) {
            // Load widgets from JSON
            globals.widgets.deserialize(breakType.Components);
            // Set all widgets to preview mode
            globals.widgets.enablePreviewMode(true);
        }
        else {
            console.warn('No components data found in break type');
        }
        // Set background
        setBackgroundImage(imageUrl, imageContainer, breakType.ImageFileName);
    }
}
/**
 * Sets the background image
 */
function setBackgroundImage(imagesUrl, containerName, backgroundImage) {
    if (!backgroundImage) {
        return;
    }
    const backgroundUrl = `${imagesUrl}/${containerName}/${backgroundImage}`;
    document.body.style.backgroundImage = `url(${backgroundUrl})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
}
//# sourceMappingURL=break.js.map