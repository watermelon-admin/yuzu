/**
 * Retrieves the current local time based on the home time zone code.
 * @returns {luxon.DateTime} The current local time.
 */
export function GetCurrentLocalTime(): luxon.DateTime {
    return luxon.DateTime.now().setZone((document.getElementById("homeTimeZoneCode") as HTMLInputElement).value);
}

/**
 * Retrieves a local time based on the time zone code.
 * @returns {luxon.DateTime} The current local time in that TZID.
 */
export function GetLocalTimeByTZID(TZID: string, dateTime: luxon.DateTime): luxon.DateTime {
    return dateTime.setZone(TZID);
}

/**
 * Gets the time denoted by the UNIX timestamp and converts it into the local time denoted by the TZID 
 * @param TZID - The time zone ID
 * @param unixTimestamp - The UNIX timestamp
 * @returns {luxon.DateTime} The current local time in that TZID.
 */
export function GetLocalTimeByTimestamp(TZID: string, unixTimestamp: number): luxon.DateTime {
    return luxon.DateTime.fromMillis(unixTimestamp * 1000).setZone(TZID);
}

/**
* Converts a DateTime object to a string in the format "HH:mm".
* @param { luxon.DateTime } dateTime - The DateTime object to convert.
* @returns { string } - The time string in the format "HH:mm".
*/
export function DateTimeToTimeString(dateTime: luxon.DateTime): string {
    return dateTime.toFormat('HH:mm');
}
    
/**
 * Checks if the hour and minute components of two DateTime objects are equal.
 * @param {luxon.DateTime} dateTime1 - The first DateTime object.
 * @param {luxon.DateTime} dateTime2 - The second DateTime object.
 * @returns {boolean} - True if the hour and minute components are equal, false otherwise
 */
function areHourAndMinuteEqual(dateTime1: luxon.DateTime, dateTime2: luxon.DateTime): boolean {
    // Extract hour and minute components from both DateTime objects
    const { hour: hour1, minute: minute1 } = dateTime1;
    const { hour: hour2, minute: minute2 } = dateTime2;

    // Check if hour and minute components are equal
    return hour1 === hour2 && minute1 === minute2;
}

/**
 * Calculates the nearest multiple of intervalMinutes before the baseTime.
 * @param {luxon.DateTime} baseTime - The base DateTime object.
 * @param {number} intervalMinutes - The interval in minutes.
 * @returns {luxon.DateTime} - The nearest multiple DateTime object before the baseTime.
 */
function nearestMultipleBefore(baseTime: luxon.DateTime, intervalMinutes: number): luxon.DateTime {
    // Get the number of minutes elapsed since the start of the hour.
    const minutesElapsed = baseTime.minute + (baseTime.hour * 60);

    // Calculate the nearest multiple before baseTime
    const nearestMultipleMinutes = Math.floor(minutesElapsed / intervalMinutes) * intervalMinutes;

    // Convert nearestMultipleMinutes back to hours and minutes
    const nearestMultipleHour = Math.floor(nearestMultipleMinutes / 60);
    const nearestMultipleMinute = nearestMultipleMinutes % 60;

    // Create a Luxon DateTime object for the nearest multiple before baseTime
    const nearestMultipleDateTime = baseTime.set({ hour: nearestMultipleHour, minute: nearestMultipleMinute });

    return nearestMultipleDateTime;
}

/**
 * Calculates the nearest multiple of intervalMinutes after the baseTime.
 * @param {luxon.DateTime} baseTime - The base DateTime object.
 * @param {number} intervalMinutes - The interval in minutes.
 * @returns {luxon.DateTime} - The nearest multiple DateTime object after the baseTime.
 */
export function nearestMultipleAfter(baseTime: luxon.DateTime, intervalMinutes: number): luxon.DateTime {
    // Get the number of minutes elapsed since the start of the hour
    const minutesElapsed = baseTime.minute + (baseTime.hour * 60);

    // Calculate the nearest multiple after baseTime
    const nearestMultipleMinutes = Math.ceil(minutesElapsed / intervalMinutes) * intervalMinutes;

    // Convert nearestMultipleMinutes back to hours and minutes
    const nearestMultipleHour = Math.floor(nearestMultipleMinutes / 60);
    const nearestMultipleMinute = nearestMultipleMinutes % 60;

    // Create a Luxon DateTime object for the nearest multiple after baseTime
    const nearestMultipleDateTime = baseTime.set({ hour: nearestMultipleHour, minute: nearestMultipleMinute });

    return nearestMultipleDateTime;
}

