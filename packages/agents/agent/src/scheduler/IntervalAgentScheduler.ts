import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext, Runner, Shutdown } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentScheduler } from './AgentScheduler';
import { ScheduledAgentTask } from './ScheduledAgentTask';
import { NextRunCalculator } from './NextRunCalculator';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentErrorEvent, AgentTaskScheduledEvent } from '../runtime/AgentEvents';
import { AgentScheduledTaskEntity } from '../memory/entities';

@Injectable()
export class IntervalAgentScheduler extends AgentScheduler {
    private tasks = new Map<string, ScheduledAgentTask>();
    private timers = new Map<string, ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>();

    private adapter?: TypeormAdapter | null;

    constructor(
        private runtime: AgentRuntime,
        @Inject(ApplicationContext) private app: ApplicationContext
    ) {
        super();
    }

    @Runner()
    async start(): Promise<void> {
        await this.ensureAdapter();
        const persisted = await this.loadPersistedTasks();
        for (const task of persisted) {
            this.tasks.set(task.id, task);
            this.armTimer(task);
        }
    }

    @Shutdown()
    async stop(): Promise<void> {
        this.timers.forEach(timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
        this.timers.forEach(timer => clearInterval(timer as ReturnType<typeof setInterval>));
        this.timers.clear();
        this.tasks.clear();
    }

    async schedule(task: ScheduledAgentTask): Promise<ScheduledAgentTask> {
        const normalized = this.normalizeTask(task);
        this.tasks.set(normalized.id, normalized);
        await this.persistTask(normalized);
        await this.app.publishEvent(new AgentTaskScheduledEvent(this, normalized));
        this.armTimer(normalized);
        return normalized;
    }

    async cancel(taskId: string): Promise<void> {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer as ReturnType<typeof setTimeout>);
            clearInterval(timer as ReturnType<typeof setInterval>);
        }
        this.timers.delete(taskId);

        const task = this.tasks.get(taskId);
        if (!task) {
            await this.deleteTask(taskId);
            return;
        }

        const cancelledTask: ScheduledAgentTask = {
            ...task,
            cancelled: true,
            running: false,
            updatedAt: Date.now()
        };

        if (this.shouldRepeat(cancelledTask)) {
            this.tasks.set(taskId, cancelledTask);
            await this.persistTask(cancelledTask);
            return;
        }

