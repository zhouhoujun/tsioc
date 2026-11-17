/**
 * `@tsdi/logger` hot-path benchmarks.
 *
 *   npm run bench
 *   npx ts-node -r tsconfig-paths/register bench/run.ts --rounds 7 --samples 200000
 *
 * Every scenario runs in its own child process. Mixing scenarios in one process
 * lets V8 share (or de-optimise) call sites across them, which on this code
 * path produced 30%+ swings that do not exist when the scenario runs alone.
 *
 * The `legacy *` scenarios replay the previous implementation (one promise per
 * message, formatting before any level check) so the improvement can be
 * re-measured later without reverting the source.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { JoinpointState } from '@tsdi/aop';
import { LogAspect } from '../src/aspect';
import { Logger } from '../src/logger';
import { LoggerManager } from '../src/LoggerManager';
import { LoggerManagers } from '../src/manager';
import { LOG_CONFIGURES } from '../src/LogConfigure';
import { Level } from '../src/Level';
import { DefaultJoinPointFormater } from '../src/formater';

class CountingLogger implements Logger {
    readonly category = 'bench';
    calls = 0;
    constructor(public level: Level = 'info') { }
    log(): void { this.calls += 1; }
    trace(): void { this.calls += 1; }
    debug(): void { this.calls += 1; }
    info(): void { this.calls += 1; }
    warn(): void { this.calls += 1; }
    error(): void { this.calls += 1; }
    fatal(): void { this.calls += 1; }
}

class CountingManager implements LoggerManager {
    configureCalls = 0;
    configure(): void { this.configureCalls += 1; }
    getLogger(): Logger { return new CountingLogger(); }
}

/** The default formater is what real applications get. */
const formater = new DefaultJoinPointFormater();

class BenchAspect extends LogAspect {
    constructor() {
        super();
        (this as any).mangers = { getConfigure: () => ({ format: formater }) };
    }

    emit(logger: Logger, joinPoint: any, level: Level, messages: any[]): void {
        this.writeLog(logger, joinPoint, level, true, ...messages);
    }

    /** Pre-optimization implementation, kept for A/B runs. */
    legacyEmit(logger: Logger, joinPoint: any, level: Level, messages: any[]): void {
        (async () => {
            const formatMsgs = this.formatMessage(joinPoint, logger, level, ...messages);
            if (level) {
                logger[level](...formatMsgs);
            } else {
                logger.debug(...formatMsgs);
            }
        })();
    }
}

const joinPoint = { state: JoinpointState.Before };
const messages = ['hello', 1];

type Scenario = { name: string; fn: () => void };

function scenarioOf(name: string): Scenario {
    const aspect = new BenchAspect();
    const filtered = new CountingLogger('info');
    const enabled = new CountingLogger('debug');
    switch (name) {
        case 'filtered-debug-entry-legacy':
            return { name, fn: () => aspect.legacyEmit(filtered, joinPoint, 'debug', messages) };
        case 'filtered-debug-entry':
            return { name, fn: () => aspect.emit(filtered, joinPoint, 'debug', messages) };
        case 'filtered-state-entry-legacy':
            return { name, fn: () => aspect.legacyEmit(filtered, joinPoint, '' as Level, messages) };
        case 'filtered-state-entry':
            return { name, fn: () => aspect.emit(filtered, joinPoint, '' as Level, messages) };
        case 'emitted-debug-entry-legacy':
            return { name, fn: () => aspect.legacyEmit(enabled, joinPoint, 'debug', messages) };
        case 'emitted-debug-entry':
            return { name, fn: () => aspect.emit(enabled, joinPoint, 'debug', messages) };
        case 'configure-once':
            {
                const manager = new CountingManager();
                const managers = new LoggerManagers({
                    has: (token: any) => token === LOG_CONFIGURES,
                    get: (token: any) => token === LOG_CONFIGURES
                        ? [{ adapter: 'fake', config: { level: 'info' as Level }, asDefault: true }]
                        : manager
                } as any);
                return {
                    name,
                    fn: () => {
                        managers.getLogger('bench', 'fake');
                    }
                };
            }
        default:
            throw new Error(`unknown scenario: ${name}`);
    }
}

const SCENARIOS = [
    'filtered-debug-entry-legacy',
    'filtered-debug-entry',
    'filtered-state-entry-legacy',
    'filtered-state-entry',
    'emitted-debug-entry-legacy',
    'emitted-debug-entry',
    'configure-once'
];

function argValue(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function runSingle(name: string, samples: number, rounds: number): void {
    const scenario = scenarioOf(name);
    for (let i = 0; i < 20000; i++) scenario.fn();
    let best = Infinity;
    for (let round = 0; round < rounds; round++) {
        const start = process.hrtime.bigint();
        for (let i = 0; i < samples; i++) scenario.fn();
        const nsPerOp = Number(process.hrtime.bigint() - start) / samples;
        if (nsPerOp < best) best = nsPerOp;
    }
    console.log(`RESULT ${name} ${best.toFixed(2)}`);
}

function main(): void {
    const samples = Number(argValue('samples') ?? 200000);
    const rounds = Number(argValue('rounds') ?? 7);
    const only = argValue('only');
    if (only) {
        runSingle(only, samples, rounds);
        return;
    }

    const results: Array<{ name: string; nsPerOp: number }> = [];
    for (const name of SCENARIOS) {
        const child = spawnSync(process.execPath, [
            '-r', 'ts-node/register',
            '-r', 'tsconfig-paths/register',
            __filename,
            '--only', name,
            '--samples', String(samples),
            '--rounds', String(rounds)
        ], { cwd: join(__dirname, '..'), encoding: 'utf8' });
        const output = `${child.stdout || ''}${child.stderr || ''}`;
        const match = output.match(/RESULT (\S+) ([\d.]+)/);
        if (!match) {
            console.error(`[BENCH-FAIL] ${name}\n${output.trim()}`);
            process.exitCode = 1;
            continue;
        }
        results.push({ name: match[1], nsPerOp: Number(match[2]) });
    }

    console.log(`\nlogger bench (node ${process.version}, best of ${rounds}, ${samples} samples, isolated processes)\n`);
    console.log('| scenario | ns/op |');
    console.log('|---|---|');
    for (const result of results) {
        console.log(`| ${result.name} | ${result.nsPerOp} |`);
    }
    console.log('');
    const manager = new CountingManager();
    const managers = new LoggerManagers({
        has: (token: any) => token === LOG_CONFIGURES,
        get: (token: any) => token === LOG_CONFIGURES
            ? [{ adapter: 'fake', config: { level: 'info' as Level }, asDefault: true }]
            : manager
    } as any);
    for (let i = 0; i < 3; i++) {
        managers.getLogger('bench', 'fake');
    }
    console.log(`adapter configure calls for 3 logger lookups: ${manager.configureCalls} (previous implementation: 4)`);
}

main();
