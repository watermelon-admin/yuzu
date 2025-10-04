// src/countdown/countdown.ts
import * as TimeTools from '../../common/timetools.js';

// Designer canvas dimensions (fixed size used in designer)
const DESIGNER_WIDTH = 1920;
const DESIGNER_HEIGHT = 1080;

// Initialize global variables for additional time zones
let additionalTimeZoneIndex = 0;
let additionalTimeZoneCounter = 0;
const additionalTimeZoneDisplayDuration = 100; // Duration to display each additional time zone in seconds

/**
 * Scales all widgets to match the current viewport size.
 * Uses viewport width as reference, scaling proportionally from the 1920x1080 designer canvas.
 * Prevents scrollbars by scaling based on width only (height may overflow and will be cut).
 */
function scaleWidgetsToViewport(): void {
    // Calculate scale factor based on viewport width
    const viewportWidth = window.innerWidth;
    const scaleX = viewportWidth / DESIGNER_WIDTH;

    console.log(`[Viewport Scaling] Viewport width: ${viewportWidth}px, Scale factor: ${scaleX.toFixed(4)}`);

    // Query all widget elements
    const widgets = document.querySelectorAll('.widget') as NodeListOf<HTMLElement>;

    widgets.forEach((widget, index) => {
        // Read original designer values from data attributes
        const designerLeft = parseFloat(widget.getAttribute('data-designer-left') || '0');
        const designerTop = parseFloat(widget.getAttribute('data-designer-top') || '0');
        const designerWidth = parseFloat(widget.getAttribute('data-designer-width') || '0');
        const designerHeight = parseFloat(widget.getAttribute('data-designer-height') || '0');
        const designerFontSize = widget.getAttribute('data-designer-fontsize');
        const designerBorderRadius = widget.getAttribute('data-designer-borderradius');

        // Calculate scaled values
        const scaledLeft = designerLeft * scaleX;
        const scaledTop = designerTop * scaleX;
        const scaledWidth = designerWidth * scaleX;
        const scaledHeight = designerHeight * scaleX;

        // Apply scaled position and size using setProperty for maximum priority
        widget.style.setProperty('left', `${scaledLeft}px`, 'important');
        widget.style.setProperty('top', `${scaledTop}px`, 'important');
        widget.style.setProperty('width', `${scaledWidth}px`, 'important');
        widget.style.setProperty('height', `${scaledHeight}px`, 'important');

        // Scale font size for text widgets
        if (designerFontSize) {
            const scaledFontSize = parseFloat(designerFontSize) * scaleX;
            widget.style.setProperty('font-size', `${scaledFontSize}px`, 'important');
        }

        // Scale border radius for box widgets
        if (designerBorderRadius) {
            const scaledBorderRadius = parseFloat(designerBorderRadius) * scaleX;
            widget.style.setProperty('border-radius', `${scaledBorderRadius}px`, 'important');
        }

        console.log(`[Viewport Scaling] Widget ${index + 1}: Scaled from (${designerLeft}, ${designerTop}, ${designerWidth}x${designerHeight}) to (${scaledLeft.toFixed(1)}, ${scaledTop.toFixed(1)}, ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)})`);
        console.log(`[Viewport Scaling] Widget ${index + 1}: Applied styles - width: ${widget.style.width}, height: ${widget.style.height}`);
    });

    console.log(`[Viewport Scaling] Scaled ${widgets.length} widgets`);
}

/**
 * Debounced window resize handler to prevent excessive scaling calculations.
 */
let resizeTimeout: number;
function handleWindowResize(): void {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
        console.log('[Viewport Scaling] Window resized, recalculating widget positions');
        scaleWidgetsToViewport();
    }, 300); // 300ms debounce delay
}

// Get the break end time from the hidden input field
function getBreakEndTimeUnixTimestamp(): number {
    const inputElement = document.getElementById("breakEndTimeUnixTimestamp") as HTMLInputElement;
    return parseInt(inputElement.value, 10);
}

