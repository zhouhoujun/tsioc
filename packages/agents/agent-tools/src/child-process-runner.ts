import { spawn } from 'child_process';

/** Cancellation wording shared by every tool that runs a child process. */
export const CANCELLED_MESSAGE = 'Command cancelled by the user.';

/** Grace period between SIGTERM and the SIGKILL escalation. */
const SIGTERM_GRACE_MS = 3000;
/** Final grace after SIGKILL before settling regardless of the child. */
const SIGKILL_SETTLE_GRACE_MS = 1000;

export interface ChildProcessRequest {
    /** Executable to run (or a full command line when `shell` is set). */
    command: string;
    /** Arguments; omitted when `shell` is set and `command` is a command line. */
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    /** Run through a shell, for tools that accept a raw command line. */
    shell?: boolean;
    /**
     * Text written to the child's stdin before it is closed. When omitted the
     * stdin pipe is left open, which is what an interactive command expects.
     */
    stdin?: string;
    /** Send SIGTERM after this long, then escalate to SIGKILL. */
    timeoutMs: number;
    /**
     * Cap on captured bytes per stream, mirroring `spawnSync`'s maxBuffer.
     * Exceeding it settles as `overflow` instead of growing without bound.
     */
    maxOutputChars?: number;
    /** The owning turn's signal: aborting stops the whole command tree. */
    signal?: AbortSignal | undefined;
}

/**
 * What the child did. The runner never rejects: each tool maps the outcome onto
 * its own result/error contract (`spawnSync` used to decide that internally).
 *
 * Every variant carries the captured output; `exitCode` is the child's code
 * (null when it died by signal) and `error` is set only for `kind: 'error'`.
 */
export type ChildProcessOutcome =
    | { kind: 'exit'; stdout: string; stderr: string; exitCode: number | null }
    | { kind: 'timeout'; stdout: string; stderr: string; exitCode: number | null }
    | { kind: 'cancelled'; stdout: string; stderr: string; exitCode: number | null }
    | { kind: 'overflow'; stdout: string; stderr: string; exitCode: number | null }
    | { kind: 'error'; stdout: string; stderr: string; exitCode: number | null; error: NodeJS.ErrnoException };

/**
 * Runs a child process without blocking the event loop.
 *
 * `spawnSync` blocked the whole loop for the duration of the command: during a
 * slow network operation the console could not render and neither Esc nor
 * timers ran. This runner spawns asynchronously, stops the process tree on
 * user interrupt (SIGTERM, then SIGKILL after a grace period) and always
 * settles, even when a child ignores SIGTERM or keeps its stdio pipes open.
 */
export function runChildProcess(request: ChildProcessRequest): Promise<ChildProcessOutcome> {
    // A dedicated process group lets a timeout/interrupt stop the whole
    // command tree: a command can fork children (or ignore SIGTERM) that keep
    // the stdio pipes open, so `close` would otherwise never fire.
    const detached = process.platform !== 'win32';
    return new Promise<ChildProcessOutcome>(resolve => {
        const child = spawn(request.command, request.args ?? [], {
            cwd: request.cwd,
            env: request.env,
            shell: request.shell,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached
        });

        let stdout = '';
        let stderr = '';
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let settled = false;
        let cancelled = false;
        let timedOut = false;
        let overflowed = false;
        let killTimer: NodeJS.Timeout | undefined;
        let forceTimer: NodeJS.Timeout | undefined;

        const signalTree = (signal: NodeJS.Signals) => {
            try {
                if (detached && child.pid) {
                    process.kill(-child.pid, signal);
                } else {
                    child.kill(signal);
                }
            } catch {
                try {
                    child.kill(signal);
                } catch {
                    // process already gone
                }
            }
        };
        const clearTimers = () => {
            clearTimeout(timer);
            if (killTimer) {
                clearTimeout(killTimer);
            }
            if (forceTimer) {
                clearTimeout(forceTimer);
            }
            request.signal?.removeEventListener('abort', onAbort);
        };
        const settle = (outcome: ChildProcessOutcome) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimers();
            resolve(outcome);
        };
        /** Settles a stopped child with whichever reason stopped it. */
        const settleStopped = () => {
            if (cancelled) {
                settle({ kind: 'cancelled', stdout, stderr, exitCode: null });
            } else if (timedOut) {
                settle({ kind: 'timeout', stdout, stderr, exitCode: null });
            } else if (overflowed) {
                settle({ kind: 'overflow', stdout, stderr, exitCode: null });
            }
        };
        /**
         * SIGTERM the tree, escalate to SIGKILL after a grace period, and settle
         * no matter what: the tool must never hang past the stop it requested.
         * Settlement waits for the child so no orphaned process keeps running.
         */
        const stopTree = () => {
            signalTree('SIGTERM');
            killTimer = setTimeout(() => {
                signalTree('SIGKILL');
                forceTimer = setTimeout(settleStopped, SIGKILL_SETTLE_GRACE_MS);
            }, SIGTERM_GRACE_MS);
        };
        const onAbort = () => {
            if (settled || cancelled || timedOut) {
                return;
            }
            cancelled = true;
            stopTree();
        };
        const timer = setTimeout(() => {
            if (settled || timedOut || cancelled) {
                return;
            }
            timedOut = true;
            stopTree();
        }, request.timeoutMs);
        request.signal?.addEventListener('abort', onAbort, { once: true });
        // The signal can fire between the caller's pre-check and this
        // registration above; without this the interrupt would be lost.
        if (request.signal?.aborted) {
            onAbort();
        }

        const collect = (target: 'stdout' | 'stderr', chunk: string, bytes: number) => {
            if (settled || overflowed) {
                return;
            }
            const cap = request.maxOutputChars;
            const nextBytes = (target === 'stdout' ? stdoutBytes : stderrBytes) + bytes;
            if (cap !== undefined && nextBytes > cap) {
                overflowed = true;
                stopTree();
                return;
            }
            if (target === 'stdout') {
                stdout += chunk;
                stdoutBytes = nextBytes;
            } else {
                stderr += chunk;
                stderrBytes = nextBytes;
            }
        };
        // Decode once, so a multi-byte character split across chunks is not
        // turned into a replacement character.
        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');
        child.stdout?.on('data', (chunk: string) => collect('stdout', chunk, Buffer.byteLength(chunk)));
        child.stderr?.on('data', (chunk: string) => collect('stderr', chunk, Buffer.byteLength(chunk)));
        // A command may exit before reading its stdin; a broken pipe on our side
        // is not a command failure.
        child.stdin?.on('error', () => undefined);
        if (request.stdin !== undefined) {
            child.stdin?.end(request.stdin);
        }

        child.on('close', (code: number | null) => {
            if (cancelled || timedOut || overflowed) {
                settleStopped();
                return;
            }
            settle({ kind: 'exit', stdout, stderr, exitCode: typeof code === 'number' ? code : null });
        });
        child.on('error', (error: NodeJS.ErrnoException) => {
            settle({ kind: 'error', error, stdout, stderr, exitCode: null });
        });
    });
}
