# Pointer Events Migration Plan

## Current State: Mouse Events Implementation

The Designer currently uses the traditional mouse event pattern:
- `mousedown` on canvas/widgets
- `mousemove` on document (added dynamically)
- `mouseup` on document (added dynamically)

### Known Issues with Current Approach

1. **Event Listener Leaks** - If `mouseup` never fires (mouse released outside window), document listeners remain attached
2. **No Touch Support** - Only works with mouse, not touch devices
3. **No Pen Support** - Doesn't handle stylus/pen input
4. **Missing Edge Cases** - No handling for pointer cancellation (e.g., browser loses focus)

## Pointer Events API: Modern Best Practice

### What Are Pointer Events?

Pointer Events unify mouse, touch, and pen input into a single event model:
- `pointerdown` - Pointer becomes active
- `pointermove` - Pointer moves
- `pointerup` - Pointer is released
- **`pointercancel`** - Pointer is interrupted (this is the key advantage!)

### Browser Support

✅ **Excellent** - Supported in all modern browsers:
- Chrome 55+ (2016)
- Firefox 59+ (2018)
- Safari 13+ (2019)
- Edge 12+ (2015)

## Migration Analysis

### Current Event Flow

```typescript
// designer-drag.ts
handleCanvasMouseDown(e: MouseEvent) {
    // 1. Determine drag type (move/resize/select)
    // 2. Store drag state
    // 3. Add document listeners
    document.addEventListener('mousemove', this.boundMouseMoveHandler);
    document.addEventListener('mouseup', this.boundMouseUpHandler);
}

handleDocumentMouseUp(e: MouseEvent) {
    // 1. Finalize operation (create command)
    // 2. Remove document listeners
    document.removeEventListener('mousemove', this.boundMouseMoveHandler);
    document.removeEventListener('mouseup', this.boundMouseUpHandler);
    // 3. Clear drag state
}
```

**Problem**: If `mouseup` doesn't fire, listeners stay attached forever.

### Proposed Pointer Events Flow

```typescript
// designer-drag.ts (migrated)
handleCanvasPointerDown(e: PointerEvent) {
    // 1. Capture the pointer (ensures all events come to this element)
    this.canvasElement.setPointerCapture(e.pointerId);

    // 2. Determine drag type (move/resize/select)
    // 3. Store drag state with pointer ID
    this.dragState = {
        pointerId: e.pointerId,  // Track which pointer
        type: DragType.Move,
        // ... rest of state
    };

    // 4. Add listeners to CANVAS (not document) - capture takes care of routing
    this.canvasElement.addEventListener('pointermove', this.boundPointerMoveHandler);
    this.canvasElement.addEventListener('pointerup', this.boundPointerUpHandler);
    this.canvasElement.addEventListener('pointercancel', this.boundPointerCancelHandler);
}

handleCanvasPointerUp(e: PointerEvent) {
    if (!this.dragState || this.dragState.pointerId !== e.pointerId) return;

    // 1. Finalize operation (create command)
    // 2. Release pointer capture
    this.canvasElement.releasePointerCapture(e.pointerId);
    // 3. Remove listeners
    this.cleanupPointerListeners();
    // 4. Clear drag state
}

handleCanvasPointerCancel(e: PointerEvent) {
    // THIS IS THE KEY IMPROVEMENT!
    // Fires when pointer is interrupted (e.g., browser alert, tab switch)
    if (!this.dragState || this.dragState.pointerId !== e.pointerId) return;

    // 1. Abort operation (revert to original state)
    this.revertDragOperation();
    // 2. Release pointer capture
    this.canvasElement.releasePointerCapture(e.pointerId);
    // 3. Remove listeners
    this.cleanupPointerListeners();
    // 4. Clear drag state
}
```

## Key Advantages

### 1. Pointer Capture Eliminates Need for Document Listeners

```typescript
// OLD: Document listeners can leak
document.addEventListener('mousemove', handler);  // Risky!

// NEW: Canvas listeners with capture - automatically cleaned up
element.setPointerCapture(pointerId);  // Routes all events to element
element.addEventListener('pointermove', handler);  // Safe, scoped to element
```

### 2. Built-in Interruption Handling

`pointercancel` fires automatically when:
- Browser window loses focus
- Alert/dialog appears
- User switches tabs
- Touch is interrupted by system gesture
- Pointer is captured by another element

**No more safety timeouts needed!**

### 3. Multi-Touch Support (Future)

Pointer events support multiple simultaneous pointers:
```typescript
// Track multiple pointers by ID
const activePointers = new Map<number, DragState>();

handlePointerDown(e: PointerEvent) {
    activePointers.set(e.pointerId, { /* state */ });
}
```

### 4. Better Performance

