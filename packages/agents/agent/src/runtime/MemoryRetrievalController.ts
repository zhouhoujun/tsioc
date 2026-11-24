import type { ApplicationContext } from '@tsdi/core';
import type { SessionStore } from '../memory/SessionStore';
import type { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import type { AgentMemoryRetriever } from '../memory/AgentMemoryRetriever';
import { AgentMemoryRetrievalFailedEvent, AgentMemoryRetrievalStartedEvent, AgentMemoryRetrievedEvent } from './AgentEvents';

export interface MemoryRetrievalHost {
    sessions: SessionStore;
    memory: MemoryStore;
    memoryRetriever?: AgentMemoryRetriever;
    app: ApplicationContext;
    source: object;
}

/** Query memory with optional retrieval service and publish observability events. */
export class MemoryRetrievalController {
    constructor(private readonly host: MemoryRetrievalHost) {
    }

    async getRelevantMemory(query: string, sessionId: string): Promise<AgentMemoryRecord[]> {
        const normalized = query.trim();
        if (!normalized) {
            return [];
        }
        await this.publish(new AgentMemoryRetrievalStartedEvent(this.host.source, sessionId, normalized));
        try {
            const records = this.host.memoryRetriever
                ? await this.host.memoryRetriever.retrieve({
                    sessionId,
                    query: normalized,
                    projectId: await this.resolveProjectId(sessionId)
                })
                : await this.host.memory.search(normalized, sessionId);
            await this.publish(new AgentMemoryRetrievedEvent(this.host.source, sessionId, normalized, records));
            return records;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            await this.publish(new AgentMemoryRetrievalFailedEvent(this.host.source, sessionId, normalized, err));
            return [];
        }
    }

    private async resolveProjectId(sessionId: string): Promise<string | undefined> {
        const state = await this.host.sessions.get(sessionId);
        return String(state.projectId || state.workspace || '').trim() || undefined;
    }

    private async publish(event: any): Promise<void> {
        try {
            await this.host.app.publishEvent(event);
        } catch {
            // memory observability must not break the turn
        }
    }
}
