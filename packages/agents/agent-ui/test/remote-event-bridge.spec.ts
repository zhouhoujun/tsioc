import { InMemoryCommandExecutionControl } from "@tsdi/agent";
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
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
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
    @Test('seedTimeline ignores events from another session')
    seedTimelineIsSessionScoped() {
        const state = makeState();
        state.sessionId = 's1';
        state.seedTimeline([{ sessionId: 's2', sequence: 2, kind: 'tool_invoked', status: 'running', content: 'drop' } as any]);
        expect(state.messages.length).toEqual(0);
    }

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

    @Test('tool_completed with todo output tracks planId and revision')
    toolCompletedTodoTracksRevision() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'tool_completed', sessionId: 's1', data: {
            sessionId: 's1',
            toolName: 'todo',
            output: { planId: 'plan:s1', revision: 3, todos: [{ id: 't1', content: 'Step one', status: 'in_progress' }] }
        } });
        expect(state.planRevision).toEqual(3);
        expect(state.planId).toEqual('plan:s1');
        expect(state.planTodos.length).toEqual(1);
    }

    @Test('plan_created tracks planId and revision when present')
    planCreatedTracksRevision() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'plan_created', sessionId: 's1', data: {
            sessionId: 's1', sequence: 1, planId: 'plan:s1', revision: 2,
            steps: [{ id: 's1', content: 'Step one', status: 'pending' }]
        } });
        expect(state.planRevision).toEqual(2);
        expect(state.planId).toEqual('plan:s1');
    }

    @Test('remote tool lifecycle projects one timeline event with execution identity')
    remoteToolLifecycleProjectsStableTimelineEvent() {
        const state = makeState();
        applyRemoteEvent(state, { type: 'tool_invoked', sessionId: 's1', data: {
            sessionId: 's1', toolName: 'read_file', toolCallId: 'call-1', sequence: 4,
            inputSummary: 'src/index.ts'
        } });
        applyRemoteEvent(state, { type: 'tool_completed', sessionId: 's1', data: {
            sessionId: 's1', toolName: 'read_file', toolCallId: 'call-1', sequence: 5,
            receipt: { toolCallId: 'call-1', receiptId: 'receipt-1', durationMs: 42, attemptCount: 1 }
        } });

        const events = state.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(events.length).toEqual(1);
        expect(events[0].content).toContain('Read');
        expect(events[0].metadata?.timeline).toEqual({
            source: 'remote', sequence: 5, toolCallId: 'call-1', receiptId: 'receipt-1', attempt: 1
        });
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

    @Test('drops stale-session replay frames and re-anchors to the active session')
    async dropsStaleReplayFrames() {
        const state = makeState();
        state.configure({ sessionId: 's2' });
        const events: string[] = [
            'event: turn_started\ndata: {"sessionId":"s1"}\n\n',
            'event: tool_invoked\ndata: {"sessionId":"s2","toolName":"echo"}\n\n'
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
        expect(state.status).toEqual('idle');
        expect(state.runningTools).toEqual(['echo']);
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

@Suite('AgentConsoleRemoteEventBridge plan lifecycle events')
export class RemoteEventBridgePlanEventsTest {
    @Test('plan_created sets planTodos from steps with sequence')
    planCreatedSetsTodos() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 1,
                steps: [
                    { id: 's1', content: 'Step one', status: 'pending' },
                    { id: 's2', content: 'Step two', status: 'in_progress' }
                ]
            }
        });
        expect(state.planTodos.length).toEqual(2);
        expect(state.planTodos[0].id).toEqual('s1');
        expect(state.planTodos[0].content).toEqual('Step one');
        expect(state.planTodos[0].status).toEqual('pending');
        expect(state.planTodos[1].id).toEqual('s2');
        expect(state.planTodos[1].status).toEqual('in_progress');
        expect(state.activities.some(a => a.kind === 'plan')).toBe(true);
    }

    @Test('plan_created with higher sequence updates planTodos')
    planCreatedHigherSequenceUpdates() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 1,
                steps: [{ id: 's1', content: 'Step one', status: 'pending' }]
            }
        });
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 2,
                steps: [
                    { id: 's1', content: 'Step one', status: 'completed' },
                    { id: 's2', content: 'Step two', status: 'pending' }
                ]
            }
        });
        expect(state.planTodos.length).toEqual(2);
        expect(state.planTodos[0].status).toEqual('completed');
    }

    @Test('plan_created with lower sequence is deduped (no update)')
    planCreatedLowerSequenceDeduped() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 3,
                steps: [{ id: 's1', content: 'Step one', status: 'completed' }]
            }
        });
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 1,
                steps: [{ id: 'old', content: 'Old step', status: 'pending' }]
            }
        });
        expect(state.planTodos.length).toEqual(1);
        expect(state.planTodos[0].id).toEqual('s1');
    }

    @Test('plan_created with same sequence is deduped')
    planCreatedSameSequenceDeduped() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 2,
                steps: [{ id: 's1', content: 'Original', status: 'pending' }]
            }
        });
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 2,
                steps: [{ id: 's1', content: 'Changed', status: 'in_progress' }]
            }
        });
        expect(state.planTodos[0].content).toEqual('Original');
    }

    @Test('plan_step_started pushes activity with stepId')
    planStepStarted() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_step_started', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', stepId: 's1', sequence: 2, owner: 'agent'
            }
        });
        const planActivities = state.activities.filter(a => a.kind === 'plan');
        expect(planActivities.length).toBeGreaterThan(0);
        expect(planActivities[planActivities.length - 1].message).toContain('s1');
    }

    @Test('plan_step_blocked pushes activity with reason')
    planStepBlocked() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_step_blocked', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', stepId: 's2', sequence: 3, reason: 'dependency s1 not met'
            }
        });
        const planActivities = state.activities.filter(a => a.kind === 'plan');
        expect(planActivities.length).toBeGreaterThan(0);
        expect(planActivities[planActivities.length - 1].message).toContain('blocked');
        expect(planActivities[planActivities.length - 1].message).toContain('dependency s1 not met');
    }

    @Test('plan_step_completed pushes activity with status')
    planStepCompleted() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_step_completed', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', stepId: 's1', sequence: 4, status: 'completed'
            }
        });
        const planActivities = state.activities.filter(a => a.kind === 'plan');
        expect(planActivities.length).toBeGreaterThan(0);
        expect(planActivities[planActivities.length - 1].message).toContain('completed');
        expect(planActivities[planActivities.length - 1].message).toContain('s1');
    }

    @Test('plan_step_completed with failed status projects error timeline')
    planStepCompletedFailed() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_step_completed', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', stepId: 's1', sequence: 5, status: 'failed'
            }
        });
        const planActivities = state.activities.filter(a => a.kind === 'plan');
        expect(planActivities[planActivities.length - 1].message).toContain('failed');
    }

    @Test('plan_completed pushes activity with summary')
    planCompleted() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_completed', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 10,
                summary: { total: 5, completed: 4, cancelled: 0, failed: 1 }
            }
        });
        const planActivities = state.activities.filter(a => a.kind === 'plan');
        expect(planActivities.length).toBeGreaterThan(0);
        expect(planActivities[planActivities.length - 1].message).toContain('4 done');
        expect(planActivities[planActivities.length - 1].message).toContain('1 failed');
    }

    @Test('plan events project timeline entries with plan label')
    planEventsProjectTimeline() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 1,
                steps: [{ id: 's1', content: 'Step', status: 'pending' }]
            }
        });
        const events = state.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(events.some(e => e.metadata?.timeline?.source === 'remote')).toBe(true);
        expect(events.some(e => e.metadata?.uiEventLabel === 'plan')).toBe(true);
    }

    @Test('reconnect replay applies plan_created events in order')
    reconnectReplayPlanEvents() {
        const state = makeState();
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 1,
                steps: [{ id: 's1', content: 'First', status: 'pending' }]
            }
        });
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 2,
                steps: [
                    { id: 's1', content: 'First', status: 'completed' },
                    { id: 's2', content: 'Second', status: 'pending' }
                ]
            }
        });
        applyRemoteEvent(state, {
            type: 'plan_created', sessionId: 's1', data: {
                sessionId: 's1', planId: 'p1', sequence: 1,
                steps: [{ id: 'stale', content: 'Stale', status: 'pending' }]
            }
        });
        expect(state.planTodos.length).toEqual(2);
        expect(state.planTodos[0].status).toEqual('completed');
        expect(state.planTodos[1].content).toEqual('Second');
    }
}