// Get the break title from the hidden input field
function getBreakName(): string {
    const inputElement = document.getElementById("breakName") as HTMLInputElement;
    return inputElement.value;
}

// Get the break end time title from the hidden input field
function getBreakEndTimeTitle(): string {
    const inputElement = document.getElementById("breakEndTimeTitle") as HTMLInputElement;
    return inputElement.value;
}

// Get the countdown message from the hidden input field
function getCountdownMessage(): string {
    const inputElement = document.getElementById("breakCountdownMessage") as HTMLInputElement;
    return inputElement.value;
}

// Get the countdown end message from the hidden input field
function getCountdownEndMessage(): string {
    const inputElement = document.getElementById("breakCountdownEndMessage") as HTMLInputElement;
    return inputElement.value;
}

// Get the user's home time zone id
function GetUserHomeTZID(): string {
    const inputElement = document.getElementById("userHomeTZID") as HTMLInputElement;
    return inputElement.value;
}

// Get the user's home time zone name (city, country)
function GetUserHomeTimeZoneName(): string {
    const inputElement = document.getElementById("userHomeTimeZoneName") as HTMLInputElement;
    return inputElement.value;
}

// Get the user's secondary time zone ids as an array of strings from the comma-separated list stored in the hidden input field
function GetUserAdditionalTZIDs(): string[] {
    const inputElement = document.getElementById("userAdditionalTZIDList") as HTMLInputElement;
    return inputElement.value.split(",");
}

// Get the user's secondary time zone names as an array of strings from the semicolon-separated list stored in the hidden input field
function GetUserAdditionalTimeZoneNames(): string[] {
    const inputElement = document.getElementById("userAdditionalTimeZoneNameList") as HTMLInputElement;
    return inputElement.value.split(";");
}

function updateDisplayValues() {
    // Get the difference in seconds from now to the break end time
    const remainingTime = calculateRemainingBreakDifference();
    //console.log(`Time difference: ${timeDifference}`);

    // Check if the break is over
    var isBreakOver = (remainingTime <= 0);

    // Get all text widget elements
    const textWidgets = document.querySelectorAll('[data-type="text"]');

    // Loop through each text widget element
    textWidgets.forEach((widget) => {
        // Cast widget to TypeScript HTML Div Element
        const textWidget = widget as HTMLDivElement;
        // Get the data-template attribute value
        const template = textWidget.getAttribute('data-template');

        // Countdown Time Unit {time-unit}
        var timeUnit;
        // Countdown Message {countdown-message}
        var countdownMessage;

        // Set the time unit and countdown message based on the remaining time
        if (isBreakOver) {
            // Display the countdown end message if the break is over
            timeUnit = "";
            // When the break is over, display the countdown end message instead of the countdown message
            countdownMessage = getCountdownEndMessage();
        } else {
            // Set the time unit based on the remaining time
            if (remainingTime < 3600) {
                timeUnit = "Minutes";
            } else {
                timeUnit = "Hours";
            }
            // Display the countdown message if the break is not over
            // Add a leading space if the countdown message is not empty
            // TODO: Make the leading space configurable
            countdownMessage = ` ${getCountdownMessage()}`;
            // Set the color of the countdown message based on the remaining time
            // Yellow if under 5 minutes, red if under 1 minute
            // Only affect the text widget that contains the timer value
            // TODO: Make color change configurable
            // TODO: Make time thresholds configurable
            if (template.includes("{timer}")) {
                if (remainingTime < 300) {
                    textWidget.style.color = "gold";
                }
                if (remainingTime < 60) {
                    textWidget.style.color = "red";
                }
            }
        }

        // Get the break end time title and break name
        const endTimeTitle = getBreakEndTimeTitle();
        const breakName = getBreakName();

        // Get the user's home time zone name and TZID
        const userHomeTimeZoneName = GetUserHomeTimeZoneName();
        const userHomeTZID = GetUserHomeTZID();
        const userHomeTZEndUnix = getBreakEndTimeUnixTimestamp();
        const userHomeTZEndLocal = TimeTools.GetLocalTimeByTimestamp(userHomeTZID, userHomeTZEndUnix);
        const userHomeTZEnd = TimeTools.DateTimeToTimeString(userHomeTZEndLocal);

        // Secondary Time Zone names and TZIDs
        const userSecondaryTZID = GetUserAdditionalTZIDs();
        const userSecondaryTimeZoneNames = GetUserAdditionalTimeZoneNames();

        // Determine the current additional time zone to display
        let additionalTimeZoneName = "";
        let additionalTimeZoneEnd = "";

        if (userSecondaryTZID.length > 0 && userHomeTZID[0] != '') {
            additionalTimeZoneName = userSecondaryTimeZoneNames[additionalTimeZoneIndex];
            const additionalTZID = userSecondaryTZID[additionalTimeZoneIndex];
            const additionalTZEndLocal = TimeTools.GetLocalTimeByTimestamp(additionalTZID, userHomeTZEndUnix);
            additionalTimeZoneEnd = TimeTools.DateTimeToTimeString(additionalTZEndLocal);

            // Update the counter and index
            additionalTimeZoneCounter++;
            if (additionalTimeZoneCounter >= additionalTimeZoneDisplayDuration) {
                additionalTimeZoneCounter = 0;
                additionalTimeZoneIndex = (additionalTimeZoneIndex + 1) % userSecondaryTZID.length;
            }
        }

        // Set the placeholder values for the countdown message
        const placeholderValues: TimeTools.PlaceholderValues = {
            "break-name": breakName,
            "countdown-message": countdownMessage,
            "end-time-home": userHomeTZEnd,
            "end-time-additional": additionalTimeZoneEnd,
            "end-time-title": endTimeTitle,
            "time-name-home": userHomeTimeZoneName,
            "time-name-additional": additionalTimeZoneName,
            "time-unit": timeUnit,
            "timer": formatTime(remainingTime)
        };

        // Replace the placeholder values in the inner text of the TextWidget
        const result = TimeTools.replacePlaceholders(template, placeholderValues);
        if (result.success) {
            textWidget.innerText = result.result;
        } else {
            // Log the error message to the console
            console.error(result.error);
        }
    });
}

