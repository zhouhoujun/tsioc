import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import {
    AgentConsoleRemoteEventBridge,
    applyRemoteEvent,
    decodeSseFrame,
    parseSseFrames
} from '../src';

function makeState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState();
}

@Suite('AgentConsoleRemoteEventBridge parsing')
export class RemoteEventBridgeParsingTest {
    @Test('parseSseFrames splits complete blocks and keeps partial remainder')
    parseSseSplits() {
        const { frames, rest } = parseSseFrames(
            'event: turn_started\ndata: {"sessionId":"s1"}\n\nevent: tool_invoked\ndata: {"sessionId":"s1"}\n\n'
        );
        expect(frames.length).toEqual(2);
        expect(frames[0].event).toEqual('turn_started');
        expect(frames[1].event).toEqual('tool_invoked');
        expect(rest).toEqual('');
    }

    @Test('parseSseFrames leaves an unterminated trailing block in rest')
    parseSseKeepsPartialTrailing() {
        const { frames, rest } = parseSseFrames(
            'event: turn_started\ndata: {"sessionId":"s1"}\n\nevent: tool_invoked\ndata: {"sessionId":"s1"}'
        );
        expect(frames.length).toEqual(1);
        expect(frames[0].event).toEqual('turn_started');
        expect(rest).toEqual('event: tool_invoked\ndata: {"sessionId":"s1"}');
    }

    @Test('parseSseFrames ignores comments and empty blocks')
    parseSseIgnoresComments() {
        const { frames } = parseSseFrames(': keep-alive\nevent: error\ndata: {"sessionId":"s1","error":"boom"}\n\n');
        expect(frames.length).toEqual(1);
        expect(frames[0].event).toEqual('error');
    }

    @Test('decodeSseFrame parses JSON data and resolves event name')
    decodeSseResolvesEvent() {
        const frame = { event: 'tool_failed', data: '{"sessionId":"s1","toolName":"read_file"}' };
        const event = decodeSseFrame(frame)!;
        expect(event.type).toEqual('tool_failed');
        expect(event.sessionId).toEqual('s1');
    }
}

@Suite('AgentConsoleRemoteEventBridge mapping')
export class RemoteEventBridgeMappingTest {
    @Test('turn_started sets status running and activity')
    turnStarted() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'turn_started', sessionId: 's1', data: { sessionId: 's1' } });
        expect(state.status).toEqual('running');
        expect(state.activities.some(activity => activity.kind === 'turn')).toBe(true);
    }

    @Test('stream_chunk updates token usage')
    streamChunkUsage() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'stream_chunk', sessionId: 's1', data: { sessionId: 's1', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } } });
        expect(state.tokenUsage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    }

    @Test('turn_completed sets status idle')
    turnCompleted() {
        const state = makeState();
        state.setStatus('running');
        applyRemoteEvent(state, { type: 'turn_completed', sessionId: 's1', data: { sessionId: 's1' } });
        expect(state.status).toEqual('idle');
    }

    @Test('tool_invoked adds running tool run')
    toolInvoked() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'tool_invoked', sessionId: 's1', data: { sessionId: 's1', toolName: 'read_file', inputSummary: '/tmp/a.ts' } });
        expect(state.runningTools).toEqual(['read_file']);
        expect(state.toolRuns.length).toEqual(1);
        expect(state.toolRuns[0].status).toEqual('running');
        expect(state.toolRuns[0].inputSummary).toEqual('/tmp/a.ts');
    }

    @Test('tool_completed marks run success with duration')
    toolCompleted() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'tool_completed', sessionId: 's1', data: {
            sessionId: 's1',
            toolName: 'edit_file',
            receipt: { durationMs: 42, toolCallId: 'tc-1', inputSummary: '/tmp/a.ts', outputSummary: 'ok' }
        } });
        expect(state.runningTools).toEqual([]);
        expect(state.toolRuns[0].status).toEqual('success');
        expect(state.toolRuns[0].durationMs).toEqual(42);
        expect(state.toolRuns[0].toolCallId).toEqual('tc-1');
    }

    @Test('tool_completed with todo output sets plan todos')
    toolCompletedTodo() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'tool_completed', sessionId: 's1', data: {
            sessionId: 's1',
            toolName: 'todo',
            output: { todos: [{ id: 't1', content: 'Step one', status: 'in_progress' }] }
        } });
        expect(state.planTodos).toEqual([{ id: 't1', content: 'Step one', status: 'in_progress' }]);
    }

    @Test('tool_failed records error and clears running')
    toolFailed() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'tool_failed', sessionId: 's1', data: { sessionId: 's1', toolName: 'write_file', error: 'ENOENT' } });
        expect(state.runningTools).toEqual([]);
        expect(state.toolRuns[0].status).toEqual('error');
        expect(state.toolRuns[0].error).toEqual('ENOENT');
        expect(state.lastError).toEqual('ENOENT');
    }

    @Test('approval_requested upserts pending approval')
    approvalRequested() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'approval_requested', sessionId: 's1', data: {
            sessionId: 's1',
            request: { id: 'ap-1', toolName: 'write_file', sessionId: 's1', reason: 'write', summary: 'write /tmp/a.ts', timeoutMs: 60000 }
        } });
        expect(state.pendingApprovals.length).toEqual(1);
        expect(state.pendingApprovals[0].id).toEqual('ap-1');
        expect(state.pendingApprovals[0].timeoutMs).toEqual(60000);
        expect(state.pendingApprovals[0].expiresAt).toBeGreaterThan(0);
    }

    @Test('approval_completed removes pending approval')
    approvalCompleted() {
        const state = makeState();
        state.upsertPendingApproval({
            id: 'ap-1', toolName: 'write_file', sessionId: 's1', reason: 'write', summary: 'x', hasInput: false,
            createdAt: Date.now(), timeoutMs: 0, expiresAt: 0
        });
        applyRemoteEvent(state, { type: 'approval_completed', sessionId: 's1', data: { sessionId: 's1', approved: true, request: { id: 'ap-1', toolName: 'write_file', sessionId: 's1' } } });
        expect(state.pendingApprovals.length).toEqual(0);
    }

    @Test('error sets status error and appends assistant error')
    errorEvent() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'error', sessionId: 's1', data: { sessionId: 's1', error: 'model failed' } });
        expect(state.status).toEqual('error');
        expect(state.lastError).toEqual('model failed');
    }

    @Test('unknown event types are ignored')
    unknownEventIgnored() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'some_future_event', sessionId: 's1', data: { sessionId: 's1' } });
        expect(state.status).toEqual('idle');
        expect(state.activities.length).toEqual(0);
    }
}

