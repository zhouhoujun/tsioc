import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';
import { MEMORY_EMBEDDER, MemoryEmbedder, SemanticMemoryRanker } from './MemoryEmbedder';

export type MemorySearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface MemorySearchOptions {
    sessionId?: string;
    mode?: MemorySearchMode;
    limit?: number;
    minScore?: number;
}

/**
 * Orchestrates memory retrieval across three search modes:
 *
 * - `keyword`:  the deterministic store search (substring match), unchanged.
 * - `semantic`: embed the query, rank all visible records by cosine
 *   similarity, return the best matches first.
 * - `hybrid`:   semantic results ranked first, then keyword-only matches
 *   appended (deduplicated by id) so a semantic miss never hides records the
 *   keyword path would have found.
 *
 * Semantic and hybrid modes require an injected `MemoryEmbedder`. When none is
 * configured they silently degrade to keyword search, preserving the existing
 * deterministic behavior for unconfigured agents.
 */
@Injectable()
export class MemorySearchService {
    constructor(
        private store: MemoryStore,
        private ranker: SemanticMemoryRanker,
        @Optional() @Inject(MEMORY_EMBEDDER) private embedder?: MemoryEmbedder | null
    ) {
    }

    hasSemantic(): boolean {
        return !!this.embedder;
    }

    async search(query: string, options?: MemorySearchOptions): Promise<AgentMemoryRecord[]> {
        const mode = this.resolveMode(options?.mode);
        if (mode === 'semantic') {
            return this.searchSemantic(query, options);
        }
        if (mode === 'hybrid') {
            return this.searchHybrid(query, options);
        }
        return this.searchKeyword(query, options);
    }

    private resolveMode(mode?: MemorySearchMode): MemorySearchMode {
        if (mode === 'semantic' || mode === 'hybrid') {
            return mode;
        }
        return 'keyword';
    }

    private async searchKeyword(query: string, options?: MemorySearchOptions): Promise<AgentMemoryRecord[]> {
        const records = await this.store.search(query, options?.sessionId);
        return this.applyLimit(records, options?.limit);
    }

    private async searchSemantic(query: string, options?: MemorySearchOptions): Promise<AgentMemoryRecord[]> {
        if (!this.embedder) {
            return this.searchKeyword(query, options);
        }
        const records = await this.store.getAll(options?.sessionId);
        const ranked = await this.ranker.rank({
            query,
            records,
            embedder: this.embedder,
            topK: options?.limit,
            minScore: options?.minScore
        });
        return ranked.map(entry => entry.record);
    }

    private async searchHybrid(query: string, options?: MemorySearchOptions): Promise<AgentMemoryRecord[]> {
        if (!this.embedder) {
            return this.searchKeyword(query, options);
        }
        const semanticRecords = await this.searchSemantic(query, options);
        const keywordRecords = await this.store.search(query, options?.sessionId);
        const seen = new Set<string>();
        const merged: AgentMemoryRecord[] = [];
        for (const record of semanticRecords) {
            if (!seen.has(record.id)) {
                seen.add(record.id);
                merged.push(record);
            }
        }
        for (const record of keywordRecords) {
            if (!seen.has(record.id)) {
                seen.add(record.id);
                merged.push(record);
            }
        }
        return this.applyLimit(merged, options?.limit);
    }

    private applyLimit(records: AgentMemoryRecord[], limit?: number): AgentMemoryRecord[] {
        if (limit == null) {
            return records;
        }
        return records.slice(0, Math.floor(limit));
    }
}
