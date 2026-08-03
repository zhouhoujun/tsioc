import { AgentTurnMessageInput } from './AgentMessage';

export interface AgentTurnInput {
    sessionId: string;
    input: string;
    principalId?: string;
    message?: AgentTurnMessageInput;
    profile?: string;
}
