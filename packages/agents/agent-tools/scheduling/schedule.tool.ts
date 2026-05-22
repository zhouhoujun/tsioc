import { AgentScheduler, AgentTool, AgentToolContext, NextRunCalculator, ScheduledAgentTask } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { randomUUID } from 'crypto';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

const DEFAULT_MAX_TASKS_PER_SESSION = 32;
const DEFAULT_MAX_PROMPT_LENGTH = 4000;
const DEFAULT_MAX_DELAY_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MIN_INTERVAL_MS = 60000;
const DEFAULT_MAX_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class ScheduleTool implements AgentTool {
    name = 'schedule';
    description = 'Create, inspect, update, pause, resume, list, or cancel scheduled prompts for the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['create', 'list', 'get', 'cancel', 'pause', 'resume', 'update'] },
            id: { type: 'string' },
            prompt: { type: 'string' },
            runAt: { type: 'number' },
            delayMs: { type: 'number' },
            intervalMs: { type: 'number' },
            cronExpr: { type: 'string' }
        },
        required: ['action']
    };
    toolset = 'scheduling';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(ApplicationContext, { defaultValue: null })
        private app?: ApplicationContext | null,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const scheduler = this.resolveScheduler();
        if (!scheduler) {
            throw new Error('Schedule tool requires an agent scheduler.');
        }
        const action = typeof input?.action === 'string' ? input.action : '';
        if (action === 'list') {
            return {
                tasks: scheduler.getTasks().filter((task: ScheduledAgentTask) => task.sessionId === context.sessionId)
            };
        }
        if (action === 'get') {
            const task = this.requireTaskForSession(scheduler, this.requireString(input?.id, 'schedule get id'), context.sessionId);
            return { task };
        }
        if (action === 'cancel') {
            const id = this.requireString(input?.id, 'schedule cancel id');
            this.requireTaskForSession(scheduler, id, context.sessionId);
            await scheduler.cancel(id);
            return { cancelled: true, id };
        }
        if (action === 'pause') {
            const id = this.requireString(input?.id, 'schedule pause id');
            this.requireTaskForSession(scheduler, id, context.sessionId);
            const paused = await this.requireSchedulerMethod(scheduler, 'pause', id);
            return { paused: true, task: paused };
        }
        if (action === 'resume') {
            const id = this.requireString(input?.id, 'schedule resume id');
            this.requireTaskForSession(scheduler, id, context.sessionId);
            const resumed = await this.requireSchedulerMethod(scheduler, 'resume', id);
            return { resumed: true, task: resumed };
        }
        if (action === 'update') {
            const id = this.requireString(input?.id, 'schedule update id');
            const task = this.requireTaskForSession(scheduler, id, context.sessionId);
            const patch = this.resolveUpdatePatch(input, task);
            const updated = await this.requireSchedulerUpdate(scheduler, id, patch);
            return { updated: true, task: updated };
        }
        if (action === 'create') {
            const prompt = this.requirePrompt(input?.prompt);
            const cronExpr = this.resolveCronExpr(input?.cronExpr);
            const runAt = cronExpr ? undefined : this.resolveRunAt(input?.runAt, input?.delayMs);
            const intervalMs = cronExpr ? undefined : this.resolveInterval(input?.intervalMs);
            this.ensureSessionCapacity(scheduler, context.sessionId);
            const task: ScheduledAgentTask = {
                id: randomUUID(),
                sessionId: context.sessionId,
                prompt,
                runAt,
                intervalMs,
                cronExpr,
                scheduleType: cronExpr ? 'cron' : intervalMs ? 'interval' : 'once'
            };
            const scheduled = await scheduler.schedule(task);
            return { scheduled: true, task: scheduled };
        }
        throw new Error('Invalid schedule input: action must be create, list, get, cancel, pause, resume, or update.');
    }

    private resolveScheduler(): AgentScheduler | undefined {
        return this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(AgentScheduler, null) as AgentScheduler | undefined
            : undefined;
    }

    private requireTaskForSession(scheduler: AgentScheduler, id: string, sessionId: string): ScheduledAgentTask {
        const task = typeof scheduler.getTask === 'function'
            ? scheduler.getTask(id)
            : scheduler.getTasks().find((item: ScheduledAgentTask) => item.id === id);
        if (!task || task.sessionId !== sessionId || task.cancelled) {
            throw new Error(`Scheduled task '${id}' was not found for this session.`);
        }
        return task;
    }

    private async requireSchedulerMethod(scheduler: AgentScheduler, method: 'pause' | 'resume', id: string): Promise<ScheduledAgentTask> {
        const fn = scheduler[method];
        if (typeof fn !== 'function') {
            throw new Error(`Schedule tool requires scheduler.${method}() support.`);
        }
        const task = await fn.call(scheduler, id);
        if (!task) {
            throw new Error(`Scheduled task '${id}' was not found for this session.`);
        }
        return task;
    }

    private async requireSchedulerUpdate(scheduler: AgentScheduler, id: string, patch: Partial<ScheduledAgentTask>): Promise<ScheduledAgentTask> {
        if (typeof scheduler.update !== 'function') {
            throw new Error('Schedule tool requires scheduler.update() support.');
        }
        const task = await scheduler.update(id, patch);
        if (!task) {
            throw new Error(`Scheduled task '${id}' was not found for this session.`);
        }
        return task;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    private requirePrompt(value: unknown): string {
        const prompt = this.requireString(value, 'schedule create prompt');
        const maxPromptLength = this.options?.schedule?.maxPromptLength ?? DEFAULT_MAX_PROMPT_LENGTH;
        if (prompt.length > maxPromptLength) {
            throw new Error(`Invalid schedule create prompt: must not exceed ${maxPromptLength} characters.`);
        }
        return prompt;
    }

    private resolveUpdatePatch(input: any, currentTask: ScheduledAgentTask): Partial<ScheduledAgentTask> {
        const patch: Partial<ScheduledAgentTask> = {};
        if (input?.prompt !== undefined) {
            patch.prompt = this.requirePrompt(input.prompt);
        }
        const cronExpr = this.resolveCronExpr(input?.cronExpr);
        const runAt = cronExpr ? undefined : this.resolveRunAt(input?.runAt, input?.delayMs);
        const intervalMs = cronExpr ? undefined : this.resolveInterval(input?.intervalMs);
        if (input?.cronExpr !== undefined) {
            patch.cronExpr = cronExpr;
            patch.intervalMs = undefined;
            patch.runAt = undefined;
            patch.scheduleType = 'cron';
        } else if (input?.intervalMs !== undefined) {
            patch.intervalMs = intervalMs;
            patch.cronExpr = undefined;
            patch.runAt = runAt ?? currentTask.runAt;
            patch.scheduleType = 'interval';
        } else if (input?.runAt !== undefined || input?.delayMs !== undefined) {
            patch.runAt = runAt;
            patch.cronExpr = undefined;
            patch.intervalMs = undefined;
            patch.scheduleType = 'once';
        }
        if (!Object.keys(patch).length) {
            throw new Error('Invalid schedule update input: provide at least one mutable field.');
        }
        return patch;
    }

    private ensureSessionCapacity(scheduler: AgentScheduler, sessionId: string): void {
        const maxTasksPerSession = this.options?.schedule?.maxTasksPerSession ?? DEFAULT_MAX_TASKS_PER_SESSION;
        const count = scheduler.getTasks().filter((task: ScheduledAgentTask) => task.sessionId === sessionId).length;
        if (count >= maxTasksPerSession) {
            throw new Error(`Scheduled task limit reached for this session (${maxTasksPerSession}).`);
        }
    }

    private resolveRunAt(runAt: unknown, delayMs: unknown): number | undefined {
        const maxDelayMs = this.options?.schedule?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
        if (typeof runAt === 'number') {
            if (!Number.isFinite(runAt) || runAt < 0) {
                throw new Error('Invalid schedule runAt: must be a finite timestamp.');
            }
            if (runAt > Date.now() + maxDelayMs) {
                throw new Error(`Invalid schedule runAt: must be within ${maxDelayMs} ms from now.`);
            }
            return runAt;
        }
        if (typeof delayMs === 'number') {
            if (!Number.isFinite(delayMs) || delayMs < 0) {
                throw new Error('Invalid schedule delayMs: must be a finite non-negative number.');
            }
            if (delayMs > maxDelayMs) {
                throw new Error(`Invalid schedule delayMs: must not exceed ${maxDelayMs}.`);
            }
            return Date.now() + delayMs;
        }
        return undefined;
    }

    private resolveInterval(intervalMs: unknown): number | undefined {
        if (intervalMs === undefined) {
            return undefined;
        }
        const minIntervalMs = this.options?.schedule?.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
        const maxIntervalMs = this.options?.schedule?.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS;
        if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs) || intervalMs < minIntervalMs || intervalMs > maxIntervalMs) {
            throw new Error(`Invalid schedule intervalMs: must be a finite number between ${minIntervalMs} and ${maxIntervalMs}.`);
        }
        return intervalMs;
    }

    private resolveCronExpr(value: unknown): string | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid schedule cronExpr: must be a non-empty string.');
        }
        const cronExpr = value.trim();
        const minIntervalMs = this.options?.schedule?.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
        try {
            NextRunCalculator.validateCronExpr(cronExpr);
            NextRunCalculator.ensureCronMeetsMinInterval(cronExpr, minIntervalMs);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Invalid schedule cronExpr: ${message}`);
        }
        return cronExpr;
    }
}
