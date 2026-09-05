/**
 * P285 — Shared interaction scenarios for the interaction gate.
 *
 * The SAME scenario objects drive the JSDOM gate spec
 * (`test/p285-interaction-gate.spec.ts`) and the Node/Playwright browser runner
 * (`harness/run-browser-gate.ts`). Therefore this module is PURE DATA + fixture
 * builders: it must not import from `@tsdi/agent-ui` and must not touch any node
 * API (no `process`, `fs`, ...). Only the transport-agnostic fake gateway
 * (`./FakeAgentGateway`) and `@tsdi/agent` wire types are allowed.
 *
 * Acceptance contract (AGENTS.md): assertions derive from REAL observed
 * behavior (seed counts, RPC call records on the gateway, SSE drop/replay, DOM
 * rows and CJK content) — never from fabricated or self-consistent values.
 */

import { CommandExchangeRecord, TimelineEventRecord } from '@tsdi/agent';
import { FakeAgentGateway, FakeAgentGatewayOptions } from './FakeAgentGateway';

/* ------------------------------------------------------------------ */
/*  Wire fixture builders                                             */
/* ------------------------------------------------------------------ */

const TS_MS = Date.UTC(2026, 0, 15, 8, 0, 0);

/**
 * One tool lifecycle: `tool_invoked` (running) + `tool_completed` (success).
 * Both events share the same `toolCallId`/`receiptId`, so the projector merges
 * them into a single `tool:<id>` row (idempotent upsed by uiEventKey).
 * MUST carry an explicit `seqBase` — the gateway auto-assigns globally only
 * when seq is absent, and live frames must stay strictly ahead of the seeded
 * tail to pass the bridge's stale-rejection gate.
 */
export function toolPair(
    seqBase: number,
    options: {
        sessionId: string;
        toolName: string;
        toolCallId: string;
        summary: string;
        durationMs?: number;
        timestamp?: number;
        status?: string;
    }
): TimelineEventRecord[] {
    const timestamp = options.timestamp ?? TS_MS + seqBase * 1000;
    const toolCallId = options.toolCallId;
    return [
        {
            seq: seqBase,
            id: `ev-${seqBase}`,
            type: 'tool_invoked',
            sessionId: options.sessionId,
            timestamp,
            turnId: 'turn-1',
            toolCallId,
            receiptId: toolCallId,
            attempt: 1,
            toolName: options.toolName,
            status: 'running',
            summary: `Running ${options.toolName}...`
        },
        {
            seq: seqBase + 1,
            id: `ev-${seqBase + 1}`,
            type: 'tool_completed',
            sessionId: options.sessionId,
            timestamp: timestamp + (options.durationMs ?? 500),
            turnId: 'turn-1',
            toolCallId,
            receiptId: toolCallId,
            attempt: 1,
            toolName: options.toolName,
            status: options.status ?? 'success',
            summary: options.summary,
            durationMs: options.durationMs ?? 500
        }
    ];
}

/** One durable command-exchange record (the gate requires `sessionEpoch >= 1`). */
export function commandRecord(
    seq: number,
    options: {
        sessionId: string;
        content: string;
        status?: string;
        attempt?: number;
        durationMs?: number;
        timestamp?: number;
    }
): CommandExchangeRecord {
    return {
        seq,
        id: `cmd-${seq}`,
        sessionId: options.sessionId,
        sessionEpoch: 1,
        kind: 'command',
        key: `cmd-${seq}`,
        content: options.content,
        sequence: seq,
        attempt: options.attempt ?? 1,
        status: options.status ?? 'success',
        durationMs: options.durationMs ?? 300,
        timestamp: options.timestamp ?? TS_MS + seq * 817
    };
}

/** A live SSE frame pair mirroring `toolPair` data (for the push path). */
export function liveToolPairFrames(
    seqBase: number,
    options: {
        sessionId: string;
        toolName: string;
        toolCallId: string;
        summary: string;
        durationMs?: number;
        timestamp?: number;
    }
): TimelineEventRecord[] {
    return toolPair(seqBase, { ...options, status: 'success' });
}

/* ------------------------------------------------------------------ */
/*  Gateway pipeline steps                                            */
/* ------------------------------------------------------------------ */

/**
 * One ordered interaction step applied against the live fake gateway AFTER the
 * initial mount/seeds settle (and optionally again after a reconnect settles).
 * `appendTimeline`/`appendCommandExchange` are DURABLE (only visible via a
 * later replay); `pushSse` is a LIVE frame (visible immediately to whichever
 * connection is draining the shared frame log).
 */
export type GatewayPipelineStep =
    | { kind: 'appendTimeline'; events: TimelineEventRecord[] }
    | { kind: 'appendCommandExchange'; records: CommandExchangeRecord[] }
    | { kind: 'pushSse'; event: string; data: unknown };

