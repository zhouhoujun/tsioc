import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { freemem } from 'node:os';
import { join } from 'node:path';
import { runTest } from '@tsdi/unit';
import { planGroups, selectGroups } from './test/groups';

/**
 * agent-ui test entry.
 *
 * Two self-contained heavy specs are isolated, and the remaining files are
 * split into three contiguous slices of the original order. Groups run in
 * worker processes: every case and every file's internal order stays intact,
 * only the wall time overlaps. The five-group plan was verified standalone and
 * together (109 + 11 + 743 + 598 + 767 = 2228 cases).
 *
 * Groups are merged down when memory is tight: a worker holds a full renderer
 * graph, so five ts-node processes on a busy 8GB host swap and run slower than
 * one. `selectGroups` keeps the heavy specs isolated whenever the budget
 * allows and concatenates adjacent remainder slices otherwise.
 *
 * Controls:
 * - `AGENT_UI_TEST_GROUPS=<1..5>` forces a worker count;
 * - `AGENT_UI_TEST_SHARDS=1` runs the original single-process suite;
 * - `AGENT_UI_TEST_MEMORY_BUDGET_MB=<MiB>` fails a suite/worker whose peak RSS
 *   exceeds the budget;
 * - `-c` / `--coverage` always runs single-process (one coverage report).
 */

const GROUP_ENV = 'AGENT_UI_TEST_GROUP';
const COUNT_ENV = 'AGENT_UI_TEST_GROUPS';
/** Opt-in peak-RSS budget for one test process, in MiB. */
const MEMORY_ENV = 'AGENT_UI_TEST_MEMORY_BUDGET_MB';
/** Rough peak RSS of one worker (renderer graph + JSDOM cases). */
const WORKER_MEMORY_BYTES = 1.2 * 1024 ** 3;

interface WorkerResult {
    group: string;
    code: number;
    stdout: string;
    stderr: string;
    ms: number;
}

function listSpecFiles(dir: string, root: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            listSpecFiles(full, root, out);
        } else if (entry.name.endsWith('.spec.ts')) {
            out.push(full.slice(root.length + 1).split('\\').join('/'));
        }
    }
    return out;
}

function wantsCoverage(args: string[]): boolean {
    return args.some(arg => arg === '-c' || arg === '--coverage' || arg.startsWith('--coverage='));
}

/** Opt-in wall-clock budget (`AGENT_UI_TEST_WALL_BUDGET=<seconds>`). */
function enforceWallBudget(startedAt: number, label: string): void {
    const budget = Number(process.env.AGENT_UI_TEST_WALL_BUDGET);
    if (!Number.isFinite(budget) || budget <= 0) {
        return;
    }
    const seconds = (Date.now() - startedAt) / 1000;
    if (seconds > budget) {
        console.error(`[agent-ui] ${label} exceeded the ${budget}s wall-clock budget (${seconds.toFixed(1)}s).`);
        process.exit(1);
    }
}

interface MemorySample {
    peakMb: number;
    overBudget: boolean;
    budgetMb: number;
}

/**
 * Opt-in peak-RSS sampler (`AGENT_UI_TEST_MEMORY_BUDGET_MB=<MiB>`).
 *
 * Shards are memory-bound: five renderer graphs on a small host swap instead of
 * running. Sampling inside each process catches a worker that only fits because
 * the parent merged groups, without depending on `/proc` (portable to CI).
 */
function startMemorySampler(label: string): () => MemorySample {
    const budgetMb = Number(process.env[MEMORY_ENV]);
    if (!Number.isFinite(budgetMb) || budgetMb <= 0) {
        return () => ({ peakMb: 0, overBudget: false, budgetMb: 0 });
    }
    let peak = process.memoryUsage().rss;
    const timer = setInterval(() => {
        peak = Math.max(peak, process.memoryUsage().rss);
    }, 200);
    timer.unref?.();
    return () => {
        clearInterval(timer);
        peak = Math.max(peak, process.memoryUsage().rss);
        const peakMb = peak / 1024 ** 2;
        const overBudget = peakMb > budgetMb;
        const line = `[agent-ui] ${label} peak RSS ${peakMb.toFixed(0)} MiB (budget ${budgetMb} MiB)`;
        if (overBudget) {
            console.error(`${line} — over budget`);
        } else {
            console.log(line);
        }
        return { peakMb, overBudget, budgetMb };
    };
}

async function runWithMemoryBudget(label: string, run: () => Promise<void>): Promise<number> {
    const stop = startMemorySampler(label);
    try {
        await run();
    } finally {
        const sample = stop();
        if (sample.overBudget) {
            return 1;
        }
    }
    return 0;
}

/**
 * Workers are memory-bound, not CPU-bound: five ts-node processes on an 8GB
 * host swap and end up slower than one. Pick the count from currently
 * available memory (never fewer than one).
 */
