/**
 * P285/P282 — Interaction gate over a virtual DOM (JSDOM).
 *
 * A single-process, browser-free interaction check. It mounts the REAL web
 * console entry (`mountAgentWebConsole`) into a JSDOM document, drives it
 * against the shared fake gateway (`FakeAgentGateway` + `SCENARIOS`), and
 * asserts REAL observed behavior — exact seed counters on the state, RPC call
 * records on the gateway, and rendered DOM metrics (rows, CJK, duplicate
 * labels). No Playwright/Chrome download is required.
 *
 * Running all 4 scenarios:
 *   cd packages/agents/agent-ui
 *   npx ts-node -r tsconfig-paths/register harness/run-dom-gate.ts
 * Running a single scenario by id:
 *   npx ts-node -r tsconfig-paths/register harness/run-dom-gate.ts desktop-basic
 * Writing the per-scenario metrics (v20-B) for the regression runner:
 *   npx ts-node -r tsconfig-paths/register harness/run-dom-gate.ts --json /tmp/dom-metrics.json
 * Viewport matrix run (v20-C): each selected scenario runs once per viewport;
 * the cell's viewport is recorded in the [METRICS] key (`dom/desktop-basic@1280x800`)
 * and in the metrics JSON rows (acceptance-only, not the regression baseline input):
 *   npx ts-node -r tsconfig-paths/register harness/run-dom-gate.ts \
 *     --viewport 320x480,768x600,1280x800,1920x1080
 *
 * Exit 0 = all scenarios PASS, 1 = any FAIL (matrix mode: all scenario x viewport cells).
 */

import { writeFileSync } from 'node:fs';

import { JSDOM } from 'jsdom';

import { DefaultReactiveEffect, reactive } from '@tsdi/components';

import { AgentConsoleSessionState } from '../src';
import { mountAgentWebConsole } from '../web-console';
import { FakeAgentGateway } from './FakeAgentGateway';
import { GatewayScenario, SCENARIOS, applyPipelineSteps, scenarioById } from './scenarios';
import { collectGatewayMetrics, GatewayDomMetrics } from './metrics';
import { GateScenarioMetrics, GateViewport, metricsSummary, parseGateCliArgs, scenarioKey } from './gate-metrics';

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

interface ScenarioRunResult {
    scenario: GatewayScenario;
    failures: string[];
    metrics: GateScenarioMetrics;
}

