import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentState } from '../runtime/AgentState';

export type AgentSessionRole = 'main' | 'branch' | 'review' | 'worker' | string;

export interface AgentSessionProjectMetadata {
    projectId?: string;
    primaryThreadId?: string;
    sessionRole?: AgentSessionRole;
    rootRequest?: string;
    focusSummary?: string;
}

export interface AgentSessionProjectIndex {
    projectKey: string;
    projectId?: string;
    workspace?: string;
    primaryThreadId?: string;
    sessionRole?: AgentSessionRole;
    rootRequest?: string;
    focusSummary?: string;
    sessionIds: string[];
    lastActiveAt?: number;
}

export interface SessionSearchMatch {
    sessionId: string;
    count: number;
    snippet: string;
    updatedAt?: number;
    summary?: string;
    workspace?: string;
}

export interface SessionSearchOptions {
    limit?: number;
    maxSessions?: number;
}

@Abstract()
export abstract class SessionStore {
    abstract get(sessionId: string): Promise<AgentState>;
    abstract has(sessionId: string): Promise<boolean>;
    abstract listSessionIds(): Promise<string[]>;
    abstract listProjects(): Promise<AgentSessionProjectIndex[]>;
    abstract append(sessionId: string, message: AgentMessage): Promise<AgentState>;
    abstract setSummary(sessionId: string, summary: string): Promise<void>;
    abstract setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void>;
    abstract setWorkspace(sessionId: string, workspace?: string): Promise<void>;
    abstract setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void>;
    abstract delete(sessionId: string): void | Promise<void>;
    abstract clear(): void | Promise<void>;

    async search(query: string, options: SessionSearchOptions = {}): Promise<SessionSearchMatch[]> {
        const normalizedQuery = String(query || '').toLowerCase().trim();
        if (!normalizedQuery) {
            return [];
        }
        const maxSessions = options.maxSessions ?? 200;
        const limit = options.limit ?? 50;
        const ids = (await this.listSessionIds()).slice(0, maxSessions);
        const results: SessionSearchMatch[] = [];
        for (const sessionId of ids) {
            const state = await this.get(sessionId);
            const matched = (state.messages || []).filter(message =>
                String(message.content || '').toLowerCase().includes(normalizedQuery));
            if (!matched.length) {
                continue;
            }
            results.push({
                sessionId,
                count: matched.length,
                snippet: `[${matched[0].role}] ${String(matched[0].content || '')}`,
                updatedAt: state.updatedAt ?? state.createdAt,
                summary: state.summary,
                workspace: state.workspace
            });
        }
        results.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
        return results.slice(0, limit);
    }
}
