import { FileAdapter, FileDirectoryEntry } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

export interface AgentConsoleWorkspaceSuggestion {
    label: string;
    value: string;
    description?: string;
}

export interface AgentConsoleWorkspaceMentionResolver {
    resolveSuggestions(workspace: string, activeToken: string, limit?: number): Promise<AgentConsoleWorkspaceSuggestion[]>;
    resolveContext(workspace: string, mentionName: string): Promise<string[]>;
}

const WORKSPACE_SUGGESTION_LIMIT = 12;
const WORKSPACE_SCAN_LIMIT = 2000;
const WORKSPACE_SCAN_DEPTH = 6;
const WORKSPACE_DIRECTORY_PREVIEW_LIMIT = 20;
const WORKSPACE_FILE_PREVIEW_CHARS = 4096;
const WORKSPACE_IGNORED_DIRECTORIES = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    '.turbo'
]);

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
        limit = WORKSPACE_SUGGESTION_LIMIT
    ): Promise<AgentConsoleWorkspaceSuggestion[]> {
        const query = this.normalizeWorkspaceQuery(activeToken);
        if (!workspace || !this.fileAdapter) {
            return [];
        }
        const lastSlashIndex = query.lastIndexOf('/');
        const basePath = lastSlashIndex >= 0 ? query.slice(0, lastSlashIndex) : '';
        const fragment = lastSlashIndex >= 0 ? query.slice(lastSlashIndex + 1) : query;
        const directSuggestions = await this.listDirectorySuggestions(workspace, basePath, fragment, limit);
        const known = new Set(directSuggestions.map(item => item.value));

        if (!query) {
            return directSuggestions.slice(0, limit);
        }

        if (lastSlashIndex >= 0) {
            if (directSuggestions.length >= limit) {
                return directSuggestions.slice(0, limit);
            }
            return [
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
            return directSuggestions.slice(0, limit);
        }

        return [
            ...directSuggestions,
            ...(await this.walkWorkspaceSuggestions(
                workspace,
                query,
                Math.max(0, limit - directSuggestions.length),
                known
            ))
        ].slice(0, limit);
    }

    async resolveContext(workspace: string, mentionName: string): Promise<string[]> {
        if (!workspace || !this.fileAdapter) {
            return [];
        }
        const target = this.resolveWorkspaceTarget(workspace, mentionName, true);
        if (!target) {
            return [];
        }
        const stats = await this.fileAdapter.stat(target.absolutePath);
        if (!stats) {
            return [];
        }
        if (stats.isDirectory()) {
            const entries = await this.readDirectoryEntries(target.absolutePath);
            const preview = entries
                .slice(0, WORKSPACE_DIRECTORY_PREVIEW_LIMIT)
                .map(entry => `${entry.name}${entry.kind === 'directory' ? '/' : ''}`);
            const hasMore = entries.length > WORKSPACE_DIRECTORY_PREVIEW_LIMIT;
            return [
                `Directory ${target.relativePath || '.'}:`,
                preview.length
                    ? `${preview.join(', ')}${hasMore ? ', ...' : ''}`
                    : '(empty)'
            ];
        }
        if (stats.isFile()) {
            try {
                const content = await this.fileAdapter.readText(target.absolutePath);
                const preview = this.truncateTextLines(String(content || '').slice(0, WORKSPACE_FILE_PREVIEW_CHARS));
                const suffix = String(content || '').length > WORKSPACE_FILE_PREVIEW_CHARS ? '\n...[truncated]' : '';
                return [
                    `File ${target.relativePath}:`,
                    `${preview}${suffix}`
                ];
            } catch {
                return [`File ${target.relativePath}: content preview unavailable.`];
            }
        }
        return [];
    }

    protected normalizeWorkspaceQuery(tokenOrMention: string): string {
        return String(tokenOrMention || '')
            .trim()
            .replace(/^@+/, '')
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
        return nameLower.startsWith(queryLower) || pathLower.startsWith(queryLower);
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

    protected truncateTextLines(text: string, maxLines = 80): string {
        const lines = text.replace(/\r/g, '').split('\n');
        if (lines.length <= maxLines) {
            return lines.join('\n');
        }
        return `${lines.slice(0, maxLines).join('\n')}\n...[truncated]`;
    }
}
