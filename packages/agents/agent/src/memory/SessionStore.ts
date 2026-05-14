import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentState } from '../runtime/AgentState';

@Abstract()
export abstract class SessionStore {
    abstract get(sessionId: string): Promise<AgentState>;
    abstract append(sessionId: string, message: AgentMessage): Promise<AgentState>;
    abstract setSummary(sessionId: string, summary: string): Promise<void>;
    abstract clear(): void | Promise<void>;
}
