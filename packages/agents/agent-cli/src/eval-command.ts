import * as fs from 'fs';
import type { Command } from 'commander';
import { compareEvalMetrics, EvalMetrics, EvalRunner, mergeAgentOptions } from '@tsdi/agent';
import { runAgentApplication } from './run-command';

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

export interface AgentEvalRunOptions {
    task?: string;
    issue?: string;
    verify?: string[];
    root?: string;
    workspace?: string;
    json?: boolean;
}

/** Run one eval task against the local agent runtime and persist the report. */
export async function runAgentEval(options: AgentEvalRunOptions): Promise<void> {
    if (!options.task || !options.issue) {
        throw new Error('eval run requires --task and --issue.');
    }
    const ctx = await runAgentApplication(
        { root: options.root, workspace: options.workspace } as any,
        mergeAgentOptions({ workspace: options.workspace })
    );
    try {
        const runner = ctx.get(EvalRunner);
        const report = await runner.run({
            id: options.task,
            issue: options.issue,
            verifyCommands: options.verify ?? []
        });
        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log(`${report.status.toUpperCase()} ${report.taskId} · ${report.metrics?.toolCalls ?? 0} tools · ${report.metrics?.toolFailures ?? 0} failures · ${report.metrics?.durationMs ?? 0}ms`);
        }
        if (report.status !== 'passed') {
            process.exitCode = 1;
        }
    } finally {
        await (ctx as any).close?.();
    }
}

export function registerEvalCli(program: Command): void {
    const evalCommand = program
        .command('eval')
        .description('Compare evaluation runs against baselines.');
    evalCommand
        .command('run')
        .description('Run one eval task against the local runtime.')
        .option('--task <id>', 'Task id.')
        .option('--issue <text>', 'Task prompt/issue.')
        .option('--verify <command>', 'Verification command (repeatable).', (value: string, previous: string[] = []) => [...previous, value])
        .option('--root <dir>', 'Agent config root.')
        .option('--workspace <dir>', 'Workspace directory.')
        .option('--json', 'Output JSON.')
        .action(async (options: any) => {
            await runAgentEval(options);
        });
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
