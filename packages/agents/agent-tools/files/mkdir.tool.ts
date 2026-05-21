import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class MkdirTool implements AgentTool {
    name = 'mkdir';
    description = 'Create a directory inside the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            recursive: { type: 'boolean' }
        },
        required: ['path']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.requirePath(input?.path);
        const recursive = input?.recursive !== false;
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir, { allowMissingPath: true });

        const existed = await this.exists(absolutePath);
        if (existed) {
            const stat = await fs.lstat(absolutePath);
            if (!stat.isDirectory()) {
                throw new Error(`Cannot create directory '${requestedPath}': path already exists and is not a directory.`);
            }
        }

        await fs.mkdir(absolutePath, { recursive });

        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            created: !existed,
            recursive
        };
    }

    private requirePath(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid mkdir input: path must be a non-empty string.');
        }
        return value;
    }

    private async exists(targetPath: string): Promise<boolean> {
        try {
            await fs.lstat(targetPath);
            return true;
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }
}
