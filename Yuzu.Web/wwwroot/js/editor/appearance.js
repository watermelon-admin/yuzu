/**
* Module: Appearance
* Implements setting widget apprearance properties.
*/
import { globals } from './globals.js';
import { SetAppearanceCommand } from './setappearance.js';
import { Execute } from './commands.js';
/**
 * Sets the appearance properties for the selected widgets.
 */
export function setSelectedWidgetsAppearance() {
    const selectedWidgets = globals.widgets.getWidgetsBySelection();
    if (selectedWidgets.length === 0) {
        return;
    }
    // Get color from colorPicker element
    const colorPicker = document.getElementById('colorPicker');
    const color = colorPicker.value;
    // Get font name from fontSelector element
    const fontSelector = document.getElementById('fontSelector');
    const fontFamily = fontSelector.options[fontSelector.selectedIndex].value;
    // Get font size from fontSize element
    const fontSize = parseInt(document.getElementById('fontSizeInput').value);
    Execute(new SetAppearanceCommand(selectedWidgets, color, fontFamily, fontSize));
}
//# sourceMappingURL=appearance.js.map