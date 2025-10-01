// src/countdown/countdown.ts
import * as TimeTools from '../../common/timetools.js';
// Initialize global variables for additional time zones
let additionalTimeZoneIndex = 0;
let additionalTimeZoneCounter = 0;
const additionalTimeZoneDisplayDuration = 100; // Duration to display each additional time zone in seconds
// Get the break end time from the hidden input field
function getBreakEndTimeUnixTimestamp() {
    const inputElement = document.getElementById("breakEndTimeUnixTimestamp");
    return parseInt(inputElement.value, 10);
}
// Get the break title from the hidden input field
function getBreakName() {
    const inputElement = document.getElementById("breakName");
    return inputElement.value;
}
// Get the break end time title from the hidden input field
function getBreakEndTimeTitle() {
    const inputElement = document.getElementById("breakEndTimeTitle");
    return inputElement.value;
}
// Get the countdown message from the hidden input field
function getCountdownMessage() {
    const inputElement = document.getElementById("breakCountdownMessage");
    return inputElement.value;
}
// Get the countdown end message from the hidden input field
function getCountdownEndMessage() {
    const inputElement = document.getElementById("breakCountdownEndMessage");
    return inputElement.value;
}
// Get the user's home time zone id
function GetUserHomeTZID() {
    const inputElement = document.getElementById("userHomeTZID");
    return inputElement.value;
}
// Get the user's home time zone name (city, country)
function GetUserHomeTimeZoneName() {
    const inputElement = document.getElementById("userHomeTimeZoneName");
    return inputElement.value;
}
// Get the user's secondary time zone ids as an array of strings from the comma-separated list stored in the hidden input field
function GetUserAdditionalTZIDs() {
    const inputElement = document.getElementById("userAdditionalTZIDList");
    return inputElement.value.split(",");
}
// Get the user's secondary time zone names as an array of strings from the semicolon-separated list stored in the hidden input field
function GetUserAdditionalTimeZoneNames() {
    const inputElement = document.getElementById("userAdditionalTimeZoneNameList");
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
        const textWidget = widget;
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
        }
        else {
            // Set the time unit based on the remaining time
            if (remainingTime < 3600) {
                timeUnit = "Minutes";
            }
            else {
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
        const placeholderValues = {
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
        }
        else {
            // Log the error message to the console
            console.error(result.error);
        }
    });
}
// Calculate the difference in seconds between the current time and the break end time
function calculateRemainingBreakDifference() {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix timestamp (seconds)
    const breakEndTime = Math.max(0, getBreakEndTimeUnixTimestamp()); // Ensure breakEndTime is not less than zero
    return Math.max(0, breakEndTime - currentTime); // Difference in seconds, ensuring it's not negative
}
// Given a time in seconds, convert it to a human-readable format: HH:MM for over an hour, MM:SS for under an hour
function formatTime(timeInSeconds) {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
// Initialize the page after it has loaded
window.addEventListener('load', () => {
    // Update the display values immediately
    updateDisplayValues();
    // Set up a timer to call the heartbeat function every 500ms
    console.log("Page loaded. Starting heartbeat...");
    setInterval(heartbeat, 500);
});
// Get the difference in seconds form now the the break end time
const timeDifference = calculateRemainingBreakDifference();
//console.log(`Time difference: ${timeDifference}`);
// Check if the break is over
var isBreakOver = (timeDifference <= 0);
// Get all text widget elements
const textWidgets = document.querySelectorAll('[data-type="text"]');
// Loop through each text widget element
textWidgets.forEach((widget) => {
    // Cast widget to TypeScript HTML Div Element
    const textWidget = widget;
    // Get the data-template attribute value
    const template = textWidget.getAttribute('data-template');
    // Countdown Time Unit {time-unit}
    var timeUnit;
    // Countdown Message{countdown-message}
    var countdownMessage;
    // Set the time unit and countdown message based on the remaining time
    if (isBreakOver) {
        // Display the countdown end message if the break is over
        timeUnit = "";
        // When the break is over, display the countdown end message instead of the countdown message
        countdownMessage = getCountdownEndMessage();
    }
    else {
        // Set the time unit based on the remaining time
        if (timeDifference < 3600) {
            timeUnit = "Minutes";
        }
        else {
            timeUnit = "Hours";
        }
        // Display the countdown message if the break is not over
        // Add a leading space if the countdown message is not empty
        // TODO: Make the leading space confgurable
        countdownMessage = ` ${getCountdownMessage()}`;
        // Set the color of the countdown message based on the remaining time
        // Yellow if under 5 minutes, red if under 1 minute
        // Only affect the text widget that countains the timer value
        // TODO: Make color change confirable
        // TODO: Make time thresholds configurable
        if (template.includes("{timer}")) {
            if (timeDifference < 300) {
                textWidget.style.color = "gold";
            }
            if (timeDifference < 60) {
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
    // If there are additional time zones, display them in sequence
    if (userSecondaryTZID.length > 0 && userSecondaryTZID.every(tzid => tzid !== '')) {
        additionalTimeZoneName = userSecondaryTimeZoneNames[additionalTimeZoneIndex];
        const additionalTZID = userSecondaryTZID[additionalTimeZoneIndex];
        const additionalTZEndLocal = TimeTools.GetLocalTimeByTimestamp(additionalTZID, userHomeTZEndUnix);
        additionalTimeZoneEnd = TimeTools.DateTimeToTimeString(additionalTZEndLocal);
        // Update the counter and index
        additionalTimeZoneCounter++;
        if (additionalTimeZoneCounter >= additionalTimeZoneDisplayDuration) {
            additionalTimeZoneCounter = 0;
            additionalTimeZoneIndex++;
            if (additionalTimeZoneIndex >= userSecondaryTZID.length)
                additionalTimeZoneIndex = 0;
        }
    }
    // Set the placeholder values for the countdown message
    const placeholderValues = {
        "break-name": breakName,
        "countdown-message": countdownMessage,
        "end-time-home": userHomeTZEnd,
        "end-time-additional": additionalTimeZoneEnd,
        "end-time-title": endTimeTitle,
        "time-name-home": userHomeTimeZoneName,
        "time-name-additional": additionalTimeZoneName,
        "time-unit": timeUnit,
        "timer": formatTime(timeDifference)
    };
    // Replace the placeholder values in the inner text of the TextWidget
    const result = TimeTools.replacePlaceholders(template, placeholderValues);
    if (result.success) {
        textWidget.innerText = result.result;
    }
    else {
        // Log the error message to the console
        console.error(result.error);
    }
});
let exitButtonTimeout;
function showExitButton() {
    const exitButton = document.getElementById('exitButton');
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
    // Update the display values immediately
    updateDisplayValues();
    // Get the "countdown-container" div
    const mainDiv = document.getElementById("mainDisplay");
    mainDiv.style.opacity = "1";
    // Add an event listener to show the exit button when the mouse moves
    document.addEventListener('mousemove', showExitButton);
    // Initially show the exit button
    showExitButton();
    // Set up a timer to call the heartbeat function every 500ms
    console.log("Page loaded. Starting heartbeat...");
    setInterval(heartbeat, 1000);
});
//# sourceMappingURL=countdown.js.map