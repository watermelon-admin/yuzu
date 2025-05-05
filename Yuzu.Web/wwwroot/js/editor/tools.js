/**
 * Module: Tools
 * Defines various handy tool functions.
 */
/**
* Generates a random color value and formats it in the #RRGGBB format.
* @returns A string representing the random color value in the #RRGGBB format.
*/
export function getRandomColor() {
    // Generate random values for red, green, and blue components
    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);
    // Convert the decimal values to hexadecimal strings and pad them if necessary
    const redHex = red.toString(16).padStart(2, '0');
    const greenHex = green.toString(16).padStart(2, '0');
    const blueHex = blue.toString(16).padStart(2, '0');
    // Concatenate the components and return the formatted color string
    return `#${redHex}${greenHex}${blueHex}`;
}
/**
 * Pads a number with zeroes to meet a minimum string length.
 *
 * @param {number} sourceNumber - The number to pad.
 * @param {number} minLength - The minimum length of the resulting string.
 * @returns {string} The padded string.
 */
export function padNumberWithZeroes(sourceNumber, minLength) {
    // Convert number to string
    let numberString = sourceNumber.toString();
    // Check if padding is necessary
    if (numberString.length < minLength) {
        // Calculate the number of zeroes to pad
        const zeroesToAdd = minLength - numberString.length;
        // Pad the string with zeroes
        numberString = "0".repeat(zeroesToAdd) + numberString;
    }
    return numberString;
}
//# sourceMappingURL=tools.js.map