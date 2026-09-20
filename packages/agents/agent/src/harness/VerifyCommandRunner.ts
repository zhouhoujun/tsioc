import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, sep } from 'path';
import { resolveProcessEnv } from '../env';

/**
 * P79: verify-command evidence source.
 *
 * After a tool round edits files, the verification gate may run package
 * verification commands (typecheck / lint / build / test) scoped to the
 * affected packages. Non-zero exits are recorded as `verify-command`
 * evidence entries and falsified by the gate, closing the "model changed code
 * but never noticed the build/test broke" feedback loop.
 *
 * Command resolution order per package:
 *  1. explicit `verification.verifyCommands.<kind>` templates (always run
 *     when set, verbatim);
 *  2. auto-discovered package.json scripts whose name is in
 *     `verification.autoScripts` (default `['typecheck', 'lint']` — fast,
 *     deterministic scripts only; long-running suites like `test`/`build`
 *     are opt-in to avoid slowing every edit round).
 *
 * Degradation rules:
 *  - no edited files, no package.json, or no matching script → silently
 *    produce no runs (the gate never falsifies on missing script/config);
 *  - a command that exceeds `timeoutMs` is killed and reported as
 *    `timedOut` (still a falsification, but clearly labeled).
 *
 * The runner is environment-agnostic: it prefers the package manager hinted
 * by a lockfile (pnpm > yarn > bun > npm) and falls back to `npm run`.
 */

export type VerifyCommandKind = 'test' | 'build' | 'typecheck' | 'lint' | string;

/** One resolved package verification command run (P79). */
export interface VerifyCommandRun {
    /** Command kind ('typecheck', 'lint', ... or the configured template key). */
    kind: VerifyCommandKind;
    /** Package.json script name that produced the run (auto-discovery only). */
    script?: string;
    /** Fully resolved command line (e.g. 'npm run typecheck'). */
    command: string;
    /** Working directory where the command ran (the package directory). */
    cwd: string;
    /** Process exit code; undefined when the command could not start. */
    exitCode?: number;
    /** Bounded combined stdout+stderr (tail-first truncation). */
    output: string;
    /** Elapsed wall-clock time in ms. */
    durationMs: number;
    /** True when the command was killed by the timeout. */
    timedOut: boolean;
    /** Non-zero exit (or timeout / spawn failure) — convenience flag for the gate. */
    failed: boolean;
}

export interface VerifyCommandRunnerOptions {
    /** Explicit command templates keyed by kind. Verbatim overrides auto-discovery. */
    verifyCommands?: Partial<Record<VerifyCommandKind, string>>;
    /** Auto-discovered package.json script names to run when present (default ['typecheck', 'lint']). */
    autoScripts?: string[];
    /** Per-command timeout in ms (default 120000). */
    timeoutMs?: number;
    /** Max characters captured per command output (default 8000). */
    maxOutputChars?: number;
    /** Package directory discovery upper bound; never walk above this directory. */
    workspace?: string;
    /** Explicit env for spawned commands (defaults to the host process env via the global guard). */
    env?: Record<string, string | undefined>;
    /** Injectable process runner for tests (defaults to the real spawn-based runner). */
    runProcess?: (command: string, args: string[], cwd: string, timeoutMs: number, env?: Record<string, string | undefined>) => Promise<{
        exitCode?: number;
        output: string;
        durationMs: number;
        timedOut: boolean;
    }>;
}

export const DEFAULT_VERIFY_AUTO_SCRIPTS = ['typecheck', 'lint'];
export const DEFAULT_VERIFY_TIMEOUT_MS = 120000;
export const DEFAULT_VERIFY_MAX_OUTPUT_CHARS = 8000;

const DEFAULT_RUNNER = (
    command: string,
    args: string[],
    cwd: string,
    timeoutMs: number,
    env?: Record<string, string | undefined>
): Promise<{ exitCode?: number; output: string; durationMs: number; timedOut: boolean }> =>
    new Promise(resolve => {
        const startedAt = Date.now();
        const child = spawn(command, args, {
            cwd,
            env: env ?? resolveProcessEnv(),
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false
        });
        let stdout = '';
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            child.kill('SIGTERM');
            const combined = `${stdout}\n${stderr}`.trim();
            resolve({
                exitCode: undefined,
                output: combined,
                durationMs: Date.now() - startedAt,
                timedOut: true
            });
        }, timeoutMs);
        child.stdout?.on('data', (chunk: { toString(): string }) => {
            stdout += chunk.toString();
        });
        child.stderr?.on('data', (chunk: { toString(): string }) => {
            stderr += chunk.toString();
        });
        child.on('error', () => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            resolve({
                exitCode: undefined,
                output: `${stdout}\n${stderr}`.trim(),
                durationMs: Date.now() - startedAt,
                timedOut: false
            });
        });
        child.on('close', code => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            resolve({
                exitCode: typeof code === 'number' ? code : undefined,
                output: `${stdout}\n${stderr}`.trim(),
                durationMs: Date.now() - startedAt,
                timedOut: false
            });
        });
    });

/**
 * Resolve the nearest package.json directory for a file path, bounded by the
 * workspace root (never walks above it). Returns undefined when no
 * package.json exists on the path from the file up to the workspace.
 */
