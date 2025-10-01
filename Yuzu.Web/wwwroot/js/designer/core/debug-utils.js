/**
 * Performance and Memory Debugging Utilities for Designer
 * Helps diagnose memory leaks, performance bottlenecks, and object lifecycle issues
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            eventListeners: new Map(), // Track active event listeners
            widgetCreations: 0,
            widgetDeletions: 0,
            commandExecutions: 0,
            dragOperations: 0,
            resizeOperations: 0,
            memorySnapshots: [],
            performanceMarks: new Map(),
            domMutations: 0,
            eventCounts: new Map()
        };

        this.isEnabled = false;
        this.startTime = Date.now();
        this.objectRegistry = new WeakMap(); // Track object references without preventing GC
        this.activeObjects = new Map(); // Strong references for active tracking
    }

    enable() {
        this.isEnabled = true;
        console.log('[PerformanceMonitor] Monitoring enabled');
        this.startMemoryMonitoring();
    }

    disable() {
        this.isEnabled = false;
        console.log('[PerformanceMonitor] Monitoring disabled');
    }

    /**
     * Track event listener registration
     */
    trackEventListener(element, eventType, handlerName, added = true) {
        if (!this.isEnabled) return;

        const key = `${element.id || element.className}_${eventType}`;
        if (!this.metrics.eventListeners.has(key)) {
            this.metrics.eventListeners.set(key, {
                element: element.tagName,
                eventType,
                handlers: []
            });
        }

        const listeners = this.metrics.eventListeners.get(key);
        if (added) {
            listeners.handlers.push({
                name: handlerName,
                timestamp: Date.now()
            });
            console.log(`[EventListener] Added: ${key} -> ${handlerName} (total: ${listeners.handlers.length})`);
        } else {
            const index = listeners.handlers.findIndex(h => h.name === handlerName);
            if (index >= 0) {
                listeners.handlers.splice(index, 1);
                console.log(`[EventListener] Removed: ${key} -> ${handlerName} (remaining: ${listeners.handlers.length})`);
            }
        }
    }

    /**
     * Get event listener report
     */
    getEventListenerReport() {
        const report = [];
        this.metrics.eventListeners.forEach((value, key) => {
            report.push({
                key,
                element: value.element,
                eventType: value.eventType,
                handlerCount: value.handlers.length,
                handlers: value.handlers.map(h => h.name)
            });
        });
        return report;
    }

    /**
     * Track widget lifecycle
     */
    trackWidgetCreated(widgetId, widgetType) {
        if (!this.isEnabled) return;

        this.metrics.widgetCreations++;
        this.activeObjects.set(`widget_${widgetId}`, {
            id: widgetId,
            type: widgetType,
            createdAt: Date.now(),
            alive: true
        });

        console.log(`[Widget] Created: ${widgetId} (type: ${widgetType}) - Total active: ${this.getActiveWidgetCount()}`);
    }

    trackWidgetDeleted(widgetId) {
        if (!this.isEnabled) return;

        this.metrics.widgetDeletions++;
        const widget = this.activeObjects.get(`widget_${widgetId}`);
        if (widget) {
            widget.alive = false;
            widget.deletedAt = Date.now();
            widget.lifespan = widget.deletedAt - widget.createdAt;
            console.log(`[Widget] Deleted: ${widgetId} (lifespan: ${widget.lifespan}ms)`);

            // Keep for analysis but mark as deleted
            setTimeout(() => {
                this.activeObjects.delete(`widget_${widgetId}`);
            }, 5000); // Keep for 5 seconds for analysis
        }
    }

    getActiveWidgetCount() {
        let count = 0;
        this.activeObjects.forEach(obj => {
            if (obj.alive) count++;
        });
        return count;
    }

    /**
     * Track command execution
     */
    trackCommand(commandName, type = 'execute') {
        if (!this.isEnabled) return;

        this.metrics.commandExecutions++;
        console.log(`[Command] ${type}: ${commandName} (total: ${this.metrics.commandExecutions})`);
    }

    /**
     * Track drag operations
     */
    trackDragStart(dragType, affectedWidgets) {
        if (!this.isEnabled) return;

        this.metrics.dragOperations++;
        const operationId = `drag_${Date.now()}`;
        this.activeObjects.set(operationId, {
            type: dragType,
            widgets: affectedWidgets,
            startTime: Date.now(),
            active: true
        });

        console.log(`[Drag] Started: ${dragType} affecting ${affectedWidgets.length} widgets`);
        return operationId;
    }

    trackDragEnd(operationId) {
        if (!this.isEnabled) return;

        const operation = this.activeObjects.get(operationId);
        if (operation) {
            operation.active = false;
            operation.duration = Date.now() - operation.startTime;
            console.log(`[Drag] Ended: ${operation.type} (duration: ${operation.duration}ms)`);

            setTimeout(() => {
                this.activeObjects.delete(operationId);
            }, 1000);
        }
    }

    /**
     * Memory monitoring
     */
    startMemoryMonitoring() {
        if (!this.isEnabled) return;

        // Take memory snapshot every 10 seconds
        this.memoryInterval = setInterval(() => {
            this.captureMemorySnapshot();
        }, 10000);
    }

    captureMemorySnapshot() {
        if (!this.isEnabled) return;

        const snapshot = {
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            metrics: {
                widgetCreations: this.metrics.widgetCreations,
                widgetDeletions: this.metrics.widgetDeletions,
                activeWidgets: this.getActiveWidgetCount(),
                commandExecutions: this.metrics.commandExecutions,
                dragOperations: this.metrics.dragOperations,
                eventListeners: this.metrics.eventListeners.size,
                domNodes: document.querySelectorAll('*').length,
                widgetNodes: document.querySelectorAll('.widget').length
            }
        };

        // Add memory info if available (Chrome only)
        if (performance.memory) {
            snapshot.memory = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                usedPercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
            };
        }

        this.metrics.memorySnapshots.push(snapshot);

        // Keep only last 100 snapshots
        if (this.metrics.memorySnapshots.length > 100) {
            this.metrics.memorySnapshots.shift();
        }

        // Log warning if memory usage is high
        if (snapshot.memory && parseFloat(snapshot.memory.usedPercent) > 80) {
            console.warn(`[Memory] High memory usage: ${snapshot.memory.usedPercent}% (${(snapshot.memory.usedJSHeapSize / 1048576).toFixed(2)} MB)`);
        }

        // Detect potential memory leaks
        this.detectMemoryLeaks(snapshot);

        return snapshot;
    }

    detectMemoryLeaks(snapshot) {
        // Check for widget count mismatch
        const expectedWidgets = this.metrics.widgetCreations - this.metrics.widgetDeletions;
        const actualWidgets = snapshot.metrics.widgetNodes;

        if (actualWidgets > expectedWidgets + 5) { // Allow 5 widget tolerance
            console.warn(`[MemoryLeak] Widget count mismatch! Expected: ${expectedWidgets}, Actual: ${actualWidgets}, Diff: ${actualWidgets - expectedWidgets}`);
        }

        // Check for excessive event listeners
        let totalListeners = 0;
        this.metrics.eventListeners.forEach(value => {
            totalListeners += value.handlers.length;
        });

        if (totalListeners > 1000) {
            console.warn(`[MemoryLeak] Excessive event listeners: ${totalListeners}`);
        }

        // Check for memory growth trend
        if (this.metrics.memorySnapshots.length >= 10) {
            const recent = this.metrics.memorySnapshots.slice(-10);
            const first = recent[0];
            const last = recent[recent.length - 1];

            if (first.memory && last.memory) {
                const growthRate = ((last.memory.usedJSHeapSize - first.memory.usedJSHeapSize) / first.memory.usedJSHeapSize) * 100;
                if (growthRate > 50) { // More than 50% growth
                    console.warn(`[MemoryLeak] Rapid memory growth detected: ${growthRate.toFixed(2)}% over last 10 snapshots`);
                }
            }
        }
    }

    /**
     * Performance timing
     */
    startTiming(label) {
        if (!this.isEnabled) return;

        const mark = `${label}_start`;
        performance.mark(mark);
        this.metrics.performanceMarks.set(label, {
            startMark: mark,
            startTime: Date.now()
        });
    }

    endTiming(label) {
        if (!this.isEnabled) return;

        const timing = this.metrics.performanceMarks.get(label);
        if (!timing) {
            console.warn(`[Performance] No start mark found for: ${label}`);
            return;
        }

        const endMark = `${label}_end`;
        performance.mark(endMark);

        const duration = Date.now() - timing.startTime;

        try {
            performance.measure(label, timing.startMark, endMark);
        } catch (e) {
            // Ignore if marks don't exist
        }

        this.metrics.performanceMarks.delete(label);

        // Warn on slow operations
        if (duration > 100) {
            console.warn(`[Performance] Slow operation: ${label} took ${duration}ms`);
        } else {
            console.log(`[Performance] ${label}: ${duration}ms`);
        }

        return duration;
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const report = {
            uptime: Date.now() - this.startTime,
            summary: {
                widgetCreations: this.metrics.widgetCreations,
                widgetDeletions: this.metrics.widgetDeletions,
                activeWidgets: this.getActiveWidgetCount(),
                widgetLeaks: this.metrics.widgetCreations - this.metrics.widgetDeletions - this.getActiveWidgetCount(),
                commandExecutions: this.metrics.commandExecutions,
                dragOperations: this.metrics.dragOperations,
                totalEventListeners: this.getTotalEventListenerCount(),
                domNodes: document.querySelectorAll('*').length,
                widgetNodes: document.querySelectorAll('.widget').length
            },
            eventListeners: this.getEventListenerReport(),
            memorySnapshots: this.metrics.memorySnapshots.slice(-10), // Last 10
            activeObjects: this.getActiveObjectsReport()
        };

        // Add current memory if available
        if (performance.memory) {
            report.currentMemory = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                usedPercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2),
                usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
                totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
                limitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
            };
        }

        return report;
    }

    getTotalEventListenerCount() {
        let total = 0;
        this.metrics.eventListeners.forEach(value => {
            total += value.handlers.length;
        });
        return total;
    }

    getActiveObjectsReport() {
        const report = {
            widgets: [],
            operations: []
        };

        this.activeObjects.forEach((obj, key) => {
            if (key.startsWith('widget_')) {
                if (obj.alive) {
                    report.widgets.push({
                        id: obj.id,
                        type: obj.type,
                        age: Date.now() - obj.createdAt
                    });
                }
            } else if (key.startsWith('drag_')) {
                if (obj.active) {
                    report.operations.push({
                        type: obj.type,
                        duration: Date.now() - obj.startTime
                    });
                }
            }
        });

        return report;
    }

    /**
     * Download debug report
     */
    downloadReport() {
        const report = this.generateReport();
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `designer-debug-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Print report to console
     */
    printReport() {
        const report = this.generateReport();
        console.group('🔍 Designer Performance Report');
        console.log('Uptime:', (report.uptime / 1000).toFixed(2), 'seconds');
        console.log('Summary:', report.summary);
        if (report.currentMemory) {
            console.log('Current Memory:', report.currentMemory);
        }
        console.log('Event Listeners:', report.eventListeners);
        console.log('Active Objects:', report.activeObjects);
        console.groupEnd();

        return report;
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
        this.activeObjects.clear();
        this.metrics.eventListeners.clear();
        this.metrics.performanceMarks.clear();
        this.metrics.memorySnapshots = [];
    }
}

// Create global singleton instance
let globalMonitor = null;

export function getPerformanceMonitor() {
    if (!globalMonitor) {
        globalMonitor = new PerformanceMonitor();
    }
    return globalMonitor;
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
    window.PerformanceMonitor = getPerformanceMonitor();
}
