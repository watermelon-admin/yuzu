// src/countdown/countdown.ts
declare const bootstrap: any;
import * as TimeTools from '../../common/timetools.js';

// Stores meta information for break preset buttons.
class BreakButtonInfo {
    intervalMultiplier: number;
    intervalMinutes: number;
    breakTypeId: string;
    breakDuration: number;
    isOtherButton: boolean;

    constructor(
        intervalMultiplier: number,
        intervalMinutes: number,
        breakTypeId: string,
        breakDuration: number,
        isOtherButton: boolean) {
        this.intervalMultiplier = intervalMultiplier;
        this.intervalMinutes = intervalMinutes;
        this.breakTypeId = breakTypeId;
        this.breakDuration = breakDuration;
        this.isOtherButton = isOtherButton;
    }
}

/**
 * Updates the headline time with the current local time.
 * @param {luxon.DateTime} currentTime - The current local time.
 */
export function updateHeadlineTime(currentTime: luxon.DateTime) {
    document.getElementById("currentLocalTime").innerText = currentTime.toLocaleString(luxon.DateTime.TIME_SIMPLE);
}

/**
 * Parses the data attributes of a break preset button and returns a BreakButtonInfo object.
 * @param {HTMLElement} sourceElement - The break button element.
 * @returns {BreakButtonInfo} - The parsed break button data.
 */
export function parseBreakButtonData(sourceElement: HTMLElement): BreakButtonInfo {
    const breakId = sourceElement.closest('.button-grid').getAttribute('data-break-id');
    console.log('Break ID from data attribute:', breakId);

    let breakButtonInfo = new BreakButtonInfo(
        parseInt(sourceElement.getAttribute('data-interval-multiplier')),
        parseInt(sourceElement.getAttribute('data-interval-minutes')),
        breakId,
        parseInt(sourceElement.getAttribute('data-break-duration')),
        sourceElement.classList.contains('other-button')
    );

    console.log('BreakButtonInfo object:', breakButtonInfo);
    return breakButtonInfo;
}

/**
 * Updates the break button times based on the current local time and break button information.
 * @param {luxon.DateTime} currentTime - The current local time.
 */
export function updateEndTimeButtonTimes(currentTime: luxon.DateTime) {
    const elementsWithDataAttribute = document.querySelectorAll('[data-interval-multiplier]');

    elementsWithDataAttribute.forEach(element => {
        const breakButtonInfo = parseBreakButtonData(element as HTMLElement);
        if (breakButtonInfo.isOtherButton) return;
        (element as HTMLElement).innerHTML = TimeTools.roundDateTime(
            currentTime,
            breakButtonInfo.intervalMinutes,
            breakButtonInfo.intervalMultiplier)
            .plus({ minute: breakButtonInfo.breakDuration }).toLocaleString(luxon.DateTime.TIME_SIMPLE);
    });
}

/**
 * Handles the click event of a break preset button.
 * @param {HTMLElement} element - The clicked button element.
 */
export function handlePresetButtonClick(element: HTMLElement) {

    // Parse the data from the clicked button
    const breakButtonInfo = parseBreakButtonData(element);
    console.log(breakButtonInfo);

    // Calculate the end time for the break
    const breakEndTimeUnixTimestamp = calculateBreakEndTimeUnixTimestamp(
        TimeTools.GetCurrentLocalTime(),
        breakButtonInfo.intervalMinutes,
        breakButtonInfo.intervalMultiplier,
        breakButtonInfo.breakDuration
    );

    // Set the form values using the calculated end time and break type
    setFormValues(breakEndTimeUnixTimestamp, breakButtonInfo.breakTypeId);

    // Submit the form to start the break
    (document.getElementById("startBreakForm") as HTMLFormElement).submit();
}

/**
 * Handles the click event of the 'Other' break preset button.
 * @param {HTMLElement} element - The clicked button element.
 */
