# Selection & Grouping UI Research
**Date:** 2025-01-04
**Purpose:** Research industry standards and best practices for object selection, grouping, and visual indicators in design tools to improve the Yuzu Break Screen Designer interface.

---

## Executive Summary

Research into leading design tools (Figma, PowerPoint, Canva, Adobe suite, Microsoft Teams) reveals consistent patterns for selection indicators, resize handles, and grouping behaviors. Key findings:

- **Blue (#007bff to #0d6efd)** is the industry standard for selection indicators
- **8 resize handles** (4 corners + 4 edges) is standard, not 4
- **Hover states** with subtle highlights provide essential affordance
- **Groups** use dashed borders but with neutral colors when unselected
- **Alignment guides** (orange/yellow dashed lines) appear dynamically during drag operations
- **"Reference widget" / "Key Object" concept:**
  - ✅ **Adobe Illustrator HAS this feature** - user clicks selected object again to make it the key object
  - ✅ **PowerPoint uses automatic "extreme position" logic** (leftmost for left-align, etc.)
  - ❌ **Figma does NOT have this** (users requesting it since 2021)
  - ❌ **Canva does NOT have this**
  - **Yuzu's approach is valid but implementation needs refinement** (see detailed analysis below)

---

## Industry Tool Analysis

### 1. Figma (Industry Leader for UI/UX Design)

**Selection Indicators:**
- Single selection: **2px solid blue outline** (#0d6efd range)
- Resize handles: **8 handles** (4 corners + 4 edge midpoints) in bright blue
- Handle style: Small squares/circles with white border
- Multi-selection: All selected objects show blue outlines simultaneously

**Hover States:**
- Purple highlight boxes appear around element boundaries before clicking
- Provides immediate visual feedback for what's hoverable
- Cursor changes to indicate draggable state

**Grouping:**
- Visual distinction between "Groups" and "Frames"
- Groups: Dashed outline, minimal visual weight
- Frames: Solid outline, acts as container
- Selection colors can be customized for mixed selections

**Interaction Patterns:**
- Click to select
- Shift+Click to add to selection
- Cmd/Ctrl+G to group
- Double-click group to edit contents
- Selection toolbar appears contextually

**Key Insight:** Figma uses **subtle purple for hover**, **bright blue for selection** - clear two-stage visual hierarchy.

---

### 2. Microsoft PowerPoint (Desktop Standard)

**Selection Indicators:**
- Single selection: Solid border with 8 resize handles
- Handle style: Circles on corners, squares on edges
- Border color: Theme-based blue
- Shadow/glow effect around selected object

**Alignment Guides:**
- **Orange dashed lines** appear dynamically when moving objects
- Smart snapping to align with other objects
- Shows when objects are centered, edge-aligned, or evenly spaced
- Distance measurements shown between objects

**Grouping:**
- Groups show **single bounding box** with handles around entire group
- Group border disappears when not selected
- Individual items can't be selected when grouped (must ungroup first)
- Visual indicator shows "Group" in selection info

**Resize Interactions:**
- Shift key: Constrain proportions
- Ctrl key: Resize from center
- Rotation handle: Small circle above top-center handle

**Key Insight:** PowerPoint's **orange alignment guides** are extremely helpful and widely recognized by users.

---

### 3. Canva (Consumer Design Tool)

**Selection Indicators:**
- Purple boxes around element boundaries on hover
- Translucent purple selection area when dragging marquee
- Bright blue border when selected

**Selection Toolbar:**
- Floating toolbar appears when 2+ objects are selected
- Contains: Group, Duplicate, Lock, Delete, and More options
- Appears above selection, follows the selection around

**Grouping:**
- Cmd/Ctrl+G keyboard shortcut
- Group button in floating toolbar
- **Non-destructive:** Double-click to edit individual elements within group
- **Nested groups:** Supports groups within groups
- Group border style: Dashed when selected

**Multi-Select:**
- Shift+Click to add individual elements
- Click-and-drag for marquee selection
- Visual feedback: Purple translucent box during drag

**Key Insight:** Canva's **floating toolbar for multi-selection** provides contextual actions without cluttering the interface.

---

### 4. Adobe Illustrator / Photoshop (Professional Standard)

**IMPORTANT: Illustrator has "Key Object" Feature for Alignment**

Illustrator allows you to designate one object as the "key object" which stays in place during alignment operations:
- Select multiple objects
- Click one object again (while all are selected) to make it the key object
- Key object gets a **thicker border** (same blue color, just more prominent)
- Align panel switches to "Align to Key Object" mode
- When aligning, the key object stays in place, others move to it

**Selection Handles:**
- **8 handles** around bounding box (4 corners + 4 edges)
- Bounding box shown in bright blue
- Rotation handle: Small circle slightly offset from corner handle
- Center point indicator: Small crosshair in center

**Handle Behavior:**
- Corner handles: Proportional resize (with Shift)
- Edge handles: Width or height only
- Rotation handle: Rotate around center (45° increments with Shift)
- Alt/Option: Scale from center instead of opposite corner

**Cursor Feedback:**
- Double-arrow cursors for resize (↔ ↕ ⤢ ⤡)
- Rotation cursor (circular arrows)
- Move cursor (four-way arrows)
- Standard OS cursors, highly recognizable

**Selection Types:**
- Direct Selection (white arrow): Select individual anchor points
- Selection Tool (black arrow): Select entire objects
- Group Selection: Select items within groups

**Key Insight:** Adobe's **8 handles + rotation handle** is the professional standard, with keyboard modifiers for precise control.

---

### 5. Microsoft Teams Whiteboard

**Selection & Manipulation:**
- Selection rectangles appear around selected objects
- Drag entire group to move together
- Right-click context menu: "Bring to Front" / "Send to Back"
- Easy object snapping with alignment guides

**Limitations:**
- **Grouping without locking is not available** (as of 2024)
- This is a commonly requested feature
- Objects can be moved together via multi-select but not permanently grouped

**Alignment Features:**
- Automatic alignment guides appear during drag
- Smart snapping to other objects
- Visual grid overlay (can be toggled)

**Key Insight:** Even Microsoft's modern tools struggle with grouping UX - it's a complex feature that needs careful design.

---

### 6. Sketch App (Mac Design Standard)

**IMPORTANT: Reference Object Feature Added in Version 91**

Sketch added "align to reference object" functionality:
- Make a multi-layer selection
- **Click again on any layer** in that selection to make it a reference object
- When you use alignment controls, other layers align to the reference object
- Similar to Illustrator's "key object" approach

**2024 Updates:**
- Smart Animate: Automatically animates changes in position, size, rotation
- Custom layer visibility options
- Command Bar and Minimap for faster workflows
- Focus on performance and efficiency
- **Align to reference object** (Version 91)

**Selection Patterns:**
- Blue selection indicators (matches macOS standards)
- 8-handle resize system
- Nested symbols and groups
- Layer list shows selection state

**Single Layer Alignment:**
- Automatically aligns to immediate parent (group, Artboard, combined shape)
- Hold Option (⌥) to align to Artboard instead

**Key Insight:** Sketch **recently added reference object alignment**, joining Adobe Illustrator as a professional tool with this capability.

---

## Alignment Behavior Across Tools - CRITICAL FINDING

### Adobe Illustrator: Explicit "Key Object" Selection

**How it works:**
1. Select multiple objects (all show selection borders)
2. **Click one object again** while all are selected
3. That object shows a **thicker/darker border** - now it's the "Key Object"
4. Align panel automatically switches to "Align to Key Object" mode
5. When aligning, the key object **stays in place**, all others move to it

**User Control:**
- ✅ User explicitly chooses which object is the anchor
- ✅ Clear visual indicator (thicker border)
- ✅ Can change key object by clicking a different object
- ✅ Align panel shows current mode

**Visual Indicator:**
- Same blue color as selection
- Just thicker/more prominent border
- NOT a different color

### PowerPoint: Automatic "Extreme Position" Logic

**How it works:**
- When aligning multiple objects, **no visual indicator** of which is the anchor
- Algorithm automatically uses the most extreme positioned object:
  - **Align Left** → leftmost object stays in place
  - **Align Right** → rightmost object stays in place
  - **Align Top** → topmost object stays in place
  - **Align Bottom** → bottommost object stays in place
  - **Center Horizontally** → distributes around center
  - **Center Vertically** → distributes around center

**User Control:**
- ❌ No explicit control over which object is anchor
- ✅ Predictable behavior (extreme position)
- ✅ No extra clicks needed
- ⚠️ Can be confusing if user expects different behavior

**Visual Indicator:**
- None - all selected objects look identical

### Figma: Bounding Box Alignment (No Anchor Object)

**How it works:**
- Aligns objects to the **bounding box of the selection**
- No individual object explicitly serves as anchor
- Example with "Align Left":
  - Object A at x=100 (leftmost)
  - Object B at x=200
  - Bounding box left edge is at x=100
  - After align left: Both objects at x=100
  - **Object A appears stationary** (but only because it's already defining the bounding box edge)
  - **Object B moves** to match the bounding box edge

**What Actually Happens:**
- ALL objects can potentially move to match the bounding box edge
- The object that's already at the extreme position appears to "stay put"
- This is a **side effect** of bounding box alignment, not an intentional anchor
- Users have **no control** over which object defines the edge (it's always the extreme position)

**User Control:**
- ❌ No key object concept
- ❌ Users have been requesting this feature since 2021 (not implemented)
- ⚠️ Workaround: "Align To" plugin

**Distribution:**
- For distribute, uses extreme positioned objects as boundaries
- Leftmost and rightmost for horizontal distribution
- Topmost and bottommost for vertical distribution

**User Frustration:**
- "This basic workflow function" is frequently requested but not implemented
- If the extreme object isn't what you want as anchor, you must manually move objects first

### Canva: Page vs. Element Alignment

**How it works:**
- **Single element selected:** Aligns to page/canvas edges
- **Multiple elements selected:** Aligns relative to each other using extreme position
  - "Align Left" → aligns to the left edge of the leftmost shape
  - "Align Top" → aligns to the top of the topmost shape
  - Similar behavior to PowerPoint's automatic extreme position logic
- **Grouped elements:** Treats group as single object, aligns to page

**What Actually Happens:**
- When aligning multiple shapes left, both shapes align to the left edge of the first (leftmost) shape
- The extreme positioned object appears stationary
- Other objects move to match that edge
- This is **automatic** - user has no control over which object is the reference

**User Control:**
- ❌ Limited - depends on selection state
- ❌ No explicit anchor object selection
- ⚠️ Must reorder or reposition if you want a different object as the edge

### Summary Table: Alignment Anchor Behavior

| Tool | Anchor Method | What Happens | Visual Indicator | User Control | Industry Adoption |
|------|---------------|--------------|------------------|--------------|-------------------|
| **Adobe Illustrator** | User-selected key object | Key object stays, others move to it | Thicker border (same color) | ✅ Click to choose | Professional standard (established) |
| **Sketch** | User-selected reference object | Reference stays, others move to it | Not specified in docs | ✅ Click to choose | Professional standard (added v91) |
| **PowerPoint** | Automatic (extreme position) | Extreme object stays, others move | None | ❌ Always automatic | Consumer standard |
| **Figma** | Bounding box alignment | All align to box edge, extreme object appears stationary (side effect) | N/A | ❌ Users requesting since 2021 | Modern web (missing feature) |
| **Canva** | Extreme position (automatic) | Extreme object stays, others move | None | ❌ Always automatic | Consumer/web |
| **Yuzu (Current)** | First-selected widget | Reference stays, others move to it | Orange border | ⚠️ Automatic, can't change | Custom (needs improvement) |

**Key Distinction:**
- **Explicit Key Object** (Illustrator, Sketch, Yuzu): User chooses which object is the anchor
- **Automatic Extreme Position** (PowerPoint, Canva): System automatically uses the most extreme positioned object
- **Bounding Box** (Figma): Aligns to selection bounds, no true anchor (extreme object stays only as side effect)

### Implications for Yuzu

**What we're doing right:**
- ✅ Having an anchor concept for alignment (matches Illustrator philosophy)
- ✅ Visual indicator for the anchor object (matches Illustrator)

**What we should improve:**
- ❌ Orange color is too prominent and conflicts with other UI
- ❌ Automatic first-selection is less flexible than Illustrator's approach
- ❌ No way to change which object is the anchor without re-selecting
- ❌ Not documented/discoverable for users

**Recommended approach:**
1. **Keep the reference widget concept** (it's professionally valid)
2. **Change visual indicator** to match Illustrator:
   - Use same blue color as selection
   - Make border thicker (3px vs 2px) or add double-border effect
   - Remove orange color entirely
3. **Allow user to change reference widget:**
   - Click on a selected object again to make it the reference
   - Or add explicit "Set as Reference" in context menu
4. **Add mode indicator** in properties panel: "Aligning to: [Widget Name]"

---

## General UX Best Practices

### Visual Indicator Design

**Color Selection:**
> "It is more important that the color creates enough contrast with the other element's color, than the color itself."

- **Contrast over specific color choice**
- **Subtle borders:** Only slightly darker than background
- **Avoid harsh black outlines:** Use tinted borders instead
- **Brand color tinting:** Align borders/dividers with brand colors

**Multiple Visual Cues:**
> "Combining a unique icon with a color for each type of indicator performed best across UX metrics."

- Use both color AND shape/icon for maximum noticeability
- Don't rely on color alone (accessibility)
- Secondary cues increase likelihood users will notice

### Resize Handle Standards

**Industry Standard: 8 Handles**
- **4 Corners:** Proportional resize (diagonal cursors: ↖ ↗ ↙ ↘)
- **4 Edges:** Width or height only (directional cursors: ↔ ↕)
- **Handle Size:** 10-12px for desktop, larger for touch
- **Handle Style:** Circle or square with contrasting border
- **Handle Color:** Matches selection border color

**Placement:**
- Corners: Slightly outside the bounding box (-6px offset typical)
- Edges: Centered on each side
- Z-index: High enough to be above content

### Grouping Best Practices

**Visual Language:**
- **Unselected groups:** Subtle, low visual weight
  - Dashed or dotted border
  - Neutral color (gray, not bright blue)
  - Minimal or no background fill

- **Selected groups:** Clear, high visual weight
  - Solid or dashed border in selection color
  - Resize handles on bounding box
  - Slight background tint for visibility

**Interaction Patterns:**
- Single click: Select entire group
- Double click: Enter group editing mode (edit individual items)
- Drag: Move entire group as unit
- Ungroup: Cmd/Ctrl+Shift+G
- Nested groups: Allowed in modern tools

**Non-Destructive Editing:**
- Users should be able to edit group members without ungrouping
- Double-click or similar gesture to "enter" the group
- Clear visual indication when inside a group

---

## Current Yuzu Designer - Gap Analysis

### What We're Doing Right ✅
1. **Blue selection color** (#0d6efd) - matches industry standard
2. **Dashed borders for groups** - good visual pattern
3. **Marquee selection box** - standard pattern implemented
4. **Box shadow on selected objects** - adds depth

### Issues to Address ❌

#### 1. **Resize Handles: Only 4 instead of 8**
- **Current:** 4 corner handles only
- **Standard:** 8 handles (4 corners + 4 edges)
- **Impact:** Can't resize width or height independently
- **Location:** `widget.ts:411-416` creates only NW, NE, SW, SE

#### 2. **"Reference Widget" Concept - Partially Standard**
- **Current:** First selected widget gets orange border, used as alignment anchor
- **Adobe Illustrator:** HAS "Key Object" feature - click selected object again to set it as anchor, shows thicker border
- **PowerPoint:** Uses "extreme position" logic automatically (leftmost for left-align, etc.) - no visual indicator
- **Figma:** Does NOT have this (users requesting since 2021), aligns to bounding box
- **Canva:** Does NOT have this
- **Impact:** The concept is valid (Illustrator uses it), but implementation differs:
  - ✅ Illustrator: User explicitly chooses key object
  - ❌ Yuzu: Automatically uses first-selected (less control)
  - ❌ Yuzu: Orange color conflicts with other UI elements
- **Recommendation:** Keep the concept but improve the implementation
- **Location:** `widget.ts:42-50`, `selection-manager.ts:139-179`

#### 3. **No Hover States**
- **Current:** No visual feedback before clicking
- **Standard:** Subtle highlight on hover (Figma purple, PowerPoint light blue)
- **Impact:** Reduced affordance, unclear what's clickable

#### 4. **Group Visual Design Issues**
- **Current:** Blue dashed border (#007bff) when unselected, orange when selected
- **Standard:** Neutral (gray) when unselected, blue when selected
- **Current:** "GROUP" text label in corner
- **Standard:** Small icon or no label
- **Impact:** Visual clutter, non-standard appearance

#### 5. **Multiple Shades of Blue**
- Selection: `#0d6efd`
- Groups unselected: `#007bff`
- Reference widget: `#fd7e14` (orange)
- Inconsistent color usage

#### 6. **Small Handle Size**
- **Current:** 10px diameter
- **Standard:** 12px+ for better clickability
- **Impact:** Harder to grab handles precisely

#### 7. **No Alignment Guides**
- **Current:** No guides when dragging
- **Standard:** Orange/yellow dashed lines for alignment
- **Impact:** Harder to align objects precisely

#### 8. **Z-Index Issues**
- Excessive use of `!important` in group-widget.ts
- Complex z-index management (lines 45-50, 242-263, 318-336)
- Makes debugging difficult

---

## Specific Code Locations

### Selection Border Styling
**File:** `designer.css:114-117`
```css
.widget.selected {
    border-color: #0d6efd; /* Good - standard blue */
    box-shadow: 0 0 5px rgba(13, 110, 253, 0.3);
}
```

### Resize Handles
**File:** `widget.ts:410-441`
```typescript
private createResizeHandles(parent: HTMLElement): void {
    const positions: ResizeHandlePosition[] = [
        ResizeHandlePosition.NorthWest,
        ResizeHandlePosition.NorthEast,
        ResizeHandlePosition.SouthWest,
        ResizeHandlePosition.SouthEast
    ];
    // Missing: North, South, East, West
}
```

**File:** `designer.css:134-168`
```css
.resize-handle {
    position: absolute;
    width: 10px;  /* Could be 12px */
    height: 10px;
    background-color: #0d6efd;
    border: 1px solid #fff;
    border-radius: 50%;
}
```

### Reference Widget Styling
**File:** `designer.css:179-181`
```css
.reference-widget {
    border-color: #fd7e14 !important; /* orange border */
}
```

**File:** `selection-manager.ts:146-179`
```typescript
public setReferenceWidget(widgetId: string): void {
    // Entire concept should be removed
}
```

### Group Widget Styling
**File:** `designer.css:274-300`
```css
.widget[data-type="group"] {
    border: 3px dashed #007bff;  /* Should be gray when unselected */
    background-color: rgba(0, 123, 255, 0.15);
    z-index: 1000 !important;  /* Excessive !important */
}

.widget[data-type="group"].selected {
    border: 4px dashed #fd7e14;  /* Should be blue, not orange */
}
```

**File:** `group-widget.ts:227-232`
```typescript
this.groupIconElement.innerHTML = '<i class="group-indicator">GROUP</i>';
// Text label not standard, should be icon or nothing
```

### Selection Box (Marquee)
**File:** `designer.css:171-176`
```css
.selection-box {
    border: 1px dashed #0d6efd;
    background-color: rgba(13, 110, 253, 0.1);
    /* Good pattern, could increase opacity slightly */
}
```

---

## Recommended Changes

### Priority 1: Core Selection Improvements
1. **Add 4 more resize handles** (North, South, East, West edges)
2. **Improve "reference widget" visual indicator** (keep concept, change appearance):
   - Change from orange to blue (same color as selection)
   - Make border thicker (3px vs 2px) or add double-border effect
   - Allow user to change reference by clicking selected object again
3. **Add hover states** with subtle border highlight
4. **Increase handle size** from 10px to 12px

### Priority 2: Group Visual Redesign
1. **Unselected groups:** Gray dashed border (#6c757d)
2. **Selected groups:** Blue dashed border (#0d6efd)
3. **Remove "GROUP" text label**, add small icon instead
4. **Simplify z-index management**, reduce `!important` usage

### Priority 3: Enhanced UX
1. **Add alignment guides** (orange dashed lines during drag)
2. **Add rotation handle** (optional, for future)
3. **Add floating toolbar** for multi-selection actions
4. **Improve keyboard shortcuts** visibility

### Priority 4: Code Quality
1. **Refactor z-index management** in group-widget.ts
2. **Consolidate color constants** in CSS variables
3. **Remove excessive logging** in production
4. **Document selection behavior** clearly

---

## Color Palette Standardization

### Proposed Color System

```css
/* Selection & Interaction Colors */
--selection-primary: #0d6efd;        /* Blue - selected objects */
--selection-shadow: rgba(13, 110, 253, 0.3);
--hover-highlight: #e7f1ff;          /* Light blue - hover state */
--alignment-guide: #fd7e14;          /* Orange - alignment guides */
--handle-primary: #0d6efd;           /* Blue - resize handles */
--handle-border: #ffffff;            /* White - handle border */

/* Group Colors */
--group-unselected: #6c757d;         /* Gray - unselected groups */
--group-unselected-bg: rgba(108, 117, 125, 0.05);
--group-selected: #0d6efd;           /* Blue - selected groups */
--group-selected-bg: rgba(13, 110, 253, 0.1);

/* Canvas Colors */
--canvas-bg: #fafafa;
--canvas-grid: rgba(0, 0, 0, 0.1);
--selection-box-bg: rgba(13, 110, 253, 0.1);
```

### Recommended Color Updates
- Remove `#007bff` (old blue, inconsistent with #0d6efd)
- Remove `#fd7e14` orange for reference widget (keep concept, but use blue thicker border instead)
- Remove `#ff0000` for reference groups (not needed)
- Add reference widget indicator using same `#0d6efd` blue but thicker border (3px)

---

## Implementation Strategy

### Phase 1: Visual Cleanup (Low Risk)
- Update group colors to gray when unselected
- Increase handle size to 12px
- Add CSS variables for color consistency
- Add hover state styling

### Phase 2: Handle Improvements (Medium Risk)
- Add 4 edge resize handles (North, South, East, West)
- Update handle positioning logic
- Test resize interactions thoroughly

### Phase 3: Remove Reference Widget (Medium Risk)
- Remove reference widget styling from CSS
- Remove `setReferenceWidget()` from SelectionManager
- Update selection logic to treat all selected items equally
- Update documentation

### Phase 4: Alignment Guides (High Effort, Low Risk)
- Add alignment guide rendering during drag
- Implement snap-to-object logic
- Add distance measurements (optional)

### Phase 5: Code Quality (Ongoing)
- Refactor z-index management
- Remove console.log statements
- Add TypeScript documentation
- Create unit tests for selection manager

---

## Testing Checklist

### Selection Testing
- [ ] Single object selection shows blue border
- [ ] Multiple object selection shows blue border on all
- [ ] Hover state appears before clicking
- [ ] Selection persists during drag
- [ ] Click empty canvas deselects all

### Resize Handle Testing
- [ ] All 8 handles appear when selected
- [ ] Corner handles resize proportionally (with Shift)
- [ ] Edge handles resize width or height only
- [ ] Handles are clickable (minimum 12px target)
- [ ] Cursor changes appropriately for each handle

### Group Testing
- [ ] Unselected groups have gray dashed border
- [ ] Selected groups have blue dashed border
- [ ] Group moves all children together
- [ ] Group resize scales all children proportionally
- [ ] Double-click enters group editing mode (future)

### Alignment Guide Testing
- [ ] Orange guides appear when dragging
- [ ] Snaps to nearby objects
- [ ] Shows when centered
- [ ] Shows when edges align
- [ ] Guides disappear after drop

---

## References

### Web Search Results
- **Figma Selection Patterns:** Search query "Figma selection styles grouping visual design UI patterns"
- **PowerPoint Standards:** Search query "PowerPoint object selection handles grouping visual feedback"
- **Canva Best Practices:** Search query "Canva editor selection UI multiple objects grouping best practices"
- **Adobe Standards:** Search query "Adobe Illustrator Photoshop selection handles blue color UI standards"
- **UX Best Practices:** Search query "selection indicator visual design border outline color best practices UX"

### Industry Documentation
- Figma Best Practices: Components, styles, and shared libraries
- Microsoft Support: PowerPoint aligning, ordering, and grouping objects
- Canva Help Center: Group, layer, and align elements
- NN/g: Visual Indicators to Differentiate Items in a List
- Interaction Design Foundation: UI Color Palette best practices

---

## Appendix: Keyboard Shortcuts Comparison

| Action | Figma | PowerPoint | Canva | Adobe | Recommended for Yuzu |
|--------|-------|------------|-------|-------|---------------------|
| Select All | Cmd+A | Ctrl+A | Cmd+A | Cmd+A | Cmd/Ctrl+A |
| Deselect All | Cmd+D | Esc | Esc | Cmd+Shift+A | Esc |
| Group | Cmd+G | Ctrl+G | Cmd+G | Cmd+G | Cmd/Ctrl+G |
| Ungroup | Cmd+Shift+G | Ctrl+Shift+G | Cmd+Shift+G | Cmd+Shift+G | Cmd/Ctrl+Shift+G |
| Duplicate | Cmd+D | Ctrl+D | Cmd+D | Cmd+D | Cmd/Ctrl+D |
| Bring Forward | Cmd+] | Ctrl+] | - | Cmd+] | Cmd/Ctrl+] |
| Send Backward | Cmd+[ | Ctrl+[ | - | Cmd+[ | Cmd/Ctrl+[ |
| Bring to Front | Cmd+Shift+] | Ctrl+Shift+] | - | Cmd+Shift+] | Cmd/Ctrl+Shift+] |
| Send to Back | Cmd+Shift+[ | Ctrl+Shift+[ | - | Cmd+Shift+[ | Cmd/Ctrl+Shift+[ |
| Delete | Delete/Backspace | Delete | Delete | Delete | Delete/Backspace |
| Constrain Proportions | Shift+Drag | Shift+Drag | Shift+Drag | Shift+Drag | Shift+Drag |
| Resize from Center | Opt+Drag | Ctrl+Drag | - | Alt+Drag | Alt+Drag |

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Author:** Research compilation based on web search and code analysis
**Status:** Reference document for future UI improvements