        this.tasks.delete(taskId);
        await this.deleteTask(taskId);
    }

    getTasks(): ScheduledAgentTask[] {
        return Array.from(this.tasks.values()).filter(task => !task.cancelled);
    }

    private armTimer(task: ScheduledAgentTask): void {
        const existing = this.timers.get(task.id);
        if (existing) {
            clearTimeout(existing as ReturnType<typeof setTimeout>);
            clearInterval(existing as ReturnType<typeof setInterval>);
        }

        if (task.cancelled) {
            this.timers.delete(task.id);
            return;
        }

        const delay = Math.max((task.nextRunAt ?? task.runAt ?? Date.now()) - Date.now(), 0);
        const timer = setTimeout(() => {
            this.fireAndForget(task.id);
        }, delay);
        this.timers.set(task.id, timer);
    }

    private fireAndForget(taskId: string): void {
        void this.executeById(taskId).catch(error => this.handleBackgroundError(taskId, error));
    }

    private async executeById(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId) ?? await this.findPersistedTask(taskId);
        if (!task) {
            this.timers.delete(taskId);
            return;
        }
        await this.execute(task);
    }

    private async execute(task: ScheduledAgentTask): Promise<void> {
        if (task.cancelled || task.running) {
            return;
        }

        const runningTask: ScheduledAgentTask = {
            ...task,
            running: true,
            updatedAt: Date.now()
        };
        this.tasks.set(runningTask.id, runningTask);

        try {
            await this.persistTask(runningTask);
            await this.runtime.runTurn(runningTask.sessionId, runningTask.prompt);
            const currentTask = this.tasks.get(runningTask.id);
            if (currentTask?.cancelled) {
                this.tasks.set(currentTask.id, {
                    ...currentTask,
                    running: false,
                    lastRunAt: Date.now(),
                    updatedAt: Date.now()
                });
                await this.persistTask(this.tasks.get(currentTask.id)!);
                return;
            }

            const now = Date.now();
            const latestTask = this.tasks.get(runningTask.id);
            if (!latestTask || latestTask.cancelled) {
                return;
            }

            const completedTask: ScheduledAgentTask = {
                ...runningTask,
                running: false,
                lastRunAt: now,
                runCount: (runningTask.runCount ?? 0) + 1,
                failureCount: 0,
                lastError: undefined,
                updatedAt: now
            };

            if (this.shouldRepeat(completedTask)) {
                const rescheduledTask: ScheduledAgentTask = {
                    ...completedTask,
                    nextRunAt: this.resolveNextRun(completedTask, now)
                };
                await this.persistTask(rescheduledTask);
                this.tasks.set(rescheduledTask.id, rescheduledTask);
                this.armTimer(rescheduledTask);
                return;
            }

            const terminalTask: ScheduledAgentTask = {
                ...completedTask,
                cancelled: true
            };
            await this.persistTask(terminalTask);
            this.timers.delete(completedTask.id);
            this.tasks.delete(completedTask.id);
            await this.deleteTask(completedTask.id);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const latestTask = this.tasks.get(runningTask.id);
            if (!latestTask || latestTask.cancelled) {
                return;
            }
            const failedTask = this.createFailedTask(runningTask, err);
            if (this.shouldRepeat(failedTask)) {
                this.tasks.set(failedTask.id, failedTask);
                try {
                    await this.persistTask(failedTask);
                } catch {
                    return;
                }
                this.armTimer(failedTask);
                try {
                    await this.app.publishEvent(new AgentErrorEvent(this, failedTask.sessionId, err));
                } catch {
                    return;
                }
                return;
            }

            const terminalTask: ScheduledAgentTask = {
                ...failedTask,
                cancelled: true
            };
            try {
                await this.persistTask(terminalTask);
            } catch {
                return;
            }
            this.timers.delete(failedTask.id);
            this.tasks.delete(failedTask.id);
            try {
                await this.deleteTask(failedTask.id);
            } catch {
                return;
            }
            try {
                await this.app.publishEvent(new AgentErrorEvent(this, failedTask.sessionId, err));
            } catch {
                return;
            }
        }
    }

    private normalizeTask(task: ScheduledAgentTask): ScheduledAgentTask {
        this.validateSchedule(task);
        const now = Date.now();
        const scheduleType = this.detectScheduleType(task);
        return {
            ...task,
            scheduleType,
            cancelled: task.cancelled ?? false,
            running: task.running ?? false,
            createdAt: task.createdAt ?? now,
            updatedAt: task.updatedAt ?? now,
            nextRunAt: task.nextRunAt ?? this.resolveInitialNextRun({ ...task, scheduleType }, now),
            runCount: task.runCount ?? 0,
            failureCount: task.failureCount ?? 0,
            lastError: task.lastError
        };
    }

    private async ensureAdapter(): Promise<TypeormAdapter | null> {
        if (this.adapter !== undefined) {
            return this.adapter;
        }
        if (typeof (this.app as any)?.get !== 'function') {
            this.adapter = null;
            return this.adapter;
        }
        try {
            this.adapter = (this.app as any).get(TypeormAdapter, null) as TypeormAdapter | null;
        } catch {
            this.adapter = null;
        }
        return this.adapter;
    }

    private createFailedTask(task: ScheduledAgentTask, error: Error): ScheduledAgentTask {
        const now = Date.now();
        return {
            ...task,
            running: false,
            lastRunAt: now,
            updatedAt: now,
            failureCount: (task.failureCount ?? 0) + 1,
            lastError: error.message,
            nextRunAt: this.shouldRepeat(task) ? this.resolveNextRun(task, now) : task.nextRunAt
        };
    }

    private async handleBackgroundError(taskId: string, error: unknown): Promise<void> {
        const err = error instanceof Error ? error : new Error(String(error));
        const task = this.tasks.get(taskId);
        if (task) {
            const failedTask = this.createFailedTask(task, err);
            this.tasks.set(taskId, failedTask);
            try {
                await this.persistTask(failedTask);
            } catch {
                // keep in-memory failure state even when persistence is unavailable
            }
            try {
                await this.app.publishEvent(new AgentErrorEvent(this, failedTask.sessionId, err));
            } catch {
                return;
            }
            return;
        }
        try {
            await this.app.publishEvent(new AgentErrorEvent(this, '', err));
        } catch {
            return;
        }
    }

    private async loadPersistedTasks(): Promise<ScheduledAgentTask[]> {
        const adapter = await this.ensureAdapter();
        if (!adapter) {
            return [];
        }
        const repo = adapter.getRepository(AgentScheduledTaskEntity);
        const records = await repo.find({ order: { createdAt: 'ASC', id: 'ASC' } as any });
        const tasks = records
            .map(record => this.toTask(record))
            .filter(task => !task.cancelled)
            .map(task => this.recoverTask(task));

        await Promise.all(tasks.map(task => this.persistTask(task)));
        return tasks;
    }

    private async findPersistedTask(taskId: string): Promise<ScheduledAgentTask | undefined> {
        const adapter = await this.ensureAdapter();
        if (!adapter) {
            return undefined;
        }
        const repo = adapter.getRepository(AgentScheduledTaskEntity);
        const record = await repo.findOne({ where: { id: taskId } as any });
        return record ? this.recoverTask(this.toTask(record)) : undefined;
    }

    private async persistTask(task: ScheduledAgentTask): Promise<void> {
        const adapter = await this.ensureAdapter();
        if (!adapter) {
            return;
        }
        const repo = adapter.getRepository(AgentScheduledTaskEntity);
        const entity = repo.create({
            id: task.id,
            sessionId: task.sessionId,
            prompt: task.prompt,
            runAt: task.runAt,
            intervalMs: task.intervalMs,
            cronExpr: task.cronExpr,
            scheduleType: task.scheduleType,
            cancelled: task.cancelled ?? false,
            running: task.running ?? false,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            lastRunAt: task.lastRunAt,
            nextRunAt: task.nextRunAt,
            runCount: task.runCount ?? 0,
            failureCount: task.failureCount ?? 0,
            lastError: task.lastError
        });
        await repo.save(entity);
    }

    private async deleteTask(taskId: string): Promise<void> {
        const adapter = await this.ensureAdapter();
        if (!adapter) {
            return;
        }
        await adapter.getRepository(AgentScheduledTaskEntity).delete({ id: taskId } as any);
    }

    private recoverTask(task: ScheduledAgentTask): ScheduledAgentTask {
        const now = Date.now();
        const recovered = this.normalizeTask(task);
        if (!recovered.running) {
            return recovered;
        }
        return {
            ...recovered,
            running: false,
            updatedAt: now,
            nextRunAt: recovered.nextRunAt ?? this.resolveInitialNextRun(recovered, now) ?? now
        };
    }

    private shouldRepeat(task: ScheduledAgentTask): boolean {
        return task.scheduleType === 'interval' || task.scheduleType === 'cron' || !!(task.intervalMs && task.intervalMs > 0) || !!task.cronExpr;
    }

    private detectScheduleType(task: ScheduledAgentTask): ScheduledAgentTask['scheduleType'] {
        if (task.cronExpr) {
            return 'cron';
        }
        if (task.intervalMs && task.intervalMs > 0) {
            return 'interval';
        }
        return 'once';
    }

    private validateSchedule(task: ScheduledAgentTask): void {
        if (task.cronExpr && task.intervalMs && task.intervalMs > 0) {
            throw new Error('Scheduled task cannot define both cronExpr and intervalMs.');
        }
        if (task.scheduleType && task.scheduleType !== this.detectScheduleType(task)) {
            throw new Error(`Scheduled task scheduleType '${task.scheduleType}' does not match its timing fields.`);
        }
        if (!task.cronExpr && (!task.intervalMs || task.intervalMs <= 0) && task.runAt == null) {
            throw new Error('Scheduled task must define runAt, intervalMs, or cronExpr.');
        }
    }

    private resolveInitialNextRun(task: ScheduledAgentTask, now: number): number | undefined {
        if (task.cronExpr) {
            return NextRunCalculator.nextCronRun(task.cronExpr, now);
        }
        if (task.intervalMs && task.intervalMs > 0) {
            return task.runAt ?? now;
        }
        return task.runAt ?? now;
    }

    private resolveNextRun(task: ScheduledAgentTask, now: number): number | undefined {
        return NextRunCalculator.nextRun(task, now);
    }

    private toTask(record: AgentScheduledTaskEntity): ScheduledAgentTask {
        return {
            id: record.id,
            sessionId: record.sessionId,
            prompt: record.prompt,
            runAt: record.runAt == null ? undefined : Number(record.runAt),
            intervalMs: record.intervalMs == null ? undefined : Number(record.intervalMs),
            cronExpr: record.cronExpr ?? undefined,
            scheduleType: (record.scheduleType as any) ?? undefined,
            cancelled: !!record.cancelled,
            running: !!record.running,
            createdAt: record.createdAt == null ? undefined : Number(record.createdAt),
            updatedAt: record.updatedAt == null ? undefined : Number(record.updatedAt),
            lastRunAt: record.lastRunAt == null ? undefined : Number(record.lastRunAt),
            nextRunAt: record.nextRunAt == null ? undefined : Number(record.nextRunAt),
            runCount: record.runCount == null ? 0 : Number(record.runCount),
            failureCount: record.failureCount == null ? 0 : Number(record.failureCount),
            lastError: record.lastError ?? undefined
        };
    }
}