export function handleOtherButtonClick(element: HTMLElement) {
    console.log('Other button clicked.');

    // Parse the data from the clicked button
    const breakButtonInfo = parseBreakButtonData(element);
    console.log(breakButtonInfo);

    // Set the type of break in the form
    setBreakTypeIdField(breakButtonInfo.breakTypeId);

    // Calculate the new time by adding breakButtonInfo.breakDuration to the current local time
    const currentTime = luxon.DateTime.local();
    const newTime = currentTime.plus({ minutes: breakButtonInfo.breakDuration });

    // Set the value of the time picker input to the calculated time
    const timePicker = document.getElementById('timePicker') as HTMLInputElement;
    if (timePicker) {
        let hours = newTime.hour;
        let minutes = newTime.minute;
        let period = '';

        // Check for AM/PM in the selected time
        if (timePicker.value.toLowerCase().includes('pm')) {
            period = 'PM';
            if (hours < 12) {
                hours += 12;
            }
        } else if (timePicker.value.toLowerCase().includes('am')) {
            period = 'AM';
            if (hours === 12) {
                hours = 0;
            }
        }

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        timePicker.value = `${formattedHours}:${formattedMinutes} ${period}`.trim();
    }

    const modalElement = document.getElementById('timeModal');
    if (!modalElement) return;

    // Show the time picker modal
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    if (modal) {
        modal.show();
    }
}

/**
 * Calculates the end time for the break.
 * @param {luxon.DateTime} currentLocalTime - The current local time.
 * @param {number} intervalMinutes - The interval in minutes.
 * @param {number} intervalMultiplier - The interval multiplier.
 * @param {number} breakDuration - The duration of the break in minutes.
 * @returns {number} - The end time for the break as a Unix Timestamp value.
 */
export function calculateBreakEndTimeUnixTimestamp(currentLocalTime: luxon.DateTime, intervalMinutes: number, intervalMultiplier: number, breakDuration: number): number {
    // Round the current time to the nearest interval, add the duration of the break, and convert to seconds
    return TimeTools.roundDateTime(currentLocalTime, intervalMinutes, intervalMultiplier)
        .plus({ minute: breakDuration }).valueOf() / 1000;
}

/**
 * Sets the value of the break end time field in the form.
 * @param {number} breakEndTimeUnixTimestamp - The end time for the break in Unix timestamp.
 */
export function setBreakEndTimeField(breakEndTimeUnixTimestamp: number) {
    const breakEndTimeField = document.querySelector("input[name='Input.BreakEndTimeUnixTimestamp']") as HTMLInputElement;
    if (breakEndTimeField) {
        breakEndTimeField.value = breakEndTimeUnixTimestamp.toString();
    }
}

/**
 * Sets the value of the break type ID field in the form.
 * @param {string} breakTypeId - The ID of the break type.
 */
export function setBreakTypeIdField(breakTypeId: string) {
    const breakTypeIdField = document.querySelector("input[name='Input.BreakTypeId']") as HTMLInputElement;
    if (breakTypeIdField) {
        breakTypeIdField.value = breakTypeId;
    }
}

/**
 * Sets the form values for starting the break.
 * @param {number} breakEndTimeUnixTimestamp - The end time for the break in Unix timestamp.
 * @param {string} breakTypeId - The ID of the break type.
 */
export function setFormValues(breakEndTimeUnixTimestamp: number, breakTypeId: string) {

    // Set the end time of the break in the form
    setBreakEndTimeField(breakEndTimeUnixTimestamp);
    // Set the type of break in the form
    setBreakTypeIdField(breakTypeId);

}

/**
 * Updates the time display fields.
 * @param {luxon.DateTime} currentTime - The current local time.
 */
export function updateTimeDisplayFields(currentTime: luxon.DateTime) {
    updateHeadlineTime(currentTime);
    updateEndTimeButtonTimes(currentTime);
}

/**
 * Updates the time display fields based on the current local time.
 */
export function handleMinuteChange() {
    console.log("Minute changed");

    updateTimeDisplayFields(TimeTools.GetCurrentLocalTime());
}

/**
 * Checks if the minute has changed and calls the handleMinuteChange function if it has.
 */
export function checkMinuteChange() {
    const currentMinute = new Date().getMinutes();
    if (currentMinute !== checkMinuteChange.previousMinute) {
        handleMinuteChange();
        checkMinuteChange.previousMinute = currentMinute;
    }
}

