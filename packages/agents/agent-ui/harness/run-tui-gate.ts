/**
 * P281/P285 — Interaction gate over the TUI/console text stream.
 *
 * The browser side has a DOM gate (`run-dom-gate.ts`); this is the console
 * side. Both gates drive the SAME shared scenarios (`FakeAgentGateway` +
 * `SCENARIOS`) over the real reactive components, and both assert REAL observed
 * behavior — exact seed counters on the state, RPC call records on the gateway,
 * SSE drop/replay flags. The only difference is the rendering lens:
 *
 *   - DOM gate  -> JSDOM metrics (rows/aria-labels/CJK/duplicates)
 *   - TUI gate  -> `ConsoleRenderer.renderToLines` FULL text stream
 *
 * agent-ui renders like Codex: a STREAMING layout that is NOT height-limited.
 * The console renderer has no viewport/first-screen concept, so this gate
 * asserts the complete text flow of the message panel (streaming), plus the
 * same single-status-glyph / natural-sentence / duplicate-free structure rules
 * (P281) that the DOM gate enforces structurally.
 *
 * Running all 5 scenarios:
 *   cd packages/agents/agent-ui
 *   npx ts-node -r tsconfig-paths/register harness/run-tui-gate.ts
 * Running a single scenario by id:
 *   npx ts-node -r tsconfig-paths/register harness/run-tui-gate.ts desktop-basic
 * Writing the per-scenario metrics (v20-B) for the regression runner:
 *   npx ts-node -r tsconfig-paths/register harness/run-tui-gate.ts --json /tmp/tui-metrics.json
 *
 * Exit 0 = all scenarios PASS, 1 = any FAIL.
 *
 * NOTE: this file lives in `harness/` (a node-side tool, like run-dom-gate.ts),
 * not in `src/`, so node APIs are allowed here. It imports app code from the
 * package's own `../src` entry (never the installed `@tsdi/agent-ui` dist).
 */

import { writeFileSync } from 'node:fs';

import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleElement, ConsoleRenderer, ConsoleTemplateModule } from '@tsdi/components/console';
import { AGENT_OPTIONS, AgentModule, COMMAND_EXECUTION_CONTROL, CommandExecutionControlPort, defaultAgentOptions } from '@tsdi/agent';

import {
    AGENT_CONSOLE_APP_RPC,
    AgentConsoleComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleRemoteEventBridge,
    AgentConsoleSessionState,
    AgentUiModule,
    HttpAgentConsoleAppRpc,
    RpcCommandOutputStore
} from '../src';
import { FakeAgentGateway } from './FakeAgentGateway';
import { GatewayScenario, SCENARIOS, applyPipelineSteps, scenarioById } from './scenarios';
import { calculateSseLossRate, GateScenarioMetrics, metricsSummary, parseGateCliArgs, scenarioKey } from './gate-metrics';

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

const CJK_RE = /[\u4e00-\u9fff]/;
/** Decorative leading glyphs the message renderer may emit (see console-renderer.spec). */
const STATUS_GLYPHS = ['✓', '✕', '●', '○', '…', '›', '•'];
/** P281 wording rules: no machine-y double-word phrases. */
const MACHINE_PHRASE_RE = /success\s+completed|completed\s+success|failed\s+error|error\s+failed/i;

function countStatusGlyphs(line: string): number {
    let count = 0;
    for (const glyph of STATUS_GLYPHS) {
        count += line.split(glyph).length - 1;
    }
    return count;
}

interface ScenarioRunResult {
    scenario: GatewayScenario;
    failures: string[];
    metrics: GateScenarioMetrics;
}

