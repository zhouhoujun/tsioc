import { AgentTurnMessageInput } from '../runtime/AgentMessage';

export interface AgentRequest {
    sessionId: string;
    input: string;
    principalId?: string;
    message?: AgentTurnMessageInput;
    profile?: string;
}