export function applyPipelineStep(gateway: FakeAgentGateway, step: GatewayPipelineStep): void {
    switch (step.kind) {
        case 'appendTimeline':
            gateway.appendTimeline(step.events);
            break;
        case 'appendCommandExchange':
            gateway.appendCommandExchange(step.records);
            break;
        case 'pushSse': {
            const frame = step.data as TimelineEventRecord;
            gateway.pushSseFrame(step.event, frame);
            break;
        }
    }
}

export function applyPipelineSteps(gateway: FakeAgentGateway, steps: GatewayPipelineStep[]): void {
    for (const step of steps) {
        applyPipelineStep(gateway, step);
    }
}

/** The two `pushSse` steps for one live tool pair (invoked, then completed). */
export function pushPairSteps(
    seqBase: number,
    options: Parameters<typeof liveToolPairFrames>[1]
): GatewayPipelineStep[] {
    const frames = liveToolPairFrames(seqBase, options);
    return [
        { kind: 'pushSse', event: 'tool_invoked', data: frames[0] },
        { kind: 'pushSse', event: 'tool_completed', data: frames[1] }
    ];
}

/* ------------------------------------------------------------------ */
/*  Scenario shape                                                    */
/* ------------------------------------------------------------------ */

export interface ScenarioViewport {
    width: number;
    height: number;
}

export interface ScenarioExpect {
    viewport: ScenarioViewport;
    /** Exact projected-entry seed counts the console must reach after mount. */
    timelineSeedCount: number;
    commandExchangeSeedCount: number;
    navSeedCount: number;
    /** Minimum observed RPC calls on the fake gateway (honest wire evidence). */
    timelineQueryCallsMin: number;
    timelineReplayCallsMin: number;
    commandExchangeReplayCallsMin: number;
    toolsListCallsMin: number;
    /** The first SSE connection must have dropped (reconnect exercised). */
    sseDropped: boolean;
    /** Minimum last applied timeline seq (`timelineTailSeq`) after all seeding. */
    timelineTailSeqMin: number;
    /** DOM metrics thresholds (see `collectGatewayMetrics`). */
    minRenderedRows: number;
    minCjkRows: number;
    uniqueAriaLabels: boolean;
    /**
     * Raised message window for the JSDOM host so small-form-factor scenarios
     * render every seeded row. The browser bundle does NOT pass console options
     * through the mount API, so the browser runner keeps the default window (7).
     */
    messagesVisibleItems?: number;
}

export interface GatewayScenario {
    id: string;
    label: string;
    mount: {
        sessionId: string;
        reconnectDelayMs: number;
    };
    expect: ScenarioExpect;
    buildGatewayOptions(): FakeAgentGatewayOptions;
    /**
     * Ordered pipeline steps run after the initial seeds settle:
     * durable appends first (visible only via a later replay), then live
     * SSE pushes (visible to whichever connection is draining the log).
     */
    steps?: GatewayPipelineStep[];
    /**
     * Optional steps run AFTER a reconnect settles (disconnect-retry):
     * these ride the SECOND connection and prove post-recovery throughput.
     */
    postSettlePush?: GatewayPipelineStep[];
}

/* ------------------------------------------------------------------ */
/*  Scenarios                                                         */
/* ------------------------------------------------------------------ */

