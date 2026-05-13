import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext, Runner, Shutdown } from '@tsdi/core';
import { AgentScheduler } from './AgentScheduler';
import { ScheduledAgentTask } from './ScheduledAgentTask';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentTaskScheduledEvent } from '../runtime/AgentEvents';

@Injectable()
export class IntervalAgentScheduler extends AgentScheduler {
    private tasks = new Map<string, ScheduledAgentTask>();
    private timers = new Map<string, ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>();

    constructor(
        private runtime: AgentRuntime,
        @Inject(ApplicationContext) private app: ApplicationContext
    ) {
        super();
    }

    @Runner()
    async start(): Promise<void> {
        return;
    }

    @Shutdown()
    async stop(): Promise<void> {
        this.timers.forEach(timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
        this.timers.forEach(timer => clearInterval(timer as ReturnType<typeof setInterval>));
        this.timers.clear();
        this.tasks.clear();
    }

    async schedule(task: ScheduledAgentTask): Promise<ScheduledAgentTask> {
        this.tasks.set(task.id, task);
        await this.app.publishEvent(new AgentTaskScheduledEvent(this, task));

        if (task.intervalMs && task.intervalMs > 0) {
            const timer = setInterval(() => {
                void this.execute(task);
            }, task.intervalMs);
            this.timers.set(task.id, timer);
        } else {
            const delay = Math.max((task.runAt ?? Date.now()) - Date.now(), 0);
            const timer = setTimeout(() => {
                void this.execute(task).finally(() => {
                    this.timers.delete(task.id);
                    this.tasks.delete(task.id);
                });
            }, delay);
            this.timers.set(task.id, timer);
        }

        return task;
    }

    async cancel(taskId: string): Promise<void> {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer as ReturnType<typeof setTimeout>);
            clearInterval(timer as ReturnType<typeof setInterval>);
        }
        this.timers.delete(taskId);
        this.tasks.delete(taskId);
    }

    getTasks(): ScheduledAgentTask[] {
        return Array.from(this.tasks.values());
    }

    private async execute(task: ScheduledAgentTask): Promise<void> {
        if (task.cancelled) {
            return;
        }
        await this.runtime.runTurn(task.sessionId, task.prompt);
    }
}
