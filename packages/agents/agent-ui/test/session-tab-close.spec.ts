import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { closeAgentConsoleSessionTab } from '../src/AgentConsoleSessionTabClose';

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

function makeHost(state: AgentConsoleSessionState, calls: { opened: Array<string | undefined>; notices: string[]; busy?: boolean }) {
    return {
        state,
        translator: null,
        isTurnInProgress: () => calls.busy === true,
        notifyBusyState: (message: string) => calls.notices.push(message),
        openSession: async (sessionId?: string) => { calls.opened.push(sessionId); }
    };
}

@Suite('session tab close')
export class SessionTabCloseTest {
    @Test('closing an inactive tab only removes it from the open set')
    async closesInactive() {
        const state = makeState('a', ['a', 'b'], ['a', 'b']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        await closeAgentConsoleSessionTab(makeHost(state, calls), 'b');
        expect(state.openSessionIds).toEqual(['a']);
        expect(calls.opened).toEqual([]);
    }

    @Test('closing the active tab selects its previous open neighbour')
    async closesActive() {
        const state = makeState('b', ['a', 'b', 'c'], ['a', 'b', 'c']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        await closeAgentConsoleSessionTab(makeHost(state, calls), 'b');
        expect(state.openSessionIds).toEqual(['a', 'c']);
        expect(calls.opened).toEqual(['a']);
    }

    @Test('closing the only tab starts a fresh session')
    async closesLast() {
        const state = makeState('a', ['a'], ['a']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[] };
        await closeAgentConsoleSessionTab(makeHost(state, calls), 'a');
        expect(state.openSessionIds).toEqual([]);
        expect(calls.opened).toEqual([undefined]);
    }

    @Test('a running turn keeps the active tab open')
    async refusesBusyTurn() {
        const state = makeState('a', ['a', 'b'], ['a', 'b']);
        const calls = { opened: [] as Array<string | undefined>, notices: [] as string[], busy: true };
        await closeAgentConsoleSessionTab(makeHost(state, calls), 'a');
        expect(state.openSessionIds).toEqual(['a', 'b']);
        expect(calls.opened).toEqual([]);
        expect(calls.notices.length).toEqual(1);
    }
}
