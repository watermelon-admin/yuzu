/**
* Module: Actions
* Executes editor actions based on the action type.
*/
import { updateButtonStatus, updateAppearanceControls } from './palette.js';
import { addBoxWidget, addQRWidget, addTextWidget, selectAllWidgets } from './widgets.js';
import { sendSelectedWidgetsToBack, bringSelectedWidgetsToFront, deleteSelectedWidgets, groupSelectedWidgets, ungroupWidgets } from './widgets.js';
import { setSelectedWidgetsAppearance, } from './appearance.js';
import { showEditorPreview, exitEditorPreview } from './preview.js';
import { editLeadingTextWidget, finishEditingTextWidget } from './editing.js';
import { cutSelectedWidgets, copySelectedWidgets, pasteWidgets, cloneSelectedWidgets } from './clipboard.js';
import { arrangeSelectedWidgets, distributeSelectedWidgets } from './arrange.js';
import { executeUndo, executeRedo } from './undo.js';
import { saveBreakType } from './storage.js';
/**
 * Handles editor button commands
 *
 * @param {string} action - The specific action triggered by the click.
 */
export function executeAction(action, data) {
    //  console.debug("Action: " + action);
    switch (action) {
        case 'start_edit':
            editLeadingTextWidget();
            break;
        case 'stop_edit':
            finishEditingTextWidget();
            break;
        case 'set_appearance':
            setSelectedWidgetsAppearance();
            break;
        case 'delete':
            deleteSelectedWidgets();
            break;
        case 'undo':
            executeUndo();
            break;
        case 'redo':
            executeRedo();
            break;
        case 'select_all':
            selectAllWidgets();
            break;
        case 'cut_selected':
            cutSelectedWidgets();
            break;
        case 'copy_selected':
            copySelectedWidgets();
            break;
        case 'paste':
            pasteWidgets();
            break;
        case 'clone_selected':
            cloneSelectedWidgets();
            break;
        case 'add_box':
            addBoxWidget();
            break;
        case 'add_text':
            addTextWidget();
            break;
        case 'add_qr':
            addQRWidget();
            break;
        case 'group_selected':
            groupSelectedWidgets();
            break;
        case 'ungroup':
            ungroupWidgets();
            break;
        case 'align_left':
            arrangeSelectedWidgets('left');
            break;
        case 'align_right':
            arrangeSelectedWidgets('right');
            break;
        case 'align_top':
            arrangeSelectedWidgets('top');
            break;
        case 'align_bottom':
            arrangeSelectedWidgets('bottom');
            break;
        case 'align_same-size':
            arrangeSelectedWidgets('same-size');
            break;
        case 'align_same-width':
            arrangeSelectedWidgets('same-width');
            break;
        case 'align_same-height':
            arrangeSelectedWidgets('same-height');
            break;
        case 'align_center-horizontal':
            arrangeSelectedWidgets('center-horizontal');
            break;
        case 'align_center-vertical':
            arrangeSelectedWidgets('center-vertical');
            break;
        case 'distribute-horizontal':
            distributeSelectedWidgets('horizontal');
            break;
        case 'distribute-vertical':
            distributeSelectedWidgets('vertical');
            break;
        case 'send-backward':
            // TODO: Implement this function
            // sendSelectedWidgetsBackward();
            break;
        case 'send-to-back':
            sendSelectedWidgetsToBack();
            break;
        case 'bring-forward':
            // Todo: Implement this function
            // bringSelectedWidgetsForward();
            break;
        case 'bring-to-front':
            bringSelectedWidgetsToFront();
            break;
        case 'preview':
            showEditorPreview();
            break;
        case 'exit-preview':
            exitEditorPreview();
            break;
        case 'save':
            saveBreakType();
            break;
        default:
            console.warn("Invalid alignment mode.");
    }
    updateButtonStatus();
    updateAppearanceControls();
}
//# sourceMappingURL=actions.js.map