/**
* Rounds a base date and time to the nearest interval.
*
* @param {luxon.DateTime} baseDateTime - The base date and time to be rounded. It should be an instance of a date object.
* @param {number} intervalMinutes - The interval in minutes to which the base date and time should be rounded.
* @param {number} intervalMultiplier - This parameter determines the direction of the rounding. If it's -1, the date and time are rounded to the nearest multiple before the current minute. If it's 0, the date and time are rounded to the current minute. If it's a positive number, the date and time are rounded to the nearest multiple after the current minute, and subsequent multiples.
*
* @returns {luxon.DateTime} roundedDateTime - The base date and time rounded to the nearest multiple of the interval minutes.
*
* @example
* // Returns a date time rounded to the nearest 15 minutes before the current time
* roundDateTime(new Date(), 15, -1);
*
* @example
* // Returns a date time rounded to the current minute
* roundDateTime(new Date(), 1, 0);
*
* @example
* // Returns a date time rounded to the nearest 15 minutes after the current time
* roundDateTime(new Date(), 15, 1);
*/
export function roundDateTime(baseDateTime: luxon.DateTime, intervalMinutes: number, intervalMultiplier: number): luxon.DateTime {
    let roundedDateTime: luxon.DateTime;
    // Calculate the rounded datetime based on interval
    if (intervalMultiplier === -1) {
        // Round to the nearest multiple of intervalMinutes after the hour
        roundedDateTime = nearestMultipleBefore(baseDateTime.startOf('minute'), intervalMinutes);
        // If the current time actually is a multiple, get the multiple before it
        if (areHourAndMinuteEqual(baseDateTime, roundedDateTime)) {
            roundedDateTime = roundedDateTime.minus({ minute: intervalMinutes });
        }
    } else if (intervalMultiplier === 0) {
        // Round to the current minute
        roundedDateTime = baseDateTime.startOf('minute');
    } else {
        // Calculate the datetime rounded to the nearest multiple of intervalMinutes after the hour, and subsequent multiples
        roundedDateTime = nearestMultipleAfter(baseDateTime.startOf('minute'), intervalMinutes);
        // If the current time actually is a multiple, get the multiple after it
        if (areHourAndMinuteEqual(baseDateTime, roundedDateTime)) {
            roundedDateTime = roundedDateTime.plus({ minute: intervalMinutes });
        }
        roundedDateTime = roundedDateTime.plus({ minute: (intervalMultiplier - 1) * intervalMinutes });
    }

    return roundedDateTime;
}

// Result structure to indicate success or failure
export interface ReplaceResult {
    success: boolean;
    result?: string; // Present when success is true
    error?: string;  // Present when success is false
}

// Data structure to hold placeholder values
export interface PlaceholderValues {
    [key: string]: string;
}

// Function signatures for special placeholder logic
function GetTZIDName(TZID: string): string {
    // Implement this function to return the name of the time zone based on TZID
    // Example: "Asia/Bangkok" -> "Bangkok, Thailand"
    return `Time Zone Name for ${TZID}`;
}

function GetTZIDTime(TZID: string): string {
    // Implement this function to return the time based on TZID
    // Example: "Asia/Bangkok" -> "12:30"

    return `Time for ${TZID}`;
}

// Function to replace placeholders in the templatedMessage

