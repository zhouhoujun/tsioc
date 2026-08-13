import { AgentMessage } from './AgentMessage';
import { AgentSessionRole, AgentSessionSection, AgentThreadStatus } from '../memory/SessionStore';

export interface AgentState {
    sessionId: string;
    messages: AgentMessage[];
    sections?: AgentSessionSection[];
    summary?: string;
    title?: string;
    pinned?: boolean;
    ownerPrincipalId?: string;
    workspace?: string;
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: AgentSessionRole;
    rootRequest?: string;
    focusSummary?: string;
    threadStatus?: AgentThreadStatus;
    createdAt?: number;
    updatedAt?: number;
}
