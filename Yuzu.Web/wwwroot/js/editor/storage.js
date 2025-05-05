/**
 * Module: Storage
 * Handle saving and loading screens
 */
import { globals } from './globals.js';
export function saveBreakType() {
    // Get serialized widget data
    const componentData = globals.widgets.serialize();
    // Get the break id from the query string
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search);
    const breakId = params.get('id');
    // Get the antiforgery token
    const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
    const token = tokenElement === null || tokenElement === void 0 ? void 0 : tokenElement.value;
    const breakTypeData = {
        PartitionKey: '',
        RowKey: breakId,
        ETag: '',
        Name: document.getElementById('settingsName').value,
        DefaultDurationMinutes: parseInt(document.getElementById('settingsDefaultDurationMinutes').value),
        CountdownMessage: document.getElementById('settingsCountdownMessage').value,
        CountdownEndMessage: document.getElementById('settingsCountdownEndMessage').value,
        EndTimeTitle: document.getElementById('settingsEndTimeTitle').value,
        BreakStartIntervalsMinutes: parseInt(document.getElementById('settingsBreakStartIntervalsMinutes').value),
        UsageCount: 0,
        ImageFileName: globals.backgroundImage,
        Components: componentData,
        IsLocked: false
    };
    // Send to server
    fetch('/Breaks/Editor?handler=SaveBreakType', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(breakTypeData)
    });
}
//# sourceMappingURL=storage.js.map