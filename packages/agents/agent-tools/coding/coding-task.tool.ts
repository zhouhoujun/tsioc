import { randomUUID } from 'crypto';
import * as path from 'path';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Injector, Optional } from '@tsdi/ioc';
import { LlmTaskTool } from '../llm/llm-task.tool';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { AgentToolsOptions, defaultAgentToolsOptions } from '../src/options';
import {
    CodingTaskActionRecord,
    CodingTaskWorkerAggregate,
    CodingTaskCheckpointRecord,
    CodingTaskComplexity,
    CodingTaskExecutionMode,
    CodingTaskIsolatedFailure,
    CodingTaskPlanningStrategy,
    CodingTaskRecord,
    CodingTaskReport,
    CodingTaskWorkerRecord,
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

interface CapturedCodingDiff {
    summary: string;
    output: any;
    text?: string;
    workers?: any[];
}

interface CodingTaskExecutionReportContext {
    executionMode: CodingTaskExecutionMode;
    completedActions: number;
    failedActionId?: string;
    diff?: CapturedCodingDiff;
    workers: CodingTaskWorkerRecord[];
    aggregate?: CodingTaskWorkerAggregate;
    rollback: {
        available: boolean;
        checkpointId?: string;
        mode?: string;
        reason?: string;
    };
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
                enum: ['plan', 'create', 'run', 'get', 'list', 'cancel', 'rollback']
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
            persist: { type: 'boolean' },
            useWorktree: {
                type: 'boolean',
                description: 'Run the task in an isolated git worktree. Creates a branch, sets up a worktree directory, merges back on completion.'
            },
            parallel: {
                type: 'boolean',
                description: 'Execute actions in parallel. Requires useWorktree so each worker gets an isolated workspace.'
            },
            executionMode: {
                type: 'string',
                enum: ['sequential', 'parallel'],
                description: 'Execution strategy for task actions. Parallel mode requires useWorktree.'
            }
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
    private runner?: WorkspaceActionRunner | null;
    private readonly llmTool?: LlmTaskTool | null;
    private readonly injector?: Injector | null;
    private readonly toolsOptions?: AgentToolsOptions | null;
    private static readonly WORKTREE_FILE_TOOLS = new Set(['read_file', 'write_file', 'edit_file', 'list_dir', 'stat', 'mkdir', 'delete_file', 'move_file', 'copy_file']);
    private static readonly WORKTREE_WORKDIR_TOOLS = new Set(['terminal', 'git_operations', 'ai_cli']);

    constructor(
        @Optional() store?: CodingTaskStore | null,
        @Optional() runner?: WorkspaceActionRunner | null,
        @Optional() llmTool?: LlmTaskTool | null,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null }) toolsOptions?: AgentToolsOptions | null,
        @Optional() @Inject() injector?: Injector | null
    ) {
        this.store = store ?? new CodingTaskStore();
        this.runner = runner;
        this.llmTool = llmTool;
        this.toolsOptions = toolsOptions;
        this.injector = injector;
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
            case 'rollback':
                return this.handleRollback(input, context);
            default:
                throw new Error('Invalid action. Must be: plan, create, run, get, list, cancel, rollback.');
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

        const executionMode = this.resolveExecutionMode(input);
        if (executionMode === 'parallel' && !input?.useWorktree) {
            throw new Error('coding_task parallel execution requires useWorktree: true.');
        }

        const working = this.store.patch(sessionId, task.id, {
            status: 'running',
            actions: task.actions.map(action => ({
                ...action,
                status: 'pending',
                workerId: undefined,
                error: undefined,
                result: undefined
            })),
            metadata: {
                ...(task.metadata || {}),
                executionMode,
                useWorktree: input?.useWorktree === true
            }
        });

        const execution = executionMode === 'parallel'
            ? await this.executeActionsParallel(working, runner, context)
            : await this.executeActionsSequential(working, runner, context, input);
        const checkpoint = this.buildRollbackCheckpoint(working, execution, input);
        const rollbackSummary = checkpoint
            ? {
                available: true,
                checkpointId: checkpoint.id,
                mode: checkpoint.mode
            }
            : {
                available: false,
                reason: input?.useWorktree === true
                    ? 'No rollback patch was captured for this worktree task.'
                    : 'Rollback is only available for coding tasks that run with useWorktree: true.'
            };
        const report = this.buildExecutionReport(working, {
            executionMode,
            completedActions: execution.completedActions,
            failedActionId: execution.failedActionId,
            diff: execution.diff,
            workers: execution.workers,
            aggregate: this.buildWorkerAggregate(execution.workers),
            rollback: rollbackSummary
        });
        const aggregate = this.buildWorkerAggregate(execution.workers);

        const finalStatus = execution.failedActionId ? 'failed' : 'completed';
        const saved = this.store.patch(sessionId, working.id, {
            status: finalStatus,
            actions: working.actions,
            metadata: {
                ...(working.metadata || {}),
                ...(checkpoint ? {
                    checkpoints: [
                        ...this.getTaskCheckpoints(working),
                        checkpoint
                    ]
                } : {})
            },
            result: {
                executionMode,
                completedActions: execution.completedActions,
                failedActionId: execution.failedActionId,
                output: this.summarizeResultPayload(execution.output),
                ...(execution.diff ? { diff: execution.diff } : {}),
                ...(execution.workers.length ? { workers: execution.workers } : {}),
                ...(aggregate ? { aggregate } : {}),
                ...(report ? { report } : {}),
                error: execution.failedActionId ? working.actions.find(item => item.id === execution.failedActionId)?.error : undefined,
                rollback: rollbackSummary
            }
        });

        return {
            ran: true,
            task: saved,
            completedActions: execution.completedActions,
            failedActionId: execution.failedActionId,
            executionMode,
            diff: saved.result?.diff,
            workers: saved.result?.workers ?? [],
            aggregate: saved.result?.aggregate,
            report: saved.result?.report,
            summary: saved.result?.report?.summary,
            nextSteps: saved.result?.report?.nextSteps,
            risks: saved.result?.report?.risks,
            artifacts: saved.result?.report?.artifacts,
            rollback: saved.result?.rollback
        };
    }

    private async handleGet(input: any, context: AgentToolContext): Promise<any> {
        return {
            task: this.requireTask(context.sessionId, this.requireString(input?.task_id, 'task_id'))
        };
    }

    private async handleRollback(input: any, context: AgentToolContext): Promise<any> {
        const runner = this.requireRunner();
        const task = this.requireTask(context.sessionId, this.requireString(input?.task_id, 'task_id'));
        if (task.status === 'running') {
            throw new Error(`Coding task '${task.id}' is still running and cannot be rolled back.`);
        }
        if (task.status === 'rolled_back') {
            throw new Error(`Coding task '${task.id}' has already been rolled back.`);
        }

        const checkpoint = this.getLatestAvailableCheckpoint(task);
        if (!checkpoint) {
            throw new Error(`Coding task '${task.id}' does not have an available rollback checkpoint.`);
        }

        const rollbackPatches = checkpoint.patches
            .filter(item => typeof item.patch === 'string' && item.patch.trim())
            .slice()
            .reverse();
        if (!rollbackPatches.length) {
            throw new Error(`Coding task '${task.id}' does not have a reversible patch payload.`);
        }

        for (const [index, patch] of rollbackPatches.entries()) {
            await runner.run({
                id: `rollback-${task.id}-${index + 1}`,
                title: `Rollback ${task.id}`,
                tool: 'git_operations',
                input: {
                    action: 'apply_patch',
                    patch: patch.patch,
                    reverse: true
                },
                status: 'pending'
            }, {
                sessionId: context.sessionId,
                principalId: context.principalId
            });
        }

        const rolledBackAt = Date.now();
        const checkpoints = this.getTaskCheckpoints(task).map(entry => entry.id === checkpoint.id
            ? {
                ...entry,
                status: 'applied',
                appliedAt: rolledBackAt
            }
            : entry
        );
        const saved = this.store.patch(context.sessionId, task.id, {
            status: 'rolled_back',
            metadata: {
                ...(task.metadata || {}),
                checkpoints
            },
            result: {
                ...(task.result || {
                    executionMode: task.metadata?.executionMode || 'sequential',
                    completedActions: 0
                }),
                rollback: {
                    available: false,
                    checkpointId: checkpoint.id,
                    mode: checkpoint.mode,
                    rolledBackAt
                }
            }
        });

        return {
            rolledBack: true,
            checkpointId: checkpoint.id,
            task: saved
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

    private extractGitPatchText(value: any): string | undefined {
        const stdout = typeof value?.stdout === 'string' ? value.stdout : undefined;
        if (stdout && stdout.trim()) {
            return stdout;
        }
        return undefined;
    }

    private buildRollbackCheckpoint(
        task: CodingTaskRecord,
        execution: { diff?: CapturedCodingDiff; workers: CodingTaskWorkerRecord[] },
        input: any
    ): CodingTaskCheckpointRecord | undefined {
        if (input?.useWorktree !== true) {
            return undefined;
        }

        if (task.metadata?.executionMode === 'parallel') {
            const patches = execution.workers
                .filter(worker => worker.status === 'completed' && typeof worker.diff?.text === 'string' && worker.diff.text.trim())
                .map(worker => ({
                    workerId: worker.workerId,
                    branch: worker.branch,
                    worktreePath: worker.worktreePath,
                    patch: worker.diff.text
                }));
            if (!patches.length) {
                return undefined;
            }
            return {
                id: `checkpoint-${task.id}`,
                label: `Auto checkpoint for ${task.title}`,
                taskId: task.id,
                createdAt: Date.now(),
                mode: 'parallel_worktree',
                status: 'available',
                patches
            };
        }

        const patch = execution.diff?.text;
        if (!patch || !patch.trim()) {
            return undefined;
        }
        const worker = execution.workers[0];
        return {
            id: `checkpoint-${task.id}`,
            label: `Auto checkpoint for ${task.title}`,
            taskId: task.id,
            createdAt: Date.now(),
            mode: 'worktree',
            status: 'available',
            branch: worker?.branch,
            worktreePath: worker?.worktreePath,
            patches: [{
                workerId: worker?.workerId,
                branch: worker?.branch,
                worktreePath: worker?.worktreePath,
                patch
            }]
        };
    }

    private getTaskCheckpoints(task: CodingTaskRecord): CodingTaskCheckpointRecord[] {
        const checkpoints = task.metadata?.checkpoints;
        return Array.isArray(checkpoints) ? checkpoints : [];
    }

    private getLatestAvailableCheckpoint(task: CodingTaskRecord): CodingTaskCheckpointRecord | undefined {
        const checkpoints = this.getTaskCheckpoints(task)
            .filter(entry => entry && entry.status === 'available')
            .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
        return checkpoints[0];
    }

    private requireTask(sessionId: string, taskId: string): CodingTaskRecord {
        const task = this.store.get(sessionId, taskId);
        if (!task) {
            throw new Error(`Coding task '${taskId}' not found.`);
        }
        return task;
    }

    private requireRunner(): WorkspaceActionRunner {
        if (!this.runner && this.injector) {
            this.runner = this.injector.get(WorkspaceActionRunner, null);
        }
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

    private resolveExecutionMode(input: any): CodingTaskExecutionMode {
        if (typeof input?.executionMode === 'string') {
            if (input.executionMode === 'parallel' || input.executionMode === 'sequential') {
                return input.executionMode;
            }
            throw new Error('Invalid executionMode: must be "sequential" or "parallel".');
        }
        return input?.parallel === true ? 'parallel' : 'sequential';
    }

    private async executeActionsSequential(
        task: CodingTaskRecord,
        runner: WorkspaceActionRunner,
        context: AgentToolContext,
        input: any
    ): Promise<{ completedActions: number; failedActionId?: string; output?: any; diff?: CapturedCodingDiff; workers: CodingTaskWorkerRecord[] }> {
        const worktree = await this.setupWorktreeIfNeeded(input, task, runner, context);
        let completedActions = 0;
        let failedActionId: string | undefined;
        let lastOutput: any;
        let diff: CapturedCodingDiff | undefined;

        try {
            for (const rawAction of task.actions) {
                const action = worktree ? this.mapActionToWorktree(rawAction, worktree) : rawAction;
                const startedAt = Date.now();
                rawAction.status = 'running';
                rawAction.startedAt = startedAt;
                if (worktree) {
                    rawAction.workerId = 'worker-1';
                }
                this.store.patch(context.sessionId, task.id, { actions: task.actions });
                try {
                    const result = await runner.run(action, { sessionId: context.sessionId, principalId: context.principalId });
                    rawAction.status = 'completed';
                    rawAction.completedAt = Date.now();
                    rawAction.result = { summary: result.summary, output: result.output };
                    completedActions += 1;
                    lastOutput = result.output;
                } catch (err) {
                    failedActionId = rawAction.id;
                    rawAction.status = 'failed';
                    rawAction.completedAt = Date.now();
                    rawAction.error = err instanceof Error ? err.message : String(err);
                    break;
                }
                this.store.patch(context.sessionId, task.id, { actions: task.actions });
            }

            diff = worktree
                ? await this.captureWorktreeDiff(worktree, runner, context)
                : await this.captureWorkspaceDiffIfNeeded(task.actions, context);

            const workers = worktree ? [{
                workerId: 'worker-1',
                actionIds: task.actions.map(action => action.id),
                status: failedActionId ? 'failed' as const : 'completed' as const,
                startedAt: task.actions.find(action => action.startedAt)?.startedAt,
                completedAt: task.actions.filter(action => action.completedAt).slice(-1)[0]?.completedAt,
                branch: worktree.branch,
                worktreePath: worktree.relativePath,
                ...(diff ? { diff } : {}),
                output: this.summarizeResultPayload(lastOutput),
                ...(failedActionId ? { error: task.actions.find(action => action.id === failedActionId)?.error } : {}),
                report: this.buildWorkerReport(task, {
                    workerId: 'worker-1',
                    actionIds: task.actions.map(action => action.id),
                    status: failedActionId ? 'failed' : 'completed',
                    diff,
                    error: failedActionId ? task.actions.find(action => action.id === failedActionId)?.error : undefined,
                    branch: worktree.branch,
                    worktreePath: worktree.relativePath
                })
            }] : [];

            return {
                completedActions,
                failedActionId,
                output: lastOutput,
                diff,
                workers
            };
        } finally {
            if (worktree) {
                await this.teardownWorktree(worktree, runner, context, !failedActionId);
            }
        }
    }

    private async executeActionsParallel(
        task: CodingTaskRecord,
        runner: WorkspaceActionRunner,
        context: AgentToolContext
    ): Promise<{ completedActions: number; failedActionId?: string; output?: any; diff?: CapturedCodingDiff; workers: CodingTaskWorkerRecord[] }> {
        const workerRuns = task.actions.map((rawAction, index) => this.executeParallelWorker(task, rawAction, index, runner, context));
        const workers = await Promise.all(workerRuns);

        for (const worker of workers) {
            if (worker.worktree) {
                await this.teardownWorktree(worker.worktree, runner, context, worker.record.status === 'completed');
            }
        }

        const completedActions = workers.filter(worker => worker.record.status === 'completed').length;
        const failedAction = task.actions.find(action => action.status === 'failed');
        const failedActionId = failedAction?.id;
        const aggregatedDiff = this.aggregateParallelDiffs(workers.map(worker => worker.record));

        return {
            completedActions,
            failedActionId,
            output: {
                workers: workers.map(worker => ({
                    workerId: worker.record.workerId,
                    actionIds: worker.record.actionIds,
                    status: worker.record.status,
                    attemptCount: worker.record.attemptCount,
                    output: worker.record.output,
                    error: worker.record.error
                }))
            },
            diff: aggregatedDiff,
            workers: workers.map(worker => worker.record)
        };
    }

    private async executeParallelWorker(
        task: CodingTaskRecord,
        rawAction: CodingTaskActionRecord,
        index: number,
        runner: WorkspaceActionRunner,
        context: AgentToolContext
    ): Promise<{ record: CodingTaskWorkerRecord; worktree?: { path: string; branch: string; relativePath: string } }> {
        const workerId = `worker-${index + 1}`;
        const startedAt = Date.now();
        const workerOptions = this.getParallelWorkerOptions();
        rawAction.status = 'running';
        rawAction.startedAt = startedAt;
        rawAction.workerId = workerId;
        rawAction.completedAt = undefined;
        rawAction.error = undefined;
        rawAction.result = undefined;
        this.store.patch(context.sessionId, task.id, { actions: task.actions });

        let attemptCount = 0;
        let lastError: string | undefined;
        let lastWorktree: { path: string; branch: string; relativePath: string } | undefined;

        while (attemptCount <= workerOptions.parallelWorkerRetries) {
            attemptCount++;
            let worktree: { path: string; branch: string; relativePath: string } | undefined;
            try {
                rawAction.status = 'running';
                rawAction.error = undefined;
                this.store.patch(context.sessionId, task.id, { actions: task.actions });
                worktree = await this.setupWorktreeForWorker(task, workerId, runner, context);
                lastWorktree = worktree;
                const action = this.mapActionToWorktree(rawAction, worktree);
                const result = await this.runParallelWorkerAction(
                    action,
                    runner,
                    context,
                    workerId,
                    attemptCount,
                    workerOptions.parallelWorkerTimeoutMs
                );
                const completedAt = Date.now();
                const diff = await this.captureWorktreeDiff(worktree, runner, context);
                rawAction.status = 'completed';
                rawAction.completedAt = completedAt;
                rawAction.result = { summary: result.summary, output: result.output };
                this.store.patch(context.sessionId, task.id, { actions: task.actions });
                return {
                    record: {
                        workerId,
                        actionIds: [rawAction.id],
                        status: 'completed',
                        attemptCount,
                        startedAt,
                        completedAt,
                        branch: worktree.branch,
                        worktreePath: worktree.relativePath,
                        ...(diff ? { diff } : {}),
                        output: this.summarizeResultPayload(result.output),
                        report: this.buildWorkerReport(task, {
                            workerId,
                            actionIds: [rawAction.id],
                            status: 'completed',
                            diff,
                            branch: worktree.branch,
                            worktreePath: worktree.relativePath
                        })
                    },
                    worktree
                };
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                if (worktree) {
                    await this.teardownWorktree(worktree, runner, context, false);
                }
                if (attemptCount <= workerOptions.parallelWorkerRetries) {
                    continue;
                }
                break;
            }
        }

        const completedAt = Date.now();
        rawAction.status = 'failed';
        rawAction.completedAt = completedAt;
        rawAction.error = lastError || `Worker ${workerId} failed.`;
        this.store.patch(context.sessionId, task.id, { actions: task.actions });
        return {
            record: {
                workerId,
                actionIds: [rawAction.id],
                status: 'failed',
                attemptCount,
                startedAt,
                completedAt,
                branch: lastWorktree?.branch,
                worktreePath: lastWorktree?.relativePath,
                error: rawAction.error,
                report: this.buildWorkerReport(task, {
                    workerId,
                    actionIds: [rawAction.id],
                    status: 'failed',
                    error: rawAction.error,
                    branch: lastWorktree?.branch,
                    worktreePath: lastWorktree?.relativePath
                })
            },
            worktree: undefined
        };
    }

    private getParallelWorkerOptions(): { parallelWorkerTimeoutMs: number; parallelWorkerRetries: number } {
        const defaults = defaultAgentToolsOptions.codingTask ?? {};
        const configured = this.toolsOptions?.codingTask ?? {};
        const timeoutMs = typeof configured.parallelWorkerTimeoutMs === 'number'
            ? configured.parallelWorkerTimeoutMs
            : defaults.parallelWorkerTimeoutMs ?? 30000;
        const retries = typeof configured.parallelWorkerRetries === 'number'
            ? configured.parallelWorkerRetries
            : defaults.parallelWorkerRetries ?? 1;
        return {
            parallelWorkerTimeoutMs: Math.max(1, timeoutMs),
            parallelWorkerRetries: Math.max(0, Math.floor(retries))
        };
    }

    private async runParallelWorkerAction(
        action: CodingTaskActionRecord,
        runner: WorkspaceActionRunner,
        context: AgentToolContext,
        workerId: string,
        attemptCount: number,
        timeoutMs: number
    ) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([
                runner.run(action, { sessionId: context.sessionId, principalId: context.principalId }),
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => {
                        reject(new Error(`Worker "${workerId}" attempt ${attemptCount} timed out after ${timeoutMs}ms.`));
                    }, timeoutMs);
                })
            ]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    private aggregateParallelDiffs(workers: CodingTaskWorkerRecord[]): CapturedCodingDiff | undefined {
        const diffWorkers = workers.filter(worker => worker.diff);
        if (!diffWorkers.length) {
            return undefined;
        }
        return {
            summary: `${diffWorkers.length} worker diff(s) captured`,
            output: {
                workers: diffWorkers.map(worker => ({
                    workerId: worker.workerId,
                    actionIds: worker.actionIds,
                    branch: worker.branch,
                    worktreePath: worker.worktreePath,
                    diff: worker.diff
                }))
            },
            workers: diffWorkers.map(worker => ({
                workerId: worker.workerId,
                actionIds: worker.actionIds,
                branch: worker.branch,
                worktreePath: worker.worktreePath,
                diff: worker.diff
            }))
        };
    }

    private buildWorkerReport(
        task: CodingTaskRecord,
        worker: {
            workerId: string;
            actionIds: string[];
            status: 'completed' | 'failed';
            diff?: CapturedCodingDiff;
            error?: string;
            branch?: string;
            worktreePath?: string;
        }
    ): CodingTaskReport | undefined {
        const actions = task.actions.filter(action => worker.actionIds.includes(action.id));
        const completedTitles = actions
            .filter(action => action.status === 'completed')
            .map(action => action.title)
            .filter((title): title is string => !!title);
        return this.cleanReport({
            summary: worker.status === 'failed'
                ? worker.error || `${worker.workerId} failed`
                : worker.diff?.summary || `${worker.workerId} completed ${worker.actionIds.length} action${worker.actionIds.length === 1 ? '' : 's'}`,
            completed: completedTitles.length ? completedTitles : undefined,
            nextSteps: worker.status === 'failed'
                ? [
                    actions[0]?.title ? `inspect ${actions[0].title}` : `inspect ${worker.workerId}`,
                    'fix the failure and rerun'
                ]
                : worker.diff
                    ? ['review diff', 'verify changes']
                    : ['verify changes'],
            risks: worker.error ? [worker.error] : undefined,
            artifacts: [
                worker.diff ? 'diff' : '',
                worker.branch ? `branch:${worker.branch}` : '',
                worker.worktreePath ? `worktree:${worker.worktreePath}` : ''
            ].filter((item): item is string => !!item)
        });
    }

    private buildExecutionReport(
        task: CodingTaskRecord,
        execution: CodingTaskExecutionReportContext
    ): CodingTaskReport | undefined {
        const workerReports = execution.workers
            .map(worker => worker.report)
            .filter((report): report is CodingTaskReport => !!report);
        const aggregate = execution.aggregate;
        const failedAction = execution.failedActionId
            ? task.actions.find(action => action.id === execution.failedActionId)
            : undefined;
        const completedTitles = task.actions
            .filter(action => action.status === 'completed')
            .map(action => action.title)
            .filter((title): title is string => !!title);
        const totalActions = task.actions.length;

        return this.mergeReports([
            {
                summary: this.buildExecutionSummary(execution, totalActions),
                completed: completedTitles.length ? completedTitles : undefined,
                nextSteps: aggregate?.status === 'partial_failure'
                    ? this.mergeUniqueStrings([
                        execution.diff ? 'review completed worker diff' : '',
                        failedAction?.title ? `fix ${failedAction.title}` : 'fix the failed worker',
                        'rerun failed workers'
                    ])
                    : execution.failedActionId
                        ? [
                            failedAction?.title ? `fix ${failedAction.title}` : 'fix the failed action',
                            'rerun the task'
                        ]
                        : execution.diff || execution.workers.length
                            ? ['review diff', 'verify changes']
                            : ['verify changes'],
                risks: [
                    aggregate && aggregate.failedWorkers > 0
                        ? `${aggregate.failedWorkers} worker failure${aggregate.failedWorkers === 1 ? '' : 's'}`
                        : '',
                    execution.failedActionId && execution.rollback.available === false && execution.rollback.reason ? execution.rollback.reason : '',
                    failedAction?.error || ''
                ].filter((item): item is string => !!item),
                artifacts: [
                    execution.diff ? 'diff' : '',
                    execution.rollback.available === true && execution.rollback.checkpointId ? `checkpoint:${execution.rollback.checkpointId}` : ''
                ].filter((item): item is string => !!item)
            },
            ...workerReports
        ]);
    }

    private buildExecutionSummary(
        execution: CodingTaskExecutionReportContext,
        totalActions: number
    ): string {
        const aggregate = execution.aggregate;
        if (aggregate && aggregate.totalWorkers > 1) {
            if (aggregate.status === 'partial_failure') {
                return `${aggregate.completedWorkers}/${aggregate.totalWorkers} workers completed; ${aggregate.failedWorkers} failed${execution.diff?.summary ? ` · ${execution.diff.summary}` : ''}`;
            }
            if (aggregate.status === 'failed') {
                return `${aggregate.failedWorkers}/${aggregate.totalWorkers} workers failed`;
            }
            return execution.diff?.summary
                ? `${aggregate.completedWorkers}/${aggregate.totalWorkers} workers completed · ${execution.diff.summary}`
                : `${aggregate.completedWorkers}/${aggregate.totalWorkers} workers completed`;
        }
        return execution.diff?.summary
            || (execution.failedActionId
                ? `${execution.completedActions}/${totalActions} action${execution.completedActions === 1 ? '' : 's'} completed before failure`
                : `${execution.completedActions}/${totalActions} action${execution.completedActions === 1 ? '' : 's'} completed`);
    }

    private buildWorkerAggregate(workers: CodingTaskWorkerRecord[]): CodingTaskWorkerAggregate | undefined {
        if (!workers.length) {
            return undefined;
        }
        const completed = workers.filter(worker => worker.status === 'completed');
        const failed = workers.filter(worker => worker.status === 'failed');
        const isolatedFailures = failed
            .filter(worker => typeof worker.error === 'string' && worker.error.trim())
            .map(worker => this.toIsolatedFailure(worker));
        return {
            totalWorkers: workers.length,
            completedWorkers: completed.length,
            failedWorkers: failed.length,
            status: failed.length
                ? (completed.length ? 'partial_failure' : 'failed')
                : 'completed',
            successfulWorkerIds: completed.map(worker => worker.workerId),
            failedWorkerIds: failed.map(worker => worker.workerId),
            ...(isolatedFailures.length ? { isolatedFailures } : {})
        };
    }

    private toIsolatedFailure(worker: CodingTaskWorkerRecord): CodingTaskIsolatedFailure {
        return {
            workerId: worker.workerId,
            actionIds: worker.actionIds.slice(),
            error: String(worker.error || '').trim(),
            attemptCount: worker.attemptCount,
            branch: worker.branch,
            worktreePath: worker.worktreePath
        };
    }

    private mergeReports(reports: Array<CodingTaskReport | undefined>): CodingTaskReport | undefined {
        const summary = reports.map(report => report?.summary).find((value): value is string => !!value);
        const completed = this.mergeUniqueStrings(reports.flatMap(report => report?.completed || []));
        const nextSteps = this.mergeUniqueStrings(reports.flatMap(report => report?.nextSteps || []));
        const risks = this.mergeUniqueStrings(reports.flatMap(report => report?.risks || []));
        const artifacts = this.mergeUniqueStrings(reports.flatMap(report => report?.artifacts || []));

        return this.cleanReport({
            summary,
            completed: completed.length ? completed : undefined,
            nextSteps: nextSteps.length ? nextSteps : undefined,
            risks: risks.length ? risks : undefined,
            artifacts: artifacts.length ? artifacts : undefined
        });
    }

    private mergeUniqueStrings(values: unknown[]): string[] {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const value of values) {
            if (typeof value !== 'string') {
                continue;
            }
            const text = value.trim();
            if (!text || seen.has(text)) {
                continue;
            }
            seen.add(text);
            result.push(text);
        }
        return result;
    }

    private cleanReport(report: CodingTaskReport): CodingTaskReport | undefined {
        const cleaned: CodingTaskReport = {};
        if (typeof report.summary === 'string' && report.summary.trim()) {
            cleaned.summary = report.summary.trim();
        }
        if (Array.isArray(report.completed) && report.completed.length) {
            cleaned.completed = this.mergeUniqueStrings(report.completed);
        }
        if (Array.isArray(report.nextSteps) && report.nextSteps.length) {
            cleaned.nextSteps = this.mergeUniqueStrings(report.nextSteps);
        }
        if (Array.isArray(report.risks) && report.risks.length) {
            cleaned.risks = this.mergeUniqueStrings(report.risks);
        }
        if (Array.isArray(report.artifacts) && report.artifacts.length) {
            cleaned.artifacts = this.mergeUniqueStrings(report.artifacts);
        }
        return cleaned.summary || cleaned.completed?.length || cleaned.nextSteps?.length || cleaned.risks?.length || cleaned.artifacts?.length ? cleaned : undefined;
    }

    private async captureWorkspaceDiffIfNeeded(
        actions: CodingTaskActionRecord[],
        context: AgentToolContext
    ): Promise<CapturedCodingDiff | undefined> {
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
                output: this.summarizeResultPayload(diff.output),
                text: this.extractGitPatchText(diff.output)
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

    private async setupWorktreeIfNeeded(
        input: any,
        task: CodingTaskRecord,
        runner: WorkspaceActionRunner,
        context: AgentToolContext
    ): Promise<{ path: string; branch: string; relativePath: string } | null> {
        if (!input?.useWorktree) {
            return null;
        }
        return this.createNamedWorktree(task.id, runner, context);
    }

    private async setupWorktreeForWorker(
        task: CodingTaskRecord,
        workerId: string,
        runner: WorkspaceActionRunner,
        context: AgentToolContext
    ): Promise<{ path: string; branch: string; relativePath: string }> {
        const worktree = await this.createNamedWorktree(`${task.id}-${workerId}`, runner, context);
        if (!worktree) {
            throw new Error(`Failed to create worktree for ${workerId}.`);
        }
        return worktree;
    }

    private async createNamedWorktree(
        rawSuffix: string,
        runner: WorkspaceActionRunner,
        context: AgentToolContext
    ): Promise<{ path: string; branch: string; relativePath: string } | null> {
        const supported = new Set(runner.getSupportedTools());
        if (!supported.has('git_operations')) {
            return null;
        }

        const taskSuffix = rawSuffix.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24);
        const worktreeBranch = `coding-task/${taskSuffix}`;
        const worktreeDir = `.worktrees/${taskSuffix}`;

        try {
            await runner.run({
                id: 'worktree-branch',
                title: 'Create worktree branch',
                tool: 'git_operations',
                input: { action: 'branch_create', path: worktreeBranch },
                status: 'pending'
            }, { sessionId: context.sessionId, principalId: context.principalId });

            await runner.run({
                id: 'worktree-create',
                title: 'Create git worktree',
                tool: 'git_operations',
                input: { action: 'worktree_create', path: worktreeDir, branch: worktreeBranch },
                status: 'pending'
            }, { sessionId: context.sessionId, principalId: context.principalId });

            return { path: worktreeDir, branch: worktreeBranch, relativePath: worktreeDir };
        } catch {
            return null;
        }
    }

    private async teardownWorktree(
        worktree: { path: string; branch: string },
        runner: WorkspaceActionRunner,
        context: AgentToolContext,
        merge = true
    ): Promise<void> {
        const { branch, path: worktreePath } = worktree;
        const runCtx = { sessionId: context.sessionId, principalId: context.principalId };

        if (merge) {
            try {
                await runner.run({
                    id: 'worktree-merge',
                    title: 'Merge worktree branch',
                    tool: 'git_operations',
                    input: { action: 'worktree_merge', path: branch },
                    status: 'pending'
                }, runCtx);
            } catch {
                // merge may fail if conflicts exist
            }
        }

        try {
            await runner.run({
                id: 'worktree-remove',
                title: 'Remove worktree directory',
                tool: 'git_operations',
                input: { action: 'worktree_cleanup', path: worktreePath, force: true },
                status: 'pending'
            }, runCtx);
        } catch {
            // best-effort cleanup
        }

        try {
            await runner.run({
                id: 'worktree-branch-delete',
                title: 'Delete worktree branch',
                tool: 'git_operations',
                input: { action: 'branch_delete', path: branch },
                status: 'pending'
            }, runCtx);
        } catch {
            // best-effort cleanup
        }
    }

    private mapActionToWorktree(
        action: CodingTaskActionRecord,
        worktree: { relativePath: string }
    ): CodingTaskActionRecord {
        const input = { ...action.input };

        if (CodingTaskTool.WORKTREE_FILE_TOOLS.has(action.tool) && typeof input.path === 'string') {
            input.path = path.posix.join(worktree.relativePath, input.path);
        }
        if (CodingTaskTool.WORKTREE_WORKDIR_TOOLS.has(action.tool) && !input.workdir) {
            input.workdir = worktree.relativePath;
        }
        if (action.tool === 'glob_search') {
            if (typeof input.pattern === 'string') {
                input.pattern = path.posix.join(worktree.relativePath, input.pattern);
            }
            if (typeof input.glob === 'string') {
                input.glob = path.posix.join(worktree.relativePath, input.glob);
            }
        }

        return { ...action, input };
    }

    private async captureWorktreeDiff(
        worktree: { relativePath: string },
        runner: WorkspaceActionRunner,
        context: AgentToolContext
    ): Promise<CapturedCodingDiff | undefined> {
        try {
            const diff = await runner.run({
                id: 'worktree-diff',
                title: 'Inspect worktree diff',
                tool: 'git_operations',
                input: { action: 'diff', workdir: worktree.relativePath, args: ['--binary'] },
                status: 'pending'
            }, { sessionId: context.sessionId, principalId: context.principalId });
            return {
                summary: diff.summary,
                output: this.summarizeResultPayload(diff.output),
                text: this.extractGitPatchText(diff.output)
            };
        } catch {
            return undefined;
        }
    }
}
