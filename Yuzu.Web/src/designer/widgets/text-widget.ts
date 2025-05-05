import { Widget } from '../widget.js';
import { WidgetData, WidgetType, TextWidgetProperties } from '../types.js';
import { createExampleReplacement, replacePlaceholders, ReplaceResult } from '../core/placeholders.js';
import { WidgetLoggerType } from '../core/designer-events.js';
import { safeLogger } from '../core/logger-utils.js';

/**
 * Represents a text widget in the designer.
 * Contains editable text with customizable font properties.
 */
export class TextWidget extends Widget {
    private isEditing: boolean = false;
    private isPreviewMode: boolean = false;
    private textEditorElement: HTMLTextAreaElement | null = null;
    private originalText: string = '';
    private errorTooltip: HTMLElement | null = null;
    private errorIcon: HTMLElement | null = null;
    private showErrorTooltip: (() => void) | null = null;
    private hideErrorTooltip: (() => void) | null = null;
    
    /**
     * Creates an instance of TextWidget.
     * @param data - The data for the widget.
     */
    constructor(data: WidgetData) {
        // Ensure the type is set correctly
        data.type = WidgetType.Text;
        
        // Initialize default properties if not provided
        if (!data.properties) {
            data.properties = {
                text: 'I am a Text Widget. Edit me!',
                fontFamily: 'Arial',
                fontSize: 16,
                fontColor: '#000000',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                hasPlaceholders: false,
                showRawPlaceholders: false
            } as TextWidgetProperties;
        }
        
        super(data);
        
        // Setup double click handler for text editing
        this.setupTextEditing();
        
        // Check for placeholders in initial text
        // This will validate but not show errors
        this.checkForPlaceholders();
    }
    
    /**
     * Override the base setPreviewMode method to handle TextWidget specific preview mode
     * @param previewMode - Whether to enable or disable preview mode
     */
    public override setPreviewMode(previewMode: boolean): void {
        // Call the base implementation first
        super.setPreviewMode(previewMode);
        
        // Store the preview mode state locally
        this.isPreviewMode = previewMode;
        
        // Update content to show either raw text or text with placeholders replaced
        const properties = this.data.properties as TextWidgetProperties;
        
        if (previewMode) {
            // In preview mode:
            
            // Only add error outline for widgets with errors in preview mode
            const hasError = properties.hasPlaceholders && properties.placeholderError;
            if (hasError) {
                // For error cases, use important to override any CSS rules
                this.element.style.setProperty('outline', '2px solid red', 'important');
                this.element.style.setProperty('outline-offset', '-1px', 'important');
                
                // Make sure all border properties are cleared to avoid any issues
                this.element.style.setProperty('border', '0', 'important');
                this.element.style.setProperty('border-width', '0', 'important');
                this.element.style.setProperty('border-style', 'none', 'important');
                this.element.style.setProperty('border-color', 'transparent', 'important');
            }
        }
        
        // Immediately update the display to show proper text
        // This ensures placeholder replacements take effect right away
        this.updateDomFromData();
    }
    
    /**
     * Checks if the text content contains placeholders and validates them.
     * Updates properties.hasPlaceholders and properties.placeholderError.
     */
    private checkForPlaceholders(): void {
        const properties = this.data.properties as TextWidgetProperties;
        if (!properties || !properties.text) return;
        
        // First, check if the text might contain any placeholder syntax (complete or incomplete)
        // This detects both '{' and '}' characters that might be part of placeholders
        const hasPotentialPlaceholders = (properties.text.includes('{') || properties.text.includes('}'));
        
        // Run the validation regardless if there are any potential placeholder markers
        if (hasPotentialPlaceholders) {
            // Look for complete placeholders with the standard pattern
            const hasCompletePlaceholders = /\{[\w-]+\}/.test(properties.text);
            
            // Also check for incomplete placeholder patterns
            const hasOpeningBracketOnly = /\{[\w-]*(?!\})/.test(properties.text);
            const hasClosingBracketOnly = /[^\{][\w-]*\}/.test(properties.text);
            
            // Set hasPlaceholders based on any placeholder-like syntax
            properties.hasPlaceholders = hasCompletePlaceholders || hasOpeningBracketOnly || hasClosingBracketOnly;
            
            // Always validate if we have any potential placeholder syntax
            const result = createExampleReplacement(properties.text);
            if (!result.success) {
                properties.placeholderError = result.error || 'Invalid placeholder syntax';
                console.log('Placeholder error detected:', properties.placeholderError);
            } else {
                properties.placeholderError = undefined;
            }
        } else {
            // No potential placeholders at all
            properties.hasPlaceholders = false;
            properties.placeholderError = undefined;
        }
    }
    
