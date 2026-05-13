import { Abstract } from '@tsdi/ioc';
import { ScheduledAgentTask } from './ScheduledAgentTask';

@Abstract()
export abstract class AgentScheduler {
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract schedule(task: ScheduledAgentTask): Promise<ScheduledAgentTask>;
    abstract cancel(taskId: string): Promise<void>;
    abstract getTasks(): ScheduledAgentTask[];
}
