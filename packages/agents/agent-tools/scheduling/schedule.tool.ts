import { AGENT_SCHEDULER, AgentScheduler, AgentTool, AgentToolContext, ScheduledAgentTask } from '@tsdi/agent';
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
    description = 'Create, list, or cancel scheduled prompts for the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['create', 'list', 'cancel'] },
            id: { type: 'string' },
            prompt: { type: 'string' },
            runAt: { type: 'number' },
            delayMs: { type: 'number' },
            intervalMs: { type: 'number' }
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
        if (action === 'cancel') {
            const id = this.requireString(input?.id, 'schedule cancel id');
            const task = scheduler.getTasks().find((item: ScheduledAgentTask) => item.id === id && item.sessionId === context.sessionId);
            if (!task) {
                throw new Error(`Scheduled task '${id}' was not found for this session.`);
            }
            await scheduler.cancel(id);
            return { cancelled: true, id };
        }
        if (action === 'create') {
            const prompt = this.requirePrompt(input?.prompt);
            const runAt = this.resolveRunAt(input?.runAt, input?.delayMs);
            const intervalMs = this.resolveInterval(input?.intervalMs);
            this.ensureSessionCapacity(scheduler, context.sessionId);
            const task: ScheduledAgentTask = {
                id: randomUUID(),
                sessionId: context.sessionId,
                prompt,
                runAt,
                intervalMs
            };
            const scheduled = await scheduler.schedule(task);
            return { scheduled: true, task: scheduled };
        }
        throw new Error('Invalid schedule input: action must be create, list, or cancel.');
    }

    private resolveScheduler(): AgentScheduler | undefined {
        return this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(AGENT_SCHEDULER, null) as AgentScheduler | undefined
            : undefined;
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
}