    /**
     * Returns the text with placeholders replaced by sample values,
     * but only in preview mode. In normal editing mode, always returns the raw text.
     */
    private getDisplayText(): string {
        const properties = this.data.properties as TextWidgetProperties;
        if (!properties || !properties.text) return '';
        
        // Always return raw text in normal editing mode or when editing
        if (!this.isPreviewMode || this.isEditing) {
            return properties.text;
        }
        
        // In preview mode, return replaced text if no errors and not showing raw placeholders
        if (properties.hasPlaceholders && !properties.showRawPlaceholders && !properties.placeholderError) {
            // Replace placeholders with sample values
            const result = createExampleReplacement(properties.text);
            
            // Update error state if an error is found during replacement
            if (!result.success) {
                properties.placeholderError = result.error;
                return properties.text; // Show raw text if error
            }
            
            return result.success ? (result.result || properties.text) : properties.text;
        }
        
        // Default to raw text in all other cases
        return properties.text;
    }
    
    /**
     * Clears any error UI elements
     */
    private clearErrorUI(): void {
        // Reset the border and outline styles
        if (this.element) {
            this.element.style.border = '';
            this.element.style.outline = 'none';
        }
        
        // Remove error tooltip if it exists (from old implementation)
        if (this.errorTooltip && this.element.contains(this.errorTooltip)) {
            this.element.removeChild(this.errorTooltip);
        }
        
        // Remove error icon if it exists (from old implementation)
        if (this.errorIcon && this.contentElement && this.contentElement.contains(this.errorIcon)) {
            this.contentElement.removeChild(this.errorIcon);
        }
        
        // Remove event listeners (from old implementation)
        if (this.showErrorTooltip && this.hideErrorTooltip) {
            this.element.removeEventListener('mouseenter', this.showErrorTooltip);
            this.element.removeEventListener('mouseleave', this.hideErrorTooltip);
        }
        
        // Reset references
        this.errorTooltip = null;
        this.errorIcon = null;
        this.showErrorTooltip = null;
        this.hideErrorTooltip = null;
        
        // Clean up any remaining error elements with error-related class names
        if (this.element) {
            const errorElements = this.element.querySelectorAll('[class*="placeholder-error"]');
            errorElements.forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }
    }
    
    /**
     * Updates properties specific to the text widget.
     */
    protected override updateSpecificProperties(): void {
        const properties = this.data.properties as TextWidgetProperties;
        
        if (this.contentElement && properties && !this.isEditing) {
            // Clear error UI first
            this.clearErrorUI();
            
            // Clear previous content
            this.contentElement.innerHTML = '';
            
            // Create text display element
            const textElement = document.createElement('div');
            textElement.className = 'text-widget-content';
            
            // Get text to display (either raw or with replaced placeholders)
            const displayText = this.getDisplayText();
            textElement.innerText = displayText;
            
            // Apply text styling
            textElement.style.fontFamily = properties.fontFamily;
            textElement.style.fontSize = `${properties.fontSize}px`;
            textElement.style.color = properties.fontColor;
            textElement.style.fontWeight = properties.fontWeight || 'normal';
            textElement.style.fontStyle = properties.fontStyle || 'normal';
            textElement.style.textDecoration = properties.textDecoration || 'none';
            textElement.style.textAlign = properties.textAlign || 'left';
            textElement.style.width = '100%';
            textElement.style.height = '100%';
            textElement.style.padding = '0';
            textElement.style.boxSizing = 'border-box';
            textElement.style.overflow = 'hidden';
            textElement.style.wordWrap = 'break-word';
            
            // Only add title for error details in preview mode
            if (this.isPreviewMode && properties.hasPlaceholders && properties.placeholderError) {
                // Add a title attribute for error details on hover
                textElement.title = properties.placeholderError;
            } else {
                textElement.title = '';
            }
            
            // Border and outline styles are handled in setPreviewMode to ensure consistency
            
            // Just add the text element directly
            this.contentElement.appendChild(textElement);
        }
    }
    
    /**
     * Sets up text editing functionality.
     */
    private setupTextEditing(): void {
        if (this.element && this.contentElement) {
            this.element.addEventListener('dblclick', this.startEditing.bind(this));
        }
    }
    
