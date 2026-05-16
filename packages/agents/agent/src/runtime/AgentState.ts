import { AgentMessage } from './AgentMessage';

export interface AgentState {
    sessionId: string;
    messages: AgentMessage[];
    summary?: string;
    ownerPrincipalId?: string;
    createdAt?: number;
    updatedAt?: number;
}