async function runScenario(dom: JSDOM, scenario: GatewayScenario, viewport?: GateViewport): Promise<ScenarioRunResult> {
    const startedAt = Date.now();
    const failures: string[] = [];
    const check = (name: string, pass: boolean, detail = ''): void => {
        if (!pass) {
            failures.push(`${name}${detail ? ` (${detail})` : ''}`);
        }
    };
    const collect = (): GatewayDomMetrics =>
        collectGatewayMetrics(dom.window.document, undefined, viewport ? { viewport } : undefined);

    // Captured inside the try: dispose() in the finally makes metadata unreadable after it.
    let settledAt = 0;
    let sseFrameCount = 0;
    let sseConsumed = 0;
    let layoutMeasured = false;
    let firstScreenVisibleRate: number | null = null;
    let postSettleStartedAt: number | null = null;

    const gateway = new FakeAgentGateway(scenario.buildGatewayOptions());
    const state = new AgentConsoleSessionState();
    if (scenario.expect.messagesVisibleItems) {
        state.setConsoleOptions({ messagesVisibleItems: scenario.expect.messagesVisibleItems });
    }
    const mountedPromise = mountAgentWebConsole({
        baseUrl: gateway.clientBaseUrl,
        sessionId: scenario.mount.sessionId,
        reconnectDelayMs: scenario.mount.reconnectDelayMs,
        fetchImpl: gateway.createFetchImpl(),
        mount: dom.window.document.getElementById('agent-console') as HTMLElement,
        state,
        pwa: false,
        workspace: ''
    });
    try {
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

        await waitUntil(() => {
            const settled = collect();
            return settled.rowCount >= scenario.expect.minRenderedRows
                && settled.ariaLabels.length >= scenario.expect.minRenderedRows
                && settled.cjkLineCount >= scenario.expect.minCjkRows
                && settled.distinctLabels === settled.ariaLabels.length
                && settled.duplicateLabels.length === 0;
        });

        settledAt = Date.now();

        const metrics = collect();
        sseFrameCount = gateway.metadata.sseFrameCount;
        sseConsumed = gateway.metadata.sseConsumed;
        layoutMeasured = metrics.layout.measured;
        firstScreenVisibleRate = metrics.layout.firstScreenVisibleRate;
        check('panel found', metrics.panelFound);
        check('row count', metrics.rowCount >= scenario.expect.minRenderedRows, `rows=${metrics.rowCount}`);
        check('cjk rows', metrics.cjkLineCount >= scenario.expect.minCjkRows, `cjk=${metrics.cjkLineCount}`);
        check('unique labels', metrics.distinctLabels === metrics.ariaLabels.length);
        check('no duplicate labels', metrics.duplicateLabels.length === 0, metrics.duplicateLabels.join(', '));
        check('layout not measured in jsdom', metrics.layout.measured === false);

        check('timeline seed count', state.timelineSeedCount === scenario.expect.timelineSeedCount, `got ${state.timelineSeedCount}`);
        check('command seed count', state.commandExchangeSeedCount === scenario.expect.commandExchangeSeedCount, `got ${state.commandExchangeSeedCount}`);
        check('nav seed count', state.navSeedCount === scenario.expect.navSeedCount, `got ${state.navSeedCount}`);
        check('timeline tail seq', state.timelineTailSeq >= scenario.expect.timelineTailSeqMin, `got ${state.timelineTailSeq}`);
        check('timeline.query calls', rpcCount(gateway, 'timeline.query') >= scenario.expect.timelineQueryCallsMin);
        check('timeline.replay calls', rpcCount(gateway, 'timeline.replay') >= scenario.expect.timelineReplayCallsMin);
        check('command_exchange.replay calls', rpcCount(gateway, 'command_exchange.replay') >= scenario.expect.commandExchangeReplayCallsMin);
        check('tools.list calls', rpcCount(gateway, 'tools.list') >= scenario.expect.toolsListCallsMin);
        check('sse dropped', gateway.metadata.sseDropped === scenario.expect.sseDropped);

        // ---- P293 timeline-naturalized acceptance cells (zh rows) -------------
        const timelineExpect = scenario.expect.timeline;
        if (timelineExpect) {
            // Post-step writes MUST go through a reactive proxy over the raw
            // state: raw-instance mutations bypass the set trap and never
            // re-render the live bindings (web-console.ts:124-127). This
            // gate-local effect is inert; the set trap still broadcasts to
            // every effect that read the raw target (reactive.ts
            // subscribableEffects), so the mounted panels re-render. The mount
            // promise itself resolves only in the finally below (after
            // gateway.dispose() closes the SSE stream), so awaiting it here
            // would hang and drain the event loop.
            const uiState = reactive(state, new DefaultReactiveEffect());
            const stepLabels = metrics.ariaLabels.slice();
            check('timeline header zh', stepLabels.some(label => /开始 .*?step 1\/3 · 1 个错误/.test(label)),
                stepLabels.filter(label => /开始/.test(label)).join(' | ') || 'none');
            check('timeline footer zh', stepLabels.some(label => /(?:完成|失败|进行中).*耗时 .*?\/timeline verbose/.test(label)),
                stepLabels.filter(label => /耗时/.test(label)).join(' | ') || 'none');
            check('timeline boundary zh', stepLabels.some(label => /第 1\/3 步 · 重构解析管线/.test(label)),
                stepLabels.filter(label => /第 \d+\/\d+ 步/.test(label)).join(' | ') || 'none');
            check('timeline steps summary zh', stepLabels.some(label => /已隐藏 \d+ 条早期事件/.test(label)),
                stepLabels.filter(label => /已隐藏/.test(label)).join(' | ') || 'none');
            check('timeline long cjk row', stepLabels.some(label => label.includes(timelineExpect.longCjkPrefix ?? '')),
                stepLabels.filter(label => (timelineExpect.longCjkPrefix?.slice(0, 6) ?? '') && label.includes((timelineExpect.longCjkPrefix as string).slice(0, 6))).join(' | ') || 'none');

            // Clear the scope BEFORE the toggle (toggle refuses the active
            // scope key), then fold the turn-1 group (todo + live pair rows ->
            // single `第 1 轮 · 2 个工具 · 370ms` row).
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
            uiState.clearTurnEventScope(timelineExpect.activeScope);
            uiState.toggleTimelineCollapse(timelineExpect.collapseScope);
            await waitUntil(() => collect().ariaLabels.some(label => /已隐藏 \d+ 条事件 · 紧凑模式仅显示当前步骤与错误/.test(label)));
        }
    } finally {
        if (mounted) {
            await mounted.dispose();
        }
    }
    const gateMetrics: GateScenarioMetrics = {
        scenarioId: scenario.id,
        gate: 'dom',
        elapsedMs: Date.now() - startedAt,
        sseConsumed,
        sseLossRate: sseFrameCount > 0 ? (sseFrameCount - sseConsumed) / sseFrameCount : 0,
        replayLatencyMs: postSettleStartedAt !== null && settledAt > 0 ? settledAt - postSettleStartedAt : null,
        firstScreenVisibleRate,
        measured: layoutMeasured,
        ...(viewport ? { viewport } : {})
    };
    return { scenario, failures, metrics: gateMetrics };
}

