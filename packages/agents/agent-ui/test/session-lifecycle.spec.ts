import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';

class RuntimeStub {
    messages: any[] = [];

    async runTurn(sessionId: string, input: string): Promise<any> {
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(): Promise<any[]> {
        return this.messages;
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
    calls: Array<{ method: string; params?: any }> = [];
    sessions: any[] = [
        { id: 'active-1', title: 'Active session', pinned: false, archived: false, messageCount: 3 },
        { id: 'archived-1', title: 'Archived session', pinned: false, archived: true, messageCount: 5 }
    ];
    messagePages?: Record<string, { messages: any[]; nextCursor?: string; hasMore: boolean }>;

    async request(method: string, params?: any): Promise<any> {
        this.calls.push({ method, params });
        switch (method) {
            case 'session.list': {
                const includeArchived = params?.includeArchived === true;
                return this.sessions.filter(item => includeArchived || !item.archived);
            }
            case 'session.set_archived': {
                const target = this.sessions.find(item => item.id === params?.sessionId);
                if (target) target.archived = !!params?.archived;
                return { updated: true, sessionId: params?.sessionId, archived: !!params?.archived };
            }
            case 'session.fork': {
                const sessionId = `fork-${Date.now().toString(36)}`;
                this.sessions.push({ id: sessionId, title: 'Forked', pinned: false, archived: false, messageCount: 1 });
                return { sessionId, sourceSessionId: params?.sessionId };
            }
            case 'session.messages':
                if (this.messagePages) {
                    const key = params?.before && params?.cursor ? params.cursor : 'tail';
                    return this.messagePages[key] || { messages: [], hasMore: false };
                }
                return { messages: [], sections: [], nextCursor: undefined, hasMore: false };
            case 'tools.list':
                return [];
            default:
                return {};
        }
    }
}

function createLifecycleConsole(): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    rpc: FakeAppRpc;
} {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
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
        sessionService
    );
    return { state, component, rpc };
}

@Suite('session lifecycle commands (P124)')
export class SessionLifecycleCommandTest {