export const SCENARIOS: GatewayScenario[] = [
    {
        id: 'desktop-basic',
        label: 'Desktop first screen: mixed EN/CJK seed renders CJK rows',
        mount: { sessionId: 'session-A', reconnectDelayMs: 3000 },
        expect: {
            viewport: { width: 1280, height: 800 },
            timelineSeedCount: 3,
            commandExchangeSeedCount: 2,
            navSeedCount: 1,
            timelineQueryCallsMin: 1,
            timelineReplayCallsMin: 0,
            commandExchangeReplayCallsMin: 0,
            toolsListCallsMin: 0,
            sseDropped: false,
            timelineTailSeqMin: 5,
            minRenderedRows: 4,
            minCjkRows: 1,
            uniqueAriaLabels: true
            // 3 tool entries + 2 command records = 5 messages < default 7 window
        },
        buildGatewayOptions() {
            return {
                sessionId: 'session-A',
                timeline: [
                    ...toolPair(0, { sessionId: 'session-A', toolName: 'bash', toolCallId: 'tc-0', summary: 'Tool bash completed', durationMs: 210 }),
                    ...toolPair(2, { sessionId: 'session-A', toolName: 'grep', toolCallId: 'tc-1', summary: 'Tool grep completed', durationMs: 340 }),
                    ...toolPair(4, { sessionId: 'session-A', toolName: '分析文件', toolCallId: 'tc-2', summary: '工具 分析文件 已完成', durationMs: 860 })
                ],
                commandExchange: [
                    commandRecord(1, { sessionId: 'session-A', content: 'Searched working tree for TODO markers' }),
                    commandRecord(2, { sessionId: 'session-A', content: 'Summarized changed files under src/' })
                ],
                navSessions: [{ id: 'session-A', label: 'Project TSIOC', status: 'active', messageCount: 5 }],
                questions: [{ questionId: 'q-1', sessionId: 'session-A', question: 'Continue with the refactor?', options: ['yes', 'no'], severity: 'medium', status: 'pending' }],
                tools: [
                    { name: 'bash', toolset: 'builtin', activation: { kind: 'tool', activated: true } },
                    { name: 'grep', toolset: 'builtin', activation: { kind: 'tool', activated: true } },
                    { name: 'analysis', toolset: 'builtin', activation: { kind: 'tool', activated: true } }
                ],
                commandOutputs: [{ id: 'out-1', sessionId: 'session-A', command: 'run tests', type: 'stream', status: 'success', timestamp: TS_MS }]
            };
        }
    },

    {
        id: 'mobile-320',
        label: 'Narrow viewport with live tool push survives and renders CJK',
        mount: { sessionId: 'session-A', reconnectDelayMs: 3000 },
        expect: {
            viewport: { width: 320, height: 640 },
            timelineSeedCount: 6,
            commandExchangeSeedCount: 4,
            navSeedCount: 1,
            timelineQueryCallsMin: 1,
            timelineReplayCallsMin: 0,
            commandExchangeReplayCallsMin: 0,
            toolsListCallsMin: 1,
            sseDropped: false,
            timelineTailSeqMin: 11,
            minRenderedRows: 7,
            minCjkRows: 6,
            uniqueAriaLabels: true,
            // 6 CJK tool pairs + 4 CJK command records = 10 messages > 7 window
            messagesVisibleItems: 200
        },
        buildGatewayOptions() {
            const timeline: TimelineEventRecord[] = [];
            for (let i = 0; i < 6; i += 1) {
                timeline.push(
                    ...toolPair(i * 2, {
                        sessionId: 'session-A',
                        toolName: `工具-${i}`,
                        toolCallId: `tc-${i}`,
                        summary: `工具 工具-${i} 已完成`,
                        durationMs: 120 + i * 40
                    })
                );
            }
            return {
                sessionId: 'session-A',
                timeline,
                commandExchange: [
                    commandRecord(1, { sessionId: 'session-A', content: '任务 1 执行完成' }),
                    commandRecord(2, { sessionId: 'session-A', content: '任务 2 完成' }),
                    commandRecord(3, { sessionId: 'session-A', content: '任务 3 成功' }),
                    commandRecord(4, { sessionId: 'session-A', content: '任务 4 已结束' })
                ],
                navSessions: [{ id: 'session-A', label: '移动端会话', status: 'active', messageCount: 6 }],
                questions: [{ questionId: 'q-1', sessionId: 'session-A', question: '继续执行余下任务？', options: ['是', '否'], severity: 'high', status: 'pending' }],
                tools: [
                    { name: 'bash', toolset: 'builtin', activation: { kind: 'tool', activated: true } },
                    { name: 'read', toolset: 'builtin', activation: { kind: 'tool', activated: true } }
                ],
                commandOutputs: [{ id: 'out-1', sessionId: 'session-A', command: 'build', type: 'stream', status: 'success', timestamp: TS_MS }]
            };
        },
        // Strictly ahead of the seeded tail (0..11): tools.list is exercised
        // by the live tool_completed -> refreshTools path.
        steps: pushPairSteps(12, {
            sessionId: 'session-A',
            toolName: '工具-live',
            toolCallId: 'tc-live-01',
            summary: '工具 工具-live 已完成',
            durationMs: 150
        })
    },

    {
        id: 'cjk-long-history',
        label: '600 tool pairs force timeline paging and keep tail integrity',
        mount: { sessionId: 'session-A', reconnectDelayMs: 3000 },
        expect: {
            viewport: { width: 1280, height: 800 },
            timelineSeedCount: 600,
            commandExchangeSeedCount: 30,
            navSeedCount: 2,
            // 600 projected entries > 500-page cap -> at least 2 timeline.query calls
            timelineQueryCallsMin: 2,
            timelineReplayCallsMin: 0,
            commandExchangeReplayCallsMin: 0,
            toolsListCallsMin: 0,
            sseDropped: false,
            timelineTailSeqMin: 1199,
            minRenderedRows: 1,
            minCjkRows: 0,
            uniqueAriaLabels: true
            // CJK tool pairs 597-599 sit mid-list; displayMessages appends the 30
            // command rows (EN) at the END, so the 7-row window tail shows EN.
            // CJK row rendering is proven by desktop-basic (tc-2) and mobile-320.
        },
        buildGatewayOptions() {
            const timeline: TimelineEventRecord[] = [];
            for (let i = 0; i < 600; i += 1) {
                const cjk = i >= 597;
                timeline.push(
                    ...toolPair(i * 2, {
                        sessionId: 'session-A',
                        toolName: cjk ? `工具-${i}` : `tool-${i}`,
                        toolCallId: `tc-${i}`,
                        summary: cjk ? `工具 工具-${i} 已完成` : `Tool tool-${i} completed`,
                        durationMs: 100 + (i % 7) * 30
                    })
                );
            }
            return {
                sessionId: 'session-A',
                timeline,
                commandExchange: Array.from({ length: 30 }, (_, i) =>
                    commandRecord(i + 1, { sessionId: 'session-A', content: `command ${i + 1} execution` })
                ),
                navSessions: [
                    { id: 'session-A', label: 'Today', status: 'active', messageCount: 600 },
                    { id: 'session-B', label: 'Yesterday', status: 'idle', messageCount: 12 }
                ],
                questions: [],
                tools: [],
                commandOutputs: []
            };
        }
    },

    {
        id: 'disconnect-retry',
        label: 'SSE drop triggers reconnect replay of durable events (no dup rows)',
        mount: { sessionId: 'session-A', reconnectDelayMs: 50 },
        expect: {
            viewport: { width: 1280, height: 800 },
            timelineSeedCount: 1,
            commandExchangeSeedCount: 1,
            navSeedCount: 1,
            timelineQueryCallsMin: 1,
            timelineReplayCallsMin: 1,
            commandExchangeReplayCallsMin: 1,
            toolsListCallsMin: 1,
            sseDropped: true,
            timelineTailSeqMin: 5,
            minRenderedRows: 3,
            minCjkRows: 1,
            uniqueAriaLabels: true
            // Initial seeds 2/2 (A,B + rec1,rec2); the reconnect replay batch
            // (D + rec3) REPLACES the counters per-batch (seedTimeline /
            // seedCommandExchange) -> final 1/1. Tail advances to D's lastSeq 5.
        },
        buildGatewayOptions() {
            return {
                sessionId: 'session-A',
                timeline: [
                    ...toolPair(0, { sessionId: 'session-A', toolName: 'bash', toolCallId: 'tc-0', summary: 'Tool bash completed', durationMs: 200 }),
                    ...toolPair(2, { sessionId: 'session-A', toolName: '搜索代码', toolCallId: 'tc-1', summary: '工具 搜索代码 已完成', durationMs: 410 })
                ],
                commandExchange: [
                    commandRecord(1, { sessionId: 'session-A', content: 'Found references across packages' }),
                    commandRecord(2, { sessionId: 'session-A', content: 'Inspected the session store layout' })
                ],
                navSessions: [{ id: 'session-A', label: 'Recovery run', status: 'active', messageCount: 3 }],
                questions: [],
                tools: [
                    { name: 'bash', toolset: 'builtin', activation: { kind: 'tool', activated: true } },
                    { name: 'search', toolset: 'builtin', activation: { kind: 'tool', activated: true } }
                ],
                commandOutputs: [{ id: 'out-1', sessionId: 'session-A', command: 'tests', type: 'stream', status: 'success', timestamp: TS_MS }],
                // Close the FIRST SSE connection after 2 served frames -> EOF ->
                // bridge scheduleReconnect -> replay picks up the D append.
                sseDrop: { afterFrames: 2 }
            };
        },
        steps: [
            // Durable appends FIRST (visible only via the reconnect replay).
            { kind: 'appendTimeline', events: toolPair(4, { sessionId: 'session-A', toolName: 'check', toolCallId: 'tc-d', summary: 'Tool check completed', durationMs: 90 }) },
            { kind: 'appendCommandExchange', records: [commandRecord(3, { sessionId: 'session-A', content: 'Verified recovery chain' })] },
            // Live pair C (seq 6,7, above the seeded tail 3): served on conn #1;
            // after 2 frames the one-shot drop closes it -> EOF -> reconnect.
            ...pushPairSteps(6, {
                sessionId: 'session-A',
                toolName: 'live-c',
                toolCallId: 'tc-live-c',
                summary: 'Tool live-c completed',
                durationMs: 120
            })
        ],
        postSettlePush: pushPairSteps(8, {
            sessionId: 'session-A',
            toolName: '工具-reconnect',
            toolCallId: 'tc-live-e',
            summary: '工具 工具-reconnect 已完成',
            durationMs: 160
        })
    }
];

export function scenarioById(id: string): GatewayScenario {
    const scenario = SCENARIOS.find(candidate => candidate.id === id);
    if (!scenario) {
        throw new Error(`Unknown P285 scenario: ${id}`);
    }
    return scenario;
}