export function findPackageDirectory(filePath: string, workspace?: string): string | undefined {
    let dir = dirname(filePath);
    const stop = workspace ? dirname(workspace) : dirname(dir);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (existsSync(join(dir, 'package.json'))) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir || dir === stop || (workspace && !dir.startsWith(workspace))) {
            return undefined;
        }
        dir = parent;
    }
}

/** Detect the package manager preferred by the lockfile present in `pkgDir`. */
export function resolvePackageManager(pkgDir: string): string {
    if (existsSync(join(pkgDir, 'pnpm-lock.yaml'))) {
        return 'pnpm';
    }
    if (existsSync(join(pkgDir, 'yarn.lock'))) {
        return 'yarn';
    }
    if (existsSync(join(pkgDir, 'bun.lockb')) || existsSync(join(pkgDir, 'bun.lock'))) {
        return 'bun';
    }
    return 'npm';
}

/** Read the package.json scripts map of a package directory ({} on failure). */
export function readPackageScripts(pkgDir: string): Record<string, string> {
    try {
        const raw = readFileSync(join(pkgDir, 'package.json'), 'utf8');
        const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
        return parsed.scripts ?? {};
    } catch {
        return {};
    }
}

/** Split a shell-ish command string into [command, ...args] (whitespace-split, quotes respected). */
export function splitCommandTemplate(template: string): string[] {
    const parts = template.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    return parts.map(part => {
        if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
            return part.slice(1, -1);
        }
        return part;
    });
}

function truncateTail(output: string, maxChars: number): string {
    if (output.length <= maxChars) {
        return output;
    }
    return `...[${output.length - maxChars} chars trimmed]\n${output.slice(-maxChars)}`;
}

/**
 * P79: verification command runner. Stateless; call `run` per tool round with
 * the file paths edited in that round.
 */
export class VerifyCommandRunner {
    constructor(private readonly options?: VerifyCommandRunnerOptions) {
    }

    async run(filePaths: string[]): Promise<VerifyCommandRun[]> {
        const timeoutMs = this.options?.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
        const maxOutputChars = this.options?.maxOutputChars ?? DEFAULT_VERIFY_MAX_OUTPUT_CHARS;
        const autoScripts = this.options?.autoScripts ?? DEFAULT_VERIFY_AUTO_SCRIPTS;
        const runProcess = this.options?.runProcess ?? DEFAULT_RUNNER;
        const explicit = this.options?.verifyCommands ?? {};
        const env = this.options?.env;

        if (filePaths.length === 0) {
            return [];
        }

        const pkgDirs: string[] = [];
        const seenDirs = new Set<string>();
        for (const filePath of filePaths) {
            const pkgDir = findPackageDirectory(filePath, this.options?.workspace);
            if (pkgDir && !seenDirs.has(pkgDir)) {
                seenDirs.add(pkgDir);
                pkgDirs.push(pkgDir);
            }
        }
        if (pkgDirs.length === 0) {
            return [];
        }

        const runs: VerifyCommandRun[] = [];
        for (const pkgDir of pkgDirs) {
            const scripts = readPackageScripts(pkgDir);
            const manager = resolvePackageManager(pkgDir);
            const packageRuns: VerifyCommandRun[] = [];

            // explicit templates run verbatim whenever set
            for (const [kind, template] of Object.entries(explicit)) {
                if (typeof template !== 'string' || !template.trim()) {
                    continue;
                }
                const [command, ...args] = splitCommandTemplate(template.trim());
                if (!command) {
                    continue;
                }
                packageRuns.push(await this.runCommand({
                    kind,
                    command,
                    args,
                    cwd: pkgDir,
                    timeoutMs,
                    maxOutputChars,
                    env,
                    runProcess
                }));
            }

            // auto-discovered scripts present in package.json and allowed
            for (const scriptName of autoScripts) {
                if (explicit[scriptName] !== undefined) {
                    continue; // explicit template already covers this kind
                }
                if (typeof scripts[scriptName] !== 'string') {
                    continue; // absent script — silent degradation, never falsifies
                }
                packageRuns.push(await this.runCommand({
                    kind: scriptName,
                    script: scriptName,
                    command: manager,
                    args: ['run', scriptName],
                    cwd: pkgDir,
                    timeoutMs,
                    maxOutputChars,
                    env,
                    runProcess
                }));
            }

            runs.push(...packageRuns);
        }
        return runs;
    }

    private async runCommand(params: {
        kind: string;
        script?: string;
        command: string;
        args: string[];
        cwd: string;
        timeoutMs: number;
        maxOutputChars: number;
        env?: Record<string, string | undefined>;
        runProcess: NonNullable<VerifyCommandRunnerOptions['runProcess']>;
    }): Promise<VerifyCommandRun> {
        const display = `${params.command} ${params.args.join(' ')}`.trim();
        const result = await params.runProcess(params.command, params.args, params.cwd, params.timeoutMs, params.env);
        const output = truncateTail(result.output, params.maxOutputChars);
        const failed = result.timedOut || (result.exitCode !== undefined && result.exitCode !== 0);
        return {
            kind: params.kind,
            script: params.script,
            command: display,
            cwd: params.cwd,
            exitCode: result.exitCode,
            output,
            durationMs: result.durationMs,
            timedOut: result.timedOut,
            failed
        };
    }
}
