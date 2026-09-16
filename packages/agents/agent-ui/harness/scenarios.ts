/**
 * P285 — Shared interaction scenarios for the interaction gate.
 *
 * The SAME scenario objects drive the JSDOM gate spec
 * (`test/p285-interaction-gate.spec.ts`) and the standalone virtual-DOM gate
 * (`harness/run-dom-gate.ts`). Therefore this module is PURE DATA + fixture
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
 * Long CJK error summary for the P293 `timeline-naturalized` failed seed:
 * drives the header error count (`1 个错误`) and the long-line CJK acceptance
 * cell. PURE DATA — gates assert only its distinctive PREFIX.
 */
export const LONG_CJK_TIMELINE_SUMMARY =
    '渲染器输出包含超出单行显示宽度的连续中文描述，用于验证超长自然语言内容在时间线尾部的渲染完整性以及与错误计数标记的联动正确性，同时用于验证会话汇总与折叠语义下的错误保留行为，确保中文长行不被静默丢弃且始终以自然语言呈现。';

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
        attempt?: number;
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
            attempt: options.attempt ?? 1,
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
            attempt: options.attempt ?? 1,
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
        attempt?: number;
        inputSummary?: string;
    }
): TimelineEventRecord[] {
    return toolPair(seqBase, { ...options, status: 'success' }).map(event => ({
        ...event,
        receipt: {
            toolCallId: options.toolCallId,
            receiptId: options.toolCallId,
            attemptCount: options.attempt ?? 1,
            durationMs: options.durationMs ?? 500,
            inputSummary: options.inputSummary,
            outputSummary: options.summary
        }
    } as TimelineEventRecord));
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
    /**
     * P293 timeline-naturalized interaction driver (PURE DATA — the zh
     * assertion strings live in the gates, the acceptance observers).
     * Gates: enable window (viewMode) + open activeScope BEFORE live steps
     * (so pushed frames project under the turn prefix), then clear scope,
     * toggle collapseScope, re-collect, then switch mode to 'compact'.
     * Error-bearing turns remain expanded after a collapse request so their
     * root cause is never hidden; compact mode still emits an overflow summary.
     */
    timeline?: {
        viewMode: 'steps' | 'compact';
        activeScope: string;
        collapseScope: string;
        /** Distinctive CJK prefix of the long error line (row truncation safe). */
        longCjkPrefix?: string;
        /** Stable tool-call ids whose lifecycle must project to exactly one row. */
        stableToolCallIds?: string[];
        /** Final attempt expected after an in-place retry lifecycle update. */
        retry?: { toolCallId: string; attempt: number };
        /** Human-readable row fragments that must retain this relative order. */
        orderedContent?: string[];
        /** Pending approval seeded through the same remote event stream. */
        approvalId?: string;
    };
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
        label: '31 timeline entries keep long-history tail integrity',
        mount: { sessionId: 'session-A', reconnectDelayMs: 3000 },
        expect: {
            viewport: { width: 1280, height: 800 },
            timelineSeedCount: 31,
            commandExchangeSeedCount: 30,
            navSeedCount: 2,
            // Pagination beyond the 500 cap is covered by the wire-contract test.
            timelineQueryCallsMin: 1,
            timelineReplayCallsMin: 0,
            commandExchangeReplayCallsMin: 0,
            toolsListCallsMin: 0,
            sseDropped: false,
            timelineTailSeqMin: 27,
            minRenderedRows: 1,
            minCjkRows: 0,
            uniqueAriaLabels: true
            // CJK tail entries exercise mixed-width rendering.
            // CJK row rendering is proven by desktop-basic (tc-2) and mobile-320.
        },
        buildGatewayOptions() {
            const timeline: TimelineEventRecord[] = [];
            for (let i = 0; i < 31; i += 1) {
                const cjk = i >= 28;
                timeline.push({
                    seq: i, id: `ev-${i}`, type: 'tool_invoked', sessionId: 'session-A',
                    timestamp: TS_MS + i * 1000, turnId: `turn-${i}`, toolCallId: `tc-${i}`,
                    receiptId: `tc-${i}`, attempt: 1,
                    toolName: cjk ? `工具-${i}` : `tool-${i}`,
                    status: 'running', summary: cjk ? `工具 工具-${i}` : `Tool tool-${i}`
                });
            }
            return {
                sessionId: 'session-A',
                timeline,
                commandExchange: Array.from({ length: 30 }, (_, i) =>
                    commandRecord(i + 1, { sessionId: 'session-A', content: `command ${i + 1} execution` })
                ),
                navSessions: [
                    { id: 'session-A', label: 'Today', status: 'active', messageCount: 31 },
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
    },

    {
        id: 'timeline-naturalized',
        label: 'Timeline lifecycle: plan, retry, approval, error and file change across DOM/TUI',
        mount: { sessionId: 'session-A', reconnectDelayMs: 3000 },
        expect: {
            viewport: { width: 1280, height: 800 },
            // 13 completed CJK tool pairs (seqs 0..25) + 1 failed long-CJK pair
            // (seqs 26,27) = 14 projected entries; timeline mode ON renders
            // header/footer/boundary/summary structural rows around the tail.
            timelineSeedCount: 14,
            commandExchangeSeedCount: 0,
            navSeedCount: 1,
            timelineQueryCallsMin: 1,
            timelineReplayCallsMin: 0,
            commandExchangeReplayCallsMin: 0,
            toolsListCallsMin: 1,
            sseDropped: false,
            // Durable seeds 0..27 are the only writers of timelineTailSeq (SSE
            // live frames are ephemeral — they replay over a live SSE pair but
            // never advance the durable tail seq), so the seeded tail lands at
            // 27, not 30.
            timelineTailSeqMin: 27,
            // steps ledger: header + footer + summary + boundary + tail(7).
            minRenderedRows: 9,
            // header/boundary/summary/footer + failed row + 5 CJK tail rows.
            minCjkRows: 6,
            uniqueAriaLabels: true,
            // P293 interaction driver (zh strings live in the gates).
            timeline: {
                viewMode: 'steps',
                activeScope: 'turn-1',
                collapseScope: 'turn-1',
                longCjkPrefix: LONG_CJK_TIMELINE_SUMMARY.slice(0, 12),
                stableToolCallIds: ['tc-todo', 'tc-live-1', 'tc-retry', 'tc-file-change'],
                retry: { toolCallId: 'tc-retry', attempt: 2 },
                orderedContent: [LONG_CJK_TIMELINE_SUMMARY.slice(0, 12), 'Timeline.ts'],
                approvalId: 'approval-naturalized'
            }
        },
        buildGatewayOptions() {
            const timeline: TimelineEventRecord[] = [];
            for (let i = 0; i < 13; i += 1) {
                timeline.push(
                    ...toolPair(i * 2, {
                        sessionId: 'session-A',
                        toolName: `工具-${i + 1}`,
                        toolCallId: `tc-${i + 1}`,
                        summary: `工具 工具-${i + 1} 已完成`,
                        durationMs: 80 + i * 30
                    })
                );
            }
            // Failed pair (seqs 26,27): drives the header error count AND the
            // long CJK line. Scope-less seed -> never folds into the turn group.
            timeline.push(
                ...toolPair(26, {
                    sessionId: 'session-A',
                    toolName: '工具-长文本',
                    toolCallId: 'tc-fail',
                    summary: LONG_CJK_TIMELINE_SUMMARY,
                    status: 'failed',
                    durationMs: 800
                })
            );
            return {
                sessionId: 'session-A',
                timeline,
                commandExchange: [],
                navSessions: [{ id: 'session-A', label: '时间线会话', status: 'active', messageCount: 14 }],
                questions: [],
                tools: [
                    { name: 'todo', toolset: 'builtin', activation: { kind: 'tool', activated: true } },
                    { name: '工具-live', toolset: 'builtin', activation: { kind: 'tool', activated: true } }
                ],
                commandOutputs: []
            };
        },
        steps: [
            // Plan todos via the todo tool: 3 zh steps, first in_progress ->
            // header `step 1/3` + boundary `第 1/3 步 · 重构解析管线`. The frame
            // rides the ACTIVE turn scope (gates begin 'turn-1' pre-steps) so
            // this row folds into the turn group.
            { kind: 'pushSse', event: 'tool_completed', data: {
                seq: 28, id: 'ev-28', type: 'tool_completed', sessionId: 'session-A',
                timestamp: TS_MS + 28000, turnId: 'turn-1', toolCallId: 'tc-todo',
                receiptId: 'tc-todo', attempt: 1, toolName: 'todo', status: 'success',
                summary: 'todo 同步', durationMs: 120,
                receipt: { toolCallId: 'tc-todo', receiptId: 'tc-todo', durationMs: 120, attemptCount: 1, inputSummary: '同步计划', outputSummary: '3 个步骤待执行' },
                output: {
                    todos: [
                        { id: 't1', content: '重构解析管线', status: 'in_progress' },
                        { id: 't2', content: '迁移渲染层', status: 'pending' },
                        { id: 't3', content: '回归验证', status: 'pending' }
                    ],
                    revision: 0,
                    planId: 'plan-naturalized'
                }
            } },
            // Live pair under the SAME active turn scope. Later retry/error and
            // file-change events make this an error-bearing, non-foldable turn.
            ...pushPairSteps(29, {
                sessionId: 'session-A',
                toolName: '工具-live',
                toolCallId: 'tc-live-1',
                summary: '工具 工具-live 已完成',
                durationMs: 250
            }),
            // Failed attempt followed by a successful second attempt. The
            // stable toolCallId must keep this as one row with attempt=2.
            { kind: 'pushSse', event: 'tool_failed', data: {
                seq: 31, id: 'ev-31', type: 'tool_failed', sessionId: 'session-A',
                timestamp: TS_MS + 31000, turnId: 'turn-1', toolCallId: 'tc-retry',
                receiptId: 'tc-retry-1', attempt: 1, toolName: '检查失败', status: 'failed',
                summary: '首次检查失败', detail: '测试断言未通过', durationMs: 90,
                error: '测试断言未通过', receipt: { toolCallId: 'tc-retry', receiptId: 'tc-retry-1', attemptCount: 1, durationMs: 90 }
            } as any },
            ...pushPairSteps(32, {
                sessionId: 'session-A', toolName: '检查失败', toolCallId: 'tc-retry',
                summary: '重试后检查通过', durationMs: 140, attempt: 2
            }),
            // File changes remain a normal tool lifecycle in the main track;
            // the detailed patch belongs to the inspector/review surface.
            ...pushPairSteps(34, {
                sessionId: 'session-A', toolName: 'apply_patch', toolCallId: 'tc-file-change',
                inputSummary: '{"path":"packages/agents/agent-ui/src/Timeline.ts"}',
                summary: 'packages/agents/agent-ui/src/Timeline.ts +12 -3', durationMs: 110
            }),
            { kind: 'pushSse', event: 'approval_requested', data: {
                sessionId: 'session-A', request: {
                    id: 'approval-naturalized', toolName: 'write_file', sessionId: 'session-A',
                    reason: '需要确认写入范围', summary: '写入 Timeline.ts', createdAt: TS_MS + 36000
                }
            } }
        ]
    }
];

export function scenarioById(id: string): GatewayScenario {
    const scenario = SCENARIOS.find(candidate => candidate.id === id);
    if (!scenario) {
        throw new Error(`Unknown P285 scenario: ${id}`);
    }
    return scenario;
}
