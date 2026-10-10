import * as path from 'path';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import globby = require('globby');
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspaceSubdir, toRelativeWorkspacePath } from './path-policy';

/** Skip files larger than this so a single huge/binary file cannot stall or OOM a search. */
const MAX_CONTENT_SEARCH_FILE_BYTES = 10 * 1024 * 1024;
/** Bytes inspected for NUL markers when deciding whether a file is binary. */
const BINARY_SNIFF_BYTES = 8192;

@Injectable()
export class ContentSearchTool implements AgentTool {
    name = 'content_search';
    description = 'Search file contents within the configured workspace. Supports plain substring or regular-expression queries. Binary files (NUL bytes) and files larger than 10MB are skipped. When the result cap is reached, the response sets `truncated: true`.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            glob: { type: 'string' },
            path: { type: 'string', description: 'Workspace-relative directory to search in (default: workspace root).' },
            regex: { type: 'boolean', description: 'Treat query as a regular expression (default false).' },
            caseSensitive: { type: 'boolean', description: 'Case-sensitive matching (default true).' }
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
        const subdir = resolveWorkspaceSubdir(input.path, policy.rootDir);
        const basePatterns = typeof input.glob === 'string' && input.glob.trim() ? [input.glob] : policy.defaultGlob;
        const patterns = basePatterns.map(pattern => subdir ? `${subdir}/${pattern}` : pattern);
        patterns.forEach(pattern => this.assertWorkspacePattern(pattern));
        const files = await globby(patterns, {
            cwd: policy.rootDir,
            absolute: true,
            onlyFiles: true,
            ignore: policy.excludedGlobs
        });
        const query = input.query;
        const caseSensitive = input.caseSensitive !== false;
        const matcher = this.compileMatcher(input, caseSensitive);
        const needle = caseSensitive ? query : query.toLowerCase();
        const cap = policy.maxSearchResults;
        const matches: Array<{ path: string; line: number; column: number; preview: string }> = [];
        let truncated = false;
        search: for (const file of files) {
            await assertNoSymlinkInWorkspacePath(file, policy.rootDir);
            const stat = await fs.stat(file).catch(() => null);
            if (!stat || !stat.isFile() || stat.size > MAX_CONTENT_SEARCH_FILE_BYTES) {
                continue;
            }
            const buffer = await fs.readFile(file);
            if (this.looksBinary(buffer)) {
                continue;
            }
            const lines = buffer.toString('utf8').split(/\r?\n/);
            for (let index = 0; index < lines.length; index++) {
                const column = matcher
                    ? this.matchColumn(matcher, lines[index])
                    : (caseSensitive ? lines[index] : lines[index].toLowerCase()).indexOf(needle);
                if (column < 0) {
                    continue;
                }
                if (matches.length >= cap) {
                    // One more hit past the cap proves the result set was cut off.
                    truncated = true;
                    break search;
                }
                matches.push({
                    path: toRelativeWorkspacePath(file, policy.rootDir),
                    line: index + 1,
                    column: column + 1,
                    preview: lines[index].slice(0, 200)
                });
            }
        }
        return { matches, ...(truncated ? { truncated: true } : {}) };
    }

    /** First match column for a stateful regex, resetting lastIndex so anchors behave per-line. */
    private matchColumn(matcher: RegExp, line: string): number {
        matcher.lastIndex = 0;
        return matcher.exec(line)?.index ?? -1;
    }

    private looksBinary(buffer: Buffer): boolean {
        const limit = Math.min(buffer.length, BINARY_SNIFF_BYTES);
        for (let index = 0; index < limit; index++) {
            if (buffer[index] === 0) {
                return true;
            }
        }
        return false;
    }

    private compileMatcher(input: any, caseSensitive: boolean): RegExp | null {
        if (input?.regex !== true) {
            return null;
        }
        try {
            return new RegExp(input.query, caseSensitive ? '' : 'i');
        } catch (error: any) {
            throw new Error(`Invalid content_search input: query is not a valid regular expression (${error?.message || error}).`);
        }
    }

    private assertWorkspacePattern(pattern: string): void {
        const trimmed = pattern.trim();
        if (path.isAbsolute(trimmed) || trimmed.split(/[\\/]+/).includes('..')) {
            throw new Error('Invalid content_search input: glob must stay within the workspace root.');
        }
    }
}
