import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { TodoStore, validateTodos, validatePlanQuality, PlanQualityResult, resolveSchedule, TodoScheduleResult } from './todo-store';

@Injectable()
export class TodoTool implements AgentTool {
    name = 'todo';
    description = 'Read, update, or validate the current session todo list.';
    inputSchema = {
        type: 'object',
        properties: {
            todos: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
                        parentId: { type: 'string' },
                        kind: { type: 'string', enum: ['task', 'milestone', 'bug', 'feature', 'chore'] },
                        acceptance: { type: 'string' },
                        dependsOn: { type: 'array', items: { type: 'string' } },
                        estimate: { type: 'string' },
                        owner: { type: 'string' }
                    },
                    required: ['id', 'content', 'status']
                }
            },
            merge: { type: 'boolean' },
            action: {
                type: 'string',
                enum: ['validate', 'decompose', 'schedule'],
                description: 'validate: check quality without persisting. decompose: validate plan quality and return suggestions without persisting. schedule: resolve DAG and return execution schedule without persisting.'
            },
            expectedRevision: { type: 'number', minimum: 0 }
        }
    };
    toolset = 'planning';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(private store: TodoStore = new TodoStore()) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const sessionId = context.sessionId;
        if (input?.todos === undefined) {
            return this.buildResult(sessionId);
        }
        if (!Array.isArray(input.todos)) {
            throw new Error('Invalid todo input: todos must be an array.');
        }

        if (input.action === 'validate' || input.action === 'decompose') {
            return this.validateOnly(input.todos);
        }

        if (input.action === 'schedule') {
            return this.scheduleOnly(input.todos);
        }

        if (input.expectedRevision !== undefined) {
            const result = input.merge
                ? await this.store.mergeAtRevision(sessionId, input.todos, Number(input.expectedRevision))
                : await this.store.replaceAtRevision(sessionId, input.todos, Number(input.expectedRevision));
            if (result && !Array.isArray(result) && (result as any).conflict) {
                return result;
            }
        } else if (input.merge) {
            await this.store.merge(sessionId, input.todos);
        } else {
            await this.store.replace(sessionId, input.todos);
        }
        return this.buildResult(sessionId);
    }

    private async buildResult(sessionId: string): Promise<any> {
        const plan = await this.store.readPlan(sessionId);
        const summary = await this.store.summarize(sessionId);
        const validation = validateTodos(plan.todos);
        const quality = validatePlanQuality(plan.todos);
        return {
            planId: plan.planId,
            revision: plan.revision,
            todos: plan.todos,
            summary,
            validation,
            quality
        };
    }

    private validateOnly(todos: any[]): { quality: PlanQualityResult; validation: ReturnType<typeof validateTodos> } {
        const normalized = todos.map((t: any) => ({
            id: String(t?.id ?? ''),
            content: String(t?.content ?? ''),
            status: String(t?.status ?? 'pending') as any,
            parentId: t?.parentId,
            kind: t?.kind,
            acceptance: t?.acceptance,
            dependsOn: t?.dependsOn,
            estimate: t?.estimate,
            owner: t?.owner
        }));
        return {
            quality: validatePlanQuality(normalized),
            validation: validateTodos(normalized)
        };
    }

    private scheduleOnly(todos: any[]): TodoScheduleResult {
        const normalized = todos.map((t: any) => ({
            id: String(t?.id ?? ''),
            content: String(t?.content ?? ''),
            status: String(t?.status ?? 'pending') as any,
            parentId: t?.parentId,
            kind: t?.kind,
            acceptance: t?.acceptance,
            dependsOn: t?.dependsOn,
            estimate: t?.estimate,
            owner: t?.owner
        }));
        return resolveSchedule(normalized);
    }
}
