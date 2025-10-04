import { WidgetType } from './types.js';
import { BoxWidget } from './widgets/box-widget.js';
import { QRWidget } from './widgets/qr-widget.js';
import { TextWidget } from './widgets/text-widget.js';
import { GroupWidget } from './widgets/group-widget.js';
/**
 * Manages the properties toolbox for editing widget properties.
 */
export class PropertiesManager {
    /**
     * Creates an instance of PropertiesManager.
     * @param canvasElement - The canvas element where the toolbox will be placed.
     * @param onPropertyChange - Callback function to be called when properties change.
     */
    constructor(canvasElement, onPropertyChange = () => { }) {
        this.selectedWidgets = [];
        // Flag to prevent feedback loops when updating properties
        this.isUpdatingControls = false;
        this.onPropertyChange = onPropertyChange;
        // Find the properties toolbox
        this.propertiesToolbox = document.querySelector('.properties-toolbar');
        if (!this.propertiesToolbox) {
            throw new Error('Properties toolbox not found');
        }
        // Move the toolbox to the canvas
        if (this.propertiesToolbox.parentElement) {
            this.propertiesToolbox.parentElement.removeChild(this.propertiesToolbox);
        }
        canvasElement.appendChild(this.propertiesToolbox);
        // Set initial position - position at the right side
        this.propertiesToolbox.style.top = '20px';
        this.propertiesToolbox.style.right = '20px';
        // Initialize controls
        this.initializeControls();
        // Make the toolbox draggable
        this.makeToolboxDraggable();
        // Prevent deselection of widgets when clicking on properties toolbox
        // Need to handle both mousedown and pointerdown since the canvas listens for pointerdown events
        this.propertiesToolbox.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        this.propertiesToolbox.addEventListener('pointerdown', (e) => {
            // Stop propagation to prevent canvas from handling this event
            // This is critical - without this, clicking controls causes the canvas to deselect widgets
            e.stopPropagation();
        });
        // Listen for widget update events
        document.addEventListener('qr-widget-resize', (e) => {
            // If the resized widget is one of our selected widgets, update the controls
            if (this.selectedWidgets.some(widget => widget.getId() === e.detail.id)) {
                this.updatePropertiesDisplay();
            }
        });
        // Listen for widget position updates
        document.addEventListener('widget-position-update', (e) => {
            // If the updated widget is one of our selected widgets, update the controls
            if (this.selectedWidgets.some(widget => widget.getId() === e.detail.id)) {
                this.updatePropertiesDisplay();
            }
        });
        // Listen for widget size updates
        document.addEventListener('widget-size-update', (e) => {
            // If the updated widget is one of our selected widgets, update the controls
            if (this.selectedWidgets.some(widget => widget.getId() === e.detail.id)) {
                this.updatePropertiesDisplay();
            }
        });
        // Listen for direct text editing updates
        document.addEventListener('widget-text-update', (e) => {
            // If the updated widget is one of our selected widgets, update just the text input
            if (this.selectedWidgets.some(widget => widget.getId() === e.detail.id)) {
                // Update the text input without triggering change events
                this.isUpdatingControls = true;
                this.textInput.value = e.detail.text;
                this.isUpdatingControls = false;
            }
        });
    }
    /**
     * Initializes all property controls.
     */
    initializeControls() {
        // Position controls
        this.positionXInput = document.getElementById('position-x');
        this.positionYInput = document.getElementById('position-y');
        // Dimension controls
        this.dimensionWInput = document.getElementById('dimension-w');
        this.dimensionHInput = document.getElementById('dimension-h');
        // Text input control
        this.textInput = document.getElementById('box-text');
        // Text style controls
        this.boldButton = document.getElementById('btn-text-bold');
        this.italicButton = document.getElementById('btn-text-italic');
        this.underlineButton = document.getElementById('btn-text-underline');
        this.strikethroughButton = document.getElementById('btn-text-strikethrough');
        // Text alignment controls
        this.alignLeftButton = document.getElementById('btn-text-left');
        this.alignCenterButton = document.getElementById('btn-text-center');
        this.alignRightButton = document.getElementById('btn-text-right');
        // Font controls
        this.fontFamilySelect = document.getElementById('font-family');
        this.textSizeRange = document.getElementById('text-size-range');
        this.textSizeDisplay = document.getElementById('text-size-display');
        // Color controls
        this.colorPicker = document.getElementById('color-picker');
        this.colorHexInput = document.getElementById('color-hex');
        // Corner radius control
        this.cornerRadiusRange = document.getElementById('corner-radius-range');
        this.cornerRadiusDisplay = document.getElementById('corner-radius-display');
        // Initialize range control min/max values
        this.textSizeRange.min = "8";
        this.textSizeRange.max = "360";
        this.textSizeRange.step = "1";
        this.textSizeRange.value = "12";
        this.cornerRadiusRange.min = "0";
        this.cornerRadiusRange.max = "50";
        this.cornerRadiusRange.step = "1";
        this.cornerRadiusRange.value = "0";
        // Add event listeners
        this.setupEventListeners();
        // Initially disable all controls until selection is made
        this.disableAllControls();
    }
    /**
     * Sets up event listeners for all property controls.
     */
    setupEventListeners() {
        // Position controls
        this.positionXInput.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const x = parseFloat(this.positionXInput.value);
            if (!isNaN(x)) {
                for (const widget of this.selectedWidgets) {
                    const position = Object.assign(Object.assign({}, widget.getData().position), { x });
                    widget.setPosition(position);
                }
                this.onPropertyChange();
            }
        });
        this.positionXInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.positionXInput.blur();
            }
        });
        this.positionYInput.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const y = parseFloat(this.positionYInput.value);
            if (!isNaN(y)) {
                for (const widget of this.selectedWidgets) {
                    const position = Object.assign(Object.assign({}, widget.getData().position), { y });
                    widget.setPosition(position);
                }
                this.onPropertyChange();
            }
        });
        this.positionYInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.positionYInput.blur();
            }
        });
        // Dimension controls
        this.dimensionWInput.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const width = parseFloat(this.dimensionWInput.value);
            if (!isNaN(width)) {
                const hasQRWidget = this.selectedWidgets.some(widget => widget instanceof QRWidget);
                for (const widget of this.selectedWidgets) {
                    if (widget instanceof QRWidget) {
                        // For QR widgets, set both width and height to maintain square
                        widget.setSize({ width, height: width });
                    }
                    else {
                        // For other widgets, just set the width
                        const size = Object.assign(Object.assign({}, widget.getData().size), { width });
                        widget.setSize(size);
                    }
                }
                // If we have a QR widget in the selection, update the height input to match
                if (hasQRWidget) {
                    this.isUpdatingControls = true;
                    this.dimensionHInput.value = width.toString();
                    this.isUpdatingControls = false;
                }
                this.onPropertyChange();
            }
        });
        this.dimensionWInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.dimensionWInput.blur();
            }
        });
        this.dimensionHInput.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const height = parseFloat(this.dimensionHInput.value);
            if (!isNaN(height)) {
                const hasQRWidget = this.selectedWidgets.some(widget => widget instanceof QRWidget);
                for (const widget of this.selectedWidgets) {
                    if (widget instanceof QRWidget) {
                        // For QR widgets, set both width and height to maintain square
                        widget.setSize({ width: height, height });
                    }
                    else {
                        // For other widgets, just set the height
                        const size = Object.assign(Object.assign({}, widget.getData().size), { height });
                        widget.setSize(size);
                    }
                }
                // If we have a QR widget in the selection, update the width input to match
                if (hasQRWidget) {
                    this.isUpdatingControls = true;
                    this.dimensionWInput.value = height.toString();
                    this.isUpdatingControls = false;
                }
                this.onPropertyChange();
            }
        });
        this.dimensionHInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.dimensionHInput.blur();
            }
        });
        // Text input control
        this.textInput.addEventListener('input', () => {
            if (this.isUpdatingControls)
                return;
            const text = this.textInput.value;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setText(text);
                }
            }
            this.onPropertyChange();
        });
        // Text style controls
        this.boldButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const isBold = this.boldButton.checked;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setFontWeight(isBold);
                }
            }
            this.onPropertyChange();
        });
        this.italicButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const isItalic = this.italicButton.checked;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setFontStyle(isItalic);
                }
            }
            this.onPropertyChange();
        });
        this.underlineButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const isUnderlined = this.underlineButton.checked;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setTextDecoration(isUnderlined ? 'underline' : 'none');
                    // Uncheck the strikethrough if underline is checked
                    if (isUnderlined && this.strikethroughButton.checked) {
                        this.isUpdatingControls = true;
                        this.strikethroughButton.checked = false;
                        this.isUpdatingControls = false;
                    }
                }
            }
            this.onPropertyChange();
        });
        this.strikethroughButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const isStrikethrough = this.strikethroughButton.checked;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setTextDecoration(isStrikethrough ? 'line-through' : 'none');
                    // Uncheck the underline if strikethrough is checked
                    if (isStrikethrough && this.underlineButton.checked) {
                        this.isUpdatingControls = true;
                        this.underlineButton.checked = false;
                        this.isUpdatingControls = false;
                    }
                }
            }
            this.onPropertyChange();
        });
        // Text alignment controls
        this.alignLeftButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            if (this.alignLeftButton.checked) {
                for (const widget of this.selectedWidgets) {
                    if (widget instanceof TextWidget) {
                        widget.setTextAlign('left');
                    }
                }
                this.onPropertyChange();
            }
        });
        this.alignCenterButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            if (this.alignCenterButton.checked) {
                for (const widget of this.selectedWidgets) {
                    if (widget instanceof TextWidget) {
                        widget.setTextAlign('center');
                    }
                }
                this.onPropertyChange();
            }
        });
        this.alignRightButton.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            if (this.alignRightButton.checked) {
                for (const widget of this.selectedWidgets) {
                    if (widget instanceof TextWidget) {
                        widget.setTextAlign('right');
                    }
                }
                this.onPropertyChange();
            }
        });
        // Font controls
        this.fontFamilySelect.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            const fontFamily = this.fontFamilySelect.value;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setFontFamily(fontFamily);
                }
            }
            this.onPropertyChange();
        });
        this.textSizeRange.addEventListener('input', () => {
            if (this.isUpdatingControls)
                return;
            const fontSize = parseInt(this.textSizeRange.value);
            this.textSizeDisplay.textContent = `${fontSize}px`;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof TextWidget) {
                    widget.setFontSize(fontSize);
                }
            }
            this.onPropertyChange();
        });
        // Color controls
        this.colorPicker.addEventListener('input', () => {
            if (this.isUpdatingControls)
                return;
            const color = this.colorPicker.value;
            // Update the hex input to match the picker
            this.isUpdatingControls = true;
            this.colorHexInput.value = color.substring(1);
            this.isUpdatingControls = false;
            // Apply color to all applicable widgets
            this.applyColorToWidgets(color);
            this.onPropertyChange();
        });
        this.colorHexInput.addEventListener('change', () => {
            if (this.isUpdatingControls)
                return;
            let hexValue = this.colorHexInput.value;
            // Add # if it's missing
            if (!hexValue.startsWith('#')) {
                hexValue = '#' + hexValue;
            }
            // Validate hex color
            if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
                // Update the color picker to match
                this.isUpdatingControls = true;
                this.colorPicker.value = hexValue;
                this.isUpdatingControls = false;
                // Apply color to all applicable widgets
                this.applyColorToWidgets(hexValue);
                this.onPropertyChange();
            }
        });
        // Corner radius control
        this.cornerRadiusRange.addEventListener('input', () => {
            if (this.isUpdatingControls)
                return;
            const radius = parseInt(this.cornerRadiusRange.value);
            this.cornerRadiusDisplay.textContent = `${radius}px`;
            for (const widget of this.selectedWidgets) {
                if (widget instanceof BoxWidget) {
                    widget.setBorderRadius(radius);
                }
            }
            this.onPropertyChange();
        });
    }
    /**
     * Applies color to appropriate widgets based on their type.
     * @param color - The color to apply.
     */
    applyColorToWidgets(color) {
        for (const widget of this.selectedWidgets) {
            if (widget instanceof BoxWidget) {
                widget.setBackgroundColor(color);
            }
            else if (widget instanceof TextWidget) {
                widget.setFontColor(color);
            }
        }
    }
    /**
     * Makes the toolbox draggable.
     */
    makeToolboxDraggable() {
        const handle = this.propertiesToolbox.querySelector('.toolbox-handle');
        if (!handle)
            return;
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.propertiesToolbox.classList.add('toolbox-dragging');
            // Calculate the offset from the mouse to the toolbox corner
            const rect = this.propertiesToolbox.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging)
                return;
            // Calculate new position
            const parentRect = this.propertiesToolbox.parentElement.getBoundingClientRect();
            let left = e.clientX - parentRect.left - offsetX;
            let top = e.clientY - parentRect.top - offsetY;
            // Keep toolbox within parent bounds
            left = Math.max(0, Math.min(left, parentRect.width - this.propertiesToolbox.offsetWidth));
            top = Math.max(0, Math.min(top, parentRect.height - this.propertiesToolbox.offsetHeight));
            this.propertiesToolbox.style.left = `${left}px`;
            this.propertiesToolbox.style.top = `${top}px`;
            this.propertiesToolbox.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.propertiesToolbox.classList.remove('toolbox-dragging');
            }
        });
    }
    /**
     * Sets the selected widgets and updates the properties toolbox.
     * @param widgets - Array of selected widgets.
     */
    setSelectedWidgets(widgets) {
        // Filter out widgets that are part of a group
        const nonGroupedWidgets = widgets.filter(widget => !widget.getElement().classList.contains('in-group'));
        // Check if selection contains any groups
        const hasGroupWidgets = widgets.some(widget => widget.getData().type === WidgetType.Group);
        // If the selection contains groups and other widgets, filter out any widgets contained in selected groups
        let filteredWidgets = nonGroupedWidgets;
        if (hasGroupWidgets) {
            // Get all child IDs from all selected group widgets
            const groupChildIds = new Set();
            widgets.forEach(widget => {
                if (widget instanceof GroupWidget) {
                    widget.getChildIds().forEach(id => groupChildIds.add(id));
                }
            });
            // Filter out widgets that are children of any selected groups
            filteredWidgets = nonGroupedWidgets.filter(widget => !groupChildIds.has(widget.getId()));
        }
        // Store the filtered widgets
        this.selectedWidgets = [...filteredWidgets];
        if (this.selectedWidgets.length === 0) {
            this.disableAllControls();
        }
        else {
            this.updatePropertiesDisplay();
        }
    }
    /**
     * Updates the properties display based on the current selection.
     */
    updatePropertiesDisplay() {
        this.isUpdatingControls = true;
        try {
            // Enable/disable controls based on the widget types in the selection
            this.updateControlAvailability();
            // Update position controls
            this.updatePositionControls();
            // Update dimension controls
            this.updateDimensionControls();
            // Update font controls
            this.updateFontControls();
            // Update color controls
            this.updateColorControls();
            // Update corner radius controls
            this.updateCornerRadiusControls();
        }
        finally {
            this.isUpdatingControls = false;
        }
    }
    /**
     * Enables or disables controls based on the current selection.
     */
    updateControlAvailability() {
        if (this.selectedWidgets.length === 0) {
            this.disableAllControls();
            return;
        }
        // Position and dimension controls are always enabled for any selection
        this.positionXInput.disabled = false;
        this.positionYInput.disabled = false;
        this.dimensionWInput.disabled = false;
        this.dimensionHInput.disabled = false;
        // Check for text widgets in the selection
        const hasTextWidget = this.selectedWidgets.some(widget => widget instanceof TextWidget);
        this.textInput.disabled = !hasTextWidget;
        // Text style controls
        this.boldButton.disabled = !hasTextWidget;
        this.italicButton.disabled = !hasTextWidget;
        this.underlineButton.disabled = !hasTextWidget;
        this.strikethroughButton.disabled = !hasTextWidget;
        // Text alignment controls
        this.alignLeftButton.disabled = !hasTextWidget;
        this.alignCenterButton.disabled = !hasTextWidget;
        this.alignRightButton.disabled = !hasTextWidget;
        // Font controls
        this.fontFamilySelect.disabled = !hasTextWidget;
        this.textSizeRange.disabled = !hasTextWidget;
        // Check for box widgets in the selection
        const hasBoxWidget = this.selectedWidgets.some(widget => widget instanceof BoxWidget);
        this.cornerRadiusRange.disabled = !hasBoxWidget;
        // Enable color control if there are box or text widgets
        const hasColorableWidget = this.selectedWidgets.some(widget => widget instanceof BoxWidget || widget instanceof TextWidget);
        this.colorPicker.disabled = !hasColorableWidget;
        this.colorHexInput.disabled = !hasColorableWidget;
    }
    /**
     * Updates position controls based on current selection.
     */
    updatePositionControls() {
        if (this.selectedWidgets.length === 0)
            return;
        // Check if all widgets have the same x-coordinate
        const firstX = this.selectedWidgets[0].getData().position.x;
        const allSameX = this.selectedWidgets.every(widget => widget.getData().position.x === firstX);
        // Check if all widgets have the same y-coordinate
        const firstY = this.selectedWidgets[0].getData().position.y;
        const allSameY = this.selectedWidgets.every(widget => widget.getData().position.y === firstY);
        // Update x-coordinate input
        if (allSameX) {
            this.positionXInput.value = firstX.toString();
        }
        else {
            this.positionXInput.value = '';
        }
        // Update y-coordinate input
        if (allSameY) {
            this.positionYInput.value = firstY.toString();
        }
        else {
            this.positionYInput.value = '';
        }
    }
    /**
     * Updates dimension controls based on current selection.
     */
    updateDimensionControls() {
        if (this.selectedWidgets.length === 0)
            return;
        // Check if all widgets have the same width
        const firstWidth = this.selectedWidgets[0].getData().size.width;
        const allSameWidth = this.selectedWidgets.every(widget => widget.getData().size.width === firstWidth);
        // Check if all widgets have the same height
        const firstHeight = this.selectedWidgets[0].getData().size.height;
        const allSameHeight = this.selectedWidgets.every(widget => widget.getData().size.height === firstHeight);
        // Update width input
        if (allSameWidth) {
            this.dimensionWInput.value = firstWidth.toString();
        }
        else {
            this.dimensionWInput.value = '';
        }
        // Update height input
        if (allSameHeight) {
            this.dimensionHInput.value = firstHeight.toString();
        }
        else {
            this.dimensionHInput.value = '';
        }
    }
    /**
     * Updates font controls based on current selection.
     */
    updateFontControls() {
        // Filter to get only text widgets
        const textWidgets = this.selectedWidgets.filter(widget => widget instanceof TextWidget);
        if (textWidgets.length === 0) {
            // No text widgets in selection, leave controls in default state
            return;
        }
        // Check if all text widgets have the same text content
        const firstText = textWidgets[0].getData().properties.text;
        const allSameText = textWidgets.every(widget => widget.getData().properties.text === firstText);
        // Update text input
        if (allSameText) {
            this.textInput.value = firstText;
        }
        else {
            // Mixed text content
            this.textInput.value = '';
            this.textInput.placeholder = 'Mixed';
        }
        // Check if all text widgets have the same font family
        const firstFontFamily = textWidgets[0].getData().properties.fontFamily;
        const allSameFontFamily = textWidgets.every(widget => widget.getData().properties.fontFamily === firstFontFamily);
        // Update font family select
        if (allSameFontFamily) {
            this.fontFamilySelect.value = firstFontFamily;
        }
        else {
            // For dropdown, we can't show "Mixed" placeholder, so just select the first option
            this.fontFamilySelect.selectedIndex = 0;
        }
        // Check if all text widgets have the same font size
        const firstFontSize = textWidgets[0].getData().properties.fontSize;
        const allSameFontSize = textWidgets.every(widget => widget.getData().properties.fontSize === firstFontSize);
        // Update font size controls
        if (allSameFontSize) {
            this.textSizeRange.value = firstFontSize.toString();
            this.textSizeDisplay.textContent = `${firstFontSize}px`;
        }
        else {
            // For range input, set to average value but display empty
            const avgFontSize = Math.round(textWidgets.reduce((sum, widget) => sum + widget.getData().properties.fontSize, 0) / textWidgets.length);
            this.textSizeRange.value = avgFontSize.toString();
            this.textSizeDisplay.textContent = ``;
        }
        // Check for text styles
        // Bold
        const firstIsBold = textWidgets[0].getData().properties.fontWeight === 'bold';
        const allSameBold = textWidgets.every(widget => widget.getData().properties.fontWeight === (firstIsBold ? 'bold' : 'normal'));
        if (allSameBold) {
            this.boldButton.checked = firstIsBold;
        }
        else {
            // For checkbox, leave unchecked for mixed state
            this.boldButton.checked = false;
        }
        // Italic
        const firstIsItalic = textWidgets[0].getData().properties.fontStyle === 'italic';
        const allSameItalic = textWidgets.every(widget => widget.getData().properties.fontStyle === (firstIsItalic ? 'italic' : 'normal'));
        if (allSameItalic) {
            this.italicButton.checked = firstIsItalic;
        }
        else {
            // For checkbox, leave unchecked for mixed state
            this.italicButton.checked = false;
        }
        // Text decoration (underline/strikethrough)
        const firstDecoration = textWidgets[0].getData().properties.textDecoration;
        const allSameDecoration = textWidgets.every(widget => widget.getData().properties.textDecoration === firstDecoration);
        if (allSameDecoration) {
            this.underlineButton.checked = firstDecoration === 'underline';
            this.strikethroughButton.checked = firstDecoration === 'line-through';
        }
        else {
            // For checkbox, leave unchecked for mixed state
            this.underlineButton.checked = false;
            this.strikethroughButton.checked = false;
        }
        // Text alignment
        const firstAlignment = textWidgets[0].getData().properties.textAlign || 'left';
        const allSameAlignment = textWidgets.every(widget => widget.getData().properties.textAlign === firstAlignment);
        // Reset all alignment buttons
        this.isUpdatingControls = true;
        this.alignLeftButton.checked = false;
        this.alignCenterButton.checked = false;
        this.alignRightButton.checked = false;
        if (allSameAlignment) {
            // Set the appropriate alignment button
            if (firstAlignment === 'left') {
                this.alignLeftButton.checked = true;
            }
            else if (firstAlignment === 'center') {
                this.alignCenterButton.checked = true;
            }
            else if (firstAlignment === 'right') {
                this.alignRightButton.checked = true;
            }
        }
        this.isUpdatingControls = false;
    }
    /**
     * Updates color controls based on current selection.
     */
    updateColorControls() {
        // Determine if we should use text color or box color
        const boxWidgets = this.selectedWidgets.filter(widget => widget instanceof BoxWidget);
        const textWidgets = this.selectedWidgets.filter(widget => widget instanceof TextWidget);
        let color = '';
        let allSameColor = false;
        // First check box widgets (they have priority if both types are selected)
        if (boxWidgets.length > 0) {
            const firstColor = boxWidgets[0].getData().properties.backgroundColor;
            allSameColor = boxWidgets.every(widget => widget.getData().properties.backgroundColor === firstColor);
            if (allSameColor) {
                color = firstColor;
            }
        }
        // Then check text widgets if no box widgets or they don't have same color
        else if (textWidgets.length > 0) {
            const firstColor = textWidgets[0].getData().properties.fontColor;
            allSameColor = textWidgets.every(widget => widget.getData().properties.fontColor === firstColor);
            if (allSameColor) {
                color = firstColor;
            }
        }
        // Update color controls
        if (allSameColor && color) {
            this.colorPicker.value = color;
            this.colorHexInput.value = color.substring(1); // Remove # prefix
        }
        else if (boxWidgets.length > 0 || textWidgets.length > 0) {
            // Mixed colors - set a reasonable default color in the picker
            // but show empty hex input
            this.colorHexInput.value = '';
        }
    }
    /**
     * Updates corner radius controls based on current selection.
     */
    updateCornerRadiusControls() {
        // Filter to get only box widgets
        const boxWidgets = this.selectedWidgets.filter(widget => widget instanceof BoxWidget);
        if (boxWidgets.length === 0) {
            // No box widgets in selection, leave control in default state
            return;
        }
        // Check if all box widgets have the same corner radius
        const firstRadius = boxWidgets[0].getData().properties.borderRadius;
        const allSameRadius = boxWidgets.every(widget => widget.getData().properties.borderRadius === firstRadius);
        // Update corner radius controls
        if (allSameRadius) {
            this.cornerRadiusRange.value = firstRadius.toString();
            this.cornerRadiusDisplay.textContent = `${firstRadius}px`;
        }
        else {
            // For range input, set to average value but display empty
            const avgRadius = Math.round(boxWidgets.reduce((sum, widget) => sum + widget.getData().properties.borderRadius, 0) / boxWidgets.length);
            this.cornerRadiusRange.value = avgRadius.toString();
            this.cornerRadiusDisplay.textContent = '';
        }
    }
    /**
     * Disables all property controls and clears their values.
     */
    disableAllControls() {
        // Disable all inputs
        this.positionXInput.disabled = true;
        this.positionYInput.disabled = true;
        this.dimensionWInput.disabled = true;
        this.dimensionHInput.disabled = true;
        this.textInput.disabled = true;
        // Text style controls
        this.boldButton.disabled = true;
        this.italicButton.disabled = true;
        this.underlineButton.disabled = true;
        this.strikethroughButton.disabled = true;
        // Text alignment controls
        this.alignLeftButton.disabled = true;
        this.alignCenterButton.disabled = true;
        this.alignRightButton.disabled = true;
        // Font controls
        this.fontFamilySelect.disabled = true;
        this.textSizeRange.disabled = true;
        this.colorPicker.disabled = true;
        this.colorHexInput.disabled = true;
        this.cornerRadiusRange.disabled = true;
        // Clear values
        this.positionXInput.value = '';
        this.positionYInput.value = '';
        this.dimensionWInput.value = '';
        this.dimensionHInput.value = '';
        this.textInput.value = '';
        this.colorHexInput.value = '';
        // Reset style checkboxes
        this.boldButton.checked = false;
        this.italicButton.checked = false;
        this.underlineButton.checked = false;
        this.strikethroughButton.checked = false;
        // Reset alignment radio buttons
        this.alignLeftButton.checked = false;
        this.alignCenterButton.checked = false;
        this.alignRightButton.checked = false;
        // Reset displays to default values
        this.textSizeDisplay.textContent = '12px';
        this.cornerRadiusDisplay.textContent = '0px';
    }
    /**
     * Resets the position of the properties toolbox.
     */
    resetPosition() {
        this.propertiesToolbox.style.top = '20px';
        this.propertiesToolbox.style.right = '20px';
        this.propertiesToolbox.style.left = 'auto';
    }
    /**
     * Maintains backward compatibility with existing code.
     * @param widget - Single widget to select, or null to clear selection.
     */
    setSelectedWidget(widget) {
        if (widget) {
            this.setSelectedWidgets([widget]);
        }
        else {
            this.setSelectedWidgets([]);
        }
    }
    /**
     * Hide the properties panel for preview mode
     */
    hidePropertiesPanel() {
        this.propertiesToolbox.style.display = 'none';
    }
    /**
     * Show the properties panel when exiting preview mode
     */
    showPropertiesPanel() {
        this.propertiesToolbox.style.display = 'block';
    }
}
//# sourceMappingURL=properties-manager.js.map