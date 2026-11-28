import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';
import { AgentConsoleKeymap } from '../src/AgentConsoleKeymap';
import { decodeGlobalKey } from '../src/AgentConsoleStreamHelpers';
import { executeGlobalKeyActionView } from '../src/AgentConsoleGlobalKeyActions';
import {
    navigateAgentConsoleSessionTabHistory,
    selectAgentConsoleSessionTabByIndex
} from '../src/AgentConsoleSessionTabNavigation';

function seedState(): { state: AgentConsoleSessionState; selected: string[] } {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.sessions = [
        { id: 'session-a', title: 'Alpha', workspace: '/tmp/ws', createdAt: 1, updatedAt: 1, current: true },
        { id: 'session-b', title: 'Beta', workspace: '/tmp/ws', createdAt: 2, updatedAt: 2, current: false },
        { id: 'session-c', title: 'Gamma', workspace: '/tmp/ws', createdAt: 3, updatedAt: 3, current: false }
    ] as any;
    state.openSessionIds = ['session-a', 'session-b', 'session-c'];
    state.sessionId = 'session-a';
    const selected: string[] = [];
    state.sessionTabsAction = {
        select: (id: string) => {
            selected.push(id);
            state.sessionId = id;
        }
    };
    return { state, selected };
}

@Suite('session tab quick switch and history')
export class SessionTabHistoryTest {
    @Test('alt+digit selects the matching visible tab')
    quickSwitch() {
        const { state, selected } = seedState();
        const host = { state, notify: () => undefined, openSession: () => undefined };
        expect(selectAgentConsoleSessionTabByIndex(host as any, 2)).toEqual(true);
        expect(selected).toEqual(['session-b']);
        expect(state.sessionId).toEqual('session-b');
        // Selecting the active tab and an out-of-range slot are no-ops.
        expect(selectAgentConsoleSessionTabByIndex(host as any, 2)).toEqual(false);
        expect(selectAgentConsoleSessionTabByIndex(host as any, 9)).toEqual(false);
        expect(selected).toEqual(['session-b']);
    }

    @Test('history walks previous visits without recording itself')
    history() {
        const { state, selected } = seedState();
        const host = { state, notify: () => undefined, openSession: () => undefined };
        selectAgentConsoleSessionTabByIndex(host as any, 2);
        selectAgentConsoleSessionTabByIndex(host as any, 3);
        expect(state.sessionTabHistory).toEqual(['session-a', 'session-b', 'session-c']);
        expect(state.sessionTabHistoryIndex).toEqual(2);

        expect(navigateAgentConsoleSessionTabHistory(host as any, -1)).toEqual(true);
        expect(state.sessionId).toEqual('session-b');
        expect(state.sessionTabHistoryIndex).toEqual(1);
        expect(navigateAgentConsoleSessionTabHistory(host as any, -1)).toEqual(true);
        expect(state.sessionId).toEqual('session-a');
        expect(state.sessionTabHistoryIndex).toEqual(0);
        expect(navigateAgentConsoleSessionTabHistory(host as any, -1)).toEqual(false);

        expect(navigateAgentConsoleSessionTabHistory(host as any, 1)).toEqual(true);
        expect(state.sessionId).toEqual('session-b');
        expect(state.sessionTabHistoryIndex).toEqual(1);
        expect(navigateAgentConsoleSessionTabHistory(host as any, 1)).toEqual(true);
        expect(state.sessionId).toEqual('session-c');
        expect(navigateAgentConsoleSessionTabHistory(host as any, 1)).toEqual(false);
        // History navigation did not append duplicates.
        expect(state.sessionTabHistory).toEqual(['session-a', 'session-b', 'session-c']);
        expect(selected).toEqual(['session-b', 'session-c', 'session-b', 'session-a', 'session-b', 'session-c']);
    }

    @Test('a new tab switch after going back truncates the forward branch')
    truncatesForwardBranch() {
        const { state } = seedState();
        const host = { state, notify: () => undefined, openSession: () => undefined };
        selectAgentConsoleSessionTabByIndex(host as any, 2);
        selectAgentConsoleSessionTabByIndex(host as any, 3);
        navigateAgentConsoleSessionTabHistory(host as any, -1);
        selectAgentConsoleSessionTabByIndex(host as any, 1);
        expect(state.sessionTabHistory).toEqual(['session-a', 'session-b', 'session-a']);
        expect(state.sessionTabHistoryIndex).toEqual(2);
    }

    @Test('global key actions dispatch quick switch and history')
    async dispatchesActions() {
        const calls: string[] = [];
        const host = {
            selectSessionTabIndex: (index: number) => { calls.push(`select:${index}`); return true; },
            navigateSessionTabHistory: (delta: 1 | -1) => { calls.push(`history:${delta}`); return true; }
        } as any;
        expect(await executeGlobalKeyActionView(host, 'tab-select-3')).toEqual(true);
        expect(await executeGlobalKeyActionView(host, 'tab-history-back')).toEqual(true);
        expect(await executeGlobalKeyActionView(host, 'tab-history-forward')).toEqual(true);
        expect(calls).toEqual(['select:3', 'history:-1', 'history:1']);
    }

    @Test('keymap exposes the quick switch and history bindings')
    keymap() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('alt+2')).toEqual('tab-select-2');
        expect(keymap.resolve('alt+9')).toEqual('tab-select-9');
        expect(keymap.resolve('ctrl+alt+left')).toEqual('tab-history-back');
        expect(keymap.resolve('ctrl+alt+right')).toEqual('tab-history-forward');
        expect(decodeGlobalKey('\u001b2')).toEqual('alt+2');
        expect(decodeGlobalKey('\u001b[1;7D')).toEqual('ctrl+alt+left');
        expect(decodeGlobalKey('\u001b[1;7C')).toEqual('ctrl+alt+right');
    }
}
