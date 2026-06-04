import { Abstract } from '@tsdi/ioc';
import { ScheduledAgentTask } from './ScheduledAgentTask';

@Abstract()
export abstract class AgentScheduler {
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract schedule(task: ScheduledAgentTask): Promise<ScheduledAgentTask>;
    abstract cancel(taskId: string): Promise<void>;
    abstract getTasks(): ScheduledAgentTask[];

    getTask?(taskId: string): ScheduledAgentTask | undefined;
    pause?(taskId: string): Promise<ScheduledAgentTask | undefined>;
    resume?(taskId: string): Promise<ScheduledAgentTask | undefined>;
    update?(taskId: string, patch: Partial<ScheduledAgentTask>): Promise<ScheduledAgentTask | undefined>;
    recover?(taskId: string): Promise<ScheduledAgentTask | undefined>;
}
