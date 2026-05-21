export interface KnowledgeEntry {
    id?: string;
    title: string;
    content: string;
    tags?: string[];
    source?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface KnowledgeSearchResult {
    entries: KnowledgeEntry[];
    total: number;
}

export interface KnowledgeAdapter {
    search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult>;
    store(entry: KnowledgeEntry): Promise<KnowledgeEntry>;
    delete(id: string): Promise<boolean>;
}

export interface KnowledgeSearchOptions {
    tags?: string[];
    limit?: number;
    offset?: number;
}

export const AGENT_KNOWLEDGE_ADAPTER = 'AGENT_KNOWLEDGE_ADAPTER';
