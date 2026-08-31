/**
 * AgentConsole command-output durable history (P267).
 *
 * Shared, cross-platform command-output history model. Hosted in `@tsdi/agent`
 * (the common dependency of both `@tsdi/agent-ui` and `@tsdi/agent-gateway`) so
 * the durable-store abstraction is implemented once and reused by every
 * concrete store (in-memory default, `FileAdapter`-backed TUI/CLI store,
 * `MemoryStore`-backed gateway store, browser RPC store) instead of being
 * duplicated per sub-project. This follows the package-wide rule: common
 * functionality via an abstract base class + IoC dependency inversion.
 *
 * This module owns the pure model:
 *
 *   - `AgentConsoleCommandOutputHistoryEntry` — the persisted record.
 *   - `CommandOutputStore` — the storage seam (port) consumed by hosts.
 *   - `AbstractCommandOutputStore` — shared filter/session-match/cursor-pagination/
 *     cap-eviction logic; concrete stores only supply their persistence seam.
 *   - `InMemoryCommandOutputStore` — the bounded default / reference for tests.
 *   - `redactCommandOutputSecret` — write-time redaction so a store never
 *     persists raw credentials (mirrors the agent runtime `RedactionFilter`).
 *
 * Cross-platform constraint: this module must NOT import `@tsdi/components/console`
 * or any node API (`node:`, `process`, `Buffer`, `fs`, `__dirname`).
 */

export interface AgentConsoleCommandOutputHistoryEntry {
    id: string;
    command: string;
    text: string;
    ts: number;
    kind: 'result' | 'error' | 'notice';
    requestId?: string;
    argsSummary?: string;
    status?: 'succeeded' | 'failed' | 'cancelled';
    durationMs?: number;
    sessionId?: string;
    source?: 'local' | 'rpc';
}

export interface CommandOutputQuery {
    sessionId?: string;
    filter?: string;
    cursor?: string;
    limit?: number;
}

export interface CommandOutputPage {
    items: AgentConsoleCommandOutputHistoryEntry[];
    nextCursor?: string;
    total: number;
}

export interface CommandOutputStore {
    list(query?: CommandOutputQuery): Promise<CommandOutputPage>;
    get(id: string, sessionId?: string): Promise<AgentConsoleCommandOutputHistoryEntry | undefined>;
    append(entry: AgentConsoleCommandOutputHistoryEntry): Promise<void>;
    clear(sessionId?: string, opts?: { all?: boolean }): Promise<number>;
}

/** Newest-first bounded cap for the durable store (in-memory live ring stays 20). */
export const AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP = 500;

/** Default page size for cursor pagination. */
export const AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE = 20;

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

/**
 * Shared, newest-first bounded command-output store.
 *
 * Owns the filtering / session-matching / cursor-pagination / cap-eviction logic
 * and the in-memory `entries` array so every concrete store (in-memory, file,
 * memory-store, RPC) reuses one implementation instead of duplicating it.
 * Subclasses only supply the persistence seam (constructor loading +
 * post-mutation persist) and otherwise inherit `list`/`get`/`append`/`clear`.
 */
export abstract class AbstractCommandOutputStore implements CommandOutputStore {
    protected entries: AgentConsoleCommandOutputHistoryEntry[] = [];

    constructor(protected readonly cap: number = AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP) {}

    async list(query: CommandOutputQuery = {}): Promise<CommandOutputPage> {
        const needle = normalizeFilter(query.filter);
        const filtered = this.entries.filter(
            entry => matchesSession(entry, query.sessionId) && matchesFilter(entry, needle)
        );
        const limit = Math.max(1, Math.min(100, Math.floor(query.limit ?? AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE)));
        const start = this.decodeCursor(query.cursor);
        const items = filtered.slice(start, start + limit);
        const total = filtered.length;
        const nextCursor = start + items.length < total ? this.encodeCursor(start + items.length) : undefined;
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
    }

    async clear(sessionId?: string, opts: { all?: boolean } = {}): Promise<number> {
        if (opts.all || !sessionId) {
            const removed = this.entries.length;
            this.entries = [];
            return removed;
        }
        const before = this.entries.length;
        this.entries = this.entries.filter(entry => !matchesSession(entry, sessionId));
        return before - this.entries.length;
    }

    protected encodeCursor(offset: number): string {
        if (typeof btoa === 'function') {
            return btoa(`o:${offset}`);
        }
        return `o:${offset}`;
    }

    protected decodeCursor(cursor: string | undefined): number {
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
}

/**
 * In-memory, newest-first, bounded command-output store.
 *
 * The default used when no host injects a durable store; also the reference
 * implementation for tests.
 */
export class InMemoryCommandOutputStore extends AbstractCommandOutputStore {}

const SECRET_KEY = /(api[-_]?key|token|secret|password|authorization|cookie)/i;
const SECRET_VALUE = /(Bearer\s+)[A-Za-z0-9._-]+|\b(sk-[A-Za-z0-9_-]{8,})\b/gi;
const REDACTED = '[REDACTED]';

/**
 * Write-time redaction for command output. Mirrors the agent runtime
 * `RedactionFilter` rules so the durable store never persists raw credentials.
 */
export function redactCommandOutputSecret(value: string): string {
    return String(value ?? '')
        .replace(SECRET_VALUE, match => (match.startsWith('Bearer ') ? 'Bearer [REDACTED]' : REDACTED));
}

export function shouldRedactCommandOutputKey(key: string): boolean {
    return SECRET_KEY.test(String(key || ''));
}