    /**
     * Starts text editing mode.
     */
    private startEditing(event: MouseEvent): void {
        event.stopPropagation();
        
        const logger = safeLogger();
        logger.info('TextEdit', `Starting text editing for widget ${this.data.id}`, {
            widgetType: this.data.type,
            widgetId: this.data.id,
            eventType: event.type,
            eventTarget: event.target instanceof Element ? event.target.tagName : 'unknown'
        });
        
        // Capture initial position and size for tracking unexpected changes
        const initialPosition = { ...this.data.position };
        const initialSize = { ...this.data.size };
        
        logger.debug('TextEdit', `Initial widget state before editing`, {
            widgetId: this.data.id,
            position: initialPosition,
            size: initialSize
        });
        
        if (this.isEditing || !this.contentElement) {
            logger.warn('TextEdit', `Cannot start editing - already editing or missing content element`, {
                isEditing: this.isEditing,
                hasContentElement: !!this.contentElement
            });
            return;
        }
        
        // Clear any error UI before starting edit mode
        this.clearErrorUI();
        
        this.isEditing = true;
        
        // Store original text for cancel operation
        const properties = this.data.properties as TextWidgetProperties;
        this.originalText = properties.text || '';
        
        logger.debug('TextEdit', `Stored original text for potential cancel`, {
            widgetId: this.data.id,
            originalText: this.originalText,
            textLength: this.originalText.length
        });
        
        // Ensure text property exists and is not null/undefined
        if (!properties.text) {
            properties.text = '';
        }
        
        // Clear content and create text editor
        this.contentElement.innerHTML = '';
        
        this.textEditorElement = document.createElement('textarea');
        this.textEditorElement.className = 'text-widget-editor';
        this.textEditorElement.value = properties.text;
        this.textEditorElement.style.fontFamily = properties.fontFamily;
        this.textEditorElement.style.fontSize = `${properties.fontSize}px`;
        this.textEditorElement.style.color = properties.fontColor;
        this.textEditorElement.style.fontWeight = properties.fontWeight || 'normal';
        this.textEditorElement.style.fontStyle = properties.fontStyle || 'normal';
        this.textEditorElement.style.textDecoration = properties.textDecoration || 'none';
        this.textEditorElement.style.textAlign = properties.textAlign || 'left';
        this.textEditorElement.style.width = '100%';
        this.textEditorElement.style.height = '100%';
        this.textEditorElement.style.padding = '0';
        this.textEditorElement.style.boxSizing = 'border-box';
        this.textEditorElement.style.border = 'none';
        this.textEditorElement.style.resize = 'none';
        this.textEditorElement.style.overflow = 'hidden';
        
        // We no longer show placeholder errors in the editor UI
        // Just add the text editor directly
        this.contentElement.appendChild(this.textEditorElement);
        
        // Add event listeners for confirming/canceling edit
        this.textEditorElement.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.textEditorElement.addEventListener('input', this.handleTextInput.bind(this));
        this.textEditorElement.addEventListener('blur', this.confirmEdit.bind(this));
        
        this.contentElement.appendChild(this.textEditorElement);
        this.textEditorElement.focus();
        
        logger.info('TextEdit', `Text editing started for widget ${this.data.id}`);
        
        // Check for position/size changes after editing has started (using setTimeout to run after current execution context)
        setTimeout(() => {
            const currentPosition = { ...this.data.position };
            const currentSize = { ...this.data.size };
            
            const positionChanged = 
                initialPosition.x !== currentPosition.x || 
                initialPosition.y !== currentPosition.y;
                
            const sizeChanged = 
                initialSize.width !== currentSize.width || 
                initialSize.height !== currentSize.height;
                
            if (positionChanged || sizeChanged) {
                logger.error('TextEdit', `Widget position/size unexpectedly changed during edit start`, {
                    widgetId: this.data.id,
                    initialPosition,
                    currentPosition,
                    initialSize,
                    currentSize,
                    positionChanged,
                    sizeChanged
                });
            }
        }, 0);
    }
    
