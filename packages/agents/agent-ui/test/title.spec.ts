import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';
import {
    AgentConsoleTitleStore,
    composeAgentConsoleTerminalTitle,
    defaultAgentConsoleTitle,
    normalizeAgentConsoleTitle
} from '../src/AgentConsoleTitle';

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

class MemoryTitleStore extends AgentConsoleTitleStore {
    saved: Array<{ workspace: string; title: string[] }> = [];
    value?: string[];

    async load(): Promise<any> {
        return this.value;
    }

    async save(workspace: string, title: any[]): Promise<void> {
        this.value = title;
        this.saved.push({ workspace, title: [...title] });
    }
}

function createTitleConsole(ui?: any): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    store: MemoryTitleStore;
} {
    const state = new AgentConsoleSessionState();
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(rpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const store = new MemoryTitleStore(null);
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
        undefined,
        store
    );
    return { state, component, store };
}

@Suite('terminal window title (P139)')
export class TerminalTitleTest {

    @Test('default title fields are the full field sequence')
    async defaultFields() {
        const { state } = createTitleConsole();
        expect(state.titleFields).toEqual([...defaultAgentConsoleTitle]);
    }

    @Test('compose skips empty parts and joins with a separator')
    async composeJoinsNonEmptyParts() {
        const title = composeAgentConsoleTerminalTitle({
            projectLabel: 'demo',
            status: 'running',
            sessionId: 'active-1',
            gitBranch: 'main',
            model: 'deepseek-v4-flash',
            workspace: '/work/demo',
            title: 'fix login'
        });
        expect(title).toEqual('demo · working · active-1 · main · deepseek-v4-flash · /work/demo · fix login');
    }

    @Test('compose maps running status to working')
    async composeStatusMapping() {
        expect(composeAgentConsoleTerminalTitle({ status: 'running' }, ['status'])).toEqual('working');
        expect(composeAgentConsoleTerminalTitle({ status: 'idle' }, ['status'])).toEqual('idle');
        expect(composeAgentConsoleTerminalTitle({ status: 'error' }, ['status'])).toEqual('error');
        expect(composeAgentConsoleTerminalTitle({ status: 'reasoning' }, ['status'])).toEqual('reasoning');
    }

    @Test('compose prefixes action_required while approvals are pending')
    async composeActionRequired() {
        const title = composeAgentConsoleTerminalTitle({ pendingApprovalCount: 2, status: 'running' }, ['status']);
        expect(title).toEqual('action_required');
    }

    @Test('compose honors the configured field subset and order')
    async composeHonorsFields() {
        const title = composeAgentConsoleTerminalTitle(
            { projectLabel: 'demo', model: 'm1', gitBranch: 'main', title: 't' },
            ['model', 'task']
        );
        expect(title).toEqual('m1 · t');
    }

    @Test('compose falls back to workspace basename for project')
    async composeProjectFallback() {
        const title = composeAgentConsoleTerminalTitle({ workspace: '/work/demo' }, ['project']);
        expect(title).toEqual('demo');
        const keyed = composeAgentConsoleTerminalTitle({ projectKey: 'k1', workspace: '/work/demo' }, ['project']);
        expect(keyed).toEqual('k1');
    }

    @Test('normalize filters invalid fields, duplicates and blanks')
    async normalizeTitleFields() {
        const normalized = normalizeAgentConsoleTitle(['project', 'PROJECT', '', 'status', 'project']);
        expect(normalized).toEqual(['project', 'status']);
        expect(normalizeAgentConsoleTitle([])).toEqual([]);
        expect(normalizeAgentConsoleTitle(undefined)).toEqual([...defaultAgentConsoleTitle]);
    }

    @Test('/title with no args lists the current fields')
    async listWithoutArgs() {
        const { state, component } = createTitleConsole();
        const result = await (component as any).handleCommand('/title');
        expect(result).toEqual(true);
        expect(state.notice).toContain('Window title:');
        expect(state.notice).toContain('project');
    }

    @Test('/title set updates fields and persists')
    async setFields() {
        const { state, component, store } = createTitleConsole();
        const result = await (component as any).handleCommand('/title set project,status');
        expect(result).toEqual(true);
        expect(state.titleFields).toEqual(['project', 'status']);
        expect(store.saved.length).toEqual(1);
        expect(store.saved[0].title).toEqual(['project', 'status']);
        expect(state.notice).toContain('Window title set to project, status.');
    }

    @Test('/title set rejects unknown fields')
    async setRejectsUnknownFields() {
        const { state, component, store } = createTitleConsole();
        const result = await (component as any).handleCommand('/title set project,bogus');
        expect(result).toEqual(true);
        expect(state.titleFields).toEqual([...defaultAgentConsoleTitle]);
        expect(state.notice).toContain('Unknown window title field "bogus"');
        expect(store.saved.length).toEqual(0);
    }

    @Test('/title unset removes a field and persists')
    async unsetField() {
        const { state, component, store } = createTitleConsole();
        const result = await (component as any).handleCommand('/title unset branch');
        expect(result).toEqual(true);
        expect(state.titleFields).not.toContain('branch');
        expect(store.saved.length).toEqual(1);
        expect(state.notice).toContain('Window title set to');
    }

    @Test('/title unset with a missing field notifies without persisting')
    async unsetUnknownField() {
        const { state, component, store } = createTitleConsole();
        const result = await (component as any).handleCommand('/title unset bogus');
        expect(result).toEqual(true);
        expect(state.titleFields).toEqual([...defaultAgentConsoleTitle]);
        expect(store.saved.length).toEqual(0);
        expect(state.notice).toContain('is not in the window title');
    }

    @Test('legacy /title <text> still renames the session and updates the title field')
    async legacyRenamePreserved() {
        const { state, component, store } = createTitleConsole();
        const result = await (component as any).handleCommand('/title fix login');
        expect(result).toEqual(true);
        expect(state.title).toEqual('fix login');
        expect(store.saved.length).toEqual(0);
        expect(state.notice).toContain('Session titled "fix login".');
    }
}
