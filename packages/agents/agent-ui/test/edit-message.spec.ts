import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';

/**
 * P130 (G55/G70): Esc,Esc edits the last user message; submitting an edited
 * message that has later turns forks the session at the previous turn.
 *
 * Harness mirrors session-lifecycle.spec.ts: 8 constructor args (state,
 * runtime, SchedulerStub, bridge, options, null, rpc, sessionService) and a
 * FakeAppRpc that answers session pages, tools and approvals with safe
 * defaults so the full submit/openSession refresh chain runs stub-safe.
 */

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

    async request(method: string, params?: any): Promise<any> {
        this.calls.push({ method, params });
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

/**
 * Records fork/ensure invocations and returns deterministic branch ids so the
 * fork assertions don't depend on FakeAppRpc's 'session.fork' semantics.
 */
class RecordingSessionService extends AgentConsoleSessionService {
    forkCalls: Array<{ sessionId: string; messageId?: string }> = [];
    ensureCalls: Array<string | undefined> = [];

    constructor(rpc?: any) {
        super(rpc, null);
    }

    async forkSession(sessionId: string, messageId?: string): Promise<string> {
        this.forkCalls.push({ sessionId, messageId });
        return 'forked-branch';
    }

    async ensureSession(sessionId?: string, context?: any): Promise<any> {
        this.ensureCalls.push(sessionId);
        return { id: sessionId || 'fresh-empty', archived: false };
    }
}

function createEditConsole(messages: any[]): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    service: RecordingSessionService;
} {
    const state = new AgentConsoleSessionState();
    state.configure({ sessionId: 'active-1' } as any);
    state.setMessages(messages as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const service = new RecordingSessionService(rpc as any);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: { title: 'Console' } } as any,
        null,
        rpc as any,
        service
    );
    return { state, component, service };
}

function pressEsc(component: AgentConsoleComponent): Promise<boolean> {
    return (component as any).handleGlobalKeyInput('\u001b');
}

function standardMessages(): any[] {
    return [
        { id: 'u1', role: 'user', content: 'prompt one', createdAt: 1 },
        { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 2 },
        { id: 'u2', role: 'user', content: 'prompt two', createdAt: 3 },
        { id: 'a2', role: 'assistant', content: 'reply two', createdAt: 4 }
    ];
}

@Suite('edit last message (P130)')
export class EditMessageTest {

    @Test('Esc,Esc enters edit mode on the last editable user message')
    async doubleEscEntersEditMode() {
        const { state, component } = createEditConsole(standardMessages());

        const first = await pressEsc(component);
        expect(first).toEqual(false);

        const second = await pressEsc(component);
        expect(second).toEqual(true);
        expect((component as any).editTargetMessageId).toEqual('u2');
        expect(state.input).toEqual('prompt two');
        expect(state.notice).toContain('Editing message u2');
    }

    @Test('Esc while editing cancels the edit and restores the draft')
    async escCancelsAndRestoresDraft() {
        const { state, component } = createEditConsole(standardMessages());
        component.input = 'draft before';

        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u2');
        expect(state.input).toEqual('prompt two');

        const cancelled = await pressEsc(component);
        expect(cancelled).toEqual(true);
        expect((component as any).editTargetMessageId).toEqual('');
        expect(state.input).toEqual('draft before');
        expect(state.notice).toContain('Edit cancelled — draft restored.');
    }

    @Test('Esc,Esc after a dismissal steps back to the previous user message')
    async doubleEscStepsBack() {
        const { state, component } = createEditConsole(standardMessages());

        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u2');

        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('');

        const stepped = await pressEsc(component);
        expect(stepped).toEqual(true);
        expect((component as any).editTargetMessageId).toEqual('u1');
        expect(state.input).toEqual('prompt one');
    }

    @Test('step-back at the first user message shows a boundary notice')
    async stepBackAtFirstMessageNotifies() {
        const { state, component } = createEditConsole(standardMessages());

        await pressEsc(component);
        await pressEsc(component);
        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u1');

        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('');

        const boundary = await pressEsc(component);
        expect(boundary).toEqual(true);
        expect(state.notice).toContain('Already at the first user message.');
    }

