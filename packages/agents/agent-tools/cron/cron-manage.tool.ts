import { AgentScheduler, AgentTool, AgentToolContext, NextRunCalculator, ScheduledAgentTask } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { randomUUID } from 'crypto';

const DEFAULT_MAX_PROMPT_LENGTH = 4000;

@Injectable()
export class CronManageTool implements AgentTool {
    name = 'cron_manage';
    description = 'Manage cron-scheduled prompts: list, create, remove, pause, resume, and inspect cron jobs. Complements the schedule tool with dedicated cron-focused operations.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['list', 'create', 'remove', 'pause', 'resume', 'get', 'runs'],
                description: 'Cron job management action.'
            },
            id: {
                type: 'string',
                description: 'Cron job ID (required for remove/pause/resume/get/runs).'
            },
            prompt: {
                type: 'string',
                description: 'Prompt to execute on schedule (required for create).'
            },
            cron_expr: {
                type: 'string',
                description: 'Cron expression (e.g., "0 9 * * *" for daily 9am). Required for create.'
            },
            name: {
                type: 'string',
                description: 'Optional human-readable name for the cron job.'
            },
            timezone: {
                type: 'string',
                description: 'Timezone (e.g., "Asia/Shanghai", "America/New_York").'
            }
        },
        required: ['action']
    };
    toolset = 'cron';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(ApplicationContext, { defaultValue: null })
        private app?: ApplicationContext | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const scheduler = this.resolveScheduler();
        if (!scheduler) {
            throw new Error('cron_manage requires an agent scheduler.');
        }
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list':
                return this.listJobs(scheduler, context.sessionId);
            case 'get':
                return this.getJob(scheduler, this.requireId(input), context.sessionId);
            case 'remove':
                return this.removeJob(scheduler, this.requireId(input), context.sessionId);
            case 'pause':
                return this.toggleJob(scheduler, this.requireId(input), context.sessionId, 'pause');
            case 'resume':
                return this.toggleJob(scheduler, this.requireId(input), context.sessionId, 'resume');
            case 'create':
                return this.createJob(scheduler, input, context.sessionId);
            case 'runs': {
                const tasks = scheduler.getTasks().filter(t => t.sessionId === context.sessionId);
                return {
                    runs: tasks.map(t => ({
                        id: t.id,
                        prompt: t.prompt,
                        cronExpr: t.cronExpr,
                        lastRunAt: t.lastRunAt,
                        nextRunAt: t.nextRunAt,
                        runCount: t.runCount ?? 0,
                        failureCount: t.failureCount ?? 0,
                        lastError: t.lastError,
                        paused: t.paused,
                        cancelled: t.cancelled
                    }))
                };
            }
            default:
                throw new Error('Invalid action. Must be: list, create, remove, pause, resume, get, runs.');
        }
    }

    private resolveScheduler(): AgentScheduler | undefined {
        return this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(AgentScheduler, null) as AgentScheduler | undefined
            : undefined;
    }

    private listJobs(scheduler: AgentScheduler, sessionId: string) {
        const jobs = scheduler.getTasks()
            .filter(t => t.sessionId === sessionId && t.cronExpr)
            .map(t => ({
                id: t.id,
                cronExpr: t.cronExpr,
                prompt: t.prompt,
                active: !t.paused && !t.cancelled,
                lastRunAt: t.lastRunAt,
                nextRunAt: t.nextRunAt,
                runCount: t.runCount ?? 0,
                failureCount: t.failureCount ?? 0
            }));
        return { jobs, total: jobs.length };
    }

    private getJob(scheduler: AgentScheduler, id: string, sessionId: string) {
        const task = this.findTask(scheduler, id, sessionId);
        if (!task || !task.cronExpr) {
            throw new Error(`Cron job '${id}' not found for this session.`);
        }
        return { job: this.toJobDetail(task) };
    }

    private async removeJob(scheduler: AgentScheduler, id: string, sessionId: string) {
        const task = this.findTask(scheduler, id, sessionId);
        if (!task) {
            throw new Error(`Cron job '${id}' not found for this session.`);
        }
        await scheduler.cancel(id);
        return { removed: true, id, cronExpr: task.cronExpr };
    }

    private async toggleJob(scheduler: AgentScheduler, id: string, sessionId: string, action: 'pause' | 'resume') {
        const task = this.findTask(scheduler, id, sessionId);
        if (!task) {
            throw new Error(`Cron job '${id}' not found for this session.`);
        }
        const fn = scheduler[action];
        if (typeof fn !== 'function') {
            throw new Error(`Scheduler does not support ${action}.`);
        }
        await fn.call(scheduler, id);
        return { [action]: true, id };
    }

    private async createJob(scheduler: AgentScheduler, input: any, sessionId: string) {
        const cronExpr = this.requireString(input?.cron_expr, 'cron_manage cron_expr');
        const prompt = this.requireString(input?.prompt, 'cron_manage prompt');
        const maxPromptLength = DEFAULT_MAX_PROMPT_LENGTH;
        if (prompt.length > maxPromptLength) {
            throw new Error(`Invalid cron prompt: must not exceed ${maxPromptLength} characters.`);
        }

        NextRunCalculator.validateCronExpr(cronExpr);

        const task: ScheduledAgentTask = {
            id: randomUUID(),
            sessionId,
            prompt,
            cronExpr,
            scheduleType: 'cron'
        };

        const scheduled = await scheduler.schedule(task);
        return {
            created: true,
            job: {
                id: scheduled.id,
                cronExpr: scheduled.cronExpr,
                prompt: scheduled.prompt,
                nextRunAt: scheduled.nextRunAt
            }
        };
    }

    private findTask(scheduler: AgentScheduler, id: string, sessionId: string): ScheduledAgentTask | undefined {
        const task = typeof scheduler.getTask === 'function'
            ? scheduler.getTask(id)
            : scheduler.getTasks().find(t => t.id === id);
        if (!task || task.sessionId !== sessionId) {
            return undefined;
        }
        return task;
    }

    private toJobDetail(task: ScheduledAgentTask) {
        return {
            id: task.id,
            cronExpr: task.cronExpr,
            prompt: task.prompt,
            active: !task.paused && !task.cancelled,
            paused: task.paused,
            cancelled: task.cancelled,
            createdAt: task.createdAt,
            lastRunAt: task.lastRunAt,
            nextRunAt: task.nextRunAt,
            runCount: task.runCount ?? 0,
            failureCount: task.failureCount ?? 0,
            lastError: task.lastError
        };
    }

    private requireId(input: any): string {
        return this.requireString(input?.id, 'cron_manage id');
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
