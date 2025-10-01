// src/pages/settings/time-zones/time-utils.ts
/**
 * Updates the time display in the timezone info modal
 */
export function updateTimeZoneInfoTime(timeZone) {
    // Get the current time in the user's browser timezone
    const now = new Date();
    // Calculate the time in the selected timezone
    // This is a simplified calculation that doesn't handle DST
    const localOffset = now.getTimezoneOffset();
    const targetOffset = (timeZone.utcOffsetHours * 60) + (timeZone.utcOffsetMinutes || 0);
    const offsetDiff = localOffset + targetOffset;
    // Create a new date object with the adjusted time
    const targetTime = new Date(now.getTime() + (offsetDiff * 60 * 1000));
    // Format the time string (HH:MM:SS)
    const hours = targetTime.getHours().toString().padStart(2, '0');
    const minutes = targetTime.getMinutes().toString().padStart(2, '0');
    const seconds = targetTime.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    // Format the date string (Day, Month DD, YYYY)
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateString = targetTime.toLocaleDateString('en-US', options);
    // Calculate time difference from local time
    let diffHours = Math.floor(offsetDiff / 60);
    const diffMinutes = Math.abs(offsetDiff % 60);
    const diffSign = diffHours >= 0 ? '+' : '-';
    diffHours = Math.abs(diffHours);
    // Update the time elements with minimal DOM changes
    updateElementTextIfDifferent('tz-info-current-time', timeString);
    updateElementTextIfDifferent('tz-info-current-date', dateString);
    // Update time difference text
    const timeDiffText = offsetDiff === 0
        ? 'Same as local time'
        : (diffHours > 0 || diffMinutes > 0
            ? `${diffSign}${diffHours}h ${diffMinutes}m from local time`
            : 'Same as local time');
    updateElementTextIfDifferent('tz-info-time-difference', timeDiffText);
}
/**
 * Helper method to update element text only if it has changed
 * This prevents unnecessary DOM updates that can cause flickering
 */
export function updateElementTextIfDifferent(elementId, newText) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    const currentText = element.textContent;
    if (currentText !== newText) {
        element.textContent = newText;
    }
}
/**
 * Formats the UTC offset for a timezone into a string
 * @param timeZone The timezone to format the offset for
 * @returns Formatted UTC offset string (e.g., "UTC +5:30")
 */
export function formatUtcOffset(timeZone) {
    return `UTC ${timeZone.utcOffsetHours >= 0 ? '+' : ''}${timeZone.utcOffsetHours}${timeZone.utcOffsetMinutes ? ':' + timeZone.utcOffsetMinutes.toString().padStart(2, '0') : ':00'}`;
}
//# sourceMappingURL=time-utils.js.map