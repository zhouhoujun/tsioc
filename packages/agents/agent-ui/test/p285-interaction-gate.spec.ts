/**
 * P285 — Interaction gate: fake-gateway wire contract + JSDOM mounts.
 *
 * The gateway unit tests lock the exact wire semantics the scenarios depend on
 * (replay sinceSeq gating, paging caps, SSE drop/consumption, auto-seq).
 * The four mount tests drive the REAL web-console mount against `SCENARIOS` and
 * assert real observed state + DOM metrics — no fabricated values.
 */

import expect = require('expect');
import { Suite, Test, Before, After } from '@tsdi/unit';
import { JSDOM } from 'jsdom';

import { TimelineEventRecord } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';
import { mountAgentWebConsole } from '../web-console';
import { FakeAgentGateway } from '../harness/FakeAgentGateway';
import {
    GatewayScenario,
    ScenarioExpect,
    applyPipelineSteps,
    commandRecord,
    scenarioById,
    toolPair
} from '../harness/scenarios';
import { collectGatewayMetrics, GatewayDomMetrics } from '../harness/metrics';

async function waitUntil(predicate: () => boolean, timeoutMs = 8000, intervalMs = 25): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (predicate()) {
            return;
        }
        if (Date.now() >= deadline) {
            throw new Error(`waitUntil timed out after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

function rpcCount(gateway: FakeAgentGateway, method: string): number {
    return gateway.metadata.rpcCalls.filter(call => call.method === method).length;
}

/* ------------------------------------------------------------------ */
/*  Suite 1: fake gateway wire contract (no DOM required)             */
/* ------------------------------------------------------------------ */

@Suite('P285 gateway wire contract')
export class P285GatewayWireContractTest {
    @Test('timeline.replay returns seq >= sinceSeq + 1')
    async timelineReplaySinceSeq() {
        const gateway = new FakeAgentGateway({
            sessionId: 'session-A',
            timeline: [
                ...toolPair(0, { sessionId: 'session-A', toolName: 'bash', toolCallId: 'tc-0', summary: 'Tool bash completed', durationMs: 10 }),
                ...toolPair(4, { sessionId: 'session-A', toolName: 'grep', toolCallId: 'tc-1', summary: 'Tool grep completed', durationMs: 10 })
            ]
        });
        const result = await gateway.handleRpc('timeline.replay', { sessionId: 'session-A', sinceSeq: 3 });
        expect(result.events.map((event: { seq: number }) => event.seq)).toEqual([4, 5]);
    }

    @Test('command_exchange.replay returns seq > sinceSeq')
    async commandExchangeReplaySinceSeq() {
        const gateway = new FakeAgentGateway({
            sessionId: 'session-A',
            commandExchange: [
                commandRecord(1, { sessionId: 'session-A', content: 'first' }),
                commandRecord(5, { sessionId: 'session-A', content: 'second' })
            ]
        });
        const result = await gateway.handleRpc('command_exchange.replay', { sessionId: 'session-A', sinceSeq: 2 });
        expect(result.records.map((record: { seq: number }) => record.seq)).toEqual([5]);
    }

    @Test('appendTimeline honors explicit seq; appendCommandExchange auto-assigns seq/sessionId/epoch')
    async appendAutoAssign() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        gateway.appendTimeline([{ id: 'ev', type: 'tool_completed', seq: 7, sessionId: 'session-A' } as never]);
        expect(gateway.timelineRecords()[0].seq).toBe(7);

        const first = gateway.appendCommandExchange([{ kind: 'command', content: 'a' } as never]);
        expect(first[0].seq).toBe(0);
        expect(first[0].sessionId).toBe('session-A');
        expect(first[0].sessionEpoch).toBe(1);

        const second = gateway.appendCommandExchange([{ kind: 'command', content: 'b' } as never]);
        expect(second[0].seq).toBe(1);
    }

    @Test('command_exchange.append RPC persists a record visible to query and replay (write→read loopback)')
    async commandExchangeAppendLoopback() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        const append = await gateway.handleRpc('command_exchange.append', {
            sessionId: 'session-A',
            record: { id: 'loop-1', kind: 'command', key: 'bash', content: 'design docs', sequence: 0 }
        });
        expect(append.record.id).toBe('loop-1');
        expect(append.record.seq).toBe(0);
        expect(append.record.sessionEpoch).toBe(1);

        const query = await gateway.handleRpc('command_exchange.query', { sessionId: 'session-A' });
        expect(query.records.map((record: { content: string }) => record.content)).toContain('design docs');

        const replay = await gateway.handleRpc('command_exchange.replay', { sessionId: 'session-A', sinceSeq: -1 });
        expect(replay.records.map((record: { seq: number }) => record.seq)).toEqual([0]);
    }

    @Test('unknown RPC surfaces -32601 through the transport envelope')
    async unknownRpcError() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        const fetchImpl = gateway.createFetchImpl();
        const response = await fetchImpl(`${gateway.clientBaseUrl}/rpc`, {
            method: 'POST',
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'totally.unknown', params: {} })
        });
        const envelope = await response.json();
        expect(envelope.error.code).toBe(-32601);
    }

    @Test('SSE drop closes the first connection after afterFrames and re-serves remaining frames')
    async sseDropAndSharedConsumedPointer() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A', sseDrop: { afterFrames: 2 } });
        gateway.pushSseFrame('tool_invoked', { type: 'tool_invoked', seq: 1, sessionId: 'session-A' });
        gateway.pushSseFrame('tool_completed', { type: 'tool_completed', seq: 2, sessionId: 'session-A' });
        gateway.pushSseFrame('tool_invoked', { type: 'tool_invoked', seq: 3, sessionId: 'session-A' });
        const fetchImpl = gateway.createFetchImpl();

        const first = await fetchImpl(`${gateway.clientBaseUrl}/api/events?sessionId=session-A`);
        const firstReader = (first.body as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        const frame1 = await firstReader.read();
        expect(decoder.decode(frame1.value as Uint8Array)).toContain('"seq":1');
        const frame2 = await firstReader.read();
        expect(decoder.decode(frame2.value as Uint8Array)).toContain('"seq":2');
        const frame3 = await firstReader.read();
        expect(frame3.done).toBe(true);

        const second = await fetchImpl(`${gateway.clientBaseUrl}/api/events?sessionId=other`);
        const secondReader = (second.body as ReadableStream<Uint8Array>).getReader();
        const resumed = await secondReader.read();
        const resumedText = decoder.decode(resumed.value as Uint8Array);
        expect(resumedText).toContain('"seq":3');
        expect(resumedText).toContain('"sessionId":"other"');
        gateway.dispose();
        await secondReader.cancel();
    }

    @Test('timeline.query collapses tool pairs and pages past the 500 cap')
    async timelineQueryPaging() {
        const events: TimelineEventRecord[] = [];
        for (let i = 0; i < 600; i += 1) {
            events.push(...toolPair(i * 2, { sessionId: 'session-A', toolName: `tool-${i}`, toolCallId: `tc-${i}`, summary: 'Tool done', durationMs: 10 }));
        }
        const gateway = new FakeAgentGateway({ sessionId: 'session-A', timeline: events });
        const page1 = await gateway.handleRpc('timeline.query', { sessionId: 'session-A', limit: 500 });
        expect(page1.entries.length).toBe(500);
        expect(page1.nextCursor).toBeTruthy();
        const page2 = await gateway.handleRpc('timeline.query', { sessionId: 'session-A', limit: 500, cursor: page1.nextCursor });
        expect(page2.entries.length).toBe(100);
        expect(page2.nextCursor).toBeFalsy();
    }
}

/* ------------------------------------------------------------------ */
/*  Suite 2: JSDOM mounts driven by the shared scenarios              */
/* ------------------------------------------------------------------ */

@Suite('P285 interaction gate JSDOM mounts')
export class P285InteractionGateMountTest {
    dom!: JSDOM;

    @Before()
    async setupDom() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body><div id="agent-console"></div></body></html>', {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'http://localhost:3100/'
        });
        (this.dom.window as unknown as { process: unknown }).process = {
            env: {},
            cwd: () => '/',
            platform: 'browser',
            version: '',
            versions: {},
            nextTick: (fn: () => void) => setTimeout(fn, 0),
            on: () => undefined,
            argv: []
        };
        (globalThis as unknown as { document: Document }).document = this.dom.window.document;
    }

    @After()
    async teardownDom() {
        delete (globalThis as unknown as { document?: Document }).document;
        if (global.gc) global.gc();
    }

    async runScenario(scenario: GatewayScenario): Promise<void> {
        const gateway = new FakeAgentGateway(scenario.buildGatewayOptions());
        const state = new AgentConsoleSessionState();
        if (scenario.expect.messagesVisibleItems) {
            state.setConsoleOptions({ messagesVisibleItems: scenario.expect.messagesVisibleItems });
        }
        // The mount promise settles only when the SSE stream EOFs. Non-drop
        // scenarios keep the stream open (connected, idle), so fire the mount
        // WITHOUT awaiting: the seed counters land during connectOnce's seed
        // phase, well before the reader parks. Teardown closes the channel to
        // resolve the promise, then disposes the bridge before its reconnect
        // timer fires.
        const mountedPromise = mountAgentWebConsole({
            baseUrl: gateway.clientBaseUrl,
            sessionId: scenario.mount.sessionId,
            reconnectDelayMs: scenario.mount.reconnectDelayMs,
            fetchImpl: gateway.createFetchImpl(),
            mount: this.dom.window.document.getElementById('agent-console') as HTMLElement,
            state,
            pwa: false,
            workspace: ''
        });
        try {
            // Initial settle: the connect-flow seeds land (seed counts are exact).
            const initialSeeds: Record<string, [number, number, number]> = {
                'disconnect-retry': [2, 2, 1]
            };
            const [initialTimeline, initialCommands, initialNav] =
                initialSeeds[scenario.id] ?? [scenario.expect.timelineSeedCount, scenario.expect.commandExchangeSeedCount, scenario.expect.navSeedCount];
            await waitUntil(() =>
                state.timelineSeedCount === initialTimeline &&
                state.commandExchangeSeedCount === initialCommands &&
                state.navSeedCount === initialNav
            );

            if (scenario.steps) {
                applyPipelineSteps(gateway, scenario.steps);
            }

            // Disconnect-retry: the one-shot drop fires, reconnect replays the
            // durable append, and the per-batch seed counters land on the final
            // expectations before the post-settle push rides the second connection.
            if (scenario.postSettlePush) {
                await waitUntil(() =>
                    gateway.metadata.sseDropped &&
                    state.timelineSeedCount === scenario.expect.timelineSeedCount &&
                    state.commandExchangeSeedCount === scenario.expect.commandExchangeSeedCount
                );
                applyPipelineSteps(gateway, scenario.postSettlePush);
            }

            if (scenario.expect.toolsListCallsMin > 0) {
                await waitUntil(() => rpcCount(gateway, 'tools.list') >= scenario.expect.toolsListCallsMin);
            }

            // Render settle: rows AND their aria-labels must resolve (distinct placeholders
            // would otherwise pass a rowCount-only wait and sample a ghost DOM).
            await waitUntil(() => {
                const settled = collectGatewayMetrics(this.dom.window.document);
                return settled.rowCount >= scenario.expect.minRenderedRows
                    && settled.ariaLabels.length >= scenario.expect.minRenderedRows
                    && settled.cjkLineCount >= scenario.expect.minCjkRows
                    && settled.distinctLabels === settled.ariaLabels.length
                    && settled.duplicateLabels.length === 0;
            });

            const metrics = collectGatewayMetrics(this.dom.window.document);
            this.assertGateMetrics(metrics, scenario.expect);
            this.assertWireState(gateway, state, scenario.expect);
        } finally {
            gateway.dispose();
            const mounted = await mountedPromise.catch(() => null);
            if (mounted) {
                await mounted.dispose();
            }
        }
    }

    assertGateMetrics(metrics: GatewayDomMetrics, expected: ScenarioExpect): void {
        expect(metrics.panelFound).toBe(true);
        expect(metrics.rowCount).toBeGreaterThanOrEqual(expected.minRenderedRows);
        expect(metrics.cjkLineCount).toBeGreaterThanOrEqual(expected.minCjkRows);
        expect(metrics.distinctLabels).toBe(metrics.ariaLabels.length);
        expect(metrics.duplicateLabels).toEqual([]);
        expect(metrics.layout.measured).toBe(false);
    }

    assertWireState(gateway: FakeAgentGateway, state: AgentConsoleSessionState, expected: ScenarioExpect): void {
        expect(state.timelineSeedCount).toBe(expected.timelineSeedCount);
        expect(state.commandExchangeSeedCount).toBe(expected.commandExchangeSeedCount);
        expect(state.navSeedCount).toBe(expected.navSeedCount);
        expect(state.timelineTailSeq).toBeGreaterThanOrEqual(expected.timelineTailSeqMin);
        expect(rpcCount(gateway, 'timeline.query')).toBeGreaterThanOrEqual(expected.timelineQueryCallsMin);
        expect(rpcCount(gateway, 'timeline.replay')).toBeGreaterThanOrEqual(expected.timelineReplayCallsMin);
        expect(rpcCount(gateway, 'command_exchange.replay')).toBeGreaterThanOrEqual(expected.commandExchangeReplayCallsMin);
        expect(rpcCount(gateway, 'tools.list')).toBeGreaterThanOrEqual(expected.toolsListCallsMin);
        expect(gateway.metadata.sseDropped).toBe(expected.sseDropped);
    }

    @Test('desktop-basic: mixed EN/CJK seeds render CJK rows')
    desktopBasic() {
        return this.runScenario(scenarioById('desktop-basic'));
    }

    @Test('mobile-320: narrow viewport survives live tool push and renders CJK')
    mobile320() {
        return this.runScenario(scenarioById('mobile-320'));
    }

    @Test('cjk-long-history: 510 tool pairs page through the timeline with tail integrity')
    cjkLongHistory() {
        return this.runScenario(scenarioById('cjk-long-history'));
    }

    @Test('disconnect-retry: SSE drop replays durable events without duplicate rows')
    disconnectRetry() {
        return this.runScenario(scenarioById('disconnect-retry'));
    }
}
