/**
 * A utility file to provide safe access to the logger functionality.
 * This avoids circular dependencies by providing a simple object with fallback methods.
 */
// Default no-op logger that doesn't throw errors
const defaultLogger = {
    enabled: true,
    logLevel: 'debug',
    logs: [],
    maxLogs: 1000,
    debug(category, message, data) {
        console.debug(`[DEBUG][${category}] ${message}`, data);
    },
    info(category, message, data) {
        console.info(`[INFO][${category}] ${message}`, data);
    },
    warn(category, message, data) {
        console.warn(`[WARN][${category}] ${message}`, data);
    },
    error(category, message, data) {
        console.error(`[ERROR][${category}] ${message}`, data);
    },
    _log() { }, // No-op
    getFormattedLogs() { return ''; }, // No-op
    downloadLogs() { }, // No-op
    clearLogs() { } // No-op
};
/**
 * Safe access to logger - will fall back to console if the real logger
 * is not available. This prevents errors like "WidgetLogger is not defined".
 */
export function safeLogger() {
    try {
        // Try to access the global WidgetLogger, or fall back to default
        return window.WidgetLogger || defaultLogger;
    }
    catch (e) {
        // If any error occurs (like in SSR), return the default logger
        return defaultLogger;
    }
}
//# sourceMappingURL=logger-utils.js.map