async function runScenario(scenario: GatewayScenario): Promise<ScenarioRunResult> {
    const startedAt = Date.now();
    const failures: string[] = [];
    const check = (name: string, pass: boolean, detail = ''): void => {
        if (!pass) {
            failures.push(`${name}${detail ? ` (${detail})` : ''}`);
        }
    };

    // Captured inside the try: dispose() in the finally makes metadata unreadable after it.
    let settledAt = 0;
    let sseFrameCount = 0;
    let sseConsumed = 0;
    let postSettleStartedAt: number | null = null;

    const gateway = new FakeAgentGateway(scenario.buildGatewayOptions());
    const rawState = new AgentConsoleSessionState();
    if (scenario.expect.messagesVisibleItems) {
        rawState.setConsoleOptions({ messagesVisibleItems: scenario.expect.messagesVisibleItems });
    }
    const rpc = new HttpAgentConsoleAppRpc({
        baseUrl: gateway.clientBaseUrl,
        fetchImpl: gateway.createFetchImpl()
    });

    let ctx: ApplicationContext | null = null;
    let disposal: Promise<(() => void) | undefined> | undefined;
    try {
        ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, ConsoleTemplateModule, ComponentsModule],
            providers: [
                { provide: AGENT_CONSOLE_APP_RPC, useValue: rpc },
                { provide: AgentConsoleSessionState, useValue: rawState },
                {
                    provide: AGENT_OPTIONS,
                    useValue: {
                        ...defaultAgentOptions,
                        ui: {
                            ...defaultAgentOptions.ui,
                            console: {
                                ...(defaultAgentOptions.ui?.console || {}),
                                workspace: ''
                            }
                        },
                        // An explicit bootstrapTurn keeps onInit's openSession on
                        // this scenario session id (otherwise it falls back to
                        // 'default', bumping the command-exchange epoch past the
                        // seed records' sessionEpoch=1 and filtering every one out).
                        bootstrapTurn: scenario.mount.sessionId ? { sessionId: scenario.mount.sessionId } : undefined
                    }
                }
            ]
        });

        const ref = ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        const state = ref.instance.sessionState;

        // Mirror web-console.ts wiring for an externally supplied state:
        //  1. wire the RPC command-output store + command-execution control,
        //  2. configure the session (configure bumps the command-exchange epoch,
        //     which seedCommandExchange requires),
        //  3. then the remote bridge seeds the timeline/commands/nav.
        state.setCommandExecutionControl(ctx.get(COMMAND_EXECUTION_CONTROL) as CommandExecutionControlPort);
        state.setCommandOutputStore(new RpcCommandOutputStore(rpc, () => state.sessionId));
        state.configure({
            sessionId: scenario.mount.sessionId,
            workspace: ''
        });

        const bridge = new AgentConsoleRemoteEventBridge(state, {
            baseUrl: gateway.clientBaseUrl,
            rpc,
            fetchImpl: gateway.createFetchImpl(),
            reconnectDelayMs: scenario.mount.reconnectDelayMs,
            onReconnected: () => state.onSessionReconnected?.()
        });
        // subscribe() resolves only after the SSE reader closes (on dispose).
        // Keep it detached like web-console's mountedPromise; the waitUntil
        // poll timers keep the event loop alive while seeding/settling.
        disposal = bridge.subscribe(state.sessionId).catch(() => () => undefined);

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
            // P293: enable the window + open the turn scope BEFORE the live
            // steps so pushed frames project under the turn-1: prefix (foldable
            // group when the scope is cleared and the turn is toggled below).
            if (scenario.expect.timeline) {
                state.setTimelineMode(scenario.expect.timeline.viewMode);
                state.beginTurnEventScope(scenario.expect.timeline.activeScope);
            }
            applyPipelineSteps(gateway, scenario.steps);
        }

        if (scenario.postSettlePush) {
            postSettleStartedAt = Date.now();
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
        // A healthy, non-disconnecting stream must consume every frame pushed
        // by the scenario. Do not let an early render condition normalize
        // in-flight frames into the loss baseline.
        if (!scenario.expect.sseDropped && gateway.metadata.sseFrameCount > 0) {
            await waitUntil(() => gateway.metadata.sseConsumed >= gateway.metadata.sseFrameCount);
        }

        const renderer = ctx.get(ConsoleRenderer);
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent> | undefined;
        const getLines = (): string[] => {
            if (!messagesPanel || !messagesPanel.hostView?.rootNodes?.[0]) {
                return [];
            }
            return renderer.renderToLines(messagesPanel.hostView.rootNodes[0] as ConsoleElement);
        };

        await waitUntil(() => getLines().length >= scenario.expect.minRenderedRows);

        settledAt = Date.now();
        sseFrameCount = gateway.metadata.sseFrameCount;
        sseConsumed = gateway.metadata.sseConsumed;

        const lines = getLines();
        const cjkLineCount = lines.filter(line => CJK_RE.test(line)).length;
        const uniqueLineCount = new Set(lines).size;

        // ---- wire assertions (same semantics as the DOM gate) -----------------
        check('timeline seed count', state.timelineSeedCount === scenario.expect.timelineSeedCount, `got ${state.timelineSeedCount}`);
        check('command seed count', state.commandExchangeSeedCount === scenario.expect.commandExchangeSeedCount, `got ${state.commandExchangeSeedCount}`);
        check('nav seed count', state.navSeedCount === scenario.expect.navSeedCount, `got ${state.navSeedCount}`);
        check('timeline tail seq', state.timelineTailSeq >= scenario.expect.timelineTailSeqMin, `got ${state.timelineTailSeq}`);
        check('timeline.query calls', rpcCount(gateway, 'timeline.query') >= scenario.expect.timelineQueryCallsMin);
        check('timeline.replay calls', rpcCount(gateway, 'timeline.replay') >= scenario.expect.timelineReplayCallsMin);
        check('command_exchange.replay calls', rpcCount(gateway, 'command_exchange.replay') >= scenario.expect.commandExchangeReplayCallsMin);
        check('tools.list calls', rpcCount(gateway, 'tools.list') >= scenario.expect.toolsListCallsMin);
        check('sse dropped', gateway.metadata.sseDropped === scenario.expect.sseDropped);

        // ---- TUI text-stream assertions (streaming, NOT height-limited) -------
        check('panel found', Boolean(messagesPanel), messagesPanel ? '' : 'messages panel ref missing');
        check('row count', lines.length >= scenario.expect.minRenderedRows, `rows=${lines.length}`);
        check('cjk rows', cjkLineCount >= scenario.expect.minCjkRows, `cjk=${cjkLineCount}`);
        check('unique lines', uniqueLineCount === lines.length, `unique=${uniqueLineCount}/${lines.length}`);
        check(
            'single status glyph per line',
            lines.every(line => countStatusGlyphs(line) <= 1),
            `lines with >1 glyph: ${lines.filter(line => countStatusGlyphs(line) > 1).map(line => JSON.stringify(line)).join(', ') || 'none'}`
        );
        const machineLines = lines.filter(line => MACHINE_PHRASE_RE.test(line));
        check('natural sentence form', machineLines.length === 0, machineLines.map(line => JSON.stringify(line)).join(', '));

        // Streaming lens: whatever the state holds must be exactly what the text
        // stream shows — no viewport clipping, no phantom rows.
        const visibleWindow = scenario.expect.messagesVisibleItems ?? 7;
        const expectedVisible = Math.min(state.messages.length, visibleWindow);
        check(
            'streaming full text',
            lines.length >= expectedVisible,
            `lines=${lines.length}, visible messages=${expectedVisible} (state=${state.messages.length}, window=${visibleWindow})`
        );

        // ---- P293 timeline-naturalized acceptance cells (zh rows) -------------
        const timelineExpect = scenario.expect.timeline;
        if (timelineExpect) {
            const stepLines = lines.slice();
            check('timeline header zh', stepLines.some(line => /P285 interaction gate · 开始 \d{1,2}:\d{2}(?::\d{2})?(?: AM| PM)?/.test(line) && !/step 1\/3 · 1 个错误/.test(line)),
                stepLines.filter(line => /开始/.test(line)).join(' | ') || 'none');
            check('timeline footer zh', stepLines.some(line => /(?:完成|失败|进行中).*耗时/.test(line) && !/\/timeline/.test(line)),
                stepLines.filter(line => /耗时/.test(line)).join(' | ') || 'none');
            check('timeline boundary zh', stepLines.some(line => /第 1\/3 步 · 重构解析管线/.test(line)),
                stepLines.filter(line => /第 \d+\/\d+ 步/.test(line)).join(' | ') || 'none');
            check('timeline steps summary zh', stepLines.some(line => /已隐藏 \d+ 条早期事件/.test(line)),
                stepLines.filter(line => /已隐藏/.test(line)).join(' | ') || 'none');
            check('timeline long cjk row', stepLines.some(line => line.includes(timelineExpect.longCjkPrefix ?? '')),
                stepLines.filter(line => (timelineExpect.longCjkPrefix?.slice(0, 6) ?? '') && line.includes((timelineExpect.longCjkPrefix as string).slice(0, 6))).join(' | ') || 'none');

            // Clear the scope BEFORE the toggle (toggle refuses the active
            // scope key), then fold the turn-1 group (todo + live pair rows ->
            // single `第 1 轮 · 完成 · 2 个工具 · 370ms` row).
            // Drain the SSE channel BEFORE clearing the scope: the bridge
            // consumes one SSE frame per reader.read() and awaits an RPC
            // round-trip (refreshTools) after each tool_completed, so live
            // frames may still be in flight when we reach the toggle. If we
            // clear the scope first, the live pair lands with an unqualified
            // key and never joins the fold. Drain (consume >= pushed), then
            // let one macrotask finish so the final frame's decode->apply
            // chain runs while the scope is still active.
            if (gateway.metadata.sseFrameCount > 0) {
                await waitUntil(() => gateway.metadata.sseConsumed >= gateway.metadata.sseFrameCount);
                await new Promise<void>(resolve => setTimeout(resolve, 0));
            }
            state.clearTurnEventScope(timelineExpect.activeScope);
            state.toggleTimelineCollapse(timelineExpect.collapseScope);
            await waitUntil(() => getLines().some(line => /第 1 轮 · 完成 · 2 个工具 · 370ms/.test(line)));
            const foldedLines = getLines();
            check('timeline collapse fold zh', foldedLines.some(line => /第 1 轮 · 完成 · 2 个工具 · 370ms/.test(line)),
                foldedLines.filter(line => /第 \d+ 轮 · 完成 · \d+ 个工具/.test(line)).join(' | ') || 'none');

            // Compact mode summarizes overflow with the naturalized zh label
            // instead of dropping rows (data-driven, no timers).
            state.setTimelineMode('compact');
            await waitUntil(() => getLines().some(line => /已隐藏 \d+ 条事件 · 紧凑模式仅显示当前步骤与错误/.test(line)));
            const compactLines = getLines();
            check('timeline compact summary zh', compactLines.some(line => /已隐藏 \d+ 条事件 · 紧凑模式仅显示当前步骤与错误/.test(line)),
                compactLines.filter(line => /已隐藏/.test(line)).join(' | ') || 'none');
        }
        // Capture wire metrics after scenario-specific interactions. Timeline
        // scenarios drain live frames before folding; sampling above that drain
        // records an artificial loss even though every frame was consumed.
        sseFrameCount = gateway.metadata.sseFrameCount;
        sseConsumed = gateway.metadata.sseConsumed;
        check('sse consumed does not exceed pushed', sseConsumed <= sseFrameCount, `pushed=${sseFrameCount}, consumed=${sseConsumed}`);
    } finally {
        // gateway.dispose() closes the SSE stream so the reader in connectOnce
        // yields done=true; only then does subscribe() settle and expose the
        // disposeBridge() handle.
        try { gateway.dispose(); } catch { /* ignore */ }
        const disposeFn = disposal ? await disposal.catch(() => null) : null;
        if (typeof disposeFn === 'function') {
            try { disposeFn(); } catch { /* ignore */ }
        }
        if (ctx) {
            await ctx.close().catch(() => null);
        }
    }
    const gateMetrics: GateScenarioMetrics = {
        scenarioId: scenario.id,
        gate: 'tui',
        elapsedMs: Date.now() - startedAt,
        sseFrameCount,
        sseConsumed,
        sseLossRate: calculateSseLossRate(sseFrameCount, sseConsumed),
        replayLatencyMs: postSettleStartedAt !== null && settledAt > 0 ? settledAt - postSettleStartedAt : null,
        firstScreenVisibleRate: null,
        measured: false
    };
    return { scenario, failures, metrics: gateMetrics };
}

