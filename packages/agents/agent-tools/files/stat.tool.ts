import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class StatTool implements AgentTool {
    name = 'stat';
    description = 'Read metadata for a workspace file or directory.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' }
        },
        required: ['path']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.requirePath(input?.path);
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        // A missing path is a normal inspection outcome, not an error: report
        // it as `exists: false` instead of leaking a raw ENOENT so the agent
        // can continue without a failed tool round.
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir, { allowMissingPath: true });
        let stat: Awaited<ReturnType<typeof fs.lstat>>;
        try {
            stat = await fs.lstat(absolutePath);
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return {
                    path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
                    exists: false
                };
            }
            throw error;
        }

        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            exists: true,
            type: this.resolveType(stat),
            size: stat.size,
            ctime: stat.ctimeMs,
            mtime: stat.mtimeMs,
            atime: stat.atimeMs
        };
    }

    private requirePath(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid stat input: path must be a non-empty string.');
        }
        return value;
    }

    private resolveType(stat: Awaited<ReturnType<typeof fs.lstat>>): string {
        if (stat.isDirectory()) {
            return 'directory';
        }
        if (stat.isFile()) {
            return 'file';
        }
        if (stat.isSymbolicLink()) {
            return 'symlink';
        }
        return 'other';
    }
}
