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
 *
 * Exit 0 = all scenarios PASS, 1 = any FAIL.
 */

import { JSDOM } from 'jsdom';

import { AgentConsoleSessionState } from '../src';
import { mountAgentWebConsole } from '../web-console';
import { FakeAgentGateway } from './FakeAgentGateway';
import { GatewayScenario, SCENARIOS, applyPipelineSteps, scenarioById } from './scenarios';
import { collectGatewayMetrics, GatewayDomMetrics } from './metrics';

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
}

async function runScenario(dom: JSDOM, scenario: GatewayScenario): Promise<ScenarioRunResult> {
    const failures: string[] = [];
    const check = (name: string, pass: boolean, detail = ''): void => {
        if (!pass) {
            failures.push(`${name}${detail ? ` (${detail})` : ''}`);
        }
    };

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
            applyPipelineSteps(gateway, scenario.steps);
        }

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

        await waitUntil(() => {
            const settled = collectGatewayMetrics(dom.window.document);
            return settled.rowCount >= scenario.expect.minRenderedRows
                && settled.ariaLabels.length >= scenario.expect.minRenderedRows
                && settled.cjkLineCount >= scenario.expect.minCjkRows
                && settled.distinctLabels === settled.ariaLabels.length
                && settled.duplicateLabels.length === 0;
        });

        const metrics = collectGatewayMetrics(dom.window.document);
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
    } finally {
        gateway.dispose();
        const mounted = await mountedPromise.catch(() => null);
        if (mounted) {
            await mounted.dispose();
        }
    }
    return { scenario, failures };
}

async function main(): Promise<number> {
    const only = process.argv[2]?.trim();
    const scenarios = only ? [scenarioById(only)] : SCENARIOS;

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
    for (const scenario of scenarios) {
        const result = await runScenario(dom, scenario);
        const ok = result.failures.length === 0;
        allOk = allOk && ok;
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${scenario.id}: ${scenario.label}`);
        for (const failure of result.failures) {
            console.log(`      - ${failure}`);
        }
    }

    delete (globalThis as unknown as { document?: Document }).document;
    console.log(`\n=== dom gate summary: ${allOk ? 'PASS' : 'FAIL'} (${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'}) ===`);
    return allOk ? 0 : 1;
}

main()
    .then(code => process.exit(code))
    .catch(err => {
        console.error('[dom-gate] unexpected failure:', err);
        process.exit(1);
    });