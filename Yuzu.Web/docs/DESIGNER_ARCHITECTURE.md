# Designer Architecture Documentation

> **Last Updated:** 2025-10-01
> **Version:** 1.0
> **Purpose:** Complete architectural documentation for the Yuzu Break Timer Designer system

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Widget System](#widget-system)
5. [Command Pattern](#command-pattern)
6. [Manager Classes](#manager-classes)
7. [Data Flow](#data-flow)
8. [File Structure](#file-structure)
9. [Key Concepts](#key-concepts)
10. [API Reference](#api-reference)

---

## Overview

The Designer is a **visual canvas-based editor** that allows users to create custom break timer screens. Users can add, position, resize, and style widgets (text, boxes, QR codes) to design personalized break screens that will be displayed during breaks.

### Key Features

- **Drag-and-drop widget creation** (Text, Box, QR Code)
- **WYSIWYG visual editor** with live preview
- **Undo/Redo system** with command pattern
- **Widget grouping** for complex layouts
- **Property panel** for precise control
- **Background image selection**
- **Clipboard operations** (cut, copy, paste)
- **Alignment and distribution tools**
- **Z-order management** (layering)
- **Grid system** with snap-to-grid
- **Placeholder system** for dynamic content (time zones, break names, etc.)
- **Preview mode** to see final result
- **Persistent storage** via backend API

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Designer.cshtml                          │
│                    (Razor Page / HTML UI)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          main.ts                                 │
│                 (Entry point / Initialization)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────────┐
           │     Designer Core Class      │
           │   (designer-core.ts)         │
           └─────────────┬────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
  ┌──────────┐   ┌──────────────┐  ┌─────────────┐
  │ Widgets  │   │  Managers    │  │  Commands   │
  │  System  │   │  (Services)  │  │  (Undo/Redo)│
  └──────────┘   └──────────────┘  └─────────────┘
        │                │                │
        │                │                │
        ▼                ▼                ▼
┌──────────────────────────────────────────────────┐
│          Canvas DOM (HTML Element)               │
└──────────────────────────────────────────────────┘
```

### Architecture Layers

1. **Presentation Layer** (`Designer.cshtml`)
   - HTML structure
   - Toolbars and UI elements
   - Action buttons
   - Modal dialogs

2. **Application Layer** (`main.ts`)
   - Initialization logic
   - Event binding
   - Button handlers
   - Background selector
   - Save/load operations

3. **Domain Layer** (Core Designer Classes)
   - Widget management
   - Selection logic
   - Drag/resize operations
   - Command execution

4. **Infrastructure Layer**
   - Command manager (undo/redo)
   - Clipboard service
   - Toolbox manager
   - Properties manager

---

## Core Components

### 1. Designer Core (`designer-core.ts`)

The main orchestrator class that coordinates all designer functionality.

**Responsibilities:**
- Widget lifecycle management (create, update, delete)
- Canvas initialization
- Event handling coordination
- Manager initialization
- State management

**Key Properties:**
```typescript
class Designer {
    protected canvasElement: HTMLElement;          // Main canvas
    protected widgets: Map<string, Widget>;        // All widgets
    protected nextZIndex: number;                  // Layer counter
    protected commandManager: CommandManager;      // Undo/redo
    protected selectionManager: SelectionManager;  // Selection state
    protected toolboxManager: ToolboxManager;      // Floating toolbars
    protected propertiesManager: PropertiesManager; // Property panel
    protected clipboard: Clipboard;                // Copy/paste
    protected dragState: DragState | null;         // Current drag
    protected previewMode: boolean;                // Preview flag
    protected hasChanges: boolean;                 // Unsaved changes
}
```

**Key Methods:**
- `addWidget(widgetData)` - Creates a new widget
- `removeWidget(id)` - Deletes a widget
- `selectWidget(id)` - Selects a widget
- `saveDesign()` - Exports canvas to JSON
- `loadDesign(json)` - Imports design from JSON
- `enterPreviewMode()` - Switches to preview
- `groupSelectedWidgets()` - Groups selection
- `executeCommand(cmd)` - Runs a command

### 2. Designer Modules

The core is split into focused modules via mixins/extensions:

#### `designer-drag.ts`
Handles all drag-related operations.

**Features:**
- Widget dragging (move)
- Widget resizing
- Multi-selection box
- Snap-to-grid
- Drag state management

**Key Methods:**
- `handleCanvasMouseDown()`
- `handleDocumentMouseMove()`
- `handleDocumentMouseUp()`
- `startDrag()` / `endDrag()`

#### `designer-selection.ts`
Manages widget selection state.

**Features:**
- Single selection
- Multi-selection (Ctrl+Click, Shift+Box)
- Selection UI (highlight, handles)
- Selection change events

**Key Methods:**
- `selectWidget(id, addToSelection)`
- `deselectWidget(id)`
- `selectAll()`
- `clearSelection()`
- `getSelectedWidgets()`

#### `designer-alignment.ts`
Provides alignment and distribution tools.

**Features:**
- Align left/center/right
- Align top/middle/bottom
- Distribute horizontally/vertically
- Make same width/height/size

**Key Methods:**
- `alignLeft()` / `alignRight()` / `alignCenter()`
- `alignTop()` / `alignBottom()` / `alignMiddle()`
- `distributeHorizontally()` / `distributeVertically()`
- `makeSameWidth()` / `makeSameHeight()` / `makeSameSize()`

#### `designer-zorder.ts`
Controls widget layering (z-index).

**Features:**
- Bring to front
- Send to back
- Bring forward
- Send backward

**Key Methods:**
- `bringToFront()`
- `sendToBack()`
- `bringForward()`
- `sendBackward()`

#### `designer-events.ts`
Centralizes event handling and logging.

**Features:**
- Event listener setup
- Keyboard shortcuts (Ctrl+C, Ctrl+V, Delete, etc.)
- Event delegation
- Debug logging system

**Key Methods:**
- `initEventListeners()`
- `handleKeyDown()`
- `setupButtonHandlers()`

---

## Widget System

### Widget Base Class (`widget.ts`)

The abstract base for all widget types.

**Responsibilities:**
- DOM element creation
- Position/size management
- Selection state
- Resize handles
- Event handling

**Key Properties:**
```typescript
class Widget {
    protected element: HTMLElement;          // DOM node
    protected data: WidgetData;              // Widget state
    protected selected: boolean;             // Selection flag
    protected isReference: boolean;          // Reference widget flag
    protected resizeHandles: Map<...>;       // Corner handles
    protected contentElement: HTMLElement;   // Inner content
}
```

**Key Methods:**
- `createDomElement()` - Creates HTML structure
- `updateDomFromData()` - Syncs data to DOM
- `getRect()` - Returns position/size
- `setPosition(point)` - Moves widget
- `setSize(size)` - Resizes widget
- `setSelected(selected)` - Updates selection
- `clone()` - Deep copy
- `toJSON()` - Serializes to JSON

### Widget Types

#### 1. **BoxWidget** (`box-widget.ts`)

A colored rectangle with rounded corners.

**Properties:**
```typescript
interface BoxWidgetProperties {
    backgroundColor: string;  // Hex color
    borderRadius: number;     // Corner radius (px)
}
```

**Use Cases:**
- Background panels
- Decorative elements
- Section dividers
- Colored overlays

#### 2. **TextWidget** (`text-widget.ts`)

Editable text with full typography control.

**Properties:**
```typescript
interface TextWidgetProperties {
    text: string;              // Content
    fontFamily: string;        // Font name
    fontSize: number;          // Size in px
    fontColor: string;         // Hex color
    fontWeight: string;        // normal|bold
    fontStyle: string;         // normal|italic
    textDecoration: string;    // none|underline|line-through
    textAlign: string;         // left|center|right
    hasPlaceholders: boolean;  // Contains placeholders
    showRawPlaceholders: boolean; // Edit vs preview mode
    placeholderError: string;  // Validation error
}
```

**Features:**
- Double-click to edit
- Rich text formatting
- Placeholder support (e.g., `{break-name}`, `{time-home}`)
- Syntax validation
- Error indicators

**Placeholder System:**
- `{break-name}` - Name of current break type
- `{end-time-home}` - End time in home timezone
- `{time-name-home}` - Name of home timezone
- `{end-time-secondary}` - End time in secondary timezone
- `{time-name-secondary}` - Name of secondary timezone
- Custom TZID placeholders: `{end-time-Asia/Bangkok}`

#### 3. **QRWidget** (`qr-widget.ts`)

Displays an image (typically a QR code).

**Properties:**
```typescript
interface QRWidgetProperties {
    imageUrl: string;  // Image source URL
}
```

**Use Cases:**
- QR codes for timers
- Logos
- Icons
- Images

#### 4. **GroupWidget** (`group-widget.ts`)

A container that groups multiple widgets together.

**Properties:**
```typescript
interface GroupWidgetProperties {
    childIds: string[];  // IDs of contained widgets
}
```

**Features:**
- Move entire group as one unit
- Nested groups supported
- Maintains relative positions
- Can be ungrouped

**Behavior:**
- When moved, all children move with it
- When deleted, can preserve or delete children
- Bounding box calculated from children
- Selection cascades to children

### Widget Factory (`widget-factory.ts`)

Centralized widget creation.

**Purpose:**
- Type-safe widget instantiation
- Consistent widget creation
- Default property injection

**Usage:**
```typescript
const widget = WidgetFactory.createWidget({
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 200, height: 50 },
    properties: {
        text: 'Hello World',
        fontSize: 24,
        fontColor: '#000000'
    }
});
```

---

## Command Pattern

### Architecture

The designer uses the **Command Pattern** for undo/redo functionality.

```
┌──────────────────┐
│ Command Manager  │
│ (Undo/Redo Stack)│
└────────┬─────────┘
         │
         │ executes
         ▼
┌──────────────────┐
│  Command         │
│  Interface       │
├──────────────────┤
│ + execute()      │
│ + undo()         │
│ + getDescription()│
└────────┬─────────┘
         │
         │ implements
         ▼
   ┌────────────────────────┐
   │  Concrete Commands     │
   ├────────────────────────┤
   │ - AddWidgetCommand     │
   │ - DeleteWidgetCommand  │
   │ - MoveWidgetCommand    │
   │ - ResizeWidgetCommand  │
   │ - ChangePropertyCommand│
   │ - GroupWidgetsCommand  │
   │ - UngroupWidgetsCommand│
   └────────────────────────┘
```

### Command Manager (`command.ts`)

Manages the undo/redo stacks.

**Properties:**
```typescript
class CommandManager {
    private undoStack: Command[];  // Past commands
    private redoStack: Command[];  // Undone commands
    private maxStackSize: number;  // Limit (default: 50)
}
```

**Methods:**
- `execute(cmd)` - Run command and add to undo stack
- `undo()` - Pop from undo, execute undo(), push to redo
- `redo()` - Pop from redo, execute execute(), push to undo
- `canUndo()` - Check if undo stack has commands
- `canRedo()` - Check if redo stack has commands
- `clear()` - Clear both stacks

### Basic Commands (`basic-commands.ts`)

**AddWidgetCommand:**
```typescript
class AddWidgetCommand implements Command {
    execute() {
        // Create widget and add to canvas
        const widget = designer.addWidget(this.widgetData);
        this.widgetId = widget.getId();
    }

    undo() {
        // Remove widget from canvas
        designer.removeWidget(this.widgetId);
    }
}
```

**DeleteWidgetCommand:**
```typescript
class DeleteWidgetCommand implements Command {
    execute() {
        // Store widget data
        this.widgetData = designer.getWidget(this.widgetId).getData();
        // Remove widget
        designer.removeWidget(this.widgetId);
    }

    undo() {
        // Restore widget
        designer.addWidgetWithId(this.widgetData);
    }
}
```

**MoveWidgetCommand:**
```typescript
class MoveWidgetCommand implements Command {
    execute() {
        // Store old position
        this.oldPosition = widget.getPosition();
        // Move to new position
        widget.setPosition(this.newPosition);
    }

    undo() {
        // Restore old position
        widget.setPosition(this.oldPosition);
    }
}
```

### Group Commands (`group-commands.ts`)

**GroupWidgetsCommand:**
- Creates a new GroupWidget
- Adds selected widgets as children
- Updates parent-child relationships
- Maintains relative positions

**UngroupWidgetsCommand:**
- Removes GroupWidget
- Restores children to top level
- Maintains absolute positions

### Alignment Commands (`alignment-commands.ts`)

Commands for alignment operations (align left, distribute, etc.)

---

## Manager Classes

### SelectionManager (`selection-manager.ts`)

Manages which widgets are currently selected.

**Responsibilities:**
- Track selected widget IDs
- Emit selection change events
- Provide selection queries

**Key Methods:**
```typescript
class SelectionManager {
    select(id: string, addToSelection: boolean): void
    deselect(id: string): void
    clear(): void
    toggle(id: string): void
    isSelected(id: string): boolean
    getSelectedIds(): string[]
    hasSelection(): boolean
}
```

**Events:**
- `selection-change` - Fired when selection changes

### ToolboxManager (`toolbox-manager.ts`)

Manages draggable floating toolbars.

**Responsibilities:**
- Register toolbox elements
- Handle toolbox dragging
- Persist toolbox positions
- Prevent toolbox overlap with widgets

**Registered Toolboxes:**
- Main toolbar (widget creation, operations)
- Properties toolbar (widget properties)
- Alignment toolbar (alignment tools)

**Key Methods:**
```typescript
class ToolboxManager {
    registerToolbox(id: string, element: HTMLElement): void
    setToolboxPosition(id: string, position: Point): void
    getToolboxPosition(id: string): Point
}
```

### PropertiesManager (`properties-manager.ts`)

Manages the properties panel for selected widgets.

**Responsibilities:**
- Update property panel based on selection
- Handle property changes
- Apply changes to widgets
- Multi-edit support

**Properties:**
- Position (x, y)
- Size (width, height)
- Text content
- Font properties (family, size, color, style)
- Text alignment
- Color (background, text)
- Corner radius

**Key Methods:**
```typescript
class PropertiesManager {
    updatePropertiesPanel(widgets: Widget[]): void
    handlePropertyChange(property: string, value: any): void
    showProperties(): void
    hideProperties(): void
}
```

### Clipboard (`clipboard.ts`)

Singleton service for copy/paste operations.

**Responsibilities:**
- Store copied widget data
- Clone widgets
- Paste with offset

**Key Methods:**
```typescript
const clipboard = getClipboard();

clipboard.copy(widgets: Widget[]): void
clipboard.cut(widgets: Widget[]): Widget[]
clipboard.paste(): WidgetData[]
clipboard.hasData(): boolean
clipboard.clear(): void
```

---

## Data Flow

### Save Operation

```
User clicks Save
       │
       ▼
main.ts: btn-save handler
       │
       ▼
Designer.saveDesign()
       │
       ├─ Iterates over all widgets
       ├─ Calls widget.toJSON()
       ├─ Collects canvas metadata
       └─ Returns JSON string
       │
       ▼
Fetch POST to /Designer?handler=SaveDesign
       │
       ├─ Payload: { id, backgroundImageTitle, canvasData }
       ├─ Headers: Anti-forgery token
       └─ Credentials: include
       │
       ▼
Designer.cshtml.cs: OnPostSaveDesignAsync()
       │
       ├─ Validates data
       ├─ Stores in database
       └─ Returns { success, message }
       │
       ▼
main.ts: Shows success toast
       │
       └─ Dispatches 'design-saved' event
```

### Load Operation

```
Page loads
       │
       ▼
Designer.cshtml.cs: OnGetAsync()
       │
       ├─ Retrieves break type by ID
       ├─ Loads canvas data from database
       └─ Sets Model properties
       │
       ▼
Designer.cshtml renders
       │
       ├─ Hidden inputs with data
       └─ data-canvas-json attribute
       │
       ▼
main.ts: DOMContentLoaded
       │
       ├─ Checks is-loading-existing flag
       ├─ Reads data-canvas-json
       └─ Calls designer.loadDesign(json)
       │
       ▼
Designer.loadDesign()
       │
       ├─ Parses JSON
       ├─ Iterates widget data
       ├─ Creates widgets via factory
       └─ Adds to canvas
       │
       ▼
Background loaded (if specified)
       │
       ├─ Fetch backgrounds from API
       ├─ Find matching title
       └─ Apply to canvas
```

### Widget Creation Flow

```
User clicks "Add Text"
       │
       ▼
main.ts: btn-add-text handler
       │
       ▼
Designer.addWidget({ type: 'text', ... })
       │
       ├─ Generates unique ID
       ├─ Merges with defaults
       └─ Calls WidgetFactory.createWidget()
       │
       ▼
WidgetFactory.createWidget()
       │
       ├─ Checks type
       ├─ new TextWidget(data)
       └─ Returns widget instance
       │
       ▼
Designer adds to widgets map
       │
       ├─ Sets resize handler
       ├─ Adds event listeners
       └─ Appends to canvas DOM
       │
       ▼
Widget.createDomElement()
       │
       ├─ Creates div structure
       ├─ Creates resize handles
       ├─ Creates content element
       └─ Adds CSS classes
       │
       ▼
Widget.updateDomFromData()
       │
       ├─ Sets position (left, top)
       ├─ Sets size (width, height)
       ├─ Sets z-index
       └─ Updates content
```

---

## File Structure

```
Yuzu.Web/
├── Pages/
│   ├── Designer.cshtml          # Main page HTML
│   └── Designer.cshtml.cs       # Backend logic
│
├── src/designer/                # TypeScript source
│   ├── main.ts                  # Entry point
│   ├── types.ts                 # Type definitions
│   ├── widget.ts                # Base Widget class
│   ├── clipboard.ts             # Clipboard service
│   ├── selection-manager.ts    # Selection state
│   ├── toolbox-manager.ts      # Toolbox dragging
│   ├── properties-manager.ts   # Property panel
│   │
│   ├── core/                    # Core modules
│   │   ├── index.ts             # Barrel export
│   │   ├── designer-core.ts     # Main Designer class
│   │   ├── designer-drag.ts     # Drag operations
│   │   ├── designer-selection.ts # Selection logic
│   │   ├── designer-alignment.ts # Alignment tools
│   │   ├── designer-zorder.ts   # Z-order operations
│   │   ├── designer-events.ts   # Event handling
│   │   ├── placeholders.ts      # Placeholder system
│   │   └── logger-utils.ts      # Logging utilities
│   │
│   ├── widgets/                 # Widget types
│   │   ├── index.ts             # Barrel export
│   │   ├── widget-factory.ts    # Widget creation
│   │   ├── box-widget.ts        # Box widget
│   │   ├── text-widget.ts       # Text widget
│   │   ├── qr-widget.ts         # QR widget
│   │   └── group-widget.ts      # Group widget
│   │
│   └── commands/                # Command pattern
│       ├── command.ts           # Command interface & manager
│       ├── basic-commands.ts    # Add/Delete/Move/Resize
│       ├── group-commands.ts    # Group/Ungroup
│       └── alignment-commands.ts # Alignment commands
│
├── wwwroot/
│   ├── css/designer/
│   │   └── designer.css         # Designer styles
│   │
│   └── js/designer/             # Compiled JavaScript
│       ├── main.js              # (from main.ts)
│       ├── core/                # (from core/)
│       ├── widgets/             # (from widgets/)
│       └── commands/            # (from commands/)
│
└── docs/
    └── DESIGNER_ARCHITECTURE.md # This file
```

---

## Key Concepts

### 1. Canvas Coordinate System

- **Origin:** Top-left corner (0, 0)
- **X-axis:** Increases to the right
- **Y-axis:** Increases downward
- **Units:** Pixels (px)

### 2. Widget Identification

- Each widget has a unique ID
- Format: `widget-{timestamp}-{random}`
- Example: `widget-1696000000000-123`

### 3. Z-Index Management

- Widgets are layered using CSS z-index
- Higher z-index = on top
- `nextZIndex` counter increments for each new widget
- Z-order commands modify relative z-index values

### 4. Selection Model

- Single selection: Click on widget
- Multi-selection:
  - Ctrl+Click: Add to selection
  - Shift+Drag: Box selection
- Selection highlights with blue border
- Resize handles appear on selected widgets

### 5. Drag Operations

Three drag types:
- **Move:** Drag widget body
- **Resize:** Drag resize handles
- **Select:** Drag on canvas (box selection)

**Drag State:**
```typescript
interface DragState {
    type: DragType;              // move|resize|select
    startPoint: Point;           // Where drag started
    currentPoint: Point;         // Current mouse position
    resizeHandle?: string;       // Which handle (nw, ne, sw, se)
    affectedWidgets: string[];   // Widget IDs being dragged
    originalPositions?: Map;     // Initial positions
    originalSize?: Size;         // Initial size (for resize)
}
```

### 6. Property Binding

Properties panel uses two-way binding:
- **Widget → Panel:** Update panel when selection changes
- **Panel → Widget:** Update widget when property changes

Changes create commands for undo/redo.

### 7. Serialization Format

**JSON Structure:**
```json
{
    "widgets": [
        {
            "id": "widget-1696000000000-123",
            "type": "text",
            "position": { "x": 100, "y": 100 },
            "size": { "width": 200, "height": 50 },
            "zIndex": 1,
            "properties": {
                "text": "Break ends in {end-time-home}",
                "fontSize": 24,
                "fontColor": "#FFFFFF",
                "textAlign": "center"
            }
        },
        {
            "id": "widget-1696000000000-456",
            "type": "box",
            "position": { "x": 50, "y": 50 },
            "size": { "width": 300, "height": 150 },
            "zIndex": 0,
            "properties": {
                "backgroundColor": "#3498db",
                "borderRadius": 10
            }
        }
    ],
    "backgroundImageTitle": "sunset-beach"
}
```

### 8. Preview Mode

Two modes:
- **Edit Mode:** Shows raw content, placeholders in `{...}` format
- **Preview Mode:** Shows replaced placeholders with example data

Toggle with Preview button or `Ctrl+P`.

In preview mode:
- Widgets not selectable
- Toolbars hidden
- Placeholders replaced
- Canvas displays as final user will see

### 9. Grid System

- Visual grid overlay
- 10px spacing
- Toggle with Grid button
- Helps with alignment
- Can be hidden via `.grid-hidden` class

### 10. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Copy selected widgets |
| `Ctrl+X` | Cut selected widgets |
| `Ctrl+V` | Paste widgets |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+A` | Select all |
| `Escape` | Clear selection |
| `Ctrl+]` | Bring to front |
| `Ctrl+[` | Send to back |
| `Ctrl+G` | Group |
| `Ctrl+Shift+G` | Ungroup |
| `Ctrl+P` | Toggle preview mode |
| Arrow keys | Move selected widgets |

---

## API Reference

### Designer Class

#### Constructor
```typescript
constructor(canvasElementId: string)
```
Creates a new Designer instance attached to the specified canvas element.

#### Widget Management

```typescript
addWidget(widgetData: Partial<WidgetData>): string
```
Adds a new widget to the canvas. Returns the widget ID.

```typescript
removeWidget(id: string): void
```
Removes a widget from the canvas.

```typescript
getWidget(id: string): Widget | undefined
```
Retrieves a widget by ID.

```typescript
getAllWidgets(): Widget[]
```
Returns array of all widgets.

#### Selection

```typescript
selectWidget(id: string, addToSelection: boolean = false): void
```
Selects a widget. If `addToSelection` is true, adds to current selection.

```typescript
deselectWidget(id: string): void
```
Deselects a widget.

```typescript
clearSelection(): void
```
Clears all selected widgets.

```typescript
getSelectedWidgets(): Widget[]
```
Returns array of selected widgets.

#### Clipboard

```typescript
copySelectedWidgets(): void
```
Copies selected widgets to clipboard.

```typescript
cutSelectedWidgets(): void
```
Cuts selected widgets to clipboard.

```typescript
paste(): void
```
Pastes widgets from clipboard.

#### Grouping

```typescript
groupSelectedWidgets(): void
```
Groups selected widgets into a GroupWidget.

```typescript
ungroupSelectedWidgets(): void
```
Ungroups selected GroupWidgets.

```typescript
canGroupSelectedWidgets(): boolean
```
Checks if selected widgets can be grouped.

```typescript
canUngroupSelectedWidgets(): boolean
```
Checks if selected widgets can be ungrouped.

#### Alignment

```typescript
alignLeft(): void
alignRight(): void
alignCenter(): void
alignTop(): void
alignBottom(): void
alignMiddle(): void
```
Aligns selected widgets.

```typescript
distributeHorizontally(): void
distributeVertically(): void
```
Distributes selected widgets evenly.

```typescript
makeSameWidth(): void
makeSameHeight(): void
makeSameSize(): void
```
Makes selected widgets the same size.

#### Z-Order

```typescript
bringToFront(): void
sendToBack(): void
bringForward(): void
sendBackward(): void
```
Changes the z-order (layering) of selected widgets.

#### Save/Load

```typescript
saveDesign(): string
```
Serializes the canvas to JSON string.

```typescript
loadDesign(json: string): void
```
Loads a design from JSON string.

#### Preview Mode

```typescript
enterPreviewMode(): void
```
Enters preview mode (hides toolbars, replaces placeholders).

```typescript
exitPreviewMode(): void
```
Exits preview mode (shows toolbars, restores raw content).

#### State

```typescript
hasUnsavedChanges(): boolean
```
Checks if there are unsaved changes.

```typescript
markAsChanged(): void
```
Marks the design as having unsaved changes.

```typescript
markAsSaved(): void
```
Marks the design as saved.

#### Command System

```typescript
executeCommand(command: Command): void
```
Executes a command and adds it to the undo stack.

```typescript
undo(): void
```
Undoes the last command.

```typescript
redo(): void
```
Redoes the last undone command.

```typescript
canUndo(): boolean
canRedo(): boolean
```
Checks if undo/redo is available.

---

## Usage Examples

### Creating a Simple Design

```typescript
// Initialize designer
const designer = new Designer('designer-canvas');

// Add a background box
designer.addWidget({
    type: 'box',
    position: { x: 50, y: 50 },
    size: { width: 700, height: 500 },
    zIndex: 0,
    properties: {
        backgroundColor: '#3498db',
        borderRadius: 15
    }
});

// Add title text
designer.addWidget({
    type: 'text',
    position: { x: 200, y: 100 },
    size: { width: 400, height: 60 },
    zIndex: 1,
    properties: {
        text: 'Break Time!',
        fontSize: 48,
        fontColor: '#FFFFFF',
        fontWeight: 'bold',
        textAlign: 'center'
    }
});

// Add countdown text with placeholder
designer.addWidget({
    type: 'text',
    position: { x: 200, y: 200 },
    size: { width: 400, height: 40 },
    zIndex: 1,
    properties: {
        text: 'Break ends at {end-time-home}',
        fontSize: 24,
        fontColor: '#FFFFFF',
        textAlign: 'center',
        hasPlaceholders: true
    }
});

// Save the design
const json = designer.saveDesign();
console.log(json);
```

### Loading a Design

```typescript
const json = `{
    "widgets": [
        {
            "id": "widget-123",
            "type": "text",
            "position": { "x": 100, "y": 100 },
            "size": { "width": 200, "height": 50 },
            "zIndex": 1,
            "properties": {
                "text": "Hello World",
                "fontSize": 24
            }
        }
    ]
}`;

designer.loadDesign(json);
```

### Working with Commands

```typescript
// Create a command
const command = new AddWidgetCommand(designer, {
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 200, height: 50 }
});

// Execute command
designer.executeCommand(command);

// Undo
designer.undo();

// Redo
designer.redo();
```

---

## Best Practices

1. **Always use commands for modifications** - This ensures undo/redo works correctly
2. **Validate widget data** - Check required properties before creating widgets
3. **Handle errors gracefully** - Use try-catch when loading designs
4. **Clean up event listeners** - Remove listeners when widgets are deleted
5. **Use widget factory** - Don't instantiate widget classes directly
6. **Test placeholder syntax** - Validate placeholder format before saving
7. **Limit undo stack size** - Default is 50, adjust based on memory constraints
8. **Sync DOM frequently** - Call `updateDomFromData()` after data changes
9. **Use type guards** - Check widget type before casting
10. **Document custom widgets** - If extending widget system, document thoroughly

---

## Troubleshooting

### Common Issues

**Widgets not appearing:**
- Check console for errors
- Verify widget data structure
- Ensure canvas element exists
- Check z-index conflicts

**Drag not working:**
- Verify event listeners attached
- Check for CSS `pointer-events` issues
- Ensure drag state initialized

**Undo/redo broken:**
- Verify all modifications use commands
- Check command execute/undo implementations
- Look for direct data mutations

**Properties panel not updating:**
- Verify selection change events firing
- Check property manager initialization
- Ensure widget data in sync with DOM

**Placeholders not replacing:**
- Check placeholder syntax
- Verify preview mode active
- Ensure placeholder values provided

**Save/load fails:**
- Validate JSON structure
- Check backend API response
- Verify anti-forgery token

---

## Future Enhancements

Potential areas for expansion:

1. **Additional Widget Types**
   - Image widget (not just QR)
   - Shape widget (circle, triangle, etc.)
   - Icon widget (Font Awesome icons)
   - Video widget

2. **Advanced Features**
   - Widget animations
   - Gradient backgrounds
   - Shadow effects
   - Rotation support
   - Locked widgets (prevent editing)

3. **Collaboration**
   - Real-time multi-user editing
   - Version history
   - Comments/annotations

4. **Templates**
   - Pre-made design templates
   - Template marketplace
   - Template categories

5. **Export Options**
   - Export to PNG/JPG
   - Export to PDF
   - Export to HTML

---

## Appendix

### Type Definitions Reference

See `types.ts` for complete type definitions:
- `Point`
- `Size`
- `Rect`
- `WidgetData`
- `WidgetType`
- `BoxWidgetProperties`
- `QRWidgetProperties`
- `TextWidgetProperties`
- `GroupWidgetProperties`
- `ResizeHandlePosition`
- `DragType`
- `DragState`

### Testing

Tests located in `__tests__` directories:
- `designer-core.test.ts` - Core functionality tests
- `designer-alignment.test.ts` - Alignment tests
- `designer-drag.test.ts` - Drag operation tests
- `widget-factory.test.ts` - Widget creation tests
- `group-widget.test.ts` - Grouping tests
- `command.test.ts` - Command pattern tests

Run tests: `npm test`

---

**End of Documentation**