export function replacePlaceholders(templatedMessage: string, values: PlaceholderValues): ReplaceResult {
    // Regular expression pattern to match placeholders of the form {placeholder-name}
    const placeholderPattern = /\{([\w-]+)\}/g;

    // Regular expression pattern to specifically match placeholders related to time zones
    const TZIDPattern = /(end-time|time-name)-([\w/]+)/i;

    // Check for missing closing or opening brackets before processing placeholders

    // Step 1: Check for missing opening brackets (e.g., "break-name}")
    let closeBracketIndex = templatedMessage.indexOf('}');
    while (closeBracketIndex !== -1) {
        // Check if there's an opening bracket '{' before the current '}'
        const openBracketIndex = templatedMessage.lastIndexOf('{', closeBracketIndex);
        if (openBracketIndex === -1) {
            // No matching opening bracket found before this closing bracket, so return an error
            const invalidPlaceholder = templatedMessage.slice(closeBracketIndex - 10, closeBracketIndex + 1); // Capture the invalid portion
            return {
                success: false,
                error: `It seems like there's a missing opening bracket before "${invalidPlaceholder}". Please ensure all placeholders start with '{'.`
            };
        }
        closeBracketIndex = templatedMessage.indexOf('}', closeBracketIndex + 1);
    }

    // Step 2: Check for missing closing brackets (e.g., "{break-name")
    let openBracketIndex = templatedMessage.indexOf('{');
    while (openBracketIndex !== -1) {
        // Find the corresponding closing bracket `}`
        closeBracketIndex = templatedMessage.indexOf('}', openBracketIndex);

        // If no closing bracket is found, return an error about the missing closing bracket
        if (closeBracketIndex === -1) {
            const invalidPlaceholder = templatedMessage.slice(openBracketIndex);
            return {
                success: false,
                error: `It seems like the placeholder "${invalidPlaceholder}" is missing a closing bracket '}'. Please check your template and ensure all placeholders are properly closed.`
            };
        }

        // Move to the next opening bracket to check for other placeholders
        openBracketIndex = templatedMessage.indexOf('{', closeBracketIndex);
    }

    // This variable will hold the final message after all replacements are made
    let replacedMessage = templatedMessage;
    let match; // This will be used to store the current match from the regular expression

    // Loop through all the matches of the placeholder pattern in the template string
    while ((match = placeholderPattern.exec(templatedMessage)) !== null) {
        const fullPlaceholder = match[0];  // The entire placeholder, including brackets (e.g., "{end-time-home}")
        const placeholderKey = match[1].toLowerCase();  // The placeholder without brackets (e.g., "end-time-home")

        // Check if the placeholder matches the special time zone pattern (e.g., {end-time-TZID})
        const tzidMatch = placeholderKey.match(TZIDPattern);
        if (tzidMatch) {
            const [_, type, tzid] = tzidMatch;

            // Special predefined values: "home" and "additional"
            if (tzid === "home" || tzid === "additional") {
                const predefinedPlaceholder = `${type}-${tzid}`.toLowerCase();  // e.g., "end-time-home" or "time-name-additional"

                if (values[predefinedPlaceholder] !== undefined) {
                    // Use the predefined value from the PlaceholderValues collection
                    replacedMessage = replacedMessage.replace(fullPlaceholder, values[predefinedPlaceholder]);
                } else {
                    // If no predefined value exists, return an error
                    return {
                        success: false,
                        error: `The predefined placeholder "${predefinedPlaceholder}" is missing from the provided values.`
                    };
                }
            } else {
                // For regular TZID placeholders, call the GetTZIDTime or GetTZIDName functions
                let replacement;
                if (type.toLowerCase() === "end-time") {
                    // If tzid is "title", it's a special case
                    if (tzid === "title")
                        replacement = values['end-time-title']; 
                    else if (tzid === "home")
                        replacement = GetTZIDTime(values['end-time-home']);
                    else if (tzid === "additional")
                        replacement = GetTZIDTime(values['end-time-additional']);
                    else
                        replacement = GetTZIDTime(tzid);
                } else if (type.toLowerCase() === "time-name") {
                    replacement = GetTZIDName(tzid);
                }

                // If no replacement found (e.g., invalid time zone ID), return an error
                if (!replacement) {
                    return {
                        success: false,
                        error: `The time zone "${tzid}" for "${type}" could not be found. Please make sure the time zone is correct.`
                    };
                }

                // Replace the placeholder in the message with the correct value (time or time zone name)
                replacedMessage = replacedMessage.replace(fullPlaceholder, replacement);
            }
            continue;  // Skip to the next match since this was a special case
        }

        // Special provision for end-time-title
        if (placeholderKey === "end-time-title") {
            if (values[placeholderKey] !== undefined) {
                replacedMessage = replacedMessage.replace(fullPlaceholder, values[placeholderKey]);
            } else {
                return {
                    success: false,
                    error: `The placeholder "${fullPlaceholder}" is missing from the provided values.`
                };
            }
            continue;  // Skip to the next match since this was a special case
        }

        // For regular placeholders, check if a corresponding value exists in the provided values
        if (values[placeholderKey] !== undefined) {
            replacedMessage = replacedMessage.replace(fullPlaceholder, values[placeholderKey]);
        } else {
            // If no matching value is found for the placeholder, return a friendly error message
            return {
                success: false,
                error: `The placeholder "${fullPlaceholder}" is not recognized. Please check the name and try again.`
            };
        }
    }

    // If everything was successful, return the final message with all placeholders replaced
    return {
        success: true,
        result: replacedMessage
    };
}

// Example usage with a template
export function createExampleReplacement(template: string): ReplaceResult {
    const placeholderValues: PlaceholderValues = {
        "break-name": "Lunch Break",
        "timer": "12:45",
        "time-unit": "Minutes",
        "countdown-message": "until break ends",
        "countdown-end-msg": "Break is over",
        "end-time-title": "Break Ends At",
        "end-time-home": "14:30",
        "time-name-home": "Berlin, Germany",
        "end-time-secondary": "15:30",
        "time-name-secondary": "Lagos, Nigeria"
    };

    return replacePlaceholders(template, placeholderValues);
}


