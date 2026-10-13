import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { TodoStore, validateTodos, validatePlanQuality, PlanQualityResult, resolveSchedule, TodoScheduleResult } from './todo-store';
import { compilePlan, PlanCompileResult } from './plan-compiler';

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
                        content: { type: 'string', description: 'Required for new items; omit to preserve an existing item\u2019s content.' },
                        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
                        parentId: { type: 'string' },
                        kind: { type: 'string', enum: ['task', 'milestone', 'bug', 'feature', 'chore'] },
                        acceptance: { type: 'string' },
                        dependsOn: { type: 'array', items: { type: 'string' } },
                        estimate: { type: 'string' },
                        owner: { type: 'string' }
                    },
                    required: ['id']
                }
            },
            merge: {
                type: 'boolean',
                description: 'Partial update. Set true to update only the provided items and keep the remaining plan items unchanged. When false or omitted, the provided list REPLACES the entire plan, so send every item you want to keep.'
            },
            action: {
                type: 'string',
                description: 'Optional. "validate": check the plan quality without persisting. "decompose": compile the plan into evidence-aware atomic steps; without acceptAll it returns split proposals for confirmation and persists nothing, with acceptAll the accepted steps are stored as the current plan. "schedule": resolve the DAG and return an execution schedule without persisting. Any other value, or omitting `action`, UPDATES the current plan with `todos` (respecting `merge`).'
            },
            acceptAll: {
                type: 'boolean',
                description: 'When action is decompose, auto-accept every split proposal and persist the accepted steps as the current plan, instead of returning them for per-step confirmation.'
            },
            conjunctions: {
                type: 'array',
                items: { type: 'string' },
                description: 'When action is decompose, override the conjunction tokens used to detect multi-action steps (defaults to the built-in set).'
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

        if (input.action === 'validate') {
            return this.validateOnly(input.todos);
        }

        if (input.action === 'decompose') {
            return this.decomposeOnly(sessionId, input.todos, Boolean(input.acceptAll), input.conjunctions);
        }

        if (input.action === 'schedule') {
            return this.scheduleOnly(input.todos);
        }

        await this.assertNewItemsHaveContent(sessionId, input.todos);

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

    private async assertNewItemsHaveContent(sessionId: string, todos: any[]): Promise<void> {
        const plan = await this.store.readPlan(sessionId);
        const existingIds = new Set(plan.todos.map(item => item.id));
        for (const raw of todos) {
            const id = String(raw?.id ?? '').trim();
            const hasContent = typeof raw?.content === 'string' && raw.content.trim().length > 0;
            if (!hasContent && !existingIds.has(id)) {
                throw new Error(`Invalid todo input: content is required for new item '${id || '(missing id)'}'. To create a plan, send every new item with its content, or call action 'decompose' with acceptAll first to persist compiled steps.`);
            }
        }
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

    private async decomposeOnly(sessionId: string, todos: any[], acceptAll: boolean, conjunctions?: string[]): Promise<PlanCompileResult & { persisted: boolean }> {
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
        const result = compilePlan(normalized, { acceptAll, conjunctions });
        if (!acceptAll || !result.accepted.length) {
            return { ...result, persisted: false };
        }
        await this.store.replace(sessionId, result.accepted);
        return { ...result, persisted: true };
    }
}
