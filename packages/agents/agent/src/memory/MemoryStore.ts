import { Abstract } from '@tsdi/ioc';

export interface AgentMemoryRecord {
    id: string;
    sessionId?: string;
    key: string;
    value: string;
    scope: 'session' | 'global';
    namespace?: string;
    category?: 'core' | 'daily' | 'conversation' | 'experience' | string;
    metadata?: Record<string, any>;
    createdAt: number;
    updatedAt?: number;
}

@Abstract()
export abstract class MemoryStore {
    abstract put(record: AgentMemoryRecord): Promise<void>;
    abstract search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]>;
    abstract getAll(sessionId?: string): Promise<AgentMemoryRecord[]>;
}
