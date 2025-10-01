# Designer Debugging Guide

> **Last Updated:** 2025-10-01
> **Purpose:** Guide for debugging performance issues, memory leaks, and object lifecycle problems in the Designer

---

## Table of Contents

1. [Overview](#overview)
2. [Performance Monitor](#performance-monitor)
3. [Common Issues](#common-issues)
4. [Debugging Tools](#debugging-tools)
5. [Memory Leak Detection](#memory-leak-detection)
6. [Console Commands](#console-commands)

---

## Overview

The Designer includes comprehensive debugging tools to help diagnose:
- **Memory leaks** - Objects not being garbage collected
- **Performance bottlenecks** - Slow operations causing UI lag
- **Object lifecycle issues** - Widgets not being properly created/destroyed
- **Event listener leaks** - Event handlers not being cleaned up
- **DOM node accumulation** - Excessive DOM elements

---

## Performance Monitor

The Designer automatically enables the Performance Monitor on initialization. It tracks:

### Widget Lifecycle
- Widget creation count
- Widget deletion count
- Active widget count
- Widget lifespan tracking

### Operations
- Command executions
- Drag/move operations
- Resize operations
- Operation duration timing

### Memory Metrics
- JavaScript heap size (Chrome only)
- Memory usage percentage
- Memory growth trends
- Periodic snapshots (every 10 seconds)

### Event Listeners
- Active event listener count per element
- Event handler registration/removal tracking
- Leak detection for orphaned listeners

---

## Common Issues

### 1. Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Slow performance after extended use
- Browser becomes unresponsive

**Causes:**
- Event listeners not removed when widgets deleted
- Circular references preventing garbage collection
- DOM nodes not properly removed
- Closures capturing large objects

**Detection:**
- Check for widget count mismatch (created vs active)
- Monitor memory growth in snapshots
- Look for excessive event listeners

**Example Console Warning:**
```
[MemoryLeak] Widget count mismatch! Expected: 5, Actual: 12, Diff: 7
[MemoryLeak] Excessive event listeners: 1523
[MemoryLeak] Rapid memory growth detected: 67.34% over last 10 snapshots
```

### 2. Excessive Object Creation

**Symptoms:**
- Slow drag operations
- Laggy UI interactions
- High CPU usage

**Causes:**
- Creating new objects on every mouse move
- Not reusing existing objects
- Deep cloning in tight loops
- Unnecessary object allocations

**Detection:**
- Check drag operation duration
- Monitor object creation rate

**Example Console Warning:**
```
[Performance] Slow operation: drag_move took 247ms
```

### 3. Event Listener Accumulation

**Symptoms:**
- Multiple handlers firing for single event
- Increasing memory usage
- Event handling getting slower

**Causes:**
- Adding listeners without removing old ones
- Not using `removeEventListener` in cleanup
- Re-registering listeners on updates

**Detection:**
- Monitor event listener count
- Check for duplicate handlers

---

## Debugging Tools

### 1. Performance Report Button

Add a debug button to your Designer page:

```html
<button id="btn-debug-report" class="btn btn-secondary">
    <i class="fas fa-bug"></i> Debug Report
</button>
```

When clicked, shows:
- Widget statistics
- Memory usage
- Event listener counts
- Option to download full JSON report

### 2. Console Commands

Access the Performance Monitor from the browser console:

```javascript
// Get current performance report
window.PerformanceMonitor.printReport()

// Download detailed JSON report
window.PerformanceMonitor.downloadReport()

// Capture immediate memory snapshot
window.PerformanceMonitor.captureMemorySnapshot()

// Get event listener report
window.PerformanceMonitor.getEventListenerReport()

// Get widget information
window.designer.perfMonitor.generateReport()
```

### 3. Chrome DevTools Memory Profiler

1. Open Chrome DevTools (F12)
2. Go to Memory tab
3. Take heap snapshot before operation
4. Perform operation (e.g., create 50 widgets)
5. Take another heap snapshot
6. Compare snapshots to find retained objects

### 4. Performance Timeline

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform operation
5. Stop recording
6. Analyze timeline for:
   - Long tasks (> 50ms)
   - Excessive scripting
   - Forced reflows
   - Memory spikes

---

## Memory Leak Detection

The Performance Monitor automatically detects:

### Widget Count Mismatch

```
Created: 100 widgets
Deleted: 85 widgets
Expected Active: 15 widgets
Actual DOM Nodes: 27 widgets
LEAK: 12 widgets not cleaned up
```

**How to Fix:**
1. Check `widget.destructor()` is called
2. Ensure DOM node removed: `element.remove()`
3. Clear all references in Maps/Sets
4. Remove all event listeners

### Event Listener Leaks

```
Event Listeners: 1,234 active
Expected for 15 widgets: ~60-90
LEAK: ~1,150 orphaned listeners
```

**How to Fix:**
1. Use bound handlers: `this.boundHandler = this.handler.bind(this)`
2. Remove in destructor: `element.removeEventListener('click', this.boundHandler)`
3. Track all registrations
4. Use AbortController for modern cleanup

### Memory Growth Pattern

```
Snapshot 1: 45.2 MB
Snapshot 10: 125.8 MB
Growth Rate: 178.3% over 90 seconds
LEAK: Rapid unbounded growth detected
```

**How to Fix:**
1. Profile with Chrome DevTools
2. Look for "Detached DOM tree" objects
3. Check for closures capturing large objects
4. Verify timer cleanup (`clearInterval`, `clearTimeout`)

---

## Console Commands

### Basic Inspection

```javascript
// Check current widget count
window.designer.widgets.size

// Get all widget IDs
Array.from(window.designer.widgets.keys())

// Check selection state
window.designer.selectionManager.getSelectedWidgetIds()

// Check command stacks
window.designer.commandManager.canUndo()
window.designer.commandManager.canRedo()
```

### Performance Analysis

```javascript
// Enable/disable monitoring
window.PerformanceMonitor.enable()
window.PerformanceMonitor.disable()

// Get detailed metrics
const report = window.PerformanceMonitor.generateReport()
console.table(report.summary)

// Check active operations
report.activeObjects.operations
```

### Memory Diagnosis

```javascript
// Check memory (Chrome only)
if (performance.memory) {
    console.log(`Used: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`)
    console.log(`Total: ${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`)
    console.log(`Limit: ${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`)
}

// Get memory snapshots
const snapshots = window.PerformanceMonitor.metrics.memorySnapshots
console.table(snapshots.slice(-10)) // Last 10 snapshots
```

### Event Listener Audit

```javascript
// Get all event listeners
const listeners = window.PerformanceMonitor.getEventListenerReport()
console.table(listeners)

// Find suspicious listener counts
listeners.filter(l => l.handlerCount > 10)
```

### Widget Lifecycle Audit

```javascript
// Check widget lifecycle
const widgets = window.PerformanceMonitor.activeObjects
const activeWidgets = []
widgets.forEach((obj, key) => {
    if (key.startsWith('widget_') && obj.alive) {
        activeWidgets.push({
            id: obj.id,
            type: obj.type,
            age: Date.now() - obj.createdAt
        })
    }
})
console.table(activeWidgets)
```

---

## Best Practices

### 1. Always Clean Up

```javascript
// GOOD: Proper cleanup
destructor() {
    // Remove event listeners
    this.element.removeEventListener('click', this.boundClickHandler)
    this.element.removeEventListener('mousedown', this.boundMouseDownHandler)

    // Remove from DOM
    if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element)
    }

    // Clear references
    this.resizeHandles.clear()
    this.contentElement = null
}

// BAD: Missing cleanup
destructor() {
    this.element.remove() // Listeners still attached!
}
```

### 2. Use Bound Handlers

```javascript
// GOOD: Reusable bound handler
constructor() {
    this.boundClickHandler = this.handleClick.bind(this)
    element.addEventListener('click', this.boundClickHandler)
}

destructor() {
    element.removeEventListener('click', this.boundClickHandler)
}

// BAD: Anonymous function (can't remove)
constructor() {
    element.addEventListener('click', () => this.handleClick())
}
```

### 3. Avoid Creating Objects in Loops

```javascript
// GOOD: Reuse object
const point = { x: 0, y: 0 }
widgets.forEach(widget => {
    point.x = widget.position.x
    point.y = widget.position.y
    // Use point...
})

// BAD: Create new object every iteration
widgets.forEach(widget => {
    const point = { x: widget.position.x, y: widget.position.y }
})
```

### 4. Throttle High-Frequency Events

```javascript
// GOOD: Throttle mouse move
let lastUpdate = 0
function handleMouseMove(e) {
    const now = Date.now()
    if (now - lastUpdate < 16) return // 60 FPS
    lastUpdate = now
    // Process event...
}

// BAD: Process every event
function handleMouseMove(e) {
    // Heavy processing on every pixel...
}
```

---

## Automated Testing

When testing, check the performance report:

```javascript
// In your test
const report = window.PerformanceMonitor.generateReport()

// Verify no leaks
expect(report.summary.widgetLeaks).toBe(0)

// Verify reasonable listener count
expect(report.summary.totalEventListeners).toBeLessThan(100)

// Verify memory not growing
const snapshots = report.memorySnapshots.slice(-5)
const firstMem = snapshots[0].memory.usedJSHeapSize
const lastMem = snapshots[4].memory.usedJSHeapSize
expect(lastMem).toBeLessThan(firstMem * 1.5) // Less than 50% growth
```

---

## Troubleshooting Guide

### Issue: Widgets not being deleted

1. Check destructor is called:
   ```javascript
   // Add breakpoint or log
   destructor() {
       console.log(`Deleting widget ${this.data.id}`)
       // ...
   }
   ```

2. Verify DOM removal:
   ```javascript
   // Check widget nodes
   document.querySelectorAll('.widget').length
   window.designer.widgets.size // Should match
   ```

3. Check for references:
   ```javascript
   // Search for widget ID in heap snapshot
   // Look for "Retained Size" in DevTools
   ```

### Issue: Slow drag operations

1. Check operation duration:
   ```javascript
   // Should be in Performance Monitor logs
   [Drag] Ended: move (duration: 45ms) // GOOD
   [Drag] Ended: move (duration: 234ms) // BAD
   ```

2. Profile the operation:
   - Open DevTools Performance tab
   - Record during drag
   - Look for long tasks

3. Check for unnecessary work:
   - Are you deep cloning on every mouse move?
   - Are you querying DOM repeatedly?
   - Are you triggering layout recalculations?

### Issue: Memory keeps growing

1. Take heap snapshots at intervals
2. Compare snapshots for "Detached DOM tree"
3. Look for arrays/maps growing unbounded
4. Check timer cleanup
5. Verify event listener removal

---

## Quick Reference

### Enable Debug Mode
```javascript
window.PerformanceMonitor.enable()
```

### Get Quick Stats
```javascript
const r = window.PerformanceMonitor.printReport()
```

### Download Full Report
```javascript
window.PerformanceMonitor.downloadReport()
```

### Force Memory Snapshot
```javascript
window.PerformanceMonitor.captureMemorySnapshot()
```

### Check for Leaks
```javascript
const report = window.PerformanceMonitor.generateReport()
if (report.summary.widgetLeaks > 0) {
    console.error(`Found ${report.summary.widgetLeaks} leaked widgets!`)
}
```

---

**End of Debugging Guide**