    /**
     * Handles text input events to update properties in real-time
     */
    private handleTextInput(event: Event): void {
        if (!this.isEditing || !this.textEditorElement) return;
        
        // Update the property in real-time without exiting edit mode
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        // Store widget position before making any changes to detect unexpected movement
        const positionBefore = { ...this.data.position };
        
        const properties = this.data.properties as TextWidgetProperties;
        properties.text = this.textEditorElement.value;
        
        // Still run placeholder validation in the background without showing errors
        // This keeps the property state updated for when we enter preview mode
        this.checkForPlaceholders();
        
        // Restore the original position if it changed during the text update
        // This is to fix the bug where the widget moves unexpectedly when typing a '{'
        const positionAfter = { ...this.data.position };
        if (positionBefore.x !== positionAfter.x || positionBefore.y !== positionAfter.y) {
            const logger = safeLogger();
            logger.warn('TextEdit', `Correcting unexpected position change during text input`, {
                widgetId: this.data.id,
                before: positionBefore,
                after: positionAfter,
                restoring: positionBefore
            });
            
            // Restore the original position
            this.data.position = { ...positionBefore };
            
            // Update DOM position without triggering a recursive update
            this.element.style.left = `${positionBefore.x}px`;
            this.element.style.top = `${positionBefore.y}px`;
        }
        
        // Dispatch an event to notify the properties manager
        const updateEvent = new CustomEvent('widget-text-update', {
            detail: {
                id: this.data.id,
                text: this.textEditorElement.value,
                hasPlaceholders: properties.hasPlaceholders,
                placeholderError: properties.placeholderError
            },
            bubbles: true
        });
        this.element.dispatchEvent(updateEvent);
    }
    
    /**
     * Handles key down events in the text editor.
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            // Enter without shift confirms edit
            event.preventDefault();
            this.confirmEdit();
        } else if (event.key === 'Escape') {
            // Escape cancels edit
            event.preventDefault();
            this.cancelEdit();
        }
    }
    
    /**
     * Confirms the text edit and applies the changes.
     */
    private confirmEdit(): void {
        if (!this.isEditing || !this.textEditorElement) {
            const logger = safeLogger();
            logger.debug('TextEdit', `Cannot confirm edit - not in editing mode or no editor`, {
                widgetId: this.data.id,
                isEditing: this.isEditing,
                hasEditor: !!this.textEditorElement
            });
            return;
        }
        
        const logger = safeLogger();
        logger.info('TextEdit', `Confirming text edit for widget ${this.data.id}`);
        
        // Store the position and size before applying changes to detect unexpected shifts
        const positionBefore = { ...this.data.position };
        const sizeBefore = { ...this.data.size };
        
        logger.debug('TextEdit', `Widget state before confirming edit`, {
            widgetId: this.data.id,
            position: positionBefore,
            size: sizeBefore
        });
        
        // Clear any error UI
        this.clearErrorUI();
        
        // Update the text in properties
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        const properties = this.data.properties as TextWidgetProperties;
        const previousText = properties.text || '';
        properties.text = this.textEditorElement.value;
        
        logger.debug('TextEdit', `Text changed during edit`, {
            widgetId: this.data.id,
            previousTextLength: previousText.length,
            newTextLength: properties.text.length,
            textChanged: previousText !== properties.text
        });
        
        // Update placeholder status
        this.checkForPlaceholders();
        
        // After editing, default to showing replaced values for placeholders
        if (properties.hasPlaceholders && !properties.placeholderError) {
            properties.showRawPlaceholders = false;
        }
        
        // Reset editing state
        this.isEditing = false;
        this.textEditorElement = null;
        
        // Update the display
        this.updateDomFromData();
        
        logger.info('TextEdit', `Text edit confirmed for widget ${this.data.id}`);
        
        // Restore original position if needed to prevent unwanted movement
        const positionAfter = { ...this.data.position };
        if (positionBefore.x !== positionAfter.x || positionBefore.y !== positionAfter.y) {
            logger.warn('TextEdit', `Correcting position changed during edit confirmation`, {
                widgetId: this.data.id,
                before: positionBefore,
                after: positionAfter,
                restoring: positionBefore
            });
            
            // Restore the original position
            this.data.position = { ...positionBefore };
            
            // Update DOM position without triggering further updates
            this.element.style.left = `${positionBefore.x}px`;
            this.element.style.top = `${positionBefore.y}px`;
        }
        
        // Check for any unexpected size changes after edit is completed
        setTimeout(() => {
            const sizeAfter = { ...this.data.size };
            
            const sizeChanged = 
                sizeBefore.width !== sizeAfter.width || 
                sizeBefore.height !== sizeAfter.height;
                
            if (sizeChanged) {
                logger.error('TextEdit', `Widget size unexpectedly changed during edit confirmation`, {
                    widgetId: this.data.id,
                    beforeSize: sizeBefore,
                    afterSize: sizeAfter
                });
            }
        }, 0);
    }
    
