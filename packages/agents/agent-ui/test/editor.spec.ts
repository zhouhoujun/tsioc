import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';
import { AgentEditorBridge } from '../src/AgentEditorBridge';

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

class FakeEditorBridge implements AgentEditorBridge {
    readonly available: boolean;
    opened: string[] = [];
    result: { content?: string; cancelled?: boolean } = { content: 'edited-draft' };

    constructor(available = true) {
        this.available = available;
    }

    async open(initial: string): Promise<{ content?: string; cancelled?: boolean }> {
        this.opened.push(initial);
        return { ...this.result };
    }
}

function createEditorConsole(editor: FakeEditorBridge | null): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    editor: FakeEditorBridge | null;
} {
    const state = new AgentConsoleSessionState();
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(rpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: { title: 'Console' } } as any,
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
        editor
    );
    return { state, component, editor };
}

@Suite('external editor bridge (P129 / G53)')
export class EditorBridgeTest {

    @Test('/editor seeds the editor with the current draft and writes the result back')
    async editorWritesResultBack() {
        const { state, component, editor } = createEditorConsole(new FakeEditorBridge());
        state.setInput('current draft');
        const result = await (component as any).handleCommand('/editor');
        expect(result).toEqual(true);
        expect(editor!.opened).toEqual(['current draft']);
        expect(state.input).toEqual('edited-draft');
        expect(state.notice).toContain('Draft updated from editor');
    }

    @Test('/editor with an argument uses it as the seed')
    async editorUsesArgumentSeed() {
        const { component, editor } = createEditorConsole(new FakeEditorBridge());
        const result = await (component as any).handleCommand('/editor seeded text');
        expect(result).toEqual(true);
        expect(editor!.opened).toEqual(['seeded text']);
    }

    @Test('/editor reports cancellation without touching the draft')
    async editorCancellationKeepsDraft() {
        const { state, component, editor } = createEditorConsole(new FakeEditorBridge());
        editor!.result = { cancelled: true };
        state.setInput('kept');
        const result = await (component as any).handleCommand('/editor');
        expect(result).toEqual(true);
        expect(state.input).toEqual('kept');
        expect(state.notice).toContain('closed without changes');
    }

    @Test('/editor without a host bridge notifies instead of failing')
    async editorWithoutHostNotifies() {
        const { state, component } = createEditorConsole(null);
        const result = await (component as any).handleCommand('/editor');
        expect(result).toEqual(true);
        expect(state.notice).toContain('No external editor available');
    }

    @Test('/editor is registered in the command hints')
    async editorInCommandHints() {
        const { component } = createEditorConsole(null);
        expect((component as any).commandHints).toContain('/editor');
    }

    @Test('/editor refuses while a turn is running')
    async editorRefusesWhileRunning() {
        const { state, component } = createEditorConsole(null);
        state.setStatus('running');
        const result = await (component as any).handleCommand('/editor');
        expect(result).toEqual(true);
        expect(state.notice).toContain('Wait for the current turn');
    }
}