async function main(): Promise<number> {
    const cli = parseGateCliArgs(process.argv.slice(2));
    if (cli.viewports && cli.viewports.length > 0) {
        console.error('[tui-gate] --viewport is DOM-gate only: the console renderer streams rows without viewport geometry (measured=false by design).');
        return 1;
    }
    const scenarios = cli.only ? [scenarioById(cli.only)] : SCENARIOS;

    let allOk = true;
    const gateMetrics: GateScenarioMetrics[] = [];
    for (const scenario of scenarios) {
        const result = await runScenario(scenario);
        gateMetrics.push(result.metrics);
        const ok = result.failures.length === 0;
        allOk = allOk && ok;
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${scenario.id}: ${scenario.label}`);
        for (const failure of result.failures) {
            console.log(`      - ${failure}`);
        }
        console.log(`      [METRICS] ${scenarioKey(result.metrics)} ${metricsSummary(result.metrics)}`);
    }

    if (cli.jsonPath) {
        writeFileSync(cli.jsonPath, `${JSON.stringify(gateMetrics, null, 2)}\n`, 'utf8');
        console.log(`[METRICS] wrote ${gateMetrics.length} scenario metrics -> ${cli.jsonPath}`);
    }

    console.log(`\n=== tui gate summary: ${allOk ? 'PASS' : 'FAIL'} (${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'}) ===`);
    return allOk ? 0 : 1;
}

main()
    .then(code => { process.exitCode = code; })
    .catch(err => {
        console.error('[tui-gate] unexpected failure:', err);
        process.exitCode = 1;
    });
