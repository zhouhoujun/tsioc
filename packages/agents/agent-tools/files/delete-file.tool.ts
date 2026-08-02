import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';
import { readFileSnapshot } from './snapshot';

@Injectable()
export class DeleteFileTool implements AgentTool {
    name = 'delete_file';
    description = 'Delete a file inside the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            confirm: { type: 'boolean' }
        },
        required: ['path', 'confirm']
    };
    toolset = 'filesystem';
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

    async captureFileSnapshot(input: any, _context?: AgentToolContext): Promise<any> {
        try {
            const requestedPath = this.requirePath(input?.path);
            const policy = resolveFilePolicy(this.options);
            const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
            return await readFileSnapshot(absolutePath);
        } catch {
            return null;
        }
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.requirePath(input?.path);
        if (input?.confirm !== true) {
            throw new Error('Invalid delete_file input: confirm must be true.');
        }
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);

        const stat = await fs.lstat(absolutePath);
        if (!stat.isFile()) {
            throw new Error(`Cannot delete '${requestedPath}': path must be a regular file.`);
        }

        await fs.unlink(absolutePath);
        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            deleted: true
        };
    }

    private requirePath(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid delete_file input: path must be a non-empty string.');
        }
        return value;
    }
}
