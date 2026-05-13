import { Abstract } from '@tsdi/ioc';

export interface AgentMemoryRecord {
    id: string;
    sessionId?: string;
    key: string;
    value: string;
    scope: 'session' | 'global';
    createdAt: number;
}

@Abstract()
export abstract class MemoryStore {
    abstract put(record: AgentMemoryRecord): Promise<void>;
    abstract search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]>;
    abstract getAll(sessionId?: string): Promise<AgentMemoryRecord[]>;
}