    /**
     * Cancels the text edit and reverts to the original text.
     */
    private cancelEdit(): void {
        if (!this.isEditing) return;
        
        // Clear any error UI
        this.clearErrorUI();
        
        // Reset to original text
        if (this.data.properties) {
            const properties = this.data.properties as TextWidgetProperties;
            properties.text = this.originalText;
            
            // Recheck for placeholders in the original text
            this.checkForPlaceholders();
            
            // Reset to showing replaced values for placeholders
            if (properties.hasPlaceholders && !properties.placeholderError) {
                properties.showRawPlaceholders = false;
            }
        }
        
        // Reset editing state
        this.isEditing = false;
        this.textEditorElement = null;
        
        // Update the display
        this.updateDomFromData();
    }
    
    /**
     * Sets the text content.
     * @param text - The new text content.
     */
    public setText(text: string): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        const properties = this.data.properties as TextWidgetProperties;
        properties.text = text;
        
        // Check for placeholders in the new text
        this.checkForPlaceholders();
        
        // After setting text, default to showing replaced values for placeholders
        if (properties.hasPlaceholders && !properties.placeholderError) {
            properties.showRawPlaceholders = false;
        }
        
        this.updateDomFromData();
    }
    
    /**
     * Toggles between showing raw placeholders and replaced values.
     * @returns The current state of showRawPlaceholders after toggling.
     */
    public togglePlaceholderView(): boolean {
        const properties = this.data.properties as TextWidgetProperties;
        if (!properties || !properties.hasPlaceholders) return false;
        
        properties.showRawPlaceholders = !properties.showRawPlaceholders;
        this.updateDomFromData();
        
        return properties.showRawPlaceholders;
    }
    
    /**
     * Sets whether to show raw placeholders or replaced values.
     * @param showRaw - Whether to show raw placeholders (true) or replaced values (false).
     */
    public setPlaceholderView(showRaw: boolean): void {
        const properties = this.data.properties as TextWidgetProperties;
        if (!properties || !properties.hasPlaceholders) return;
        
        properties.showRawPlaceholders = showRaw;
        this.updateDomFromData();
    }
    
    /**
     * Sets the font family.
     * @param fontFamily - The font family.
     */
    public setFontFamily(fontFamily: string): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).fontFamily = fontFamily;
        this.updateDomFromData();
    }
    
    /**
     * Sets the font size.
     * @param fontSize - The font size in pixels.
     */
    public setFontSize(fontSize: number): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).fontSize = fontSize;
        this.updateDomFromData();
    }
    
    /**
     * Sets the font color.
     * @param color - The font color CSS value.
     */
    public setFontColor(color: string): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).fontColor = color;
        this.updateDomFromData();
    }
    
    /**
     * Sets the font weight (bold or normal).
     * @param isBold - Whether the text should be bold.
     */
    public setFontWeight(isBold: boolean): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).fontWeight = isBold ? 'bold' : 'normal';
        this.updateDomFromData();
    }
    
    /**
     * Sets the font style (italic or normal).
     * @param isItalic - Whether the text should be italic.
     */
    public setFontStyle(isItalic: boolean): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).fontStyle = isItalic ? 'italic' : 'normal';
        this.updateDomFromData();
    }
    
    /**
     * Sets the text decoration (underline, line-through, or none).
     * @param decoration - The text decoration.
     */
    public setTextDecoration(decoration: 'none' | 'underline' | 'line-through'): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).textDecoration = decoration;
        this.updateDomFromData();
    }
    
    /**
     * Sets the text alignment.
     * @param alignment - The text alignment (left, center, right).
     */
    public setTextAlign(alignment: 'left' | 'center' | 'right'): void {
        if (!this.data.properties) {
            this.data.properties = {} as TextWidgetProperties;
        }
        
        (this.data.properties as TextWidgetProperties).textAlign = alignment;
        this.updateDomFromData();
    }
    
    /**
     * Gets information about the widget's placeholder status.
     * @returns An object containing placeholder status information.
     */
    public getPlaceholderInfo(): {
        hasPlaceholders: boolean;
        showingRawPlaceholders: boolean;
        hasError: boolean;
        errorMessage?: string;
    } {
        const properties = this.data.properties as TextWidgetProperties;
        if (!properties) {
            return {
                hasPlaceholders: false,
                showingRawPlaceholders: false,
                hasError: false
            };
        }
        
        return {
            hasPlaceholders: properties.hasPlaceholders || false,
            showingRawPlaceholders: properties.showRawPlaceholders || false,
            hasError: !!(properties.hasPlaceholders && properties.placeholderError),
            errorMessage: properties.placeholderError
        };
    }
}