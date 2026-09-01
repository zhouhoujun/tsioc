import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    renderAgentConsoleMessageItems
} from '../src';
import { AgentConsoleRawModeStore } from '../src/AgentConsoleRawMode';
import { mergeAgentTuiConfig, normalizeAgentTuiConfig } from '../src/AgentTuiConfig';

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

class MemoryRawModeStore extends AgentConsoleRawModeStore {
    saved: Array<{ workspace: string; rawMode: boolean }> = [];
    value?: boolean;

    async load(): Promise<any> {
        return this.value;
    }

    async save(workspace: string, rawMode: boolean): Promise<void> {
        this.value = rawMode;
        this.saved.push({ workspace, rawMode });
    }
}

function createRawModeConsole(ui?: any, storeValue?: boolean): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    store: MemoryRawModeStore;
} {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(rpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const store = new MemoryRawModeStore(null);
    store.value = storeValue;
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
        store
    );
    return { state, component, store };
}

@Suite('raw scrollback mode (P131)')
export class AgentConsoleRawModeTest {

    @Test('raw mode renders markdown content as plain text')
    rawRendersPlainText() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1',
                role: 'assistant',
                content: '**bold**\n- item',
                createdAt: 1
            }
        ] as any, { rawMode: true });

        expect(items[0].lines[0].content).toEqual('**bold**');
        expect(items[0].lines[1].content).toEqual('- item');
    }

    @Test('default mode still renders markdown')
    defaultRendersMarkdown() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1',
                role: 'assistant',
                content: '**bold**\n- item',
                createdAt: 1
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('bold');
        expect(items[0].lines[1].content).toEqual('item');
    }

    @Test('raw mode bypasses tool output summarization')
    rawKeepsFullToolOutput() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 't1',
                role: 'tool',
                name: 'read_file',
                content: '{"path":"src/index.ts","truncated":false}',
                createdAt: 1,
                metadata: {
                    receipt: {
                        toolName: 'read_file'
                    }
                }
            }
        ] as any, { rawMode: true });

        expect(items[0].lines[0].content).toContain('"path":"src/index.ts"');
        expect(items[0].lines[0].content).toContain('"truncated":false');
    }

    @Test('default mode summarizes tool output')
    defaultSummarizesToolOutput() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 't1',
                role: 'tool',
                name: 'read_file',
                content: '{"path":"src/index.ts","truncated":false}',
                createdAt: 1,
                metadata: {
                    receipt: {
                        toolName: 'read_file'
                    }
                }
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('src/index.ts');
        expect(items[0].lines[0].content.includes('{')).toEqual(false);
    }

    @Test('tui config defaults rawMode to false')
    tuiConfigDefaults() {
        expect(normalizeAgentTuiConfig().rawMode).toEqual(false);
    }

    @Test('tui config merge honors rawMode layers')
    tuiConfigMerge() {
        expect(mergeAgentTuiConfig({ rawMode: true }).rawMode).toEqual(true);
        expect(mergeAgentTuiConfig({}, { rawMode: false }).rawMode).toEqual(false);
        expect(mergeAgentTuiConfig({ rawMode: true }, { rawMode: false }).rawMode).toEqual(false);
    }

    @Test('tui config normalize falls back to false for invalid rawMode')
    tuiConfigInvalidRawMode() {
        expect(normalizeAgentTuiConfig({ rawMode: 'yes' as any }).rawMode).toEqual(false);
    }

    @Test('constructor initializes rawMode from ui options')
    constructorInitializesFromOptions() {
        const { state } = createRawModeConsole({ rawMode: true });
        expect(state.rawMode).toEqual(true);
    }

    @Test('/raw toggles rawMode and persists')
    async togglePersists() {
        const { state, component, store } = createRawModeConsole();
        expect(state.rawMode).toEqual(false);
        const result = await (component as any).handleCommand('/raw');
        expect(result).toEqual(true);
        expect(state.rawMode).toEqual(true);
        expect(store.saved.length).toEqual(1);
        expect(store.saved[0].rawMode).toEqual(true);
        expect(state.notice).toContain('Raw mode enabled');

        await (component as any).handleCommand('/raw');
        expect(state.rawMode).toEqual(false);
        expect(store.saved.length).toEqual(2);
        expect(store.saved[1].rawMode).toEqual(false);
        expect(state.notice).toContain('Raw mode disabled');
    }

    @Test('/raw on and /raw off set rawMode explicitly')
    async onOffArgs() {
        const { state, component, store } = createRawModeConsole();
        await (component as any).handleCommand('/raw on');
        expect(state.rawMode).toEqual(true);
        await (component as any).handleCommand('/raw off');
        expect(state.rawMode).toEqual(false);
        expect(store.saved.length).toEqual(2);
    }

    @Test('restoreRawMode applies a persisted value')
    async restoreFromStore() {
        const { state, component } = createRawModeConsole(undefined, true);
        await (component as any).restoreRawMode();
        expect(state.rawMode).toEqual(true);
    }

    @Test('restoreRawMode leaves the default when nothing is persisted')
    async restoreFromEmptyStore() {
        const { state, component } = createRawModeConsole();
        await (component as any).restoreRawMode();
        expect(state.rawMode).toEqual(false);
    }
}
