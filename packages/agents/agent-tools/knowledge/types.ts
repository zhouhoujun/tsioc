import { Abstract } from "@tsdi/ioc";

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


@Abstract()
export abstract class KnowledgeAdapter {
    abstract search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult>;
    abstract store(entry: KnowledgeEntry): Promise<KnowledgeEntry>;
    abstract delete(id: string): Promise<boolean>;
}

export interface KnowledgeSearchOptions {
    tags?: string[];
    limit?: number;
    offset?: number;
}

