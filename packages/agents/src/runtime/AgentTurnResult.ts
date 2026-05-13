import { AgentMessage } from './AgentMessage';
import { ScheduledAgentTask } from '../scheduler/ScheduledAgentTask';

export interface AgentTurnResult {
    sessionId: string;
    message: AgentMessage;
    scheduledTasks?: ScheduledAgentTask[];
}
