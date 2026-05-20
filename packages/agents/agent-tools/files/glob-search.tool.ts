import * as path from 'path';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import globby = require('globby');
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class GlobSearchTool implements AgentTool {
    name = 'glob_search';
    description = 'Search for files within the configured workspace using glob patterns.';
    inputSchema = {
        type: 'object',
        properties: {
            pattern: { type: 'string' }
        },
        required: ['pattern']
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
        if (!input || typeof input.pattern !== 'string' || !input.pattern.trim()) {
            throw new Error('Invalid glob_search input: pattern must be a non-empty string.');
        }
        this.assertWorkspacePattern(input.pattern);
        const policy = resolveFilePolicy(this.options);
        const matches = await globby(input.pattern, {
            cwd: policy.rootDir,
            absolute: true,
            onlyFiles: true,
            ignore: policy.excludedGlobs
        });
        const safeMatches: string[] = [];
        for (const file of matches) {
            await assertNoSymlinkInWorkspacePath(file, policy.rootDir);
            safeMatches.push(toRelativeWorkspacePath(file, policy.rootDir));
            if (safeMatches.length >= policy.maxSearchResults) {
                break;
            }
        }
        return {
            matches: safeMatches
        };
    }

    private assertWorkspacePattern(pattern: string): void {
        const trimmed = pattern.trim();
        if (path.isAbsolute(trimmed) || trimmed.split(/[\\/]+/).includes('..')) {
            throw new Error('Invalid glob_search input: pattern must stay within the workspace root.');
        }
    }
}
