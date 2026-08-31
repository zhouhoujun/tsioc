/**
 * AgentConsole command-output durable history (P267) — `MemoryStore` backend.
 *
 * Concrete `CommandOutputStore` persisted as a single `MemoryStore` aggregate
 * record, keyed by an ownership-scoped `recordId` supplied by the host (e.g. a
 * gateway RPC server constructs it from workspace + principal + session so one
 * caller can never read or write another's history). Reuses the shared
 * filter/session-match/cursor-pagination/cap-eviction logic in
 * `AbstractCommandOutputStore`; this class only supplies the persistence seam
 * (load the aggregate record on construction, write the aggregate back after
 * each mutation).
 *
 * Cross-platform constraint: this module must NOT import `@tsdi/components/console`
 * or any node API (`node:`, `process`, `Buffer`, `fs`, `__dirname`).
 */

import { AbstractCommandOutputStore, AgentConsoleCommandOutputHistoryEntry, AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP, CommandOutputPage, CommandOutputQuery } from '../ui/CommandOutputHistory';
import { MemoryStore } from './MemoryStore';

/** MemoryStore record key under which the aggregate command-output history lives. */
export const COMMAND_OUTPUT_MEMORY_KEY = 'agent:command-output-history';

/**
 * `MemoryStore`-backed command-output store.
 *
 * The aggregate is a single `MemoryStore` record whose `id` equals the
 * ownership-scoped `recordId` (workspace:principal:session) and whose `value`
 * is the JSON-serialized, newest-first entry array. Any host with a
 * `MemoryStore` (the agent runtime local path and the gateway RPC backend) can
 * reuse this to get durable command output without reimplementing the shared
 * store logic.
 */
export class MemoryCommandOutputStore extends AbstractCommandOutputStore {
    private loaded = false;
    private version = 0;

    constructor(
        protected readonly memory: MemoryStore,
        protected readonly recordId: string,
        cap: number = AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP
    ) {
        super(cap);
    }

    protected async load(): Promise<void> {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        const records = await this.memory.getAll(undefined);
        // A durable MemoryStore.put is an idempotent upsert (TypeORM `save` by
        // primary key), but an in-memory store accumulates one record per write.
        // Each write carries a monotonic `version` (metadata), so the snapshot
        // with the highest version is authoritative — this keeps clears visible
        // (a clear writes a newer empty snapshot) under either put semantics.
        let authoritative = undefined as any;
        let authoritativeVersion = -1;
        for (const candidate of (records || [])) {
            if (candidate.id !== this.recordId
                || candidate.key !== COMMAND_OUTPUT_MEMORY_KEY
                || candidate.scope !== 'global') {
                continue;
            }
            const version = Number(candidate.metadata?.version ?? 0);
            if (version > authoritativeVersion) {
                authoritative = candidate;
                authoritativeVersion = version;
            }
        }
        this.version = authoritativeVersion;
        if (!authoritative) {
            return;
        }
        try {
            const parsed = JSON.parse(authoritative.value);
            if (Array.isArray(parsed)) {
                this.entries = parsed.slice(0, this.cap);
            }
        } catch {
            this.entries = [];
        }
    }

    protected async persist(): Promise<void> {
        this.version += 1;
        await this.memory.put({
            id: this.recordId,
            key: COMMAND_OUTPUT_MEMORY_KEY,
            value: JSON.stringify(this.entries),
            scope: 'global',
            category: 'conversation',
            metadata: { kind: 'command-output', version: this.version },
            createdAt: this.entries[this.entries.length - 1]?.ts ?? Date.now(),
            updatedAt: Date.now()
        });
    }

    override async list(query: CommandOutputQuery): Promise<CommandOutputPage> {
        await this.load();
        return super.list(query);
    }

    override async get(id: string, sessionId?: string): Promise<AgentConsoleCommandOutputHistoryEntry | undefined> {
        await this.load();
        return super.get(id, sessionId);
    }

    override async append(entry: AgentConsoleCommandOutputHistoryEntry): Promise<void> {
        await this.load();
        await super.append(entry);
        await this.persist();
    }

    override async clear(sessionId?: string, opts: { all?: boolean } = {}): Promise<number> {
        await this.load();
        const removed = await super.clear(sessionId, opts);
        await this.persist();
        return removed;
    }
}
