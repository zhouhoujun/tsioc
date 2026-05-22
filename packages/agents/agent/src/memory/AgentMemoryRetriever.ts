import { Abstract, Injectable } from '@tsdi/ioc';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';

export interface AgentMemoryRetrievalInput {
    sessionId: string;
    query: string;
}

@Abstract()
export abstract class AgentMemoryRetriever {
    abstract retrieve(input: AgentMemoryRetrievalInput): Promise<AgentMemoryRecord[]>;
}

@Injectable()
export class DefaultAgentMemoryRetriever extends AgentMemoryRetriever {
    constructor(private store: MemoryStore) {
        super();
    }

    async retrieve(input: AgentMemoryRetrievalInput): Promise<AgentMemoryRecord[]> {
        return this.store.search(input.query, input.sessionId);
    }
}
