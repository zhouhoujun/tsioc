import * as path from 'path';
import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class ListDirTool implements AgentTool {
    name = 'list_dir';
    description = 'List direct entries in a workspace directory.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Workspace-relative directory to list (default: workspace root).' },
            limit: { type: 'number' },
            includeHidden: { type: 'boolean' }
        }
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
        const includeHidden = input?.includeHidden === true;
        const policy = resolveFilePolicy(this.options);
        const limit = this.resolveLimit(input?.limit, policy.maxSearchResults);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);

        const stat = await fs.stat(absolutePath);
        if (!stat.isDirectory()) {
            throw new Error(`Invalid list_dir input: '${requestedPath}' must be a directory.`);
        }

        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        const filteredEntries = entries
            .filter(entry => includeHidden || !entry.name.startsWith('.'))
            .sort((left, right) => left.name.localeCompare(right.name));
        const visibleEntries = filteredEntries.slice(0, limit);

        const items = await Promise.all(visibleEntries.map(async entry => {
            const entryPath = path.join(absolutePath, entry.name);
            // lstat (never stat) so a symlinked child is reported, not traversed. Do not re-add
            // assertNoSymlinkInWorkspacePath here: it aborts the whole listing on any symlinked entry.
            const entryStat = await fs.lstat(entryPath);
            return {
                name: entry.name,
                path: toRelativeWorkspacePath(entryPath, policy.rootDir),
                kind: this.resolveKind(entryStat),
                size: entryStat.size,
                mtime: entryStat.mtimeMs
            };
        }));

        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            entries: items,
            truncated: filteredEntries.length > items.length
        };
    }

    private requirePath(value: unknown): string {
        return typeof value === 'string' && value.trim() ? value.trim() : '.';
    }

    private resolveLimit(value: unknown, fallback: number): number {
        if (value == null) {
            return fallback;
        }
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
            throw new Error('Invalid list_dir input: limit must be a positive integer.');
        }
        return Math.min(value, fallback);
    }

    private resolveKind(stat: Awaited<ReturnType<typeof fs.lstat>>): string {
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
