// Get the break end time from the hidden input field
function getBreakEndTimeUnixTimestamp() {
    const inputElement = document.getElementById("breakEndTimeUnixTimestamp");
    return parseInt(inputElement.value, 10);
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
// Update the display values
function updateDisplayValues() {
    // Calculate the remaining time
    const remainingTime = calculateRemainingBreakDifference();
    // Format the remaining time
    const formattedTime = formatTime(remainingTime);
    // Set the appearance classes based on the remaining time
    const body = document.body;
    if (remainingTime < 60) {
        // Alert 
        body.classList.remove('mobile-time-warning', 'mobile-time-info');
        body.classList.add('mobile-time-alert');
    }
    else if (remainingTime < 300) {
        // Warning 
        body.classList.remove('mobile-time-info', 'mobile-time-alert');
        body.classList.add('mobile-time-warning');
    }
    else {
        // Normal 
        body.classList.remove('mobile-time-warning', 'mobile-time-alert');
        body.classList.add('mobile-time-info');
    }
    // Update the break counter text
    const breakCounterElement = document.getElementById("breakCounter");
    breakCounterElement.textContent = formattedTime;
    // Check if the break is over
    var isBreakOver = (remainingTime <= 0);
    // Countdown Time Unit 
    var timeUnit = "";
    // Countdown Message
    var countdownMessage = "";
    // Set the time unit and countdown message based on the remaining time
    if (isBreakOver) {
        // Display the countdown end message if the break is over
        timeUnit = "";
        // When the break is over, display the countdown end message instead of the countdown message
        countdownMessage = getCountdownEndMessage();
        // Hide the counter unit text
        const counterUnitElement = document.getElementById("counterUnit");
        counterUnitElement.style.display = "none";
    }
    else {
        // Set the time unit based on the remaining time
        if (remainingTime < 3600) {
            timeUnit = "Minutes";
        }
        else {
            timeUnit = "Hours";
        }
        // Update the time unit text
        const timeUnitElement = document.getElementById("timeUnit");
        timeUnitElement.textContent = timeUnit;
        // Display the countdown message if the break is not over
        countdownMessage = getCountdownMessage();
    }
    // Update the countdown message text
    const countdownMessageElement = document.getElementById("countdownMessage");
    // Remove the trailing period from the countdown message
    countdownMessage = countdownMessage.replace(/\.$/, "");
    countdownMessageElement.textContent = countdownMessage;
}
// Heartbeat to update timer values
function heartbeat() {
    updateDisplayValues();
}
// Initialize the page after it has loaded
window.addEventListener('load', () => {
    // Update the display values immediately
    updateDisplayValues();
    // Set up a timer to call the heartbeat function every 500ms
    console.log("Page loaded. Starting heartbeat...");
    setInterval(heartbeat, 1000);
});
export {};
//# sourceMappingURL=mobile.js.map