function emptySseFetch(): typeof fetch {
    return (async () => ({
        ok: true,
        status: 200,
        body: { getReader: () => ({ read: async () => ({ done: true } as const) }) }
    })) as unknown as typeof fetch;
}

interface RpcCall {
    method: string;
    params: any;
}

function makeRpc(respond: (method: string, params: any) => any) {
    const calls: RpcCall[] = [];
    const rpc = {
        async request(method: string, params: any): Promise<any> {
            calls.push({ method, params });
            return respond(method, params);
        }
    };
    return { rpc, calls };
}

@Suite('AgentConsoleRemoteEventBridge reconnect')
export class RemoteEventBridgeReconnectTest {
    @Test('reconnect replays missed raw events and advances the tail seq without duplicating entries')
    async reconnectReplaysMissedEvents() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' });
        const { rpc, calls } = makeRpc((method, params) => {
            if (method === 'timeline.query') {
                return {
                    sessionId: 's1',
                    entries: [
                        { key: 'tool:tc1', kind: 'tool', sessionId: 's1', label: 'bash', status: 'running', lastSeq: 1, toolCallId: 'tc1', receiptId: 'rc1', attempt: 1 }
                    ],
                    hasMore: false
                };
            }
            if (method === 'timeline.replay') {
                return {
                    sessionId: 's1',
                    events: [
                        { seq: 2, id: 'evt2', type: 'tool_invoked', sessionId: 's1', timestamp: 100, toolName: 'bash', toolCallId: 'tc2', receiptId: 'rc2', attempt: 1, status: 'running' },
                        { seq: 3, id: 'evt3', type: 'tool_completed', sessionId: 's1', timestamp: 200, toolName: 'bash', toolCallId: 'tc2', receiptId: 'rc2', attempt: 1, status: 'success', durationMs: 12 }
                    ]
                };
            }
            if (method === 'nav.query') {
                return { sessions: [] };
            }
            if (method === 'question.list') {
                return [];
            }
            return {};
        });
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://local',
            rpc: rpc as any,
            fetchImpl: emptySseFetch(),
            reconnectDelayMs: 100000
        });
        await bridge.subscribe('s1');
        expect(state.timelineTailSeq).toEqual(1);
        expect(state.messages.filter(m => m.metadata?.uiEventKey === 'tool:tc1')).toHaveLength(1);

        await bridge.connectOnce();
        bridge.dispose();

        const replayCall = calls.find(call => call.method === 'timeline.replay');
        expect(replayCall).toBeDefined();
        expect(replayCall!.params.sinceSeq).toEqual(1);
        expect(state.timelineTailSeq).toEqual(3);
        expect(state.timelineReconnecting).toBe(false);
        expect(state.timelineStale).toBe(false);
        const tc2 = state.messages.filter(m => m.metadata?.uiEventKey === 'tool:tc2');
        expect(tc2).toHaveLength(1);
        expect(tc2[0].metadata?.status).toEqual('success');
        expect(state.messages.filter(m => m.metadata?.uiEventKey === 'tool:tc1')).toHaveLength(1);
    }

    @Test('seedFromTimeline pages through timeline.query with the returned cursor')
    async seedPagingFollowsCursor() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' });
        const { rpc, calls } = makeRpc((method, params) => {
            if (method === 'timeline.query') {
                if (!params.cursor) {
                    return {
                        sessionId: 's1',
                        entries: [
                            { key: 'tool:tc1', kind: 'tool', sessionId: 's1', label: 'bash', status: 'running', lastSeq: 1, toolCallId: 'tc1', receiptId: 'rc1', attempt: 1 }
                        ],
                        hasMore: true,
                        nextCursor: 'c1'
                    };
                }
                return {
                    sessionId: 's1',
                    entries: [
                        { key: 'plan:p1', kind: 'plan', sessionId: 's1', label: 'plan p1', status: 'pending', lastSeq: 2, planId: 'p1' }
                    ],
                    hasMore: false
                };
            }
            if (method === 'nav.query') {
                return { sessions: [] };
            }
            if (method === 'question.list') {
                return [];
            }
            return {};
        });
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://local',
            rpc: rpc as any,
            fetchImpl: emptySseFetch(),
            reconnectDelayMs: 100000
        });
        await bridge.subscribe('s1');
        bridge.dispose();

        const queryCalls = calls.filter(call => call.method === 'timeline.query');
        expect(queryCalls).toHaveLength(2);
        expect(queryCalls[1].params.cursor).toEqual('c1');
        expect(state.timelineTailSeq).toEqual(2);
        expect(state.messages.filter(m => m.metadata?.uiEventKey === 'tool:tc1')).toHaveLength(1);
        expect(state.messages.filter(m => m.metadata?.uiEventKey === 'plan:p1')).toHaveLength(1);
    }

    @Test('switching sessions resets the timeline tail so replay never uses the previous session cursor')
    switchingSessionResetsTimelineTail() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        state.seedTimeline([
            { key: 'tool:tc1', kind: 'tool', sessionId: 's1', label: 'bash', status: 'running', lastSeq: 5, toolCallId: 'tc1', receiptId: 'rc1', attempt: 1 }
        ]);
        expect(state.timelineTailSeq).toEqual(5);
        state.markTimelineReconnecting(true);
        state.configure({ sessionId: 's2' });
        expect(state.timelineTailSeq).toEqual(-1);
        expect(state.timelineSeedCount).toEqual(0);
        expect(state.timelineReconnecting).toBe(false);
        expect(state.timelineStale).toBe(false);
    }

    @Test('seedFromTimeline drops pages when the session switches mid-seed')
    async seedDroppedWhenSessionSwitchedMidSeed() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        let resolveQuery!: (value: any) => void;
        const { rpc } = makeRpc((method) => {
            if (method === 'timeline.query') {
                return new Promise(resolve => {
                    resolveQuery = resolve;
                });
            }
            if (method === 'nav.query') {
                return { sessions: [] };
            }
            if (method === 'question.list') {
                return [];
            }
            return {};
        });
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:8080',
            rpc: rpc as any,
            fetchImpl: emptySseFetch(),
            reconnectDelayMs: 100000
        });
        const connecting = bridge.subscribe('s1');
        state.configure({ sessionId: 's2' });
        resolveQuery({
            sessionId: 's1',
            entries: [
                { key: 'tool:tc1', kind: 'tool', sessionId: 's1', label: 'bash', status: 'running', lastSeq: 1, toolCallId: 'tc1', receiptId: 'rc1', attempt: 1 }
            ],
            hasMore: false
        });
        await connecting;
        bridge.dispose();
        expect(state.messages.filter(m => m.metadata?.uiEventKey === 'tool:tc1')).toHaveLength(0);
        expect(state.timelineTailSeq).toEqual(-1);
    }

    @Test('replayFromTimeline drops events when the session switches mid-replay')
    async replayDroppedWhenSessionSwitchedMidReplay() {
        const state = makeState();
        state.configure({ sessionId: 's1' });
        let resolveReplay!: (value: any) => void;
        const { rpc } = makeRpc((method) => {
            if (method === 'timeline.query') {
                return {
                    sessionId: 's1',
                    entries: [
                        { key: 'tool:tc1', kind: 'tool', sessionId: 's1', label: 'bash', status: 'running', lastSeq: 1, toolCallId: 'tc1', receiptId: 'rc1', attempt: 1 }
                    ],
                    hasMore: false
                };
            }
            if (method === 'timeline.replay') {
                return new Promise(resolve => {
                    resolveReplay = resolve;
                });
            }
            if (method === 'nav.query') {
                return { sessions: [] };
            }
            if (method === 'question.list') {
                return [];
            }
            return {};
        });
        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: 'http://localhost:8080',
            rpc: rpc as any,
            fetchImpl: emptySseFetch(),
            reconnectDelayMs: 100000
        });
        await bridge.subscribe('s1');
        const reconnecting = bridge.connectOnce();
        state.configure({ sessionId: 's2' });
        resolveReplay({
            sessionId: 's1',
            events: [
                { seq: 2, id: 'evt2', type: 'tool_invoked', sessionId: 's1', timestamp: 100, toolName: 'bash', toolCallId: 'tc2', receiptId: 'rc2', attempt: 1, status: 'running' }
            ]
        });
        await reconnecting;
        bridge.dispose();
        expect(state.messages.filter(m => m.metadata?.uiEventKey === 'tool:tc2')).toHaveLength(0);
        expect(state.timelineTailSeq).toEqual(-1);
    }
}