- Events attached to canvas, not document (fewer event bubbles)
- Pointer capture is hardware-accelerated
- Fewer event listener attach/detach operations

## Migration Checklist

### Phase 1: Core Event Migration (Low Risk)
- [ ] Replace `mousedown` → `pointerdown`
- [ ] Replace `mousemove` → `pointermove`
- [ ] Replace `mouseup` → `pointerup`
- [ ] Add `pointercancel` handler
- [ ] Test on mouse input (should be identical)

### Phase 2: Pointer Capture (Medium Risk)
- [ ] Implement `setPointerCapture()` in pointer down
- [ ] Implement `releasePointerCapture()` in pointer up/cancel
- [ ] Move listeners from document to canvas element
- [ ] Test pointer-outside-window scenarios
- [ ] Verify no listener leaks in DevTools

### Phase 3: Cleanup & Enhancement (Low Risk)
- [ ] Remove safety timeout fallbacks (no longer needed)
- [ ] Add pointer type detection (`e.pointerType: 'mouse' | 'touch' | 'pen'`)
- [ ] Add pressure sensitivity for pen input (optional)
- [ ] Test on touch devices (tablets/phones)
- [ ] Test on devices with pen input (Surface, iPad Pro)

### Phase 4: Advanced Features (Optional)
- [ ] Multi-touch support for multi-widget selection
- [ ] Pressure-based brush size (if drawing features added)
- [ ] Touch gesture support (pinch to zoom, rotate)

## Code Changes Required

### Files to Modify

1. **`src/designer/core/designer-drag.ts`**
   - Change event types: `MouseEvent` → `PointerEvent`
   - Add `pointerId` to `DragState` interface
   - Implement `pointercancel` handler
   - Replace document listeners with captured canvas listeners

2. **`src/designer/widget.ts`**
   - Update resize handle events: `mousedown` → `pointerdown`
   - Pass `PointerEvent` to resize handler

3. **`src/designer/selection-manager.ts`**
   - Remove safety timeout (no longer needed with `pointercancel`)
   - Update any mouse-specific logic

4. **`src/designer/types.ts`**
   - Add `pointerId?: number` to `DragState` interface

### Breaking Changes

**None** - Pointer events are backwards compatible. Existing mouse input works identically.

## Testing Strategy

### Unit Tests
```typescript
// Mock PointerEvent
const createPointerEvent = (type: string, props: any) => {
    return new PointerEvent(type, {
        pointerId: 1,
        pointerType: 'mouse',
        ...props
    });
};

it('should clean up on pointercancel', () => {
    const down = createPointerEvent('pointerdown', { clientX: 100, clientY: 100 });
    designer.handlePointerDown(down);

    const cancel = createPointerEvent('pointercancel', { pointerId: 1 });
    designer.handlePointerCancel(cancel);

    // Verify cleanup
    expect(designer.dragState).toBeNull();
});
```

### Manual Testing Scenarios
1. **Mouse outside window** - Drag widget, move mouse outside browser, release → Should cancel cleanly
2. **Browser alert** - Start drag, trigger alert() → Should cancel operation
3. **Tab switch** - Start drag, Cmd+Tab to switch apps → Should cancel
4. **Touch device** - Test on iPad/tablet with touch input
5. **Stylus** - Test with Apple Pencil or Surface Pen

## Estimated Effort

- **Phase 1**: 2-4 hours (basic migration)
- **Phase 2**: 4-6 hours (pointer capture implementation)
- **Phase 3**: 2-3 hours (cleanup and testing)
- **Phase 4**: 8-16 hours (optional advanced features)

**Total Core Migration**: 8-13 hours

## Rollback Plan

If issues arise:
1. Revert commits (migration is isolated to event handling)
2. Fall back to current mouse events + safety timeouts
3. No data loss risk (only affects event handling)

## Recommended Approach

### Option A: Full Migration (Recommended)
- Implement all of Phase 1-3
- Modern, clean solution
- Eliminates safety timeouts entirely
- Future-proof for touch/pen

### Option B: Hybrid Approach
- Keep current mouse events
- Add `pointercancel` polyfill for edge cases
- Keep safety timeouts as secondary fallback
- Less work, but doesn't get full benefits

### Option C: Status Quo
- Keep current implementation
- Rely on safety timeouts
- Works, but not best practice
- May have edge cases

## Recommendation

**Proceed with Option A (Full Migration)**

Reasons:
1. **Better reliability** - `pointercancel` is more reliable than timeouts
2. **Future-proof** - Touch/pen support built-in
3. **Cleaner code** - No need for safety net timeouts
4. **Low risk** - Pointer events are well-supported and backwards compatible
5. **Modest effort** - 8-13 hours for significant improvement

This should be a separate issue/PR after #42 is tested and merged.
