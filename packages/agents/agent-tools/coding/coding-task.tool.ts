import { randomUUID } from 'crypto';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable, Optional } from '@tsdi/ioc';
import { LlmTaskTool } from '../llm/llm-task.tool';
import {
    CodingTaskActionRecord,
    CodingTaskComplexity,
    CodingTaskPlanningStrategy,
    CodingTaskRecord,
    CodingTaskStore
} from './coding-task-store';
import { WorkspaceActionRunner } from './workspace-action-runner';

interface PlannedTaskDraft {
    title: string;
    summary?: string;
    strategy: CodingTaskPlanningStrategy;
    complexity: CodingTaskComplexity;
    model?: string;
    steps: string[];
    successCriteria: string[];
    actions: CodingTaskActionRecord[];
    fallbackReason?: string;
}

@Injectable()
export class CodingTaskTool implements AgentTool {
    private static readonly READ_ONLY_GIT_ACTIONS = new Set(['status', 'log', 'diff', 'show', 'branch', 'stash_list', 'log_graph', 'remote']);
    private static readonly WORKSPACE_MUTATION_TOOLS = new Set([
        'write_file',
        'edit_file',
        'mkdir',
        'copy_file',
        'move_file',
        'delete_file',
        'terminal',
        'process.start',
        'ai_cli'
    ]);
    name = 'coding_task';
    description = 'Plan and execute session-scoped coding tasks using workspace tools with complexity-aware model routing.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['plan', 'create', 'run', 'get', 'list', 'cancel']
            },
            task_id: { type: 'string' },
            goal: { type: 'string' },
            title: { type: 'string' },
            context: { type: 'string' },
            constraints: {
                type: 'array',
                items: { type: 'string' }
            },
            actions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        tool: { type: 'string' },
                        input: { type: 'object' }
                    },
                    required: ['tool', 'input']
                }
            },
            persist: { type: 'boolean' }
        },
        required: ['action']
    };
    toolset = 'project';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };
    private readonly store: CodingTaskStore;
    private readonly runner?: WorkspaceActionRunner | null;
    private readonly llmTool?: LlmTaskTool | null;

    constructor(
        @Optional() store?: CodingTaskStore | null,
        @Optional() runner?: WorkspaceActionRunner | null,
        @Optional() llmTool?: LlmTaskTool | null
    ) {
        this.store = store ?? new CodingTaskStore();
        this.runner = runner;
        this.llmTool = llmTool;
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const action = typeof input?.action === 'string' ? input.action : '';
        switch (action) {
            case 'plan':
                return this.handlePlan(input, context);
            case 'create':
                return this.handleCreate(input, context);
            case 'run':
                return this.handleRun(input, context);
            case 'get':
                return this.handleGet(input, context);
            case 'list':
                return { tasks: this.store.list(context.sessionId), total: this.store.list(context.sessionId).length };
            case 'cancel':
                return { cancelled: true, task: this.store.cancel(context.sessionId, this.requireString(input?.task_id, 'task_id')) };
            default:
                throw new Error('Invalid action. Must be: plan, create, run, get, list, cancel.');
        }
    }

    private async handlePlan(input: any, context: AgentToolContext): Promise<any> {
        const goal = this.requireString(input?.goal, 'goal');
        const draft = await this.planTaskDraft(input, context, goal);
        const task = this.createTaskRecord(input, goal, draft);
        if (input?.persist !== false) {
            this.store.save(context.sessionId, task);
        }
        return {
            planned: true,
            task,
            modelSelection: {
                complexity: draft.complexity,
                strategy: draft.strategy,
                model: draft.model,
                fallbackReason: draft.fallbackReason
            }
        };
    }

    private async handleCreate(input: any, context: AgentToolContext): Promise<any> {
        const goal = this.requireString(input?.goal, 'goal');
        const task = Array.isArray(input?.actions) && input.actions.length
            ? this.createTaskRecord(input, goal, {
                title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : this.deriveTitle(goal),
                summary: typeof input?.context === 'string' ? input.context.trim() : undefined,
                strategy: 'heuristic',
                complexity: this.estimateComplexity(this.buildPlanningText(goal, input?.context, this.resolveConstraints(input?.constraints))),
                steps: ['Execute the provided action sequence.'],
                successCriteria: ['All actions finish without errors.'],
                actions: this.normalizeActions(input.actions)
            })
            : this.createTaskRecord(input, goal, await this.planTaskDraft(input, context, goal));
        this.store.save(context.sessionId, task);
        return { created: true, task };
    }

    private async handleRun(input: any, context: AgentToolContext): Promise<any> {
        const runner = this.requireRunner();
        const sessionId = context.sessionId;
        let task = input?.task_id
            ? this.requireTask(sessionId, this.requireString(input?.task_id, 'task_id'))
            : null;

        if (!task) {
            const goal = this.requireString(input?.goal, 'goal');
            const draft = Array.isArray(input?.actions) && input.actions.length
                ? {
                    title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : this.deriveTitle(goal),
                    summary: typeof input?.context === 'string' ? input.context.trim() : undefined,
                    strategy: 'heuristic' as const,
                    complexity: this.estimateComplexity(this.buildPlanningText(goal, input?.context, this.resolveConstraints(input?.constraints))),
                    steps: ['Execute the provided action sequence.'],
                    successCriteria: ['All actions finish without errors.'],
                    actions: this.normalizeActions(input.actions)
                }
                : await this.planTaskDraft(input, context, goal);
            task = this.createTaskRecord(input, goal, draft);
            this.store.save(sessionId, task);
        }

        const working = this.store.patch(sessionId, task.id, {
            status: 'running',
            actions: task.actions.map(action => ({ ...action, status: 'pending', error: undefined, result: undefined }))
        });

        let completedActions = 0;
        let failedActionId: string | undefined;
        let lastOutput: any;

        for (const action of working.actions) {
            const startedAt = Date.now();
            action.status = 'running';
            action.startedAt = startedAt;
            this.store.patch(sessionId, working.id, { actions: working.actions });
            try {
                const result = await runner.run(action, { sessionId, principalId: context.principalId });
                action.status = 'completed';
                action.completedAt = Date.now();
                action.result = { summary: result.summary, output: result.output };
                completedActions += 1;
                lastOutput = result.output;
            } catch (err) {
                failedActionId = action.id;
                action.status = 'failed';
                action.completedAt = Date.now();
                action.error = err instanceof Error ? err.message : String(err);
                break;
            }
            this.store.patch(sessionId, working.id, { actions: working.actions });
        }

        const diff = await this.captureWorkspaceDiffIfNeeded(working.actions, context);

        const finalStatus = failedActionId ? 'failed' : 'completed';
        const saved = this.store.patch(sessionId, working.id, {
            status: finalStatus,
            actions: working.actions,
            result: {
                completedActions,
                failedActionId,
                output: this.summarizeResultPayload(lastOutput),
                ...(diff ? { diff } : {}),
                error: failedActionId ? working.actions.find(item => item.id === failedActionId)?.error : undefined
            }
        });

        return {
            ran: true,
            task: saved,
            completedActions,
            failedActionId
        };
    }

    private async handleGet(input: any, context: AgentToolContext): Promise<any> {
        return {
            task: this.requireTask(context.sessionId, this.requireString(input?.task_id, 'task_id'))
        };
    }

    private async planTaskDraft(input: any, context: AgentToolContext, goal: string): Promise<PlannedTaskDraft> {
        const constraints = this.resolveConstraints(input?.constraints);
        const planningText = this.buildPlanningText(goal, input?.context, constraints);
        const complexity = this.estimateComplexity(planningText);
        const llmDraft = await this.tryPlanWithLlm(goal, input?.context, constraints, context, complexity);
        if (llmDraft) {
            return llmDraft;
        }
        return {
            title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : this.deriveTitle(goal),
            summary: typeof input?.context === 'string' ? input.context.trim() : undefined,
            strategy: 'heuristic',
            complexity,
            steps: [
                'Inspect the workspace and identify the relevant files or modules.',
                'Apply the smallest change that satisfies the goal.',
                'Verify the result with available project checks.'
            ],
            successCriteria: [
                'The requested change is implemented.',
                'Changed files remain consistent with the existing project structure.'
            ],
            actions: this.buildHeuristicActions(goal)
        };
    }

    private async tryPlanWithLlm(
        goal: string,
        contextText: unknown,
        constraints: string[],
        context: AgentToolContext,
        complexity: CodingTaskComplexity
    ): Promise<PlannedTaskDraft | null> {
        if (!this.llmTool) {
            return null;
        }
        const supportedTools = this.requireRunner().getSupportedTools().join(', ');
        const planningPrompt = [
            'Produce a coding task plan as strict JSON.',
            'Return one JSON object only, with no markdown fences.',
            'Schema:',
            '{"title":"string","summary":"string","steps":["string"],"successCriteria":["string"],"actions":[{"title":"string","tool":"string","input":{}}]}',
            `Use only these tool names when proposing actions: ${supportedTools}.`,
            'Prefer platform-neutral workspace tools like list_dir, content_search, read_file, edit_file, write_file, mkdir, and git_operations.',
            'Use terminal, process.start, or ai_cli only when they are clearly necessary. Avoid OS-specific commands.',
            'If the goal is ambiguous, start with discovery actions instead of making edits.',
            `Task goal:\n${goal}`
        ];
        if (typeof contextText === 'string' && contextText.trim()) {
            planningPrompt.push(`Additional context:\n${contextText.trim()}`);
        }
        if (constraints.length) {
            planningPrompt.push(`Constraints:\n${constraints.map(item => `- ${item}`).join('\n')}`);
        }

        try {
            const llmResult = await this.llmTool.invoke({
                prompt: planningPrompt.join('\n\n'),
                system: 'You are a coding task planner. Output valid JSON only.'
            }, context);
            const parsed = this.parseJsonObject(llmResult?.content);
            return {
                title: this.requirePlannedString(parsed?.title, this.deriveTitle(goal)) ?? this.deriveTitle(goal),
                summary: this.requirePlannedString(parsed?.summary, undefined),
                strategy: 'llm',
                complexity,
                model: typeof llmResult?.model === 'string' ? llmResult.model : undefined,
                steps: this.normalizeStringArray(parsed?.steps, ['Inspect the workspace before editing.']),
                successCriteria: this.normalizeStringArray(parsed?.successCriteria, ['The requested coding task is completed successfully.']),
                actions: this.normalizeActions(parsed?.actions),
                fallbackReason: undefined
            };
        } catch (err) {
            return {
                title: this.deriveTitle(goal),
                summary: typeof contextText === 'string' && contextText.trim() ? contextText.trim() : undefined,
                strategy: 'heuristic',
                complexity,
                steps: [
                    'Inspect the workspace and identify the relevant files or modules.',
                    'Apply the smallest change that satisfies the goal.',
                    'Verify the result with available project checks.'
                ],
                successCriteria: [
                    'The requested change is implemented.',
                    'Changed files remain consistent with the existing project structure.'
                ],
                actions: this.buildHeuristicActions(goal),
                fallbackReason: err instanceof Error ? err.message : String(err)
            };
        }
    }

    private createTaskRecord(input: any, goal: string, draft: PlannedTaskDraft): CodingTaskRecord {
        const now = Date.now();
        return {
            id: typeof input?.task_id === 'string' && input.task_id.trim() ? input.task_id.trim() : `coding-${randomUUID()}`,
            title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : draft.title,
            goal,
            status: 'planned',
            createdAt: now,
            updatedAt: now,
            planning: {
                strategy: draft.strategy,
                complexity: draft.complexity,
                model: draft.model,
                summary: draft.summary,
                steps: draft.steps,
                successCriteria: draft.successCriteria,
                fallbackReason: draft.fallbackReason
            },
            actions: draft.actions
        };
    }

    private buildPlanningText(goal: string, contextText: unknown, constraints: string[]): string {
        return [goal, typeof contextText === 'string' ? contextText : '', constraints.join('\n')].filter(Boolean).join('\n');
    }

    private resolveConstraints(value: unknown): string[] {
        if (value == null) {
            return [];
        }
        if (!Array.isArray(value)) {
            throw new Error('Invalid constraints: must be an array of strings.');
        }
        return value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim());
    }

    private normalizeActions(value: unknown): CodingTaskActionRecord[] {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .filter(item => item && typeof item.tool === 'string' && item.tool.trim() && item.input && typeof item.input === 'object')
            .map((item, index) => ({
                id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `action-${index + 1}`,
                title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `${String(item.tool).trim()} step ${index + 1}`,
                tool: String(item.tool).trim(),
                input: { ...item.input },
                status: 'pending'
            }));
    }

    private normalizeStringArray(value: unknown, fallback: string[]): string[] {
        if (!Array.isArray(value)) {
            return fallback;
        }
        const normalized = value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim());
        return normalized.length ? normalized : fallback;
    }

    private buildHeuristicActions(goal: string): CodingTaskActionRecord[] {
        const query = this.extractSearchQuery(goal);
        const actions: CodingTaskActionRecord[] = [{
            id: 'action-1',
            title: 'Inspect workspace root',
            tool: 'list_dir',
            input: { path: '.', limit: 50 },
            status: 'pending'
        }];
        if (query) {
            actions.push({
                id: 'action-2',
                title: 'Search workspace for relevant code',
                tool: 'content_search',
                input: { query },
                status: 'pending'
            });
        }
        return actions;
    }

    private extractSearchQuery(goal: string): string {
        const quoted = goal.match(/["'`][^"'`]{2,}["'`]/)?.[0];
        if (quoted) {
            return quoted.slice(1, -1);
        }
        const keyword = goal
            .replace(/[^\w\u4e00-\u9fa5\s-]/g, ' ')
            .split(/\s+/)
            .map(part => part.trim())
            .find(part => part.length >= 4);
        return keyword ?? '';
    }

    private parseJsonObject(content: unknown): any {
        if (typeof content !== 'string' || !content.trim()) {
            throw new Error('Planner did not return JSON content.');
        }
        const trimmed = content.trim();
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const candidate = fenced?.[1] ?? trimmed;
        return JSON.parse(candidate);
    }

    private requirePlannedString(value: unknown, fallback?: string): string | undefined {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
        return fallback;
    }

    private estimateComplexity(input: string): CodingTaskComplexity {
        const normalized = input.toLowerCase();
        let score = 0;

        if (normalized.length > 120) score += 1;
        if (normalized.length > 500) score += 1;
        if (normalized.length > 1400) score += 1;
        if (input.split('\n').length >= 6) score += 1;

        const signals = [
            'architecture', 'architect', 'refactor', 'migration', 'tradeoff', 'design', 'root cause', 'postmortem',
            'optimize', 'optimise', 'algorithm', 'debug', 'investigate', 'prove', 'reason', 'analyze', 'analyse',
            'multi-step', 'step by step', 'system design', 'performance', 'security', 'concurrency', 'distributed',
            'planning', 'workflow', 'benchmark', '复杂', '推理', '分析', '架构', '排查', '根因', '优化', '设计', '迁移',
            '性能', '安全', '并发', '分布式', '代码'
        ];
        score += Math.min(4, signals.filter(signal => normalized.includes(signal)).length);

        if (score <= 1) {
            return 'simple';
        }
        if (score <= 3) {
            return 'moderate';
        }
        return 'complex';
    }

    private deriveTitle(goal: string): string {
        return goal.length > 80 ? `${goal.slice(0, 77)}...` : goal;
    }

    private summarizeResultPayload(value: any): any {
        if (value == null) {
            return undefined;
        }
        if (typeof value === 'string') {
            return value.length > 400 ? `${value.slice(0, 397)}...` : value;
        }
        if (typeof value !== 'object') {
            return value;
        }
        const text = JSON.stringify(value);
        if (text.length <= 400) {
            return value;
        }
        return { summary: text.slice(0, 397) + '...' };
    }

    private requireTask(sessionId: string, taskId: string): CodingTaskRecord {
        const task = this.store.get(sessionId, taskId);
        if (!task) {
            throw new Error(`Coding task '${taskId}' not found.`);
        }
        return task;
    }

    private requireRunner(): WorkspaceActionRunner {
        if (!this.runner) {
            throw new Error('Workspace action runner is not configured for coding_task.');
        }
        return this.runner;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    private async captureWorkspaceDiffIfNeeded(
        actions: CodingTaskActionRecord[],
        context: AgentToolContext
    ): Promise<{ summary: string; output: any; } | undefined> {
        const runner = this.requireRunner();
        const supported = new Set(runner.getSupportedTools());
        if (!supported.has('git_operations')) {
            return undefined;
        }
        const mutated = actions.some(action => action.status === 'completed' && this.didMutateWorkspace(action));
        if (!mutated) {
            return undefined;
        }
        try {
            const diff = await runner.run({
                id: 'action-diff',
                title: 'Inspect workspace diff',
                tool: 'git_operations',
                input: { action: 'diff' },
                status: 'pending'
            }, {
                sessionId: context.sessionId,
                principalId: context.principalId
            });
            return {
                summary: diff.summary,
                output: this.summarizeResultPayload(diff.output)
            };
        } catch {
            return undefined;
        }
    }

    private didMutateWorkspace(action: CodingTaskActionRecord): boolean {
        if (CodingTaskTool.WORKSPACE_MUTATION_TOOLS.has(action.tool)) {
            return true;
        }
        if (action.tool !== 'git_operations') {
            return false;
        }
        const gitAction = typeof action.input?.action === 'string' ? action.input.action.trim() : '';
        return !!gitAction && !CodingTaskTool.READ_ONLY_GIT_ACTIONS.has(gitAction);
    }
}