async function main(): Promise<number> {
    const cli = parseGateCliArgs(process.argv.slice(2));
    const scenarios = cli.only ? [scenarioById(cli.only)] : SCENARIOS;

    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="agent-console"></div></body></html>', {
        runScripts: 'dangerously',
        resources: 'usable',
        url: 'http://localhost:3100/'
    });
    (dom.window as unknown as { process: unknown }).process = {
        env: {},
        cwd: () => '/',
        platform: 'browser',
        version: '',
        versions: {},
        nextTick: (fn: () => void) => setTimeout(fn, 0),
        on: () => undefined,
        argv: []
    };
    (globalThis as unknown as { document: Document }).document = dom.window.document;

    let allOk = true;
    const gateMetrics: GateScenarioMetrics[] = [];
    const viewports = cli.viewports ?? null;
    for (const scenario of scenarios) {
        // [{}] = single viewport-less cell so single-run keys/JSON stay baseline-compatible.
        const cells: Array<{ viewport?: GateViewport }> = viewports === null
            ? [{}]
            : viewports.map(viewport => ({ viewport }));
        for (const cell of cells) {
            const result = await runScenario(dom, scenario, cell.viewport);
            gateMetrics.push(result.metrics);
            const ok = result.failures.length === 0;
            allOk = allOk && ok;
            const at = cell.viewport ? ` @ ${cell.viewport.width}x${cell.viewport.height}` : '';
            console.log(`[${ok ? 'PASS' : 'FAIL'}] ${scenario.id}${at}: ${scenario.label}`);
            for (const failure of result.failures) {
                console.log(`      - ${failure}`);
            }
            console.log(`      [METRICS] ${scenarioKey(result.metrics)} ${metricsSummary(result.metrics)}`);
        }
    }

    if (cli.jsonPath) {
        writeFileSync(cli.jsonPath, `${JSON.stringify(gateMetrics, null, 2)}\n`, 'utf8');
        console.log(`[METRICS] wrote ${gateMetrics.length} scenario metrics -> ${cli.jsonPath}${viewports !== null ? ' (matrix rows carry @<W>x<H> keys; acceptance-only, not the regression baseline input)' : ''}`);
    }

    delete (globalThis as unknown as { document?: Document }).document;
    if (viewports !== null) {
        console.log(`\n=== dom gate matrix summary: ${allOk ? 'PASS' : 'FAIL'} (${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} x ${viewports.length} viewport${viewports.length === 1 ? '' : 's'}, ${gateMetrics.length} cells) ===`);
    } else {
        console.log(`\n=== dom gate summary: ${allOk ? 'PASS' : 'FAIL'} (${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'}) ===`);
    }
    return allOk ? 0 : 1;
}

main()
    .then(code => { process.exitCode = code; })
    .catch(err => {
        console.error('[dom-gate] unexpected failure:', err);
        process.exitCode = 1;
    });