@Suite('AgentConsoleRemoteEventBridge connection')
export class RemoteEventBridgeConnectionTest {
    @Test('applies SSE records for the subscribed session')
    async appliesRecordsForSession() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        const events: string[] = [
            'event: turn_started\ndata: {"sessionId":"s1"}\n\n',
            'event: tool_invoked\ndata: {"sessionId":"s1","toolName":"echo"}\n\n'
        ];
        const fetchImpl = async () => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    for (const event of events) {
                        controller.enqueue(new TextEncoder().encode(event));
                    }
                    controller.close();
                }
            });
            return new Response(stream, { status: 200 });
        };
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:8080',
            fetchImpl: fetchImpl as any,
            reconnectDelayMs: 100_000
        });
        const dispose = await bridge.subscribe('s1');
        dispose();
        expect(state.status).toEqual('running');
        expect(state.runningTools).toEqual(['echo']);
    }

    @Test('ignores records for other sessions')
    async ignoresOtherSessions() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        const fetchImpl = async () => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('event: turn_started\ndata: {"sessionId":"other"}\n\n'));
                    controller.close();
                }
            });
            return new Response(stream, { status: 200 });
        };
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:8080',
            fetchImpl: fetchImpl as any,
            reconnectDelayMs: 100_000
        });
        const dispose = await bridge.subscribe('s1');
        dispose();
        expect(state.status).toEqual('idle');
    }

    @Test('connectOnce throws on non-ok response')
    async connectOnceThrowsOnHttpError() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        const fetchImpl = async () => new Response('denied', { status: 401 });
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:8080',
            fetchImpl: fetchImpl as any,
            reconnectDelayMs: 100_000
        });
        let thrown: any = null;
        try {
            await bridge.subscribe('s1');
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
    }

    @Test('subscribe returns a dispose function that stops reconnects')
    async subscribeDisposeStops() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        let calls = 0;
        const fetchImpl = async () => {
            calls++;
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('event: turn_started\ndata: {"sessionId":"s1"}\n\n'));
                    controller.close();
                }
            });
            return new Response(stream, { status: 200 });
        };
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:8080',
            fetchImpl: fetchImpl as any,
            reconnectDelayMs: 100_000
        });
        const dispose = await bridge.subscribe('s1');
        expect(state.status).toEqual('running');
        expect(calls).toEqual(1);
        dispose();
        expect(bridge.connected).toBe(false);
    }
}