    @Test('steer user messages are skipped by the editable set')
    async steerMessagesAreSkipped() {
        const { state, component } = createEditConsole([
            { id: 's1', role: 'user', content: 'steer content', createdAt: 1, metadata: { kind: 'steer' } },
            { id: 'u1', role: 'user', content: 'prompt one', createdAt: 2 },
            { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 3 }
        ]);

        await pressEsc(component);
        await pressEsc(component);

        expect((component as any).editTargetMessageId).toEqual('u1');
        expect(state.input).toEqual('prompt one');
    }

    @Test('no editable user message shows a notice')
    async noUserMessageShowsNotice() {
        const { state, component } = createEditConsole([
            { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 1 }
        ]);

        await pressEsc(component);
        const entered = await pressEsc(component);

        expect(entered).toEqual(true);
        expect(state.notice).toContain('No user message to edit.');
        expect((component as any).editTargetMessageId).toEqual('');
    }

    @Test('editing strips the [Mention Context] marker from the draft')
    async mentionContextMarkerIsStripped() {
        const { state, component } = createEditConsole([
            { id: 'u1', role: 'user', content: '[Mention Context]\nContext: workspace\n\nreal prompt', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 2 }
        ]);

        await pressEsc(component);
        await pressEsc(component);

        expect((component as any).editTargetMessageId).toEqual('u1');
        expect(state.input).toEqual('real prompt');
    }

    @Test('editing a message with image parts restores them as pending attachments')
    async imagePartsBecomePendingAttachments() {
        const { state, component } = createEditConsole([
            { id: 'u1', role: 'user', content: 'look at this', createdAt: 1, parts: [{ type: 'image', imageUrl: 'data:image/png;base64,AAA', name: 'shot.png', mediaType: 'image/png' }] },
            { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 2 }
        ]);

        await pressEsc(component);
        await pressEsc(component);

        expect((component as any).editTargetMessageId).toEqual('u1');
        const attachments = state.pendingAttachments;
        expect(attachments.length).toEqual(1);
        expect(attachments[0]).toEqual({
            id: 'edit-u1-0',
            kind: 'image',
            path: 'data:image/png;base64,AAA',
            name: 'shot.png',
            mediaType: 'image/png',
            imageUrl: 'data:image/png;base64,AAA'
        });
    }

    @Test('submit after editing a mid-history message forks the session at the previous turn')
    async submitEditedMidHistoryForksSession() {
        const { state, component, service } = createEditConsole(standardMessages());

        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u2');

        component.input = 'edited prompt two';
        await component.submit();

        expect(service.forkCalls).toEqual([{ sessionId: 'active-1', messageId: 'a1' }]);
        expect(state.sessionId).toEqual('forked-branch');
        expect(state.notice).toContain('Branched into forked-branch');
    }

    @Test('submit after editing the first message creates a fresh session')
    async submitEditedFirstMessageCreatesFreshSession() {
        const { state, component, service } = createEditConsole([
            { id: 'u1', role: 'user', content: 'prompt one', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 2 },
            { id: 'u2', role: 'user', content: 'prompt two', createdAt: 3 }
        ]);

        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u2');
        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u1');

        component.input = 'edited first prompt';
        await component.submit();

        expect(service.ensureCalls[0]).toEqual(undefined);
        expect(service.forkCalls.length).toEqual(0);
        expect(state.sessionId).toEqual('fresh-empty');
    }

    @Test('submit after editing the last message runs the turn in place without forking')
    async submitEditedLastMessageRunsInPlace() {
        const { state, component, service } = createEditConsole([
            { id: 'u1', role: 'user', content: 'prompt one', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: 'reply one', createdAt: 2 },
            { id: 'u2', role: 'user', content: 'prompt two', createdAt: 3 }
        ]);

        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u2');

        component.input = 'edited last prompt';
        await component.submit();

        expect(service.forkCalls.length).toEqual(0);
        expect(service.ensureCalls.length).toEqual(0);
        expect(state.sessionId).toEqual('active-1');
    }

    @Test('an unknown command typed while editing does not fork')
    async unknownCommandWhileEditingDoesNotFork() {
        const { state, component, service } = createEditConsole(standardMessages());

        await pressEsc(component);
        await pressEsc(component);
        expect((component as any).editTargetMessageId).toEqual('u2');

        component.input = '/zzz-unknown';
        await component.submit();

        expect(service.forkCalls.length).toEqual(0);
        expect(state.notice).toContain('Unknown command: /zzz-unknown');
    }
}
