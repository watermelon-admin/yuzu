/**
 * Module: Editor
 * Main entry point for all editor functionality.
 */
// Import necessary modules
import { globals } from './globals.js';
import { updateButtonStatus, updateAppearanceControls } from './palette.js';
import { createDraggable, createResizable, removeInteraction } from './interaction.js';
import { handleKeyCommand } from './keys.js';
import { executeAction } from './actions.js';
import { initCanvas } from './canvas.js';
import { saveBreakType } from './storage.js';
import { WidgetStore } from './widgetstore.js';
// Initialize the widgets property
globals.widgets = new WidgetStore(globals);
/**
 * Exports public functions and constants for external use.
 */
export { handleWidgetElementClick, createDraggable, createResizable, removeInteraction, executeAction, saveBreakType };
initEditor();
const DRAGGABLE_SELECTOR = ".draggable"; // Selector for draggable elements
// Initialize draggable interactions for elements with 'draggable' class
createDraggable(DRAGGABLE_SELECTOR);
function initEditor() {
    // Init editor features
    initEventHandlers();
    initDebugging();
    initEditorCanvas();
    initEditorPalette();
    initEditorKeyboard();
    initScreen();
}
/**
 * Gets the current BreakType from the repo and initializes the screen
 */
function initScreen() {
    // Get the break id from the query string
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search);
    const breakId = params.get('id');
    fetchBreakType(breakId)
        .then(breakType => {
        if (breakType) {
            // Load widgets from JSON
            globals.widgets.deserialize(breakType.Components);
            // Set background
            setBackgroundImage(imageUrl, imageContainer, breakType.ImageFileName);
        }
    });
}
function initEventHandlers() {
    var _a, _b, _c;
    // Save the initial state of the form when the modal is shown
    (_a = document.getElementById('settingsModal')) === null || _a === void 0 ? void 0 : _a.addEventListener('shown.bs.modal', function () {
        globals.originalFormData = {};
        const inputs = document.querySelectorAll('#settingsForm input, #settingsForm textarea, #settingsForm select');
        inputs.forEach((input) => {
            const id = input.id;
            globals.originalFormData[id] = input.value;
        });
        globals.isDirty = false; // Reset the dirty flag when the form is loaded
    });
    // Set the dirty flag when the user changes any input
    document.querySelectorAll('#settingsForm input, #settingsForm textarea, #settingsForm select').forEach((input) => {
        input.addEventListener('change', () => globals.isDirty = true);
        input.addEventListener('input', () => globals.isDirty = true);
    });
    // Handle the Discard button click
    (_b = document.getElementById('discardButton')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', function () {
        if (globals.isDirty) {
            if (confirm("You have unsaved changes. Are you sure you want to discard them?")) {
                // Reset form to original state
                const inputs = document.querySelectorAll('#settingsForm input, #settingsForm textarea, #settingsForm select');
                inputs.forEach((input) => {
                    const id = input.id;
                    input.value = globals.originalFormData[id];
                });
                closeSettingsModal();
            }
        }
        else {
            closeSettingsModal();
        }
    });
    (_c = document.getElementById('saveButton')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', function (event) {
        const form = document.getElementById('settingsForm');
        // Ensure the form element is not null and validate it using jQuery's validation
        if (form) {
            // Access jQuery's validation method through `window['jQuery']` to avoid TypeScript errors
            const isValid = window['jQuery'](form).valid();
            if (isValid) {
                globals.isDirty = false;
                closeSettingsModal();
                saveBreakType();
            }
            else {
                console.log('Form is invalid, validation errors displayed.');
            }
        }
    });
}
function closeSettingsModal() {
    const modalElement = document.getElementById('settingsModal');
    const bootstrapModal = bootstrap.Modal.getInstance(modalElement); // Get the existing modal instance
    bootstrapModal === null || bootstrapModal === void 0 ? void 0 : bootstrapModal.hide();
}
/**
 * Sets the background image
 */
