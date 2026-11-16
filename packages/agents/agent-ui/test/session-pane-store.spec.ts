import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionPaneStore } from '../src/AgentConsoleSessionPaneStore';

const snapshot = (input: string): any => ({ input, scrollOffset: 0, scrollFollowing: true });

@Suite('agent console session pane store')
export class AgentConsoleSessionPaneStoreTest {
    @Test('creates one stable record per session')
    ensuresStableRecords() {
        const store = new AgentConsoleSessionPaneStore();
        const first = store.ensure('session-a');
        expect(first?.id).toEqual('session-a');
        expect(store.ensure('session-a')).toBe(first);
        expect(store.ensure('')).toBe(undefined);
        expect(store.list().map(pane => pane.id)).toEqual(['session-a']);
    }

    @Test('capturing a snapshot bumps the pane version')
    snapshotBumpsVersion() {
        const store = new AgentConsoleSessionPaneStore();
        const pane = store.putSnapshot('session-a', snapshot('one'));
        expect(pane?.version).toEqual(1);
        expect(store.snapshot('session-a')?.input).toEqual('one');
        store.putSnapshot('session-a', snapshot('two'));
        expect(store.get('session-a')?.version).toEqual(2);
        expect(store.snapshot('session-a')?.input).toEqual('two');
    }

    @Test('activate marks the visible pane and keeps the record')
    activateKeepsRecord() {
        const store = new AgentConsoleSessionPaneStore();
        store.putSnapshot('session-a', snapshot('a'));
        store.putSnapshot('session-b', snapshot('b'));
        store.activate('session-b');
        expect(store.activeId).toEqual('session-b');
        expect(store.active?.id).toEqual('session-b');
        expect(store.snapshot('session-a')?.input).toEqual('a');
        store.activate('session-a');
        expect(store.active?.id).toEqual('session-a');
        expect(store.snapshot('session-b')?.input).toEqual('b');
    }

    @Test('forget drops only the requested pane')
    forgetDropsPane() {
        const store = new AgentConsoleSessionPaneStore();
        store.putSnapshot('session-a', snapshot('a'));
        store.putSnapshot('session-b', snapshot('b'));
        store.activate('session-a');
        store.forget('session-a');
        expect(store.get('session-a')).toBe(undefined);
        expect(store.activeId).toEqual('');
        expect(store.snapshot('session-b')?.input).toEqual('b');
        store.forget('');
        expect(store.list().map(pane => pane.id)).toEqual(['session-b']);
        store.clear();
        expect(store.list()).toEqual([]);
    }
}
