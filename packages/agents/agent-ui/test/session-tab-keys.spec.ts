import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { AgentConsoleKeymap } from '../src/AgentConsoleKeymap';
import { decodeGlobalKey } from '../src/AgentConsoleStreamHelpers';
import { closeAgentConsoleSessionTab } from '../src/AgentConsoleSessionTabClose';
import {
    cycleAgentConsoleSessionTab,
    reopenClosedAgentConsoleSessionTab
} from '../src/AgentConsoleSessionTabNavigation';
import { executeGlobalKeyActionView } from '../src/AgentConsoleGlobalKeyActions';
import { normalizeAgentConsoleBrowserKey } from '../src/AgentConsoleKeyNormalization';

function makeState(current: string, open: string[], sessions: string[]): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: current });
    state.setOpenSessionIds(open);
    state.setSessions(sessions.map(id => ({
        id,
        current: id === current,
        title: `Topic ${id}`,
        workspace: '/work/a'
    })));
    return state;
}

function makeHost(state: AgentConsoleSessionState, calls: { opened: Array<string | undefined>; notices: string[] }) {
    return {
        state,
        translator: null,
        notify: (message: string) => { calls.notices.push(message); },
        notifyBusyState: (message: string) => { calls.notices.push(message); },
        isTurnInProgress: () => false,
        openSession: async (sessionId?: string) => {
            calls.opened.push(sessionId);
            if (sessionId) {
                state.configure({ sessionId });
            }
        }
    };
}

@Suite('session tab keyboard navigation')
export class SessionTabKeyboardTest {
    @Test('Ctrl+Tab cycles forward and wraps, Ctrl+Shift+Tab goes back')
    async cyclesTabs() {
        const state = makeState('b', ['a', 'b', 'c'], ['a', 'b', 'c']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        const host = makeHost(state, calls);

        expect(cycleAgentConsoleSessionTab(host, 1)).toEqual(true);
        expect(calls.opened).toEqual(['c']);
        expect(cycleAgentConsoleSessionTab(host, 1)).toEqual(true);
        expect(calls.opened).toEqual(['c', 'a']);
        expect(cycleAgentConsoleSessionTab(host, -1)).toEqual(true);
        expect(calls.opened).toEqual(['c', 'a', 'c']);
    }

    @Test('a single tab is a no-op')
    async singleTab() {
        const state = makeState('a', ['a'], ['a']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        expect(cycleAgentConsoleSessionTab(makeHost(state, calls), 1)).toEqual(false);
        expect(calls.opened).toEqual([]);
    }

    @Test('Ctrl+Shift+T reopens the most recently closed tab')
    async reopensClosedTab() {
        const state = makeState('b', ['a', 'b', 'c'], ['a', 'b', 'c']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        const host = makeHost(state, calls);
        await closeAgentConsoleSessionTab(host, 'c');
        expect(state.openSessionIds).toEqual(['a', 'b']);
        expect(state.closedSessionTabIds).toEqual(['c']);

        expect(await reopenClosedAgentConsoleSessionTab(host)).toEqual(true);
        expect(state.openSessionIds).toEqual(['a', 'b', 'c']);
        expect(calls.opened).toEqual(['c']);
        expect(state.closedSessionTabIds).toEqual([]);
    }

    @Test('reopening with no closed tab notifies once')
    async noClosedTab() {
        const state = makeState('a', ['a'], ['a']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        expect(await reopenClosedAgentConsoleSessionTab(makeHost(state, calls))).toEqual(true);
        expect(calls.notices.length).toEqual(1);
    }

    @Test('closing an unknown tab does not enter the reopen stack')
    async ignoresUnknownClose() {
        const state = makeState('a', ['a'], ['a']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        await closeAgentConsoleSessionTab(makeHost(state, calls), 'missing');
        expect(state.closedSessionTabIds).toEqual([]);
    }

    @Test('default keymap and terminal decoders resolve the tab shortcuts')
    async keymapAndDecoders() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('ctrl+tab')).toEqual('tab-next');
        expect(keymap.resolve('ctrl+shift+tab')).toEqual('tab-prev');
        expect(keymap.resolve('ctrl+shift+t')).toEqual('tab-reopen');
        expect(keymap.resolve('ctrl+x w')).toEqual('tab-close');
        expect(keymap.resolve('alt+]')).toEqual('tab-next');
        expect(keymap.resolve('alt+[')).toEqual('tab-prev');
        expect(keymap.resolve('alt+shift+t')).toEqual('tab-reopen');
        expect(decodeGlobalKey('\u001b[1;5I')).toEqual('ctrl+tab');
        expect(decodeGlobalKey('\u001b[1;6I')).toEqual('ctrl+shift+tab');
        expect(decodeGlobalKey('\u001b[9;5u')).toEqual('ctrl+tab');
    }

    @Test('browser key normalization keeps modifiers distinct')
    browserKeyNormalization() {
        expect(normalizeAgentConsoleBrowserKey('Tab', { ctrlKey: true })).toEqual('ctrl+tab');
        expect(normalizeAgentConsoleBrowserKey('Tab', { ctrlKey: true, shiftKey: true })).toEqual('ctrl+shift+tab');
        expect(normalizeAgentConsoleBrowserKey('T', { ctrlKey: true, shiftKey: true })).toEqual('ctrl+shift+t');
        expect(normalizeAgentConsoleBrowserKey(']', { altKey: true })).toEqual('alt+]');
        expect(normalizeAgentConsoleBrowserKey('T', { altKey: true, shiftKey: true })).toEqual('alt+shift+t');
        expect(normalizeAgentConsoleBrowserKey('F2', { shiftKey: true })).toEqual('shift+f2');
    }

    @Test('global key actions dispatch to the tab host methods')
    async dispatchesActions() {
        const calls: string[] = [];
        const host = {
            cycleSessionTab: (delta: 1 | -1) => { calls.push(`cycle:${delta}`); return true; },
            reopenClosedSessionTab: async () => { calls.push('reopen'); return true; }
        } as any;
        expect(await executeGlobalKeyActionView(host, 'tab-next')).toEqual(true);
        expect(await executeGlobalKeyActionView(host, 'tab-prev')).toEqual(true);
        expect(await executeGlobalKeyActionView(host, 'tab-reopen')).toEqual(true);
        expect(calls).toEqual(['cycle:1', 'cycle:-1', 'reopen']);
    }
}
