import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';
import { MEMORY_EMBEDDER, MemoryEmbedder, SemanticMemoryRanker } from './MemoryEmbedder';
import { MemorySearchMode } from './MemorySearchService';

export const PROJECT_MEMORY_NAMESPACE_PREFIX = 'project-memory:';
export type ProjectMemoryConflictStrategy = 'replace' | 'keep-newest' | 'append';

export interface ProjectMemoryInput {
    projectId: string;
    key: string;
    value: string;
    category?: AgentMemoryRecord['category'];
    ttlMs?: number;
    conflict?: ProjectMemoryConflictStrategy;
    metadata?: Record<string, any>;
}

export interface ProjectMemorySearchOptions {
    mode?: MemorySearchMode;
    limit?: number;
    minScore?: number;
    now?: number;
}

export function normalizeProjectMemoryId(value: string): string {
    return String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function isProjectMemoryRecord(record: AgentMemoryRecord): boolean {
    return String(record.namespace || '').startsWith(PROJECT_MEMORY_NAMESPACE_PREFIX);
}

@Injectable()
export class ProjectMemoryService {
    constructor(
        private store: MemoryStore,
        private ranker: SemanticMemoryRanker,
        @Optional() @Inject(MEMORY_EMBEDDER) private embedder?: MemoryEmbedder | null
    ) {
    }

    async add(input: ProjectMemoryInput): Promise<AgentMemoryRecord> {
        const projectId = normalizeProjectMemoryId(input.projectId);
        const key = String(input.key || '').trim();
        const value = String(input.value || '').trim();
        if (!projectId || !key || !value) throw new Error('Project memory requires projectId, key, and value.');
        const now = Date.now();
        const existing = (await this.list(projectId, now)).filter(record => record.key.toLowerCase() === key.toLowerCase());
        const conflict = input.conflict ?? 'replace';
        if (conflict === 'keep-newest' && existing.length) return existing[0];
        if (conflict === 'replace') {
            for (const record of existing) await this.store.delete(record.id, undefined, 'global');
        }
        const record: AgentMemoryRecord = {
            id: `project-memory-${now}-${Math.random().toString(36).slice(2)}`,
            key,
            value,
            scope: 'global',
            namespace: this.namespace(projectId),
            category: input.category ?? 'core',
            metadata: {
                ...(input.metadata || {}),
                projectId,
                expiresAt: input.ttlMs && input.ttlMs > 0 ? now + input.ttlMs : undefined,
                conflict
            },
            createdAt: now,
            updatedAt: now
        };
        await this.store.put(record);
        return record;
    }

    async list(projectId: string, now = Date.now()): Promise<AgentMemoryRecord[]> {
        const namespace = this.namespace(projectId);
        const records = (await this.store.getAll()).filter(record => record.namespace === namespace && this.isFresh(record, now));
        return records.sort((left, right) => (right.updatedAt ?? right.createdAt) - (left.updatedAt ?? left.createdAt));
    }

    async remove(projectId: string, idOrKey: string): Promise<number> {
        const target = String(idOrKey || '').trim().toLowerCase();
        if (!target) return 0;
        const namespace = this.namespace(projectId);
        const records = (await this.store.getAll()).filter(record => record.namespace === namespace && (record.id.toLowerCase() === target || record.key.toLowerCase() === target));
        let removed = 0;
        for (const record of records) removed += await this.store.delete(record.id, undefined, 'global');
        return removed;
    }

    async search(projectId: string, query: string, options: ProjectMemorySearchOptions = {}): Promise<AgentMemoryRecord[]> {
        const records = await this.list(projectId, options.now);
        const normalized = String(query || '').trim().toLowerCase();
        const keyword = records.filter(record => !normalized || record.key.toLowerCase().includes(normalized) || record.value.toLowerCase().includes(normalized));
        if (!this.embedder || options.mode === 'keyword' || !normalized) return this.limit(keyword, options.limit);
        const ranked = await this.ranker.rank({ query, records, embedder: this.embedder, topK: options.limit, minScore: options.minScore });
        if (options.mode === 'semantic') return ranked.map(item => item.record);
        const merged = ranked.map(item => item.record);
        const seen = new Set(merged.map(record => record.id));
        for (const record of keyword) if (!seen.has(record.id)) merged.push(record);
        return this.limit(merged, options.limit);
    }

    isFresh(record: AgentMemoryRecord, now = Date.now()): boolean {
        const expiresAt = Number(record.metadata?.expiresAt || 0);
        return !expiresAt || expiresAt > now;
    }

    private namespace(projectId: string): string {
        const normalized = normalizeProjectMemoryId(projectId);
        return normalized ? `${PROJECT_MEMORY_NAMESPACE_PREFIX}${normalized}` : PROJECT_MEMORY_NAMESPACE_PREFIX;
    }

    private limit(records: AgentMemoryRecord[], limit?: number): AgentMemoryRecord[] {
        return limit && limit > 0 ? records.slice(0, Math.floor(limit)) : records;
    }
}
