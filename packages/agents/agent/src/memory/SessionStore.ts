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
    sessionIds: string[];
    lastActiveAt?: number;
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
}
