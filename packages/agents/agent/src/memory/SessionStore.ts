import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentState } from '../runtime/AgentState';

@Abstract()
export abstract class SessionStore {
    abstract get(sessionId: string): Promise<AgentState>;
    abstract has(sessionId: string): Promise<boolean>;
    abstract listSessionIds(): Promise<string[]>;
    abstract append(sessionId: string, message: AgentMessage): Promise<AgentState>;
    abstract setSummary(sessionId: string, summary: string): Promise<void>;
    abstract setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void>;
    abstract delete(sessionId: string): void | Promise<void>;
    abstract clear(): void | Promise<void>;
}