function resolveGroupCount(): number {
    const forced = Number(process.env[COUNT_ENV]);
    if (Number.isFinite(forced) && forced >= 1) {
        return Math.min(5, Math.floor(forced));
    }
    return Math.max(1, Math.min(5, Math.floor(freemem() / WORKER_MEMORY_BYTES)));
}

async function flushStdio(): Promise<void> {
    // Lingering timers/SSE probes would otherwise keep a worker alive for
    // minutes after the last case.
    const drain = (stream: NodeJS.WriteStream): Promise<void> => new Promise(resolve => {
        if (!stream.writableLength) {
            resolve();
            return;
        }
        stream.once('drain', resolve);
    });
    await drain(process.stdout);
    await drain(process.stderr);
}

function spawnWorker(group: string, args: string[]): Promise<WorkerResult> {
    const started = Date.now();
    return new Promise(resolve => {
        const child = spawn(
            process.execPath,
            [
                require.resolve('ts-node/dist/bin.js'),
                '--transpile-only',
                '-r',
                'tsconfig-paths/register',
                __filename,
                ...args
            ],
            {
                cwd: __dirname,
                env: { ...process.env, [GROUP_ENV]: group },
                stdio: ['ignore', 'pipe', 'pipe']
            }
        );
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', chunk => { stdout += String(chunk); });
        child.stderr?.on('data', chunk => { stderr += String(chunk); });
        const done = (code: number): void => {
            resolve({ group, code, stdout, stderr, ms: Date.now() - started });
        };
        child.on('error', error => { stderr += String(error); done(1); });
        child.on('close', code => done(code ?? 1));
    });
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const files = listSpecFiles(join(__dirname, 'test'), __dirname);

    // Worker: the parent already chose the group plan; run only our files.
    const group = process.env[GROUP_ENV];
    if (group !== undefined) {
        const groups = selectGroups(planGroups(files), Number(process.env[COUNT_ENV]) || 5);
        const selected = groups[group] || [];
        if (!selected.length) {
            return;
        }
        const overBudget = await runWithMemoryBudget(`group ${group}`, async () => {
            await runTest(selected.map(file => `./${file}`), { baseURL: __dirname });
        });
        await flushStdio();
        process.exit(overBudget ? 1 : 0);
    }

    if (wantsCoverage(args) || process.env.AGENT_UI_TEST_SHARDS === '1') {
        const started = Date.now();
        const overBudget = await runWithMemoryBudget('single-process suite', async () => {
            await runTest('./test/**/*.ts', { baseURL: __dirname });
        });
        enforceWallBudget(started, 'single-process suite');
        await flushStdio();
        process.exit(overBudget ? 1 : 0);
    }

    const plannedGroups = planGroups(files);
    const groupCount = Math.min(resolveGroupCount(), Object.keys(plannedGroups).length);
    const groups = selectGroups(plannedGroups, groupCount);
    process.env[COUNT_ENV] = String(groupCount);
    const names = Object.keys(groups);
    const planned = names.reduce((sum, name) => sum + groups[name].length, 0);
    if (names.length === 1 || planned !== files.length) {
        // A missing/renamed spec would lose coverage: run one pass instead.
        const started = Date.now();
        const overBudget = await runWithMemoryBudget('single-pass suite', async () => {
            await runTest('./test/**/*.ts', { baseURL: __dirname });
        });
        enforceWallBudget(started, 'single-pass suite');
        await flushStdio();
        process.exit(overBudget ? 1 : 0);
    }

    const availableGb = (freemem() / 1024 ** 3).toFixed(1);
    console.log(`[agent-ui] ${names.length} groups (${availableGb}GB available) · ${files.length} spec files`);
    console.log('[agent-ui] AGENT_UI_TEST_GROUPS=<n> overrides, AGENT_UI_TEST_SHARDS=1 disables');
    for (const name of names) {
        console.log(`[agent-ui] start ${name} (${groups[name].length} files)`);
    }
    const started = Date.now();
    // Start every worker before awaiting any of them so they overlap.
    const workers = names.map(name => spawnWorker(name, args));
    let failed = 0;
    for (const worker of workers) {
        const result = await worker;
        console.log(`\n[agent-ui] ${result.group} finished in ${(result.ms / 1000).toFixed(1)}s (exit ${result.code}, ${groups[result.group].length} files)`);
        if (result.stdout) {
            process.stdout.write(result.stdout);
        }
        if (result.stderr) {
            process.stderr.write(result.stderr);
        }
        if (result.code !== 0) {
            failed += 1;
        }
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (failed) {
        console.error(`\n[agent-ui] ${failed}/${names.length} groups failed · ${seconds}s`);
        await flushStdio();
        process.exit(1);
    }
    console.log(`\n[agent-ui] ${names.length} groups passed · ${seconds}s`);
    enforceWallBudget(started, 'parallel groups');
    await flushStdio();
    process.exit(0);
}

main().catch((error: Error) => {
    console.error(error);
    process.exit(1);
});
