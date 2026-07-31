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
    abstract delete(id: string, sessionId?: string, scope?: AgentMemoryRecord['scope']): Promise<number>;

    /**
     * Delete all session-scoped memory records owned by a session.
     * Global records (shared across sessions) are never removed.
     * Returns the number of deleted records.
     */
    abstract deleteBySession(sessionId: string): Promise<number>;
}
