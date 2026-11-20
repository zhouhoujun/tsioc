import { FileAdapter, FileDirectoryEntry } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

export interface AgentConsoleWorkspaceSuggestion {
    label: string;
    value: string;
    description?: string;
}

export interface AgentConsoleMentionCatalogItem {
    kind: 'skill' | 'plugin';
    id: string;
    title?: string;
    description?: string;
    scope?: string;
}

export interface AgentConsoleWorkspaceMentionResolver {
    resolveSuggestions(workspace: string, activeToken: string, limit?: number, catalog?: AgentConsoleMentionCatalogItem[]): Promise<AgentConsoleWorkspaceSuggestion[]>;
    resolveContext(workspace: string, mentionName: string, catalog?: AgentConsoleMentionCatalogItem[]): Promise<string[]>;
}

const WORKSPACE_SUGGESTION_LIMIT = 12;
/** Upper bound for `@file#Lx-Ly` context so one mention cannot flood a prompt. */
export const AGENT_CONSOLE_MENTION_RANGE_MAX_LINES = 400;
const WORKSPACE_SCAN_LIMIT = 2000;
const WORKSPACE_SCAN_DEPTH = 6;
const WORKSPACE_IGNORED_DIRECTORIES = new Set([
    '.git',
    // The agent's own storage/spill directory (tool output, cache) must never
    // be offered as a workspace mention.
    '.tsdi-agent',
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    '.turbo'
]);

export interface AgentConsoleMentionRange {
    path: string;
    start: number;
    end: number;
}

/**
 * Parse opencode-style line ranges: `file.ts#L20-L45`, `file.ts#20-45` or a
 * single line `file.ts#L20`. Missing/invalid ranges leave the mention as a path.
 */
