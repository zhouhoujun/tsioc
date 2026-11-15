import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { dismissBackgroundPanels } from '../src/AgentConsoleDialogExclusivity';
import { openTextOverlay } from '../src/AgentConsoleOverlayState';

function fakeState(): any {
    return {
        sessionsFocused: true,
        toolsFocused: true,
        approvalsFocused: true,
        jobsFocused: true,
        tasksFocused: true,
        toolRunsFocused: true,
        reviewOpen: true,
        gitSnapshotOpen: true,
        messageDetailOpen: true,
        timelineEventInspectorOpen: true,
        commandOutputsOpen: true,
        whichKeyVisible: true,
        healthPopoverVisible: true,
        textOverlay: { title: 'x', lines: ['x'], scroll: 0 },
        textOverlayBack: () => undefined,
        maxOverlayVisibleLines: 10,
        syncDerivedInputFocus: () => undefined
    };
}

@Suite('dialog exclusivity')
export class DialogExclusivityTest {
    @Test('opening a text dialog dismisses every other transient panel')
    openingTextClosesPanels() {
        const state = fakeState();
        openTextOverlay(state, 'Help', ['line']);
        expect(state.textOverlay?.title).toEqual('Help');
        expect(state.sessionsFocused).toEqual(false);
        expect(state.toolsFocused).toEqual(false);
        expect(state.approvalsFocused).toEqual(false);
        expect(state.jobsFocused).toEqual(false);
        expect(state.tasksFocused).toEqual(false);
        expect(state.toolRunsFocused).toEqual(false);
        expect(state.reviewOpen).toEqual(false);
        expect(state.commandOutputsOpen).toEqual(false);
        expect(state.whichKeyVisible).toEqual(false);
    }

    @Test('the panel being opened survives the dismiss pass')
    keepsRequestedPanel() {
        const state = fakeState();
        dismissBackgroundPanels(state, 'tools');
        expect(state.toolsFocused).toEqual(true);
        expect(state.sessionsFocused).toEqual(false);
        expect(state.textOverlay).toEqual(null);
        expect(state.textOverlayBack).toBeUndefined();
    }
}
