# Selection & Grouping UI - Implementation Concept
**Date:** 2025-01-04
**Based on:** SELECTION_GROUPING_UI_RESEARCH.md
**Goal:** Improve selection indicators, grouping visuals, and alignment behavior in Yuzu Break Screen Designer

---

## Design Philosophy

Following **Adobe Illustrator's professional standard** with elements from Sketch and PowerPoint:
- Users deserve **explicit control** over which object is the alignment anchor (not automatic like Figma/Canva)
- Visual indicators should be **subtle and clear** (same color family, different weights)
- Industry-standard **8 resize handles** for professional-grade control
- **Hover states** provide essential affordance before interaction

---

## Visual Design System

### Color Palette

```css
/* Selection Colors - Single Blue Palette */
--selection-primary: #0d6efd;           /* Primary blue for selection */
--selection-shadow: rgba(13, 110, 253, 0.3);
--selection-glow: rgba(13, 110, 253, 0.15);

/* Reference/Key Object Indicator - Same Blue, Different Treatment */
--reference-border-width: 3px;          /* Thicker than normal */
--reference-inner-border: #ffffff;      /* White inner border for double-line effect */

/* Hover States */
--hover-border: rgba(13, 110, 253, 0.4); /* Subtle blue hint */
--hover-bg: rgba(13, 110, 253, 0.05);    /* Very subtle background */

/* Group Colors - Neutral When Unselected */
--group-unselected: #6c757d;            /* Gray - low visual weight */
--group-unselected-bg: rgba(108, 117, 125, 0.08);
--group-selected: #0d6efd;              /* Blue when selected */
--group-selected-bg: rgba(13, 110, 253, 0.1);

/* Alignment Guides */
--alignment-guide: #fd7e14;             /* Orange - only for guides */
--alignment-guide-shadow: rgba(253, 126, 20, 0.3);

/* Handle Colors */
--handle-fill: #0d6efd;                 /* Blue fill */
--handle-border: #ffffff;               /* White border */
--handle-size: 12px;                    /* Increased from 10px */
```

