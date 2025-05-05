/**
* Module: Canvas
* Functionality for the canvas in the editor
*/
import { updateAppearanceControls } from './palette.js';
import { globals } from './globals.js';
import { updateButtonStatus } from './palette.js';
// Canvas drawing data
const canvas = {
    element: null,
    ctx: null,
    isMouseDown: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
};
// Init Canvas
export function initCanvas() {
    canvas.element = document.getElementById('canvasTarget');
    // Create canvas element
    canvas.element.style.position = 'absolute';
    canvas.element.width = window.innerWidth;
    canvas.element.height = window.innerHeight;
    canvas.element.style.zIndex = 'auto';
    canvas.ctx = canvas.element.getContext('2d');
    // Event listener for mouse down
    canvas.element.addEventListener('mousedown', (event) => {
        canvas.isMouseDown = true;
        canvas.startX = event.clientX - canvas.element.offsetLeft;
        canvas.startY = event.clientY - canvas.element.offsetTop;
        // Temporarily bring canvas to the front for drawing the selection rectangle
        canvas.element.style.zIndex = '2147483647'; // Max Z-Index value
    });
    // Event listener for mouse move
    canvas.element.addEventListener('mousemove', (event) => {
        if (canvas.isMouseDown) {
            canvas.endX = event.clientX - canvas.element.offsetLeft;
            canvas.endY = event.clientY - canvas.element.offsetTop;
            drawRectangle();
        }
    });
    // Event listener for mouse up
    canvas.element.addEventListener('mouseup', (event) => {
        canvas.isMouseDown = false;
        canvas.ctx.clearRect(0, 0, canvas.element.width, canvas.element.height);
        // Select all widgets that are completely within the selection rectangle
        globals.widgets.selectWidgetsByRectangle(canvas.startX, canvas.startY, canvas.endX, canvas.endY);
        // Send canvas to the back after the selection rectangle has gone
        // If we don't do that the canvas will intercept all events
        canvas.element.style.zIndex = 'auto';
        updateButtonStatus();
        updateAppearanceControls();
    });
    // Function to draw rectangle on canvas
    function drawRectangle() {
        canvas.ctx.clearRect(0, 0, canvas.element.width, canvas.element.height);
        canvas.ctx.setLineDash([5, 5]);
        canvas.ctx.strokeStyle = '#000';
        canvas.ctx.strokeRect(canvas.startX, canvas.startY, canvas.endX - canvas.startX, canvas.endY - canvas.startY);
    }
}
//# sourceMappingURL=canvas.js.map