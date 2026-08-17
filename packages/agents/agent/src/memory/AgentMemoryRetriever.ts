import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';
import { MEMORY_EMBEDDER, MemoryEmbedder, SemanticMemoryRanker } from './MemoryEmbedder';
import { MemorySearchMode, MemorySearchService } from './MemorySearchService';
import { isProjectMemoryRecord, ProjectMemoryService } from './ProjectMemoryService';

export interface AgentMemoryRetrievalInput {
    sessionId: string;
    query: string;
    /** Search mode; defaults to keyword when unset or unsupported. */
    mode?: MemorySearchMode;
    /** Cap on the number of returned records. */
    limit?: number;
    /** Minimum cosine similarity for semantic/hybrid ranking (0-1). */
    minScore?: number;
    /** Project/workspace identity used for isolated cross-session memory. */
    projectId?: string;
}

@Abstract()
export abstract class AgentMemoryRetriever {
    abstract retrieve(input: AgentMemoryRetrievalInput): Promise<AgentMemoryRecord[]>;
}

/**
 * Default retriever backed by the orchestrated MemorySearchService.
 *
 * When constructed directly without a service (and optionally with an
 * embedder), it builds an ad-hoc service so semantic/hybrid modes still work
 * outside the DI container. Without an embedder every mode falls back to the
 * deterministic keyword store search.
 */
@Injectable()
export class DefaultAgentMemoryRetriever extends AgentMemoryRetriever {
    private searchService: MemorySearchService;

    constructor(
        private store: MemoryStore,
        @Optional() searchService?: MemorySearchService,
        @Optional() @Inject(MEMORY_EMBEDDER) private embedder?: MemoryEmbedder | null,
        @Optional() private projectMemory?: ProjectMemoryService | null
    ) {
        super();
        this.searchService = searchService ?? new MemorySearchService(store, new SemanticMemoryRanker(), embedder ?? null);
    }

    async retrieve(input: AgentMemoryRetrievalInput): Promise<AgentMemoryRecord[]> {
        const records = await this.searchService.search(input.query, {
            sessionId: input.sessionId,
            mode: input.mode,
            limit: input.projectId ? undefined : input.limit,
            minScore: input.minScore
        });
        const visible = records.filter(record => !isProjectMemoryRecord(record));
        if (!input.projectId || !this.projectMemory) return input.limit ? visible.slice(0, input.limit) : visible;
        const project = await this.projectMemory.search(input.projectId, input.query, input);
        const merged = [...project, ...visible];
        return input.limit ? merged.slice(0, input.limit) : merged;
    }
}
