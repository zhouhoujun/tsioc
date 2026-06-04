import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { ProcessRegistry } from './ProcessRegistry';

const DEFAULT_MAX_OUTPUT_CHARS = 16 * 1024;
const DEFAULT_MAX_PROCESSES_PER_SESSION = 4;

@Injectable()
export class ProcessStartTool implements AgentTool {
    name = 'process.start';
    description = 'Start a background process inside the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            command: { type: 'string' },
            workdir: { type: 'string' },
            maxOutputChars: { type: 'number' }
        },
        required: ['command']
    };
    toolset = 'process';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowAnonymous: true }
    };

    constructor(
        private processes: ProcessRegistry,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null }) private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const command = this.requireCommand(input?.command);
        this.processes.assertSessionCapacity(context.sessionId, this.resolveMaxProcessesPerSession());
        const cwd = await this.resolveCwd(input?.workdir);
        const maxOutputChars = this.resolveMaxOutputChars(input?.maxOutputChars);
        const record = this.processes.start(context.sessionId, randomUUID(), command, cwd, maxOutputChars);
        return {
            process: record
        };
    }

    private requireCommand(command: unknown): string {
        if (typeof command !== 'string' || !command.trim()) {
            throw new Error('Invalid process.start input: command must be a non-empty string.');
        }
        return command;
    }

    private async resolveCwd(workdir: unknown): Promise<string> {
        const policy = resolveFilePolicy(this.options);
        if (typeof workdir !== 'string' || !workdir.trim()) {
            return policy.rootDir;
        }
        const cwd = resolveWorkspacePath(workdir, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(cwd, policy.rootDir);
        const stat = await fs.stat(cwd);
        if (!stat.isDirectory()) {
            throw new Error(`Process workdir '${workdir}' is not a directory.`);
        }
        return cwd;
    }

    private resolveMaxProcessesPerSession(): number {
        const limit = this.options?.process?.maxProcessesPerSession;
        if (limit == null) {
            return DEFAULT_MAX_PROCESSES_PER_SESSION;
        }
        if (!Number.isInteger(limit) || limit < 1) {
            throw new Error('Invalid process tool configuration: maxProcessesPerSession must be an integer >= 1.');
        }
        return limit;
    }

    private resolveMaxOutputChars(value: unknown): number {
        if (value == null) {
            return this.options?.process?.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
        }
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 256) {
            throw new Error('Invalid process.start input: maxOutputChars must be a number >= 256 when provided.');
        }
        return Math.floor(value);
    }
}
