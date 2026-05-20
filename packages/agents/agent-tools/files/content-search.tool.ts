import * as path from 'path';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import globby = require('globby');
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class ContentSearchTool implements AgentTool {
    name = 'content_search';
    description = 'Search file contents within the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            glob: { type: 'string' }
        },
        required: ['query']
    };
    toolset = 'search';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!input || typeof input.query !== 'string' || !input.query.trim()) {
            throw new Error('Invalid content_search input: query must be a non-empty string.');
        }
        const policy = resolveFilePolicy(this.options);
        const patterns = typeof input.glob === 'string' && input.glob.trim() ? [input.glob] : policy.defaultGlob;
        patterns.forEach(pattern => this.assertWorkspacePattern(pattern));
        const files = await globby(patterns, {
            cwd: policy.rootDir,
            absolute: true,
            onlyFiles: true,
            ignore: policy.excludedGlobs
        });
        const query = input.query;
        const matches: Array<{ path: string; line: number; column: number; preview: string }> = [];
        for (const file of files) {
            if (matches.length >= policy.maxSearchResults) {
                break;
            }
            await assertNoSymlinkInWorkspacePath(file, policy.rootDir);
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split(/\r?\n/);
            for (let index = 0; index < lines.length; index++) {
                const column = lines[index].indexOf(query);
                if (column >= 0) {
                    matches.push({
                        path: toRelativeWorkspacePath(file, policy.rootDir),
                        line: index + 1,
                        column: column + 1,
                        preview: lines[index].slice(0, 200)
                    });
                }
                if (matches.length >= policy.maxSearchResults) {
                    break;
                }
            }
        }
        return { matches };
    }

    private assertWorkspacePattern(pattern: string): void {
        const trimmed = pattern.trim();
        if (path.isAbsolute(trimmed) || trimmed.split(/[\\/]+/).includes('..')) {
            throw new Error('Invalid content_search input: glob must stay within the workspace root.');
        }
    }
}