export function setBackgroundImage(imagesUrl, containerName, backgroundImage) {
    globals.backgroundImage = backgroundImage;
    const backgroundUrl = `${imagesUrl}/${containerName}/${backgroundImage}`;
    document.body.style.backgroundImage = `url(${backgroundUrl})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
}
/**
 * Initializes debugging features if enabled.
 */
function initDebugging() {
    if (globals.isDebugMode) {
        console.log('Debugging enabled.');
    }
    // Display debug info label if in debug mode
    const debugInfoLabel = document.getElementById('debugModeLabel');
    if (debugInfoLabel) {
        debugInfoLabel.style.display = globals.isDebugMode ? 'block' : 'none';
    }
}
/**
 * Initializes the editor palette.
 * This function is responsible for setting up the initial state of the editor palette.
 */
function initEditorPalette() {
    updateButtonStatus(); // Update button status in the palette
    updateAppearanceControls(); // Update appearance controls in the palette
    // Show the button with id 'show-preview'
    const showPreviewButton = document.getElementById('exitPreview');
    if (showPreviewButton) {
        showPreviewButton.style.display = 'none';
    }
    // Set interaction for tool widget elements
    const commandBox = document.getElementById('commandBox');
    if (commandBox)
        createDraggable(commandBox);
    const appearanceBox = document.getElementById('appearanceBox');
    if (appearanceBox)
        createDraggable(appearanceBox);
    const exitPreviewBox = document.getElementById('exitPreviewBox');
    if (exitPreviewBox)
        createDraggable(exitPreviewBox);
}
/**
 * Initializes the editor keyboard.
 * This function sets up an event listener for handling key press events in the editor.
 */
function initEditorKeyboard() {
    document.addEventListener('keydown', handleKeyPress); // Listen for keydown events
}
/**
 * Initializes the editor canvas.
 * This function is responsible for setting up the initial state of the editor canvas.
 */
function initEditorCanvas() {
    initCanvas(); // Initialize canvas for editor
}
/**
 * Handles key press events on the application.
 *
 * @param {KeyboardEvent} event - The keyboard event object.
 */
export function handleKeyPress(event) {
    handleKeyCommand(event); // Handle key commands based on the event
}
/**
 * Responds to click actions in the palette interface.
 *
 * @param {string} action - The specific action triggered by the click.
 */
export function handleButtonClick(action) {
    executeAction(action); // Execute the specified action
}
/**
 * Handles click events on widgets within the editor.
 *
 * @param {HTMLElement} element - The HTML element that was clicked.
 * @param {MouseEvent} event - The mouse event object.
 */
function handleWidgetElementClick(element, event) {
    console.debug('handleWidgetElementClick() called.');
    // Find the widget associated with the clicked element
    const targetWidget = globals.widgets.findWidgetByElement(element);
    // If the widget is not found, it is part of a group
    if (!targetWidget)
        return;
    console.debug('  isMoving = ' + targetWidget.isMoving);
    // Return early if the widget is part of a group and not a GroupWidget
    if (targetWidget.groupNumber > 0 && targetWidget.widgetType !== "GroupWidget") {
        return;
    }
    // Check if any widgets are selected
    const areWidgetsSelected = globals.widgets.getWidgetsBySelection().length > 0;
    // If the widget is not moving, handle the click event
    if (!targetWidget.isMoving) {
        handleWidgetSelection(event, targetWidget, areWidgetsSelected);
    }
    // Reset the isMoving flag after handling the click
    targetWidget.isMoving = false;
    // Update the button status and appearance controls
    updateButtonStatus();
    updateAppearanceControls();
}
/**
 * Handles widget selection based on shift key and current selection state.
 *
 * @param {MouseEvent} event - The mouse event object.
 * @param {any} targetWidget - The widget object being interacted with.
 * @param {boolean} areWidgetsSelected - Indicates if any widgets are currently selected.
 */
function handleWidgetSelection(event, targetWidget, areWidgetsSelected) {
    // Deselect all widgets if no widgets are selected and shift key is not pressed
    if (areWidgetsSelected && !event.shiftKey) {
        globals.widgets.deselectAllWidgets();
    }
    // Select the widget if it is not already selected
    globals.widgets.selectWidgets([targetWidget]);
}
/**
 * Handles double-click events on text widgets within the editor.
 *
 * @param {HTMLElement} element - The HTML element that was double-clicked.
 * @param {MouseEvent} event - The mouse event object.
 */
export function handleTextWidgetElementDoubleClick(element, event) {
    console.debug('handleTextWidgetElementDoubleClick() called!');
    // Simulate starting the edit action when double-clicking on a text widget
    executeAction('start_edit');
}
/**
 * Handles focus out events on text widgets within the editor.
 *
 * @param {HTMLElement} element - The HTML element that lost focus.
 * @param {MouseEvent} event - The mouse event object.
 */
export function handleTextWidgetElementFocusOut(element, event) {
    // Stop editing the text widget if it loses focus
    executeAction('stop_edit');
}
/**
 * Handles key down events on text widgets within the editor.
 *
 * @param {HTMLElement} element - The HTML element that was focused.
 * @param {KeyboardEvent} event - The keyboard event object.
 */
export function handleTextWidgetElementKeyDown(element, event) {
    // Stop editing the text widget if the Enter key is pressed
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        executeAction('stop_edit');
    }
}
/**
 * Displays the General Break Settings modal.
 *
 */
export function showSettingsModal() {
    // Show Settings Modal
    const settingsModalElement = document.getElementById('settingsModal');
    if (settingsModalElement) {
        const settingsModal = new bootstrap.Modal(settingsModalElement, {
            keyboard: true
        });
        settingsModal.show();
    }
}
function fetchBreakType(breakId) {
    return fetch(`/breaks/editor?handler=BreakType&breakId=${breakId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
        .then(response => response.json())
        .then(breakType => breakType)
        .catch(error => {
        console.error('Error fetching BreakType:', error);
        return null;
    });
}
//# sourceMappingURL=editor.js.map