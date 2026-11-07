import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState, AgentConsoleStatusPanelComponent } from '../src';

/**
 * The footer notice duplicates text that an open text overlay already shows.
 * Suppress it while the dialog is open, restore it when the dialog closes.
 */
@Suite('status notice under a dialog')
export class StatusNoticeOverlayTest {
    @Test('the footer summary hides while a dialog is open and returns after close')
    hidesUnderOverlay() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const panel = new AgentConsoleStatusPanelComponent(state);
        state.setNotice('session chat-1 · model fake');
        expect(panel.notice).toEqual('session chat-1 · model fake');
        expect(panel.statusSummary).toContain('session chat-1');

        state.openTextOverlay('status', ['session chat-1', 'model fake']);
        expect(panel.notice).toEqual('');
        expect(panel.statusSummary).toEqual('');

        state.closeTextOverlay();
        expect(panel.notice).toEqual('session chat-1 · model fake');
        expect(panel.statusSummary).toContain('session chat-1');
    }
}