/**
 * Initializes the time picker.
 */
export function initTimePicker() {

    // Initialize time picker
    const initializeTimePicker = (): void => {
        const timePicker = document.getElementById('timePicker') as HTMLInputElement;
        if (!timePicker) return;

        // Set default time to current hour
        const now = new Date();
        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        timePicker.value = `${currentHour}:${currentMinute}`;

        // Handle OK button click
        const okButton = document.getElementById('okButton');
        if (!okButton) return;

        okButton.addEventListener('click', async (): Promise<void> => {
            const selectedTime = timePicker.value;
            if (selectedTime) {

                console.log('Selected time:', selectedTime);

                // Convert selected time into UNIX timestamp using Luxon
                let [hours, minutes] = selectedTime.split(':').map(Number);
                const isPM = selectedTime.toLowerCase().includes('pm');
                const isAM = selectedTime.toLowerCase().includes('am');

                // Convert 12-hour time to 24-hour time
                if (isPM && hours < 12) {
                    hours += 12;
                } else if (isAM && hours === 12) {
                    hours = 0;
                }

                // Create a DateTime object using Luxon
                const now = luxon.DateTime.local();
                let selectedDateTime = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

                // Check if the selected time is earlier than the current time
                if (selectedDateTime < now) {
                    selectedDateTime = selectedDateTime.plus({ days: 1 });
                }

                const unixTimestamp = selectedDateTime.toSeconds();

                // Set the end time of the break in the form
                setBreakEndTimeField(unixTimestamp);

                // Submit the form to start the break
                (document.getElementById("startBreakForm") as HTMLFormElement).submit();

                const modalElement = document.getElementById('timeModal');
                if (!modalElement) return;

                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            } else {
                alert('Please select a time');
            }
        });

        // Monitor changes to the time picker input
        timePicker.addEventListener('input', function () {
            const selectedTime = timePicker.value;
            const now = new Date();
            const selectedDateTime = new Date(now.toDateString() + ' ' + selectedTime);

            const dayInfo = document.getElementById('dayInfo');
            const dayMessage = document.getElementById('dayMessage');

            if (selectedDateTime < now) {
                // Set the date of the end time to the selected time tomorrow
                selectedDateTime.setDate(selectedDateTime.getDate() + 1);
                dayInfo.textContent = 'tomorrow';
                dayMessage.classList.remove('text-muted');
                dayMessage.classList.add('text-danger');
            } else {
                // Set the date of the end time to the selected time today
                dayInfo.textContent = 'today';
                dayMessage.classList.remove('text-danger');
                dayMessage.classList.add('text-muted');
            }
        });
    };

    // Call initialization when document is ready
    document.addEventListener('DOMContentLoaded', initializeTimePicker);
}

/**
 * Initializes the page.
 *
 * This function is called to initialize the page. It sets up the necessary event handlers and updates the time display fields.
 */
export function InitPage() {

    initTimePicker();

    // Call the checkMinuteChange function every second
    setInterval(checkMinuteChange, 1000);

    // Initialize the time display fields
    updateTimeDisplayFields(TimeTools.GetCurrentLocalTime());
}

// Attach all module functions to the windows object
// TODO: Add declarations to gain type safety
(window as any).updateHeadlineTime = updateHeadlineTime;
(window as any).updateEndTimeButtonTimes = updateEndTimeButtonTimes;
(window as any).parseBreakButtonData = parseBreakButtonData;
(window as any).handlePresetButtonClick = handlePresetButtonClick;
(window as any).handleOtherButtonClick = handleOtherButtonClick;
(window as any).calculateBreakEndTimeUnixTimestamp = calculateBreakEndTimeUnixTimestamp;
(window as any).setFormValues = setFormValues;
(window as any).InitPage = InitPage;
(window as any).MinuteChanged = handleMinuteChange;
(window as any).checkMinuteChange = checkMinuteChange;
(window as any).UpdateTimeDisplayFields = updateTimeDisplayFields;

// Initialize the previousMinute property
checkMinuteChange.previousMinute = new Date().getMinutes();

// Let's go!
InitPage();
