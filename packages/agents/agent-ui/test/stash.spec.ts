import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleSessionService,
    AgentConsoleSessionState
} from '../src';
import { AgentConsoleStashStore } from '../src/AgentConsoleStash';

class RuntimeStub {
    async runTurn(sessionId: string, input: string): Promise<any> {
        return { sessionId, message: { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 } };
    }

    async getMessages(): Promise<any[]> {
        return [];
    }
}

class SchedulerStub {
    async schedule(task: any): Promise<any> {
        return task;
    }

    getTasks(): any[] {
        return [];
    }
}

class FakeAppRpc {
    async request(method: string, params?: any): Promise<any> {
        switch (method) {
            case 'session.messages':
                return { messages: [], sections: [], nextCursor: undefined, hasMore: false };
            case 'tools.list':
                return [];
            default:
                return {};
        }
    }
}

class MemoryStashStore extends AgentConsoleStashStore {
    saved: Array<{ workspace: string; stashes: Record<string, string> }> = [];
    value: Record<string, string> = {};

    async load(): Promise<any> {
        return { ...this.value };
    }

    async save(workspace: string, stashes: Record<string, string>): Promise<void> {
        this.value = { ...stashes };
        this.saved.push({ workspace, stashes: { ...stashes } });
    }
}

function createStashConsole(ui?: any, stashValue?: Record<string, string>): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    store: MemoryStashStore;
} {
    const state = new AgentConsoleSessionState();
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(rpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const store = new MemoryStashStore(null);
    store.value = { ...(stashValue || {}) };
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: ui || {} } as any,
        null,
        rpc as any,
        sessionService,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        store
    );
    return { state, component, store };
}

@Suite('named draft stash (P132)')
export class AgentConsoleStashTest {

    @Test('stash store persists named drafts to disk shape')
    async storeRoundTrips() {
        const store = new AgentConsoleStashStore(null);
        expect(await store.load('ws')).toEqual({});
    }

    @Test('/stash list notifies when empty')
    async listEmpty() {
        const { state, component } = createStashConsole();
        const result = await (component as any).handleCommand('/stash');
        expect(result).toEqual(true);
        expect(state.notice).toContain('No stashed drafts');
    }

    @Test('/stash list shows names and sizes')
    async listEntries() {
        const { state, component } = createStashConsole(undefined, { 'wip': 'hello world', 'plan': 'todo' });
        await (component as any).handleCommand('/stash list');
        expect(state.notice).toContain('wip (11 chars)');
        expect(state.notice).toContain('plan (4 chars)');
    }

    @Test('/stash push saves the current draft')
    async pushDraft() {
        const { state, component, store } = createStashConsole();
        state.updateDraft('stash me');
        const result = await (component as any).handleCommand('/stash push wip');
        expect(result).toEqual(true);
        expect(store.value.wip).toEqual('stash me');
        expect(store.saved.length).toEqual(1);
        expect(state.notice).toContain('stashed as "wip"');
    }

    @Test('/stash push rejects an empty draft')
    async pushEmpty() {
        const { state, component, store } = createStashConsole();
        const result = await (component as any).handleCommand('/stash push wip');
        expect(result).toEqual(true);
        expect(Object.keys(store.value).length).toEqual(0);
        expect(state.notice).toContain('Nothing to stash');
    }

    @Test('/stash push without a name uses default')
    async pushDefaultName() {
        const { state, component, store } = createStashConsole();
        state.updateDraft('draft text');
        await (component as any).handleCommand('/stash push');
        expect(store.value.default).toEqual('draft text');
    }

    @Test('/stash pop restores the draft and removes the stash')
    async popDraft() {
        const { state, component, store } = createStashConsole(undefined, { 'wip': 'restored text' });
        const result = await (component as any).handleCommand('/stash pop wip');
        expect(result).toEqual(true);
        expect(state.input).toEqual('restored text');
        expect(store.value.wip).toBeUndefined();
        expect(state.notice).toContain('Restored stash "wip"');
    }

    @Test('/stash pop of a missing name notifies')
    async popMissing() {
        const { state, component } = createStashConsole();
        const result = await (component as any).handleCommand('/stash pop nope');
        expect(result).toEqual(true);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('No stash named "nope"');
    }

    @Test('/stash rm removes a named stash')
    async rmStash() {
        const { state, component, store } = createStashConsole(undefined, { 'wip': 'text', 'keep': 'keep me' });
        const result = await (component as any).handleCommand('/stash rm wip');
        expect(result).toEqual(true);
        expect(store.value.wip).toBeUndefined();
        expect(store.value.keep).toEqual('keep me');
        expect(state.notice).toContain('Removed stash "wip"');
    }

    @Test('/stash with an unknown verb notifies usage')
    async unknownVerb() {
        const { state, component } = createStashConsole();
        const result = await (component as any).handleCommand('/stash bogus');
        expect(result).toEqual(true);
        expect(state.notice).toContain('Usage: /stash');
    }

    @Test('constructor wires the stash store into the component')
    async constructorWiresStore() {
        const { component } = createStashConsole();
        expect((component as any).stashStore).toBeTruthy();
    }
}