**Key Changes:**
- ❌ Remove orange (#fd7e14) from reference widget
- ❌ Remove old blue (#007bff)
- ✅ Use single blue (#0d6efd) for all selection states
- ✅ Differentiate with border width and effects, not color

---

## 1. Selection Indicators

### Single Object Selection

**Visual Treatment:**
- **Border:** 2px solid blue (#0d6efd)
- **Shadow:** Subtle blue glow (0 0 5px rgba(13, 110, 253, 0.3))
- **Handles:** 8 resize handles (4 corners + 4 edges)
- **Handle size:** 12px diameter (up from 10px)
- **Cursor:** Move cursor (four-way arrows)

```css
.widget.selected {
    border: 2px solid var(--selection-primary);
    box-shadow: 0 0 5px var(--selection-shadow);
}
```

### Multiple Object Selection

**All Selected Objects:**
- Same visual treatment as single selection
- All show 2px blue border
- All show subtle shadow

**Reference Widget (Alignment Anchor):**
- **Border:** 3px solid blue (#0d6efd) - THICKER than others
- **Inner effect:** 1px white border inside for double-line appearance
- **Shadow:** Slightly stronger glow
- **Visual hierarchy:** Clearly the "main" selection

```css
.widget.selected.reference-widget {
    border: 3px solid var(--selection-primary);
    box-shadow:
        inset 0 0 0 1px var(--reference-inner-border),  /* Inner white line */
        0 0 8px var(--selection-shadow);                 /* Stronger glow */
}
```

**Setting Reference Widget (Illustrator Pattern):**
1. User selects multiple widgets (all show 2px blue border)
2. User **clicks on one selected widget again**
3. That widget's border thickens to 3px + double-line effect
4. Properties panel shows: "Aligning to: [Widget Name]"

### Hover State (Before Selection)

**Visual Treatment:**
- **Border:** 2px solid rgba(13, 110, 253, 0.4) - Semi-transparent blue
- **Background:** Very subtle rgba(13, 110, 253, 0.05)
- **Cursor:** Pointer cursor
- **Transition:** Smooth 150ms ease

```css
.widget:hover:not(.selected) {
    border: 2px solid var(--hover-border);
    background-color: var(--hover-bg);
    cursor: pointer;
    transition: all 150ms ease;
}
```

---

## 2. Resize Handles - 8-Handle System

### Handle Configuration

**Current (4 handles):**
- NW, NE, SW, SE (corners only)

**New (8 handles):**
- **4 Corners:** NW, NE, SW, SE (diagonal resize)
- **4 Edges:** N, E, S, W (horizontal/vertical only resize)

### Visual Design

**All Handles:**
- **Size:** 12px × 12px (increased from 10px)
- **Shape:** Circular
- **Fill:** Blue (#0d6efd)
- **Border:** 1.5px solid white
- **Shadow:** 0 0 3px rgba(0, 0, 0, 0.3)
- **Position:** -6px offset from edge (so they straddle the border)

```css
.resize-handle {
    width: 12px;
    height: 12px;
    background-color: var(--handle-fill);
    border: 1.5px solid var(--handle-border);
    border-radius: 50%;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
    position: absolute;
    z-index: 1000;
}
```

### Handle Positions & Cursors

```typescript
// Corner handles - Diagonal resize
.resize-handle.nw { top: -6px; left: -6px; cursor: nw-resize; }
.resize-handle.ne { top: -6px; right: -6px; cursor: ne-resize; }
.resize-handle.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
.resize-handle.se { bottom: -6px; right: -6px; cursor: se-resize; }

// Edge handles - Directional resize (NEW)
.resize-handle.n { top: -6px; left: calc(50% - 6px); cursor: n-resize; }
.resize-handle.s { bottom: -6px; left: calc(50% - 6px); cursor: s-resize; }
.resize-handle.e { top: calc(50% - 6px); right: -6px; cursor: e-resize; }
.resize-handle.w { top: calc(50% - 6px); left: -6px; cursor: w-resize; }
```

### Resize Behavior

**Corner Handles:**
- Default: Free resize (both width and height)
- With **Shift:** Maintain aspect ratio
- With **Alt:** Resize from center

**Edge Handles:**
- **North/South:** Height only
- **East/West:** Width only
- With **Shift:** No effect (already constrained)
- With **Alt:** Resize from center

---

## 3. Group Widget Visual Design

### Unselected Group

**Visual Treatment:**
- **Border:** 2px dashed #6c757d (gray, not blue)
- **Background:** Very subtle rgba(108, 117, 125, 0.08)
- **Icon:** Small group icon (📁 or stacked squares) in top-left corner
- **Text:** No "GROUP" label (replaced with icon)
- **Shadow:** None (low visual weight)

```css
.widget[data-type="group"] {
    border: 2px dashed var(--group-unselected);
    background-color: var(--group-unselected-bg);
    box-shadow: none;
}
```

**Group Icon:**
```css
.group-icon {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 20px;
    height: 20px;
    background-color: var(--group-unselected);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.group-icon::before {
    content: "⧉";  /* Unicode: Squared Square */
    color: white;
    font-size: 12px;
}
```

### Selected Group

**Visual Treatment:**
- **Border:** 2px dashed #0d6efd (blue, matches other selections)
- **Background:** rgba(13, 110, 253, 0.1) - more visible
- **Shadow:** 0 0 8px rgba(13, 110, 253, 0.2)
- **Handles:** Show resize handles
- **Icon:** Blue icon instead of gray

```css
.widget[data-type="group"].selected {
    border: 2px dashed var(--group-selected);
    background-color: var(--group-selected-bg);
    box-shadow: 0 0 8px var(--selection-shadow);
}

.widget[data-type="group"].selected .group-icon {
    background-color: var(--group-selected);
}
```

### Reference Group (If Group is Reference Widget)

**Visual Treatment:**
- **Border:** 3px dashed #0d6efd (thicker, like other reference widgets)
- **Inner effect:** Subtle white inner glow
- **Everything else:** Same as selected group

```css
.widget[data-type="group"].selected.reference-widget {
    border: 3px dashed var(--group-selected);
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.3),
        0 0 12px var(--selection-shadow);
}
```

---

## 4. Alignment Guides (Future Enhancement)

### Dynamic Alignment Lines

**When Dragging Widget:**
- Orange dashed lines appear when widget edges align with other widgets
- Lines snap when within 5px threshold
- Show alignment for: left, right, top, bottom, center-x, center-y

**Visual Design:**
```css
.alignment-guide {
    position: absolute;
    border: 1px dashed var(--alignment-guide);
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 0 3px var(--alignment-guide-shadow);
}

.alignment-guide.vertical {
    width: 1px;
    height: 100%; /* Spans canvas height */
}

.alignment-guide.horizontal {
    width: 100%; /* Spans canvas width */
    height: 1px;
}
```

**Behavior:**
```typescript
// Show when widget edge is within 5px of another widget edge
const SNAP_THRESHOLD = 5;

// Guide types
interface AlignmentGuide {
    type: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';
    position: number;
    targetWidget: string; // Widget ID we're aligning to
}
```

---

## 5. Selection Box (Marquee Selection)

### Current Design (Keep Mostly Same)

**Visual Treatment:**
- **Border:** 1px dashed #0d6efd
- **Background:** rgba(13, 110, 253, 0.1)
- **Optional:** Animated "marching ants" effect

**Enhanced Version:**
```css
.selection-box {
    position: absolute;
    border: 1px dashed var(--selection-primary);
    background-color: var(--selection-glow);
    pointer-events: none;
    z-index: 10000;
}

/* Optional: Marching ants animation */
@keyframes marching-ants {
    0% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: 12px; }
}

.selection-box.animated {
    animation: marching-ants 0.5s linear infinite;
}
```

---

## 6. Properties Panel - Reference Widget Indicator

### Display Current Reference

**When Multiple Widgets Selected:**

```html
<div class="reference-widget-indicator">
    <div class="indicator-icon">
        <svg><!-- Anchor icon --></svg>
    </div>
    <div class="indicator-text">
        <span class="label">Aligning to:</span>
        <span class="widget-name">Text Widget 1</span>
    </div>
    <button class="change-reference-btn" title="Click another selected widget to change">
        <svg><!-- Info icon --></svg>
    </button>
</div>
```

**Styling:**
```css
.reference-widget-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: rgba(13, 110, 253, 0.1);
    border-left: 3px solid var(--selection-primary);
    margin-bottom: 12px;
    font-size: 13px;
}

.indicator-icon svg {
    width: 16px;
    height: 16px;
    fill: var(--selection-primary);
}

.widget-name {
    font-weight: 600;
    color: var(--selection-primary);
}

.change-reference-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: help;
    opacity: 0.6;
}
```

---

## 7. User Interaction Flow

### Setting Reference Widget

**Current Behavior:**
- First selected widget automatically becomes reference
- User has no control

**New Behavior (Illustrator Pattern):**

1. **User selects Widget A** (Shift+Click or Marquee)
   - Widget A shows 2px blue border
   - Widget A is automatically the reference (it's the only one)

2. **User adds Widget B to selection** (Shift+Click)
   - Widget A: 3px blue border + double-line effect (reference)
   - Widget B: 2px blue border (selected)
   - Properties panel: "Aligning to: Widget A"

3. **User clicks Widget B again** (while it's already selected)
   - Widget A: Changes to 2px border (no longer reference)
   - Widget B: Changes to 3px border + double-line (now reference)
   - Properties panel: "Aligning to: Widget B"

4. **User aligns left**
   - Widget B stays in place
   - Widget A moves to align with Widget B's left edge

### Alternative: Context Menu

Right-click on selected widget:
```
┌─────────────────────────┐
│ Copy                    │
│ Paste                   │
│ Delete                  │
├─────────────────────────┤
│ ✓ Use as Alignment Anchor│  ← Checkbox shows if this is reference
├─────────────────────────┤
│ Bring to Front          │
│ Send to Back            │
└─────────────────────────┘
```

---

## 8. Keyboard Shortcuts & Interactions

### Selection

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Select widget | Click | Single selection, becomes reference |
| Add to selection | Shift+Click | Add to selection, previous reference stays |
| Toggle selection | Ctrl+Click (Win)<br>Cmd+Click (Mac) | Toggle widget in/out of selection |
| Select all | Ctrl+A / Cmd+A | Select all widgets |
| Deselect all | Esc | Clear selection |
| Marquee select | Click+Drag empty space | Rectangle selection |
| Set as reference | Click selected widget again | Make it the reference widget |

### Alignment (With Reference Widget)

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Align left | Ctrl+Shift+L | Align to reference widget's left edge |
| Align right | Ctrl+Shift+R | Align to reference widget's right edge |
| Align top | Ctrl+Shift+T | Align to reference widget's top edge |
| Align bottom | Ctrl+Shift+B | Align to reference widget's bottom edge |
| Center horizontal | Ctrl+Shift+H | Center relative to reference widget |
| Center vertical | Ctrl+Shift+V | Center relative to reference widget |

### Resize

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Free resize | Drag corner handle | Resize both dimensions |
| Constrain aspect | Shift+Drag corner | Maintain proportions |
| Resize from center | Alt+Drag handle | Scale from center point |
| Height only | Drag N/S edge handle | Resize height, width stays same |
| Width only | Drag E/W edge handle | Resize width, height stays same |

---

## 9. Implementation Priority

### Phase 1: Core Visual Improvements (Week 1)
**Low risk, high visual impact**

✅ **Files to modify:**
- `designer.css` - Update all color values
- `widget.ts` - Change reference widget styling
- `group-widget.ts` - Update group visual design

**Tasks:**
1. Replace orange (#fd7e14) with blue double-border for reference widget
2. Change unselected groups from blue to gray
3. Update selected group to blue
4. Add hover states with semi-transparent blue
5. Increase handle size from 10px to 12px
6. Add CSS variables for color consistency

**Testing:**
- Visual regression testing
- Ensure selection still works correctly
- Verify group appearance changes

---

### Phase 2: Enhanced Resize Handles (Week 2)
**Medium risk, professional feature**

✅ **Files to modify:**
- `widget.ts` - Add 4 more resize handles
- `types.ts` - Add new ResizeHandlePosition values
- `designer-core.ts` - Handle new resize directions

**Tasks:**
1. Add North, South, East, West handle positions to enum
2. Create 4 additional resize handles in DOM
3. Position handles at edge midpoints
4. Update resize logic to handle directional resizing
5. Update cursors for each handle type
6. Test with all widget types

**Edge Cases:**
- Very small widgets (handles might overlap)
- Rotated widgets (future consideration)
- Groups (handle inheritance)

---

### Phase 3: Interactive Reference Widget Selection (Week 3)
**Medium risk, UX improvement**

✅ **Files to modify:**
- `selection-manager.ts` - Add click-to-set-reference logic
- `main.ts` - Handle widget click when already selected
- `properties-manager.ts` - Add reference widget indicator UI

**Tasks:**
1. Detect when user clicks an already-selected widget
2. Call `setReferenceWidget()` on selection manager
3. Update visual indicators (thicken border)
4. Add "Aligning to: [name]" display in properties panel
5. Add tooltip/help text to explain the feature

**User Education:**
- Add small "?" help icon next to alignment buttons
- Tooltip: "Click a selected widget to make it the alignment anchor"
- Consider one-time tutorial overlay

---

### Phase 4: Alignment Guides (Week 4)
**High effort, nice-to-have**

✅ **Files to modify:**
- `designer-drag.ts` - Add snap detection during drag
- `alignment-guides.ts` - NEW FILE for guide rendering
- `designer.css` - Add alignment guide styles

**Tasks:**
1. Create alignment guide rendering system
2. Detect when widget edges are within 5px of other widgets
3. Show orange dashed lines for aligned edges
4. Snap widget position when guide appears
5. Remove guides on drag end
6. Performance optimization (debounce, only check visible widgets)

**Performance Considerations:**
- Only check alignment with nearby widgets (spatial indexing)
- Throttle calculations to 60fps max
- Clear guides immediately on mouseup

---

### Phase 5: Polish & Optimization (Week 5)
**Code quality, performance**

✅ **Tasks:**
1. Remove excessive console.log statements
2. Refactor z-index management (remove !important where possible)
3. Add TypeScript documentation
4. Create unit tests for selection-manager
5. Performance profiling for large canvases (50+ widgets)
6. Accessibility improvements (ARIA labels for handles)
7. Write user documentation

---

## 10. Testing Plan

### Visual Testing

**Selection States:**
- [ ] Single widget selection shows 2px blue border
- [ ] Hover shows semi-transparent blue border
- [ ] Reference widget shows 3px blue border with double-line effect
- [ ] Multiple selection shows all borders correctly
- [ ] Clicking selected widget changes reference (visual update)

**Resize Handles:**
- [ ] All 8 handles appear on selected widget
- [ ] Handles are 12px and easily clickable
- [ ] Corner handles show diagonal cursors
- [ ] Edge handles show directional cursors
- [ ] Handles don't overlap on small widgets

**Groups:**
- [ ] Unselected groups have gray dashed border
- [ ] Selected groups have blue dashed border
- [ ] Reference groups have thicker blue border
- [ ] Group icon appears in top-left
- [ ] Group moves all children correctly

### Functional Testing

**Reference Widget:**
- [ ] First selected widget is automatically reference
- [ ] Clicking selected widget makes it reference
- [ ] Properties panel shows "Aligning to: [name]"
- [ ] Alignment operations use reference as anchor
- [ ] Reference persists through other operations (drag, resize)

**Resize Operations:**
- [ ] Corner handles resize both dimensions
- [ ] Shift+Corner maintains aspect ratio
- [ ] Alt+Handle resizes from center
- [ ] Edge handles resize single dimension only
- [ ] Minimum size enforced (10px × 10px)

**Alignment Operations:**
- [ ] Align Left: Other widgets move to reference's left edge
- [ ] Align Right: Other widgets move to reference's right edge
- [ ] Align Top: Other widgets move to reference's top edge
- [ ] Align Bottom: Other widgets move to reference's bottom edge
- [ ] Center: Other widgets center on reference

### Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Performance Testing

- [ ] 10 widgets: Smooth interaction
- [ ] 50 widgets: Acceptable performance
- [ ] 100 widgets: Identify bottlenecks
- [ ] Large images: Memory usage acceptable

---

## 11. Documentation Updates

### For Users

**Designer Help Page:**
```markdown
## Selection & Alignment

### Selecting Widgets
- **Click** a widget to select it
- **Shift+Click** to add widgets to selection
- **Click+Drag** empty space to select multiple widgets

### Reference Widget (Alignment Anchor)
When multiple widgets are selected, one widget acts as the **alignment anchor**:
- The reference widget has a **thicker blue border**
- Other widgets align to the reference widget's edges
- **Click a selected widget again** to make it the reference widget
- The properties panel shows "Aligning to: [widget name]"

### Resizing Widgets
- **Corner handles** (diagonal): Resize both width and height
- **Edge handles** (N/S/E/W): Resize single dimension
- **Shift+Drag**: Maintain aspect ratio
- **Alt+Drag**: Resize from center
```

### For Developers

**Code Documentation:**
```typescript
/**
 * Sets a widget as the reference widget for alignment operations.
 * The reference widget will remain stationary when alignment commands
 * are executed, while other selected widgets will move to align with it.
 *
 * Visual indicator: 3px blue border with double-line effect (vs 2px for normal selection)
 *
 * @param widgetId - The ID of the widget to set as reference
 * @throws {Error} If widget is not currently selected
 *
 * @example
 * // User clicks an already-selected widget
 * selectionManager.setReferenceWidget('widget-123');
 */
public setReferenceWidget(widgetId: string): void
```

---

## 12. Success Metrics

### User Experience
- ✅ Users can successfully set reference widget without instruction
- ✅ Alignment operations feel predictable and professional
- ✅ Visual hierarchy is clear (selection vs reference vs groups)
- ✅ Resize handles are easily discoverable and clickable

### Technical
- ✅ No performance degradation with new features
- ✅ All existing functionality continues to work
- ✅ Code coverage increases (especially selection-manager)
- ✅ No regression bugs in production

### Design Quality
- ✅ Consistent blue color palette throughout
- ✅ Professional appearance matching industry tools
- ✅ Accessible to users with visual impairments
- ✅ Works on all supported browsers

---

## 13. Future Enhancements

### Beyond Initial Implementation

**Rotation Handles:**
- Small circular handle above top-center
- Rotate around center point
- Shift for 15° increments

**Smart Guides:**
- Distance measurements between objects
- Equal spacing indicators
- Golden ratio guides

**Selection History:**
- Cmd+D to reselect previous selection
- Selection sets/bookmarks

**Advanced Grouping:**
- Double-click group to enter edit mode
- Edit individual elements without ungrouping
- Nested group visual hierarchy

**Context-Aware Alignment:**
- Align to canvas edges (in addition to reference widget)
- Align to artboard/frame boundaries
- Align to grid

---

## Summary

This implementation concept brings Yuzu's designer to professional standards by:

1. **Adopting industry-proven patterns** (Illustrator's key object, 8-handle system)
2. **Improving visual clarity** (single blue palette, thicker border for reference)
3. **Giving users control** (click to set reference widget)
4. **Adding missing features** (4 edge resize handles, hover states)
5. **Maintaining backwards compatibility** (all existing features still work)

The phased implementation approach minimizes risk while delivering visible improvements quickly.

**Next Step:** Review this concept, then proceed with Phase 1 implementation.