export function parseAgentConsoleMentionRange(mention: string): AgentConsoleMentionRange | undefined {
    const match = String(mention || '').match(/^(.*?)#L?(\d+)(?:-L?(\d+))?$/);
    if (!match) {
        return undefined;
    }
    const start = Number(match[2]);
    const end = match[3] ? Number(match[3]) : start;
    if (!Number.isFinite(start) || start < 1 || !Number.isFinite(end)) {
        return undefined;
    }
    return { path: match[1], start, end: Math.max(start, end) };
}

interface WorkspaceTarget {
    absolutePath: string;
    relativePath: string;
}

@Injectable()
export class AgentConsoleWorkspaceMentionsProvider implements AgentConsoleWorkspaceMentionResolver {
    constructor(
        @Optional() private fileAdapter?: FileAdapter | null
    ) {
    }

    async resolveSuggestions(
        workspace: string,
        activeToken: string,
        limit = WORKSPACE_SUGGESTION_LIMIT,
        catalog: AgentConsoleMentionCatalogItem[] = []
    ): Promise<AgentConsoleWorkspaceSuggestion[]> {
        const catalogSuggestions = this.resolveCatalogSuggestions(activeToken, catalog);
        if (/^@(skill|plugin):/i.test(activeToken)) {
            return catalogSuggestions.slice(0, limit);
        }
        // A trailing `#Lx-Ly` belongs to the selected file, not its name.
        const query = this.normalizeWorkspaceQuery(activeToken).replace(/#L?\d+(?:-L?\d+)?$/, '');
        if (!workspace || !this.fileAdapter) {
            return catalogSuggestions.slice(0, limit);
        }
        const lastSlashIndex = query.lastIndexOf('/');
        const basePath = lastSlashIndex >= 0 ? query.slice(0, lastSlashIndex) : '';
        const fragment = lastSlashIndex >= 0 ? query.slice(lastSlashIndex + 1) : query;
        const directSuggestions = await this.listDirectorySuggestions(workspace, basePath, fragment, limit);
        const known = new Set(directSuggestions.map(item => item.value));

        if (!query) {
            return [...catalogSuggestions, ...directSuggestions].slice(0, limit);
        }

        if (lastSlashIndex >= 0) {
            if (directSuggestions.length >= limit) {
                return [...catalogSuggestions, ...directSuggestions].slice(0, limit);
            }
            return [
                ...catalogSuggestions,
                ...directSuggestions,
                ...(await this.listNestedDirectorySuggestions(
                    workspace,
                    basePath,
                    fragment,
                    Math.max(0, limit - directSuggestions.length),
                    known
                ))
            ].slice(0, limit);
        }

        if (directSuggestions.length >= limit) {
            return [...catalogSuggestions, ...directSuggestions].slice(0, limit);
        }

        return [
            ...catalogSuggestions,
            ...directSuggestions,
            ...(await this.walkWorkspaceSuggestions(
                workspace,
                query,
                Math.max(0, limit - directSuggestions.length),
                known
            ))
        ].slice(0, limit);
    }

    async resolveContext(workspace: string, mentionName: string, catalog: AgentConsoleMentionCatalogItem[] = []): Promise<string[]> {
        const catalogMatch = mentionName.match(/^(skill|plugin):(.+)$/i);
        if (catalogMatch) {
            const kind = catalogMatch[1].toLowerCase() as 'skill' | 'plugin';
            const id = catalogMatch[2];
            const item = catalog.find(candidate => candidate.kind === kind && candidate.id === id);
            if (!item) return [];
            return kind === 'skill'
                ? [`Activate skill '${item.id}'${item.description ? `: ${item.description}` : '.'}`]
                : [`Plugin scope '${item.id}'${item.scope ? ` (${item.scope})` : ''}${item.description ? `: ${item.description}` : '.'}`];
        }
        if (!workspace || !this.fileAdapter) {
            return [];
        }
        const range = parseAgentConsoleMentionRange(mentionName);
        const target = this.resolveWorkspaceTarget(workspace, range?.path ?? mentionName, true);
        if (!target) {
            return [];
        }
        const stats = await this.fileAdapter.stat(target.absolutePath);
        if (!stats) {
            return [];
        }
        if (stats.isDirectory()) {
            const entries = await this.readDirectoryEntries(target.absolutePath);
            const basePath = target.relativePath ? `${target.relativePath}/` : '';
            return [
                `${target.relativePath || '.'}/`,
                ...(entries.slice(0, 20).map(entry => `${basePath}${entry.name}${entry.kind === 'directory' ? '/' : ''}`))
            ];
        }
        if (stats.isFile()) {
            if (!range) {
                return [target.relativePath];
            }
            const lines = (await this.fileAdapter.readText(target.absolutePath)).split(/\r?\n/);
            if (range.start > lines.length) {
                // A range beyond EOF keeps the mention usable as a path hint.
                return [target.relativePath];
            }
            const start = range.start;
            const end = Math.min(range.end, start + AGENT_CONSOLE_MENTION_RANGE_MAX_LINES - 1, lines.length);
            const width = String(end).length;
            return [
                `${target.relativePath} (lines ${start}-${end}):`,
                ...lines.slice(start - 1, end).map((line, index) => `${String(start + index).padStart(width, ' ')} | ${line}`)
            ];
        }
        return [];
    }

    protected resolveCatalogSuggestions(activeToken: string, catalog: AgentConsoleMentionCatalogItem[]): AgentConsoleWorkspaceSuggestion[] {
        const token = String(activeToken || '').toLowerCase();
        return catalog
            .filter(item => `@${item.kind}:${item.id}`.toLowerCase().startsWith(token))
            .sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id))
            .map(item => ({
                label: item.title || item.id,
                value: `@${item.kind}:${item.id}`,
                description: `${item.kind === 'skill' ? 'Skill' : 'Plugin'}${item.scope ? ` / ${item.scope}` : ''}${item.description ? ` / ${item.description}` : ''}`
            }));
    }

    protected normalizeWorkspaceQuery(tokenOrMention: string): string {
        return String(tokenOrMention || '')
            .trim()
            .replace(/^@+/, '')
            .replace(/^"/, '')
            .replace(/"$/, '')
            .replace(/\\/g, '/')
            .replace(/^\.\//, '')
            .replace(/^\/+/, '');
    }

    protected resolveWorkspaceTarget(workspace: string, tokenOrMention: string, trimTrailingSlash = false): WorkspaceTarget | undefined {
        if (!workspace || !this.fileAdapter) {
            return undefined;
        }
        let relativePath = this.normalizeWorkspaceQuery(tokenOrMention);
        if (trimTrailingSlash) {
            relativePath = relativePath.replace(/\/+$/, '');
        }
        if (!this.isSafeRelativePath(relativePath)) {
            return undefined;
        }
        const cleanedSegments = relativePath
            .split('/')
            .filter(Boolean);
        const normalizedRelativePath = cleanedSegments.join('/');
        return {
            absolutePath: this.fileAdapter.resolve(workspace, ...cleanedSegments),
            relativePath: normalizedRelativePath
        };
    }

    protected isSafeRelativePath(relativePath: string): boolean {
        if (!relativePath) {
            return true;
        }
        if (/^[a-zA-Z]+:/.test(relativePath)) {
            return false;
        }
        const segments = relativePath.split('/');
        return !segments.some(segment => segment === '..');
    }

    protected async readDirectoryEntries(directoryPath: string): Promise<FileDirectoryEntry[]> {
        if (!this.fileAdapter) {
            return [];
        }
        const entries = await this.fileAdapter.list(directoryPath);
        return entries
            .filter(entry => entry.kind !== 'directory' || !WORKSPACE_IGNORED_DIRECTORIES.has(entry.name))
            .slice()
            .sort((left, right) => {
                if ((left.kind === 'directory') !== (right.kind === 'directory')) {
                    return left.kind === 'directory' ? -1 : 1;
                }
                return left.name.localeCompare(right.name);
            });
    }

    protected buildSuggestionValue(basePath: string, entry: FileDirectoryEntry): string {
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        return `@${relativePath}${entry.kind === 'directory' ? '/' : ''}`;
    }

    protected matchesWorkspaceQuery(entryName: string, relativePath: string, queryLower: string): boolean {
        if (!queryLower) {
            return true;
        }
        const nameLower = entryName.toLowerCase();
        const pathLower = relativePath.toLowerCase();
        return nameLower.startsWith(queryLower)
            || nameLower.includes(queryLower)
            || pathLower.startsWith(queryLower)
            || pathLower.includes(queryLower);
    }

    protected async listDirectorySuggestions(
        workspace: string,
        basePath: string,
        fragment: string,
        limit: number
    ): Promise<AgentConsoleWorkspaceSuggestion[]> {
        const target = this.resolveWorkspaceTarget(workspace, basePath);
        if (!target) {
            return [];
        }
        const fragmentLower = fragment.toLowerCase();
        const entries = await this.readDirectoryEntries(target.absolutePath);
        return entries
            .filter(entry => this.matchesWorkspaceQuery(entry.name, target.relativePath ? `${target.relativePath}/${entry.name}` : entry.name, fragmentLower))
            .slice(0, limit)
            .map(entry => ({
                label: this.buildSuggestionValue(target.relativePath, entry),
                value: this.buildSuggestionValue(target.relativePath, entry),
                description: entry.kind === 'directory' ? 'folder' : entry.kind
            }));
    }

    protected matchesWorkspacePathSuffix(relativePath: string, queryPath: string): boolean {
        const normalizedRelativePath = String(relativePath || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        const normalizedQueryPath = String(queryPath || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (!normalizedQueryPath) {
            return false;
        }
        const relativeSegments = normalizedRelativePath
            .split('/')
            .filter(Boolean)
            .map(segment => segment.toLowerCase());
        const querySegments = normalizedQueryPath
            .split('/')
            .filter(Boolean)
            .map(segment => segment.toLowerCase());
        if (!relativeSegments.length || !querySegments.length || querySegments.length > relativeSegments.length) {
            return false;
        }
        for (let index = 1; index <= querySegments.length; index++) {
            const candidateSegment = relativeSegments[relativeSegments.length - index];
            const querySegment = querySegments[querySegments.length - index];
            if (!candidateSegment.startsWith(querySegment)) {
                return false;
            }
        }
        return true;
    }

    protected async listNestedDirectorySuggestions(
        workspace: string,
        basePath: string,
        fragment: string,
        limit: number,
        existing = new Set<string>()
    ): Promise<AgentConsoleWorkspaceSuggestion[]> {
        if (!basePath || limit <= 0) {
            return [];
        }
        const rootTarget = this.resolveWorkspaceTarget(workspace, '');
        if (!rootTarget) {
            return [];
        }
        const queue: Array<{ absolutePath: string; relativePath: string; depth: number }> = [{
            absolutePath: rootTarget.absolutePath,
            relativePath: '',
            depth: 0
        }];
        const fragmentLower = fragment.toLowerCase();
        const suggestions: AgentConsoleWorkspaceSuggestion[] = [];
        let visited = 0;

        while (queue.length && suggestions.length < limit && visited < WORKSPACE_SCAN_LIMIT) {
            const current = queue.shift()!;
            const entries = await this.readDirectoryEntries(current.absolutePath);
            for (const entry of entries) {
                visited += 1;
                if (visited > WORKSPACE_SCAN_LIMIT || suggestions.length >= limit) {
                    break;
                }
                if (entry.kind !== 'directory') {
                    continue;
                }
                const relativePath = current.relativePath ? `${current.relativePath}/${entry.name}` : entry.name;
                if (this.matchesWorkspacePathSuffix(relativePath, basePath)) {
                    const nestedEntries = await this.readDirectoryEntries(entry.path);
                    for (const nestedEntry of nestedEntries) {
                        const nestedRelativePath = `${relativePath}/${nestedEntry.name}`;
                        const value = this.buildSuggestionValue(relativePath, nestedEntry);
                        if (existing.has(value) || !this.matchesWorkspaceQuery(nestedEntry.name, nestedRelativePath, fragmentLower)) {
                            continue;
                        }
                        existing.add(value);
                        suggestions.push({
                            label: value,
                            value,
                            description: nestedEntry.kind === 'directory' ? 'folder' : nestedEntry.kind
                        });
                        if (suggestions.length >= limit) {
                            break;
                        }
                    }
                }
                if (current.depth < WORKSPACE_SCAN_DEPTH && !WORKSPACE_IGNORED_DIRECTORIES.has(entry.name)) {
                    queue.push({
                        absolutePath: entry.path,
                        relativePath,
                        depth: current.depth + 1
                    });
                }
            }
        }

        return suggestions;
    }

    protected async walkWorkspaceSuggestions(
        workspace: string,
        query: string,
        limit: number,
        existing = new Set<string>()
    ): Promise<AgentConsoleWorkspaceSuggestion[]> {
        const rootTarget = this.resolveWorkspaceTarget(workspace, '');
        if (!rootTarget || !query) {
            return [];
        }
        const queue: Array<{ absolutePath: string; relativePath: string; depth: number }> = [{
            absolutePath: rootTarget.absolutePath,
            relativePath: '',
            depth: 0
        }];
        const queryLower = query.toLowerCase();
        const suggestions: AgentConsoleWorkspaceSuggestion[] = [];
        let visited = 0;

        while (queue.length && suggestions.length < limit && visited < WORKSPACE_SCAN_LIMIT) {
            const current = queue.shift()!;
            const entries = await this.readDirectoryEntries(current.absolutePath);
            for (const entry of entries) {
                visited += 1;
                if (visited > WORKSPACE_SCAN_LIMIT || suggestions.length >= limit) {
                    break;
                }
                const relativePath = current.relativePath ? `${current.relativePath}/${entry.name}` : entry.name;
                const value = this.buildSuggestionValue(current.relativePath, entry);
                if (!existing.has(value) && this.matchesWorkspaceQuery(entry.name, relativePath, queryLower)) {
                    existing.add(value);
                    suggestions.push({
                        label: value,
                        value,
                        description: entry.kind === 'directory' ? 'folder' : entry.kind
                    });
                }
                if (entry.kind === 'directory' && current.depth < WORKSPACE_SCAN_DEPTH && !WORKSPACE_IGNORED_DIRECTORIES.has(entry.name)) {
                    queue.push({
                        absolutePath: entry.path,
                        relativePath,
                        depth: current.depth + 1
                    });
                }
            }
        }

        return suggestions;
    }

}
