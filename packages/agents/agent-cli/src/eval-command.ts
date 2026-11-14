import * as fs from 'fs';
import type { Command } from 'commander';
import { compareEvalMetrics, EvalMetrics } from '@tsdi/agent';

export interface AgentEvalCompareOptions {
    baseline: string;
    current: string;
    json?: boolean;
}

function readMetrics(file: string): EvalMetrics {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed === 'object' && parsed.metrics) {
        return parsed.metrics;
    }
    return parsed as EvalMetrics;
}

/** Compare two eval reports/metrics and fail on regressions. */
export function runAgentEvalCompare(options: AgentEvalCompareOptions): boolean {
    const baseline = readMetrics(options.baseline);
    const current = readMetrics(options.current);
    const comparison = compareEvalMetrics(baseline, current);
    if (options.json) {
        console.log(JSON.stringify(comparison, null, 2));
    } else if (comparison.ok) {
        console.log('Eval metrics: OK');
    } else {
        console.log('Eval metrics regressed:');
        for (const reason of comparison.regressions) {
            console.log(`- ${reason}`);
        }
    }
    return comparison.ok;
}

export function registerEvalCli(program: Command): void {
    const evalCommand = program
        .command('eval')
        .description('Compare evaluation runs against baselines.');
    evalCommand
        .command('compare <baseline> <current>')
        .description('Fail when tool failures, duration or tokens regress.')
        .option('--json', 'Output JSON.')
        .action((baseline: string, current: string, options: any) => {
            const ok = runAgentEvalCompare({ baseline, current, json: options.json });
            if (!ok) {
                process.exitCode = 1;
            }
        });
}
