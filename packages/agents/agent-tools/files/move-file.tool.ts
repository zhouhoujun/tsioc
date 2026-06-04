import * as path from 'path';
import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class MoveFileTool implements AgentTool {
    name = 'move_file';
    description = 'Move or rename a file inside the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            overwrite: { type: 'boolean' }
        },
        required: ['from', 'to']
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

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const from = this.requirePath(input?.from, 'from');
        const to = this.requirePath(input?.to, 'to');
        const overwrite = input?.overwrite === true;
        const policy = resolveFilePolicy(this.options);
        const fromPath = resolveWorkspacePath(from, policy.rootDir);
        const toPath = resolveWorkspacePath(to, policy.rootDir);
        if (fromPath === toPath) {
            throw new Error('Invalid move_file input: from and to must be different paths.');
        }
        await assertNoSymlinkInWorkspacePath(fromPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(toPath, policy.rootDir, { allowMissingPath: true });

        const sourceStat = await fs.lstat(fromPath);
        if (!sourceStat.isFile()) {
            throw new Error(`Cannot move '${from}': source must be a regular file.`);
        }

        const destinationExists = await this.exists(toPath);
        if (destinationExists && !overwrite) {
            throw new Error(`Cannot move to '${to}': destination already exists.`);
        }
        if (destinationExists) {
            const destinationStat = await fs.lstat(toPath);
            if (!destinationStat.isFile()) {
                throw new Error(`Cannot move to '${to}': destination must be a regular file.`);
            }
            await fs.unlink(toPath);
        }

        await fs.mkdir(path.dirname(toPath), { recursive: true });
        await fs.rename(fromPath, toPath);

        return {
            from: toRelativeWorkspacePath(fromPath, policy.rootDir),
            to: toRelativeWorkspacePath(toPath, policy.rootDir),
            overwritten: destinationExists
        };
    }

    private requirePath(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid move_file input: ${field} must be a non-empty string.`);
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
