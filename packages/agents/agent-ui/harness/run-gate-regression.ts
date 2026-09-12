/**
 * v20-B — gate metrics regression runner.
 *
 * Consumes the per-scenario metrics JSON produced by `run-dom-gate.ts` /
 * `run-tui-gate.ts` (`--json <path>`) and compares them against a committed
 * baseline (`harness/gate-baseline.json`). Mirrors the plan-eval-bench flow:
 * first run (or `--write-baseline`) snapshots the baseline and exits 0; later
 * runs diff against it and emit a CI-consumable `[OK]`/`[REGRESSION]` marker.
 *
 * Usage (from packages/agents/agent-ui):
 *   npx ts-node -r tsconfig-paths/register harness/run-gate-regression.ts \
 *       --dom /tmp/dom-metrics.json --tui /tmp/tui-metrics.json \
 *       --baseline harness/gate-baseline.json
 *   # force re-snapshot without comparing:
 *   npx ts-node -r tsconfig-paths/register harness/run-gate-regression.ts \
 *       --dom ... --tui ... --baseline ... --write-baseline
 *
 * Exit 0 = baseline written or run within tolerance ([OK]); 1 = degradation
 * beyond tolerance ([REGRESSION]).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
    GateScenarioMetrics,
    baselineFromMetrics,
    mergeGateMetrics,
    renderGateRegression,
    runGateRegression
} from './gate-metrics';

interface RunnerArgs {
    domJson?: string;
    tuiJson?: string;
    baseline: string;
    writeBaseline: boolean;
}

function parseRunnerArgs(args: string[]): RunnerArgs {
    const out: RunnerArgs = { baseline: 'harness/gate-baseline.json', writeBaseline: false };
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        const next = (): string => {
            const value = args[i + 1];
            if (value === undefined) {
                throw new Error(`missing value for ${arg}`);
            }
            i += 1;
            return value;
        };
        if (arg === '--dom') {
            out.domJson = next();
        } else if (arg === '--tui') {
            out.tuiJson = next();
        } else if (arg === '--baseline') {
            out.baseline = next();
        } else if (arg === '--write-baseline') {
            out.writeBaseline = true;
        } else {
            throw new Error(`unknown argument: ${arg}`);
        }
    }
    return out;
}

function loadMetrics(path: string | undefined, label: string): GateScenarioMetrics[] {
    if (!path) {
        return [];
    }
    if (!existsSync(path)) {
        throw new Error(`${label} metrics file not found: ${path}`);
    }
    return JSON.parse(readFileSync(path, 'utf8')) as GateScenarioMetrics[];
}

function main(): number {
    const args = parseRunnerArgs(process.argv.slice(2));
    const current = mergeGateMetrics(loadMetrics(args.domJson, 'dom'), loadMetrics(args.tuiJson, 'tui'));
    if (current.length === 0) {
        console.error('[gate-regression] no scenario metrics loaded (need --dom and/or --tui)');
        return 1;
    }

    const baselineExists = existsSync(args.baseline);
    if (args.writeBaseline || !baselineExists) {
        writeFileSync(args.baseline, `${JSON.stringify(baselineFromMetrics(current), null, 2)}\n`, 'utf8');
        console.log(`[OK] gate baseline written: ${args.baseline} (${current.length} scenarios)`);
        return 0;
    }

    const baseline = JSON.parse(readFileSync(args.baseline, 'utf8')) as GateScenarioMetrics[];
    const result = runGateRegression(current, baseline);
    console.log(renderGateRegression(result));
    return result.regressed ? 1 : 0;
}

try {
    process.exit(main());
} catch (err) {
    console.error('[gate-regression] unexpected failure:', err);
    process.exit(1);
}