// Calculate the difference in seconds between the current time and the break end time
function calculateRemainingBreakDifference(): number {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix timestamp (seconds)
    const breakEndTime = Math.max(0, getBreakEndTimeUnixTimestamp()); // Ensure breakEndTime is not less than zero
    return Math.max(0, breakEndTime - currentTime); // Difference in seconds, ensuring it's not negative
}

// Given a time in seconds, convert it to a human-readable format: HH:MM for over an hour, MM:SS for under an hour
function formatTime(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

let exitButtonTimeout: number;

function showExitButton(): void {
    const exitButton = document.getElementById('exitButton') as HTMLButtonElement;
    exitButton.classList.add('visible');
    clearTimeout(exitButtonTimeout);
    exitButtonTimeout = window.setTimeout(() => {
        exitButton.classList.remove('visible');
    }, 3000);
}

// Heartbeat to update timer values
function heartbeat() {

    updateDisplayValues();

}

// Initialize the page after it has loaded
window.addEventListener('load', () => {

    // Scale widgets to match viewport BEFORE fading in (critical for proper alignment)
    console.log('[Init] Scaling widgets to viewport before fade-in');
    scaleWidgetsToViewport();

    // Update the display values immediately
    updateDisplayValues();

    // Get the "countdown-container" div
    const mainDiv = document.getElementById("mainDisplay") as HTMLDivElement;
    mainDiv.style.opacity = "1";

    // Add an event listener to show the exit button when the mouse moves
    document.addEventListener('mousemove', showExitButton);

    // Initially show the exit button
    showExitButton();

    // Add window resize listener with debouncing
    window.addEventListener('resize', handleWindowResize);
    console.log('[Init] Window resize listener added');

    // Set up a timer to call the heartbeat function every 500ms
    console.log("Page loaded. Starting heartbeat...");
    setInterval(heartbeat, 1000);

});