import { AgentMessage } from './AgentMessage';
import { AgentSessionRole } from '../memory/SessionStore';

export interface AgentState {
    sessionId: string;
    messages: AgentMessage[];
    summary?: string;
    ownerPrincipalId?: string;
    workspace?: string;
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: AgentSessionRole;
    rootRequest?: string;
    focusSummary?: string;
    createdAt?: number;
    updatedAt?: number;
}
