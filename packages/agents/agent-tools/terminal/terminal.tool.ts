import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';
import { assertSandboxCommand, buildSandboxEnv, resolveSandboxPolicy } from '../src/sandbox-policy';

const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_MAX_TIMEOUT_MS = 600000;
/** Grace period between SIGTERM and the SIGKILL escalation on timeout. */
const SIGTERM_GRACE_MS = 3000;
/** Final grace after SIGKILL before the tool settles regardless of the child. */
const SIGKILL_SETTLE_GRACE_MS = 1000;

@Injectable()
export class TerminalTool implements AgentTool {
    name = 'terminal';
    description = 'Execute a foreground shell command inside the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            command: { type: 'string' },
            workdir: { type: 'string' },
            timeoutMs: { type: 'number' }
        },
        required: ['command']
    };
    toolset = 'terminal';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const command = this.requireCommand(input?.command);
        assertSandboxCommand(command, resolveSandboxPolicy(this.options), this.name);
        const timeoutMs = this.resolveTimeout(input?.timeoutMs);
        const cwd = await this.resolveCwd(input?.workdir);
        const result = await this.exec(command, cwd, timeoutMs);
        return {
            ...result,
            cwd
        };
    }

    private requireCommand(command: unknown): string {
        if (typeof command !== 'string' || !command.trim()) {
            throw new Error('Invalid terminal input: command must be a non-empty string.');
        }
        return command;
    }

    private resolveTimeout(inputTimeout: unknown): number {
        const configured = (this.options as any)?.terminal ?? {};
        const maxTimeoutMs = configured.maxTimeoutMs ?? DEFAULT_MAX_TIMEOUT_MS;
        const timeoutMs = typeof inputTimeout === 'number'
            ? inputTimeout
            : configured.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
        if (timeoutMs <= 0 || timeoutMs > maxTimeoutMs) {
            throw new Error(`Invalid terminal timeout: timeout must be between 1 and ${maxTimeoutMs} ms.`);
        }
        return timeoutMs;
    }

    private async resolveCwd(workdir: unknown): Promise<string> {
        const policy = resolveFilePolicy(this.options);
        if (typeof workdir !== 'string' || !workdir.trim()) {
            return policy.rootDir;
        }
        const cwd = resolveWorkspacePath(workdir, policy.rootDir);
        const stat = await fs.stat(cwd);
        if (!stat.isDirectory()) {
            throw new Error(`Terminal workdir '${workdir}' is not a directory.`);
        }
        return cwd;
    }

    private async exec(command: string, cwd: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean; }> {
        const sandbox = resolveSandboxPolicy(this.options);
        return new Promise((resolve, reject) => {
            // A dedicated process group lets the timeout kill the whole command
            // tree. A shell command can fork children (or ignore SIGTERM) that
            // keep the stdio pipe open, so `close` would otherwise never fire and
            // the tool would outlive its timeout indefinitely.
            const detached = process.platform !== 'win32';
            const child = spawn(command, {
                cwd,
                shell: true,
                env: buildSandboxEnv(process.env, sandbox),
                detached
            });
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let settled = false;
            let killTimer: NodeJS.Timeout | undefined;
            let forceTimer: NodeJS.Timeout | undefined;
            const clearTimers = () => {
                clearTimeout(timer);
                if (killTimer) {
                    clearTimeout(killTimer);
                }
                if (forceTimer) {
                    clearTimeout(forceTimer);
                }
            };
            const finish = (result: { stdout: string; stderr: string; exitCode: number; timedOut: boolean; }) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimers();
                resolve(result);
            };
            const fail = (error: Error) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimers();
                reject(error);
            };
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
            const timer = setTimeout(() => {
                timedOut = true;
                signalTree('SIGTERM');
                // SIGTERM is ignorable; escalate to SIGKILL, then settle no matter
                // what so the tool can never hang past its timeout.
                killTimer = setTimeout(() => {
                    signalTree('SIGKILL');
                    forceTimer = setTimeout(() => {
                        finish({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 124, timedOut: true });
                    }, SIGKILL_SETTLE_GRACE_MS);
                }, SIGTERM_GRACE_MS);
            }, timeoutMs);
            child.stdout?.on('data', chunk => {
                stdout += String(chunk);
            });
            child.stderr?.on('data', chunk => {
                stderr += String(chunk);
            });
            child.on('error', error => {
                fail(error);
            });
            child.on('close', code => {
                finish({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: timedOut ? 124 : (code ?? 0),
                    timedOut
                });
            });
        });
    }
}
