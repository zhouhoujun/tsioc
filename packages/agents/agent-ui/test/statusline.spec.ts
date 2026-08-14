import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';
import { AgentConsoleStatusPanelComponent } from '../src/AgentConsolePanels';
import { AgentConsoleStatuslineStore, defaultAgentConsoleStatusline, normalizeAgentConsoleStatusline } from '../src/AgentConsoleStatusline';

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

class MemoryStatuslineStore extends AgentConsoleStatuslineStore {
    saved: Array<{ workspace: string; statusline: string[] }> = [];
    value?: string[];

    async load(): Promise<any> {
        return this.value;
    }

    async save(workspace: string, statusline: any[]): Promise<void> {
        this.value = statusline;
        this.saved.push({ workspace, statusline: [...statusline] });
    }
}

function createStatuslineConsole(ui?: any): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    store: MemoryStatuslineStore;
} {
    const state = new AgentConsoleSessionState();
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(rpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const store = new MemoryStatuslineStore(null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: ui || { title: 'Console' } } as any,
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
        store
    );
    return { state, component, store };
}

@Suite('statusline config (P125)')
export class StatuslineCommandTest {

    @Test('default statusline is the full field sequence')
    async defaultSequence() {
        const { state } = createStatuslineConsole();
        expect(state.statusline).toEqual([...defaultAgentConsoleStatusline]);
    }

    @Test('ui.statusline option overrides the default sequence')
    async optionOverridesDefault() {
        const { state } = createStatuslineConsole({ statusline: ['model', 'tokens'] });
        expect(state.statusline).toEqual(['model', 'tokens']);
    }

    @Test('/statusline with no args lists the current sequence')
    async listWithoutArgs() {
        const { state, component } = createStatuslineConsole();
        const result = await (component as any).handleCommand('/statusline');
        expect(result).toEqual(true);
        expect(state.notice).toContain('Statusline:');
        expect(state.notice).toContain('model');
    }

    @Test('/statusline set updates state and persists the sequence')
    async setFields() {
        const { state, component, store } = createStatuslineConsole();
        const result = await (component as any).handleCommand('/statusline set model,workspace');
        expect(result).toEqual(true);
        expect(state.statusline).toEqual(['model', 'workspace']);
        expect(store.saved.length).toEqual(1);
        expect(store.saved[0].statusline).toEqual(['model', 'workspace']);
        expect(state.notice).toContain('Statusline set to model, workspace.');
    }

    @Test('/statusline set rejects unknown fields')
    async setRejectsUnknownFields() {
        const { state, component, store } = createStatuslineConsole();
        const result = await (component as any).handleCommand('/statusline set model,bogus');
        expect(result).toEqual(true);
        expect(state.statusline).toEqual([...defaultAgentConsoleStatusline]);
        expect(state.notice).toContain('Unknown statusline field "bogus"');
        expect(store.saved.length).toEqual(0);
    }

    @Test('/statusline set ignores duplicates and blanks')
    async setNormalizes() {
        const normalized = normalizeAgentConsoleStatusline(['model', 'MODEL', '', 'tokens', 'model']);
        expect(normalized).toEqual(['model', 'tokens']);
        expect(normalizeAgentConsoleStatusline([])).toEqual([]);
        expect(normalizeAgentConsoleStatusline(undefined)).toEqual([...defaultAgentConsoleStatusline]);
    }

    @Test('/statusline unset removes a field and persists')
    async unsetField() {
        const { state, component, store } = createStatuslineConsole();
        const result = await (component as any).handleCommand('/statusline unset git-branch');
        expect(result).toEqual(true);
        expect(state.statusline).not.toContain('git-branch');
        expect(store.saved.length).toEqual(1);
        expect(state.notice).toContain('Statusline set to');
    }

    @Test('/statusline unset with a missing field notifies without persisting')
    async unsetUnknownField() {
        const { state, component, store } = createStatuslineConsole();
        const result = await (component as any).handleCommand('/statusline unset bogus');
        expect(result).toEqual(true);
        expect(state.statusline).toEqual([...defaultAgentConsoleStatusline]);
        expect(store.saved.length).toEqual(0);
        expect(state.notice).toContain('is not in the statusline');
    }

    @Test('status panel renders configured fields as status lines')
    async panelRendersFields() {
        const { state } = createStatuslineConsole({ statusline: ['model', 'tokens'] });
        state.setProvider('deepseek');
        state.setModel('deepseek-v4-flash');
        state.setTokenUsage({ promptTokens: 120, completionTokens: 1080, totalTokens: 1200 });

        const panel = new AgentConsoleStatusPanelComponent(state);

        expect(panel.shouldShow).toEqual(true);
        const lines = panel.statusLines;
        expect(lines.some(line => line.includes('model: deepseek/deepseek-v4-flash'))).toEqual(true);
        expect(lines.some(line => line.includes('tokens: 1.2K'))).toEqual(true);
        expect(lines.some(line => line.includes('git-branch:'))).toEqual(false);
    }

    @Test('status panel hides when no fields, notice, or approvals')
    async panelHiddenByDefault() {
        const { state } = createStatuslineConsole({ statusline: [] });
        const panel = new AgentConsoleStatusPanelComponent(state);
        expect(panel.shouldShow).toEqual(false);
        expect(panel.statusLines).toEqual([]);
    }

    @Test('status panel shows notice lines alongside configured fields')
    async panelShowsNoticeWithFields() {
        const { state } = createStatuslineConsole({ statusline: ['workspace'] });
        state.setWorkspace('/work/demo');
        state.setNotice('ready');
        const panel = new AgentConsoleStatusPanelComponent(state);
        expect(panel.shouldShow).toEqual(true);
        const lines = panel.statusLines;
        expect(lines.some(line => line.includes('workspace: /work/demo'))).toEqual(true);
        expect(lines.some(line => line.includes('ready'))).toEqual(true);
    }
}