    @Test('restoring a paged session keeps messages from the beginning')
    async restoringPagedSessionKeepsBeginning() {
        const { component, rpc } = createLifecycleConsole();
        rpc.messagePages = {
            tail: {
                messages: [
                    { id: 'm3', role: 'user', content: 'third', createdAt: 3 },
                    { id: 'm4', role: 'assistant', content: 'fourth', createdAt: 4 }
                ],
                nextCursor: 'm4',
                hasMore: true
            },
            m3: {
                messages: [
                    { id: 'm1', role: 'user', content: 'first', createdAt: 1 },
                    { id: 'm2', role: 'assistant', content: 'second', createdAt: 2 }
                ],
                nextCursor: 'm2',
                hasMore: false
            }
        };

        const page = await (component as any).loadSessionPage('active-1');

        expect(page.messages.map((message: any) => message.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
        expect(rpc.calls.filter(call => call.method === 'session.messages').map(call => call.params)).toEqual([
            { sessionId: 'active-1' },
            { sessionId: 'active-1', cursor: 'm3', before: true }
        ]);
    }

    @Test('/resume lists archived sessions and resumes a selection')
    async resumeIncludesArchived() {
        const { state, component, rpc } = createLifecycleConsole();

        const pending = (component as any).handleCommand('/resume');

        const listCall = rpc.calls.find(call => call.method === 'session.list');
        expect(listCall?.params).toEqual({ includeArchived: true });
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(state.selectMenu?.options.length).toEqual(2);
        expect(state.selectMenu?.options.some(option => option.label.includes('archived'))).toEqual(true);

        await state.selectMenuAction?.('active-1');
        const result = await pending;
        expect(result).toEqual(true);
    }

    @Test('/resume with no sessions shows a notice')
    async resumeWithNoSessions() {
        const { state, component, rpc } = createLifecycleConsole();
        rpc.sessions = [];

        await (component as any).handleCommand('/resume');

        expect(state.notice).toContain('No sessions available.');
    }

    @Test('/archive sets the archived flag and refreshes the session list')
    async archiveCurrentSession() {
        const { state, component, rpc } = createLifecycleConsole();

        const result = await (component as any).handleCommand('/archive');

        expect(result).toEqual(true);
        const archiveCall = rpc.calls.find(call => call.method === 'session.set_archived');
        expect(archiveCall?.params).toEqual({ sessionId: 'active-1', archived: true });
        expect(state.notice).toContain('Archived session active-1');
    }

    @Test('/fork forks the current session and opens the branch')
    async forkCurrentSession() {
        const { state, component, rpc } = createLifecycleConsole();
        state.setNotice('');

        const result = await (component as any).handleCommand('/fork');

        expect(result).toEqual(true);
        const forkCall = rpc.calls.find(call => call.method === 'session.fork');
        expect(forkCall?.params).toEqual({ sessionId: 'active-1' });
        expect(state.notice).toContain('Forked session fork-');
    }

    @Test('/fork with a message id forwards it to the RPC')
    async forkWithMessageId() {
        const { component, rpc } = createLifecycleConsole();

        await (component as any).handleCommand('/fork msg-42');

        const forkCall = rpc.calls.find(call => call.method === 'session.fork');
        expect(forkCall?.params).toEqual({ sessionId: 'active-1', messageId: 'msg-42' });
    }

    @Test('/side opens a temporary fork and labels it as side session')
    async sideOpensTemporaryFork() {
        const { state, component, rpc } = createLifecycleConsole();

        const result = await (component as any).handleCommand('/side');

        expect(result).toEqual(true);
        const forkCall = rpc.calls.find(call => call.method === 'session.fork');
        expect(forkCall).toBeTruthy();
        expect(state.notice).toContain('Opened side session fork-');
    }

    @Test('/archive with no current session shows a notice')
    async archiveWithNoSession() {
        const { state, component } = createLifecycleConsole();
        state.sessionId = '';

        await (component as any).handleCommand('/archive');

        expect(state.notice).toContain('No current session to archive.');
    }

    @Test('resume/archive/fork are registered in command hints')
    async commandsRegisteredInHints() {
        const { state } = createLifecycleConsole();
        expect(state.commandHints).toContain('/resume');
        expect(state.commandHints).toContain('/archive');
        expect(state.commandHints).toContain('/fork');
        expect(state.commandHints).toContain('/side');
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Suite('timeline event duration derivation')
export class TimelineEventDurationTest {

    @Test('terminal upsert derives duration from the running row start time')
    async terminalUpsertDerivesDuration() {
        const { state } = createLifecycleConsole();
        const key = 'tool-1';
        state.upsertUiEventMessage(key, 'Invoked', {
            eventType: 'tool_call',
            label: 'tool',
            status: 'running',
            toolCallId: 'tc-1',
            source: 'local'
        });
        await sleep(5);
        state.upsertUiEventMessage(key, 'Completed', {
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success',
            toolCallId: 'tc-1',
            source: 'local'
        });

        const rows = state.messages.filter(message => message.metadata?.uiKind === 'event');
        expect(rows.length).toEqual(1);
        expect(rows[0].metadata?.status).toEqual('success');
        expect(typeof rows[0].metadata?.durationMs).toEqual('number');
        expect(rows[0].metadata?.durationMs).toBeGreaterThanOrEqual(5);
    }

    @Test('repeated terminal upserts keep the first derived duration')
    async repeatedTerminalUpsertsKeepDuration() {
        const { state } = createLifecycleConsole();
        const key = 'bg-1';
        state.upsertUiEventMessage(key, 'Running', {
            eventType: 'bg',
            label: 'task',
            status: 'running',
            receiptId: 'r-1',
            source: 'local'
        });
        await sleep(5);
        state.upsertUiEventMessage(key, 'Done', {
            eventType: 'bg',
            label: 'task',
            status: 'success',
            receiptId: 'r-1',
            source: 'local'
        });
        const first = state.messages.find(message => message.metadata?.uiEventKey === key);
        expect(typeof first?.metadata?.durationMs).toEqual('number');
        const firstDuration = first?.metadata?.durationMs;

        await sleep(10);
        state.upsertUiEventMessage(key, 'Done again', {
            eventType: 'bg',
            label: 'task',
            status: 'success',
            receiptId: 'r-1',
            source: 'local'
        });
        const second = state.messages.find(message => message.metadata?.uiEventKey === key);
        expect(second?.metadata?.durationMs).toEqual(firstDuration);
    }

    @Test('explicit receipt duration is preserved over derivation')
    async explicitDurationPreserved() {
        const { state } = createLifecycleConsole();
        const key = 'tool-explicit';
        state.upsertUiEventMessage(key, 'Invoked', {
            eventType: 'tool_call',
            label: 'tool',
            status: 'running',
            toolCallId: 'tc-9',
            source: 'local'
        });
        state.upsertUiEventMessage(key, 'Completed', {
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success',
            durationMs: 1234,
            toolCallId: 'tc-9',
            source: 'local'
        });
        const row = state.messages.find(message => message.metadata?.uiEventKey === key);
        expect(row?.metadata?.durationMs).toEqual(1234);
    }

    @Test('re-running after a terminal row is rejected and does not clear duration')
    async rerunAfterTerminalRejected() {
        const { state } = createLifecycleConsole();
        const key = 'tool-2';
        state.upsertUiEventMessage(key, 'Invoked', {
            eventType: 'tool_call',
            label: 'tool',
            status: 'running',
            toolCallId: 'tc-2',
            source: 'local'
        });
        await sleep(5);
        state.upsertUiEventMessage(key, 'Completed', {
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success',
            toolCallId: 'tc-2',
            source: 'local'
        });
        state.upsertUiEventMessage(key, 'Rerunning', {
            eventType: 'tool_call',
            label: 'tool',
            status: 'running',
            toolCallId: 'tc-2',
            source: 'local'
        });
        const row = state.messages.find(message => message.metadata?.uiEventKey === key);
        expect(row?.metadata?.status).toEqual('success');
        expect(typeof row?.metadata?.durationMs).toEqual('number');
    }
}
