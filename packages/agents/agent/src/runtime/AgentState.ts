import { AgentMessage } from './AgentMessage';

export interface AgentState {
    sessionId: string;
    messages: AgentMessage[];
    summary?: string;
    ownerPrincipalId?: string;
    workspace?: string;
    createdAt?: number;
    updatedAt?: number;
}
