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

            // Special predefined values: "home" and "secondary"
            if (tzid === "home" || tzid === "secondary") {
                const predefinedPlaceholder = `${type}-${tzid}`.toLowerCase();  // e.g., "end-time-home" or "time-name-secondary"

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
