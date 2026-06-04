import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';

const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_MAX_TIMEOUT_MS = 600000;

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
        return new Promise((resolve, reject) => {
            const child = spawn(command, {
                cwd,
                shell: true,
                env: process.env
            });
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const timer = setTimeout(() => {
                timedOut = true;
                child.kill('SIGTERM');
            }, timeoutMs);
            child.stdout?.on('data', chunk => {
                stdout += String(chunk);
            });
            child.stderr?.on('data', chunk => {
                stderr += String(chunk);
            });
            child.on('error', error => {
                clearTimeout(timer);
                reject(error);
            });
            child.on('close', code => {
                clearTimeout(timer);
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: timedOut ? 124 : (code ?? 0),
                    timedOut
                });
            });
        });
    }
}
