/**
 * Bounded durable command-output store backed by the cross-platform
 * `FileAdapter` (P267).
 *
 * Persists command outputs to a single JSON file through the injected
 * `FileAdapter` — the same abstraction used by `AgentConsoleSettingsStore`,
 * `AgentConsoleStash`, and `AgentConsoleTheme` — so both the TUI (node
 * FileAdapter) and the browser (platform-browser FileAdapter) share one
 * implementation. Each mutation rewrites the file, keeping at most `cap`
 * newest records, so results survive page/terminal restart.
 *
 * Cross-platform: this module must NOT import node APIs.
 */
import { FileAdapter } from '@tsdi/common';
import {
    AgentConsoleCommandOutputHistoryEntry,
    CommandOutputPage,
    CommandOutputQuery,
    CommandOutputStore,
    AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP,
    AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE
} from './AgentConsoleCommandOutputHistory';

export interface BoundedFileCommandOutputStoreOptions {
    fileAdapter: FileAdapter;
    /** Root directory the durable file lives in (e.g. workspace or config dir). */
    directory: string;
    cap?: number;
}

function normalizeFilter(filter: string | undefined): string {
    return String(filter || '').trim().toLowerCase();
}

function matchesFilter(entry: AgentConsoleCommandOutputHistoryEntry, needle: string): boolean {
    if (!needle) {
        return true;
    }
    return entry.command.toLowerCase().includes(needle) || entry.text.toLowerCase().includes(needle);
}

function matchesSession(entry: AgentConsoleCommandOutputHistoryEntry, sessionId: string | undefined): boolean {
    if (!sessionId) {
        return true;
    }
    return entry.sessionId === sessionId || (!entry.sessionId && sessionId === 'console');
}

function encodeCursor(offset: number): string {
    const raw = `o:${offset}`;
    if (typeof btoa === 'function') {
        return btoa(raw);
    }
    return raw;
}

function decodeCursor(cursor: string | undefined): number {
    if (!cursor) {
        return 0;
    }
    try {
        const raw = typeof atob === 'function' ? atob(cursor) : cursor;
        const match = /^o:(\d+)$/.exec(raw);
        return match ? Number(match[1]) : 0;
    } catch {
        return 0;
    }
}

export class BoundedFileCommandOutputStore implements CommandOutputStore {
    protected readonly fileAdapter: FileAdapter;
    protected readonly filePath: string;
    protected readonly cap: number;
    protected entries: AgentConsoleCommandOutputHistoryEntry[] = [];

    constructor(options: BoundedFileCommandOutputStoreOptions) {
        if (!options.fileAdapter || !options.directory) {
            throw new Error('BoundedFileCommandOutputStore requires a fileAdapter and directory');
        }
        this.fileAdapter = options.fileAdapter;
        this.filePath = this.fileAdapter.join(String(options.directory), '.tsdi-agent', 'command-output-history.json');
        this.cap = Math.max(1, Math.floor(options.cap ?? AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP));
        this.load();
    }

    protected load(): void {
        try {
            if (!this.fileAdapter.existsSync(this.filePath)) {
                this.entries = [];
                return;
            }
            const parsed = this.fileAdapter.readJSONSync<{ entries?: AgentConsoleCommandOutputHistoryEntry[] }>(this.filePath);
            const list = Array.isArray(parsed?.entries) ? parsed.entries : [];
            this.entries = list
                .filter((e: any) => e && typeof e.id === 'string')
                .slice(0, this.cap);
        } catch {
            this.entries = [];
        }
    }

    protected persist(): void {
        try {
            void this.fileAdapter.writeText(
                this.filePath,
                JSON.stringify({ version: 1, entries: this.entries })
            );
        } catch {
            // best-effort: never throw on persistence failure
        }
    }

    async list(query: CommandOutputQuery = {}): Promise<CommandOutputPage> {
        const needle = normalizeFilter(query.filter);
        const filtered = this.entries.filter(
            entry => matchesSession(entry, query.sessionId) && matchesFilter(entry, needle)
        );
        const limit = Math.max(1, Math.min(100, Math.floor(query.limit ?? AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE)));
        const start = decodeCursor(query.cursor);
        const items = filtered.slice(start, start + limit);
        const total = filtered.length;
        const nextCursor = start + items.length < total ? encodeCursor(start + items.length) : undefined;
        return { items, nextCursor, total };
    }

    async get(id: string, sessionId?: string): Promise<AgentConsoleCommandOutputHistoryEntry | undefined> {
        return this.entries.find(entry => entry.id === id && matchesSession(entry, sessionId));
    }

    async append(entry: AgentConsoleCommandOutputHistoryEntry): Promise<void> {
        if (!entry || !entry.id) {
            return;
        }
        const withoutDup = this.entries.filter(existing => existing.id !== entry.id);
        this.entries = [entry, ...withoutDup].slice(0, this.cap);
        this.persist();
    }

    async clear(sessionId?: string, opts: { all?: boolean } = {}): Promise<number> {
        if (opts.all || !sessionId) {
            const removed = this.entries.length;
            this.entries = [];
            this.persist();
            return removed;
        }
        const before = this.entries.length;
        this.entries = this.entries.filter(entry => !matchesSession(entry, sessionId));
        const removed = before - this.entries.length;
        this.persist();
        return removed;
    }
}
