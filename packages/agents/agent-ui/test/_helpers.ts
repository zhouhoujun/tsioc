import expect = require('expect');
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createReadStream } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioPlaybackAdapter, AudioPlaybackOptions, Encodings, FileAdapter, FileDirectoryEntry, IReadable } from '@tsdi/common';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentCompensationEvent,
    MemoryStore,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent,
    InMemoryCommandExecutionControl,
    normalizeAgentWorkspaceIdentity
} from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleInputHistoryStore,
    AgentConsoleInputPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleApprovalRequest,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    AgentConsoleSessionChoice,
    AgentConsoleSessionProjectGroup,
    AgentConsoleWorkspaceMentionsProvider,
    AgentConsoleKeymap,
    AgentConsoleKeymapStore,
    AgentConsoleSettingsStore,
    AgentConsoleThemeStore,
    agentConsoleThemes,
    AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP,
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP,
    reduceAgentConsoleCommandExecution,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    AgentConsoleCommandExecution
} from '../src';
import { runAgentUiOrmApp } from '../testing/agent-orm';

export class TestFileAdapter extends FileAdapter {
    isAbsolute(target: string): boolean {
        return path.isAbsolute(target);
    }

    normalize(target: string): string {
        return path.normalize(target);
    }

    join(...targets: string[]): string {
        return path.join(...targets);
    }

    resolve(...targets: string[]): string {
        return path.resolve(...targets);
    }

    extname(target: string): string {
        return path.extname(target);
    }

    existsSync(target: string): boolean {
        return fs.existsSync(target);
    }

    read(target: string, options?: Encodings | any): IReadable {
        return createReadStream(target, options);
    }

    async find(): Promise<null> {
        return null;
    }

    async readText(target: string, encoding: Encodings = 'utf-8'): Promise<string> {
        const content = await fs.promises.readFile(target, encoding as BufferEncoding);
        return content.toString();
    }

    readTextSync(target: string, encoding: Encodings = 'utf-8'): string {
        return fs.readFileSync(target, encoding as BufferEncoding).toString();
    }

    async readJSON<T = any>(target: string): Promise<T> {
        return JSON.parse(await this.readText(target));
    }

    readJSONSync<T = any>(target: string): T {
        return JSON.parse(this.readTextSync(target));
    }

    async writeText(target: string, content: string, encoding: Encodings = 'utf-8'): Promise<void> {
        await fs.promises.writeFile(target, content, encoding as BufferEncoding);
    }

    async mkdir(target: string, options?: { recursive?: boolean }): Promise<void> {
        await fs.promises.mkdir(target, { recursive: options?.recursive ?? false });
    }

    async remove(target: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
        await fs.promises.rm(target, {
            recursive: options?.recursive ?? false,
            force: options?.force ?? false
        });
    }

    override async stat(target: string): Promise<any | null> {
        try {
            return await fs.promises.stat(target);
        } catch {
            return null;
        }
    }

    override async list(target: string): Promise<FileDirectoryEntry[]> {
        try {
            const entries = await fs.promises.readdir(target, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                path: path.join(target, entry.name),
                kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
            }));
        } catch {
            return [];
        }
    }
}

export class AudioCaptureStub extends AudioCaptureAdapter {
    events?: AudioCaptureSessionEvents;
    starts = 0;
    stops = 0;
    cancels = 0;
    available = true;
    startError?: Error;

    override get isAvailable(): boolean { return this.available; }
    override get missingComponents(): string[] { return this.available ? [] : ['microphone']; }
    override async start(events: AudioCaptureSessionEvents): Promise<void> {
        this.starts++;
        if (this.startError) throw this.startError;
        this.events = events;
    }
    override async stop(): Promise<void> { this.stops++; this.events?.onEnd?.(); }
    override async cancel(): Promise<void> { this.cancels++; }
    emit(chunk: string): void { this.events?.onChunk?.(Buffer.from(chunk)); }
}

export class AudioPlaybackStub extends AudioPlaybackAdapter {
    plays: Array<{ chunks: Uint8Array[]; options: AudioPlaybackOptions }> = [];
    stops = 0;
    available = true;
    override get isAvailable(): boolean { return this.available; }
    override get missingComponents(): string[] { return this.available ? [] : ['speaker']; }
    override async play(chunks: Uint8Array[], options: AudioPlaybackOptions): Promise<void> {
        this.plays.push({ chunks, options });
    }
    override async stop(): Promise<void> { this.stops++; }
}

export class RuntimeStub {
    calls: string[] = [];
    messages = [{ id: '1', role: 'assistant', content: 'ready', createdAt: 1 } as any];
    planModeSessions = new Set<string>();
    sandboxModes = new Map<string, 'off' | 'workspace' | 'network-block'>();
    turnMessages: any[] = [];
    turnProfiles: Array<string | undefined> = [];

    setPlanMode(sessionId: string, enabled: boolean): void {
        this.calls.push(`plan:${sessionId}:${enabled}`);
        if (enabled) {
            this.planModeSessions.add(sessionId);
        } else {
            this.planModeSessions.delete(sessionId);
        }
    }

    isPlanMode(sessionId: string): boolean {
        return this.planModeSessions.has(sessionId);
    }

    setSessionSandboxMode(sessionId: string, mode?: 'off' | 'workspace' | 'network-block' | null): void {
        this.calls.push(`sandbox:${sessionId}:${mode ?? 'default'}`);
        if (mode == null) {
            this.sandboxModes.delete(sessionId);
            return;
        }
        this.sandboxModes.set(sessionId, mode);
    }

    getSessionSandboxMode(sessionId: string): 'off' | 'workspace' | 'network-block' | undefined {
        return this.sandboxModes.get(sessionId);
    }

    delegationModes = new Map<string, 'disabled' | 'explicit' | 'proactive'>();

    setSessionDelegationMode(sessionId: string, mode?: 'disabled' | 'explicit' | 'proactive' | null): void {
        if (mode == null) {
            this.delegationModes.delete(sessionId);
            return;
        }
        this.delegationModes.set(sessionId, mode);
    }

    getSessionDelegationMode(sessionId: string): 'disabled' | 'explicit' | 'proactive' {
        return this.delegationModes.get(sessionId) ?? 'explicit';
    }

    async undoFileChange(): Promise<any> {
        this.calls.push('undo:file');
        return { filePath: '/ws/a.txt', restored: 'content' };
    }

    async redoFileChange(): Promise<any> {
        this.calls.push('redo:file');
        return { filePath: '/ws/a.txt', restored: 'content' };
    }

    async runTurn(sessionId: string, input: string, _principalId?: string, message?: any, profile?: string): Promise<any> {
        this.calls.push(`${sessionId}:${input}`);
        this.turnMessages.push(message);
        this.turnProfiles.push(profile);
        this.messages = [
            { id: '1', role: 'user', content: input, parts: message?.parts, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(_sessionId?: string): Promise<any[]> {
        return this.messages;
    }

    async *runStreamingTurn(sessionId: string, input: string, _principalId?: string, message?: any, profile?: string): AsyncGenerator<any> {
        this.calls.push(`${sessionId}:${input}`);
        this.turnMessages.push(message);
        this.turnProfiles.push(profile);
        yield { type: 'text', content: `Echo: ${input}` };
        yield { type: 'done', usage: { promptTokens: 5, completionTokens: 7, totalTokens: 12 } };
        this.messages = [
            { id: '1', role: 'user', content: input, parts: message?.parts, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
    }
}

export function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

export class FailingRuntimeStub extends RuntimeStub {
    override async runTurn(_sessionId: string, _input: string): Promise<any> {
        throw new Error('submit failed');
    }

    override async *runStreamingTurn(_sessionId: string, _input: string): AsyncGenerator<any> {
        throw new Error('submit failed');
    }
}

export class SchedulerStub {
    tasks: any[] = [];
    paused: string[] = [];
    resumed: string[] = [];
    cancelled: string[] = [];
    recovered: string[] = [];

    async schedule(task: any): Promise<any> {
        this.tasks.push(task);
        return task;
    }

    getTasks(): any[] {
        return this.tasks;
    }

    async pause(taskId: string): Promise<any> {
        this.paused.push(taskId);
        const task = this.tasks.find(item => item.id === taskId);
        if (!task) {
            return undefined;
        }
        Object.assign(task, { paused: true, running: false, updatedAt: Date.now() });
        return { ...task };
    }

    async resume(taskId: string): Promise<any> {
        this.resumed.push(taskId);
        const task = this.tasks.find(item => item.id === taskId);
        if (!task) {
            return undefined;
        }
        Object.assign(task, { paused: false, running: false, updatedAt: Date.now() });
        return { ...task };
    }

    async cancel(taskId: string): Promise<void> {
        this.cancelled.push(taskId);
        this.tasks = this.tasks.map(task => task.id === taskId ? { ...task, cancelled: true, updatedAt: Date.now() } : task);
    }

    async recover(taskId: string): Promise<any> {
        this.recovered.push(taskId);
        const task = this.tasks.find(item => item.id === taskId);
        if (!task) {
            return undefined;
        }
        Object.assign(task, { paused: false, running: false, cancelled: false, manualRecoveryRequired: false, updatedAt: Date.now() });
        return { ...task };
    }
}

export class ToolRegistryStub {
    activations: Array<{ sessionId: string; name: string }> = [];
    skills: any[] = [];
    plugins: any[] = [];

    getToolDefinitions(): any[] {
        return [{ name: 'read_file', toolset: 'filesystem', activation: { kind: 'deferred', activated: false } }];
    }

    async isToolActive(): Promise<boolean> {
        return false;
    }

    async activateTool(sessionId: string, name: string): Promise<boolean> {
        this.activations.push({ sessionId, name });
        return true;
    }

    async invoke(name: string, input?: any): Promise<any> {
        if (name === 'skill_list') {
            const query = String(input?.query || '').trim().toLowerCase();
            const skills = !query
                ? this.skills
                : this.skills.filter(skill => {
                    const fields = [skill.id, skill.title, skill.summary, skill.category, skill.source];
                    return fields.some(value => typeof value === 'string' && value.toLowerCase().includes(query));
                });
            return { skills };
        }
        if (name === 'read_skill') {
            const id = String(input?.id || '');
            return { skill: this.skills.find(skill => skill.id === id) };
        }
        if (name === 'plugins') return { plugins: this.plugins };
        return undefined;
    }
}

export class EventMulticasterStub {
    private listeners = new Map<any, Array<(event: any) => void | Promise<void>>>();

    addListener(eventType: any, handler: (event: any) => void | Promise<void>): void {
        const handlers = this.listeners.get(eventType) || [];
        handlers.push(handler);
        this.listeners.set(eventType, handlers);
    }

    removeListener(eventType: any, handler: (event: any) => void | Promise<void>): void {
        const handlers = this.listeners.get(eventType) || [];
        this.listeners.set(eventType, handlers.filter(item => item !== handler));
    }

    async emit(event: any): Promise<void> {
        const handlers = this.listeners.get(event.constructor) || [];
        for (const handler of handlers) {
            await handler(event);
        }
    }
}

export class ApplicationContextStub {
    readonly eventMulticaster = new EventMulticasterStub();
    closeCalls = 0;
    registry = new Map<any, any>();

    get(token: any, defaultValue?: any): any {
        return this.registry.has(token) ? this.registry.get(token) : defaultValue;
    }

    async close(): Promise<void> {
        this.closeCalls += 1;
    }
}

export class AppRpcStub {
    state?: Record<string, any>;
    tools?: any[];
    modelProfiles?: any[];
    sessionExports = new Map<string, any>();
    modelActivateHandlers = new Map<string, () => Promise<any>>();
    streamChunks?: any[];
    todoPlan?: any[];
    todoPlanBySession = new Map<string, any[]>();
    todoFailuresBySession = new Set<string>();
    codingTasks?: any[];
    codingTasksBySession = new Map<string, any[]>();
    codingTaskFailuresBySession = new Set<string>();
    codingTaskDetails = new Map<string, any>();
    codingTaskDetailHandlers = new Map<string, () => Promise<any>>();
    codingTaskDiffs = new Map<string, any>();
    codingTaskDiffHandlers = new Map<string, () => Promise<any>>();
    codingTaskCancelHandlers = new Map<string, () => Promise<any>>();
    codingTaskRetryHandlers = new Map<string, () => Promise<any>>();
    codingTaskRollbackHandlers = new Map<string, () => Promise<any>>();
    reviewAnnotationCacheByKey = new Map<string, Record<string, any>>();
    reviewAnnotationLoadHandlers = new Map<string, () => Promise<any>>();
    approvalRequests: any[] = [];
    approvedApprovals: string[] = [];
    deniedApprovals: string[] = [];
    compactResult?: Record<string, any>;
    shareResult?: Record<string, any> | null = null;
    shareTokens: string[] = [];
    rejectedActions: any[] = [];
    retryResult?: Record<string, any> | null = null;
    summaryQualityAggregates: any[] = [];
    summaryQualityRecords: any[] = [];
    summaryQualityTrend: any[] = [];
    compactionHistoryRecords: any[] = [];
    compactionHistoryAggregates: any[] = [];
    compactionHistoryTrend: any[] = [];
    usageStats: Record<string, any> | null = null;
    turnDiagnosticsAggregate: Record<string, any> | null = null;
    turnDiagnosticsRecords: any[] = [];
    turnDiagnosticsTrend: any[] = [];
    sandboxModes = new Map<string, string>();
    delegationModes = new Map<string, string>();
    audioStatesBySession = new Map<string, { bufferedBytes: number; chunks: string[] }>();
    audioStatusOverride: Record<string, any> | null = null;
    gitStepSnapshots: any[] = [];
    gitStepSnapshotDiffs = new Map<string, any>();
    reviewDiffResult: Record<string, any> | null = null;
    reviewRuns: any[] = [];
    reviewRunDetail: Record<string, any> | null = null;
    reviewSaved: any[] = [];
    runTurnResults: Array<Record<string, any>> = [];
    pageResults?: Record<string, any> | null = null;
    sectionsBySession = new Map<string, any[]>();
    calls: Array<{ method: string; params?: any; context?: any }> = [];
    async request(method: string, params?: any, context?: any): Promise<any> {
        this.calls.push({ method, params, context });
        if (method === 'session.messages') {
            if (this.pageResults) {
                return this.pageResults;
            }
            return { messages: [] };
        }
        if (method === 'session.section.list') {
            return this.sectionsBySession.get(String(params?.sessionId || '')) || [];
        }
        if (method === 'app.state') {
            return this.state;
        }
        if (method === 'session.git_snapshot.list') {
            return this.gitStepSnapshots || [];
        }
        if (method === 'session.git_snapshot.diff') {
            return this.gitStepSnapshotDiffs.get(String(params?.ref || '')) ?? null;
        }
        if (method === 'session.git_snapshot.revert') {
            return { reverted: true, messageId: params?.messageId };
        }
        if (method === 'session.git_snapshot.unrevert') {
            return { reverted: true };
        }
        if (method === 'tools.activate') {
            return { activated: true, name: params?.name, sessionId: params?.sessionId };
        }
        if (method === 'review.diff') {
            if (!this.reviewDiffResult) {
                throw new Error('review diff unavailable');
            }
            return { review: this.reviewDiffResult };
        }
        if (method === 'review.list') {
            const commit = params?.commit;
            const runs = commit
                ? this.reviewRuns.filter(run => run.commitSha === commit)
                : this.reviewRuns;
            return { runs };
        }
        if (method === 'review.get') {
            return { run: this.reviewRunDetail };
        }
        if (method === 'review.save') {
            this.reviewSaved.push(params?.run);
            const saved = { id: `review-${this.reviewSaved.length}`, ...(params?.run || {}) };
            return { run: saved };
        }
        if (method === 'run.turn') {
            const result = this.runTurnResults.shift();
            if (result === undefined) {
                return { message: { content: '' } };
            }
            return result;
        }
        if (method === 'tools.list') {
            return this.tools || [];
        }
        if (method === 'model.list') {
            return this.modelProfiles || [];
        }
        if (method === 'model.activate') {
            const handler = this.modelActivateHandlers.get(params?.name);
            if (handler) {
                return await handler();
            }
            const matched = (this.modelProfiles || []).find(item => item.name === params?.name);
            return {
                modelProfile: params?.name,
                provider: matched?.provider || 'deepseek',
                model: matched?.model || 'deepseek-v4-flash'
            };
        }
        if (method === 'session.export') {
            const sessionId = String(params?.sessionId || 'console');
            const format = String(params?.format || 'json').trim().toLowerCase() === 'jsonl' ? 'jsonl' : 'json';
            const key = `${sessionId}:${format}`;
            const stored = this.sessionExports.get(key) ?? this.sessionExports.get(sessionId);
            if (stored) {
                return stored;
            }
            return {
                sessionId,
                format,
                exportedAt: 1,
                fileName: `agent-session-${sessionId}.${format === 'jsonl' ? 'jsonl' : 'json'}`,
                contentType: format === 'jsonl' ? 'application/x-ndjson; charset=utf-8' : 'application/json; charset=utf-8',
                content: format === 'jsonl'
                    ? `${JSON.stringify({ type: 'session', exportedAt: 1, session: { id: sessionId, messageCount: 1, toolCallCount: 0 } })}\n${JSON.stringify({ type: 'message', message: { id: 'm1', role: 'assistant', content: 'ready', createdAt: 1 } })}\n`
                    : JSON.stringify({
                        type: 'session_export',
                        format,
                        exportedAt: 1,
                        session: { id: sessionId, messageCount: 1, toolCallCount: 0 },
                        messages: [{ id: 'm1', role: 'assistant', content: 'ready', createdAt: 1 }],
                        toolCalls: []
                    }, null, 2),
                session: { id: sessionId, messageCount: 1, toolCallCount: 0 },
                messages: [{ id: 'm1', role: 'assistant', content: 'ready', createdAt: 1 }],
                toolCalls: []
            };
        }
        if (method === 'session.sandbox_mode.set') {
            const sessionId = String(params?.sessionId || 'console');
            const mode = String(params?.mode || 'default');
            if (mode === 'default') {
                this.sandboxModes.delete(sessionId);
            } else {
                this.sandboxModes.set(sessionId, mode);
            }
            return { sessionId, mode };
        }
        if (method === 'session.sandbox_mode.get') {
            const sessionId = String(params?.sessionId || 'console');
            return { sessionId, mode: this.sandboxModes.get(sessionId) || 'default' };
        }
        if (method === 'session.delegation_mode.set') {
            const sessionId = String(params?.sessionId || 'console');
            const mode = String(params?.mode || 'explicit');
            if (mode === 'default' || mode === 'explicit') {
                this.delegationModes.delete(sessionId);
                return { sessionId, mode: 'explicit' };
            }
            this.delegationModes.set(sessionId, mode as 'disabled' | 'proactive');
            return { sessionId, mode };
        }
        if (method === 'session.delegation_mode.get') {
            const sessionId = String(params?.sessionId || 'console');
            return { sessionId, mode: this.delegationModes.get(sessionId) || 'explicit' };
        }
        if (method === 'todo.get') {
            if (this.todoFailuresBySession.has(params?.sessionId)) {
                throw new Error(`todo lookup failed for ${params?.sessionId}`);
            }
            const todos = this.todoPlanBySession.get(params?.sessionId) || this.todoPlan || [];
            return {
                sessionId: params?.sessionId || 'console',
                todos,
                summary: {
                    total: todos.length,
                    pending: todos.filter(item => item.status === 'pending').length,
                    in_progress: todos.filter(item => item.status === 'in_progress').length,
                    completed: todos.filter(item => item.status === 'completed').length,
                    cancelled: todos.filter(item => item.status === 'cancelled').length
                }
            };
        }
        if (method === 'coding_task.list') {
            if (this.codingTaskFailuresBySession.has(params?.sessionId)) {
                throw new Error(`coding task lookup failed for ${params?.sessionId}`);
            }
            const tasks = this.codingTasksBySession.get(params?.sessionId) || this.codingTasks || [];
            return {
                sessionId: params?.sessionId || 'console',
                tasks,
                total: tasks.length
            };
        }
        if (method === 'coding_task.get') {
            const handler = this.codingTaskDetailHandlers.get(params?.taskId);
            if (handler) {
                return {
                    sessionId: params?.sessionId || 'console',
                    task: await handler()
                };
            }
            return {
                sessionId: params?.sessionId || 'console',
                task: this.codingTaskDetails.get(params?.taskId) || null
            };
        }
        if (method === 'coding_task.diff') {
            const handler = this.codingTaskDiffHandlers.get(params?.taskId);
            if (handler) {
                return await handler();
            }
            return this.codingTaskDiffs.get(params?.taskId) || {
                sessionId: params?.sessionId || 'console',
                taskId: params?.taskId,
                executionMode: null,
                diff: null,
                workers: []
            };
        }
        if (method === 'review_annotations.save') {
            const cacheKey = String(params?.cacheKey || params?.sessionId || 'console').trim();
            this.reviewAnnotationCacheByKey.set(cacheKey, params?.cache || {});
            return { ok: true };
        }
        if (method === 'review_annotations.load') {
            const handler = this.reviewAnnotationLoadHandlers.get(params?.cacheKey);
            if (handler) {
                return await handler();
            }
            const cacheKey = String(params?.cacheKey || params?.sessionId || 'console').trim();
            return this.reviewAnnotationCacheByKey.get(cacheKey) || null;
        }
        if (method === 'approval.list') {
            const sessionId = params?.sessionId;
            return {
                sessionId: sessionId || null,
                requests: sessionId
                    ? this.approvalRequests.filter(item => item.sessionId === sessionId)
                    : this.approvalRequests
            };
        }
        if (method === 'approval.approve') {
            const requestId = params?.requestId;
            const request = this.approvalRequests.find(item => item.id === requestId);
            if (request) {
                this.approvedApprovals.push(requestId);
                this.approvalRequests = this.approvalRequests.filter(item => item.id !== requestId);
            }
            return { requestId, applied: !!request, decision: 'approved' };
        }
        if (method === 'approval.reject') {
            const requestId = params?.requestId;
            const request = this.approvalRequests.find(item => item.id === requestId);
            if (request) {
                this.deniedApprovals.push(requestId);
                this.approvalRequests = this.approvalRequests.filter(item => item.id !== requestId);
            }
            return { requestId, applied: !!request, decision: 'denied' };
        }
        if (method === 'summary_quality.list') {
            const provider = params?.provider;
            const records = provider
                ? this.summaryQualityRecords.filter(item => item.provider === provider)
                : this.summaryQualityRecords;
            return { records: records.slice(0, params?.limit ?? 200) };
        }
        if (method === 'summary_quality.stats') {
            const provider = params?.provider;
            const aggregates = provider
                ? this.summaryQualityAggregates.filter(item => item.provider === provider)
                : this.summaryQualityAggregates;
            return { aggregates };
        }
        if (method === 'summary_quality.trend') {
            const provider = params?.provider;
            const trend = provider
                ? this.summaryQualityTrend.filter(item => item.provider === provider)
                : this.summaryQualityTrend;
            return { trend };
        }
        if (method === 'compaction_history.list') {
            const sessionId = params?.sessionId;
            const records = sessionId
                ? this.compactionHistoryRecords.filter(item => item.sessionId === sessionId)
                : this.compactionHistoryRecords;
            return { records: records.slice(0, params?.limit ?? 200) };
        }
        if (method === 'compaction_history.stats') {
            const sessionId = params?.sessionId;
            const aggregates = sessionId
                ? this.compactionHistoryAggregates.filter(item => item.sessionId === sessionId)
                : this.compactionHistoryAggregates;
            return { aggregates };
        }
        if (method === 'compaction_history.trend') {
            const sessionId = params?.sessionId;
            const trend = sessionId
                ? this.compactionHistoryTrend.filter(item => item.sessionId === sessionId)
                : this.compactionHistoryTrend;
            return { trend };
        }
        if (method === 'usage.stats') {
            return { usage: this.usageStats };
        }
        if (method === 'turn_diagnostics.list') {
            const sessionId = params?.sessionId;
            const records = sessionId
                ? this.turnDiagnosticsRecords.filter(item => item.sessionId === sessionId)
                : this.turnDiagnosticsRecords;
            return { records: records.slice(0, params?.limit ?? 200) };
        }
        if (method === 'turn_diagnostics.stats') {
            const sessionId = params?.sessionId;
            const aggregate = sessionId
                ? (this.turnDiagnosticsAggregate && this.turnDiagnosticsAggregate.sessionIds?.includes(sessionId) ? this.turnDiagnosticsAggregate : null)
                : this.turnDiagnosticsAggregate;
            return { aggregate };
        }
        if (method === 'turn_diagnostics.trend') {
            const sessionId = params?.sessionId;
            const trend = sessionId
                ? this.turnDiagnosticsTrend.filter(item => item.sessionId === sessionId)
                : this.turnDiagnosticsTrend;
            return { trend };
        }
        if (method === 'coding_task.cancel') {
            const handler = this.codingTaskCancelHandlers.get(params?.taskId);
            if (handler) {
                return await handler();
            }
            const task = this.codingTaskDetails.get(params?.taskId) || (this.codingTasks || []).find(item => item.id === params?.taskId) || null;
            return {
                sessionId: params?.sessionId || 'console',
                taskId: params?.taskId,
                cancelled: true,
                task: task ? {
                    ...task,
                    status: 'cancelled'
                } : null
            };
        }
        if (method === 'coding_task.retry_failed') {
            const handler = this.codingTaskRetryHandlers.get(params?.taskId);
            if (handler) {
                return await handler();
            }
            const task = this.codingTaskDetails.get(params?.taskId) || (this.codingTasks || []).find(item => item.id === params?.taskId) || null;
            const retryTask = task ? {
                ...task,
                id: `${task.id}-retry`,
                title: `Retry failed workers: ${task.title}`,
                status: 'completed',
                result: {
                    ...(task.result || {}),
                    aggregate: task.result?.aggregate ? {
                        ...task.result.aggregate,
                        failedWorkers: 0,
                        completedWorkers: Number(task.result.aggregate.totalWorkers || 0),
                        status: 'completed',
                        successfulWorkerIds: ['worker-1', 'worker-2'],
                        failedWorkerIds: [],
                        isolatedFailures: []
                    } : undefined,
                    workers: Array.isArray(task.result?.workers)
                        ? task.result.workers.map((worker: any) => worker?.status === 'failed'
                            ? {
                                ...worker,
                                status: 'completed',
                                error: undefined
                            }
                            : worker)
                        : [],
                    rollback: {
                        available: true,
                        checkpointId: `checkpoint-${task.id}-retry`,
                        mode: 'parallel_worktree'
                    }
                },
                metadata: {
                    ...(task.metadata || {}),
                    retryOfTaskId: task.id,
                    retrySourceTaskId: task.id
                }
            } : null;
            if (retryTask) {
                this.codingTaskDetails.set(retryTask.id, retryTask);
                this.codingTaskDiffs.set(retryTask.id, {
                    sessionId: params?.sessionId || 'console',
                    taskId: retryTask.id,
                    executionMode: retryTask.result?.executionMode || 'parallel',
                    diff: retryTask.result?.diff || null,
                    workers: retryTask.result?.workers || []
                });
            }
            return {
                sessionId: params?.sessionId || 'console',
                taskId: params?.taskId,
                retried: !!retryTask,
                task: retryTask
            };
        }
        if (method === 'coding_task.rollback') {
            const handler = this.codingTaskRollbackHandlers.get(params?.taskId);
            if (handler) {
                return await handler();
            }
            const task = this.codingTaskDetails.get(params?.taskId) || (this.codingTasks || []).find(item => item.id === params?.taskId) || null;
            return {
                sessionId: params?.sessionId || 'console',
                taskId: params?.taskId,
                rolledBack: true,
                task: task ? {
                    ...task,
                    status: 'rolled_back',
                    result: {
                        ...(task.result || {}),
                        rollback: {
                            available: false,
                            checkpointId: `checkpoint-${task.id}`,
                            mode: task.result?.executionMode === 'parallel' ? 'parallel_worktree' : 'worktree',
                            rolledBackAt: Date.now()
                        }
                    }
                } : null
            };
        }
        if (method === 'audio.status') {
            if (this.audioStatusOverride) {
                return this.audioStatusOverride;
            }
            const sessionId = String(params?.sessionId || 'console');
            const state = this.audioStatesBySession.get(sessionId);
            return {
                sessionId,
                available: true,
                active: !!state,
                bufferedBytes: state?.bufferedBytes || 0
            };
        }
        if (method === 'audio.start') {
            const sessionId = String(params?.sessionId || 'console');
            this.audioStatesBySession.set(sessionId, { bufferedBytes: 0, chunks: [] });
            return { sessionId, ok: true, active: true };
        }
        if (method === 'audio.feed') {
            const sessionId = String(params?.sessionId || 'console');
            const state = this.audioStatesBySession.get(sessionId);
            if (!state) {
                return { sessionId, ok: false, error: 'no active voice session' };
            }
            const chunk = String(params?.chunk || '');
            state.bufferedBytes += Buffer.from(chunk, 'base64').length;
            state.chunks.push(chunk);
            return { sessionId, ok: true, bufferedBytes: state.bufferedBytes };
        }
        if (method === 'audio.end') {
            const sessionId = String(params?.sessionId || 'console');
            const state = this.audioStatesBySession.get(sessionId);
            if (!state) {
                return { sessionId, ok: false, error: 'no active voice session' };
            }
            this.audioStatesBySession.delete(sessionId);
            return {
                sessionId,
                ok: true,
                transcribed: 'hello voice input',
                reply: 'voice reply from gateway',
                audio: {
                    format: 'pcm16k',
                    chunks: [Buffer.from('voice audio').toString('base64')],
                    totalBytes: 11,
                    truncated: false
                },
                active: false
            };
        }
        if (method === 'session.compact') {
            const sessionId = String(params?.sessionId || 'console');
            const reason = typeof params?.reason === 'string' ? params.reason : undefined;
            return this.compactResult ?? {
                sessionId,
                compacted: true,
                reason,
                strategy: 'compacted',
                level: 'light',
                beforeMessageCount: 20,
                afterMessageCount: 10,
                beforeTokens: 8000,
                afterTokens: 4000,
                compactedMessageCount: 10,
                compressionRatio: 50,
                cumulativeTokenSavings: 4000,
                summaryInserted: true,
                summary: '[Context Summary — compressed 10 messages]'
            };
        }
        if (method === 'session.share.create') {
            const token = `tok_share_${this.shareTokens.length + 1}`;
            this.shareTokens.push(token);
            return this.shareResult ?? { id: `share-${token}`, token, url: `/api/share/${token}`, createdAt: Date.now() };
        }
        if (method === 'session.share.list') {
            return this.shareTokens.map(token => ({ token, url: `/api/share/${token}`, createdAt: Date.now() }));
        }
        if (method === 'session.share.revoke') {
            const token = String(params?.token || '');
            const existed = this.shareTokens.includes(token);
            this.shareTokens = this.shareTokens.filter(item => item !== token);
            return { revoked: existed, token };
        }
        if (method === 'harness.rejected_actions') {
            return { actions: this.rejectedActions };
        }
        if (method === 'harness.retry_rejected_action') {
            return this.retryResult ?? { retried: true, toolName: params?.toolName };
        }
        if (method === 'audio.cancel') {
            const sessionId = String(params?.sessionId || 'console');
            const cancelled = this.audioStatesBySession.delete(sessionId);
            return { sessionId, ok: true, cancelled };
        }
        return undefined;
    }

    async *stream(method: string, params?: any, context?: any): AsyncGenerator<any> {
        this.calls.push({ method, params, context });
        for (const chunk of this.streamChunks || []) {
            yield chunk;
        }
    }
}

export class SessionServiceStub extends AgentConsoleSessionService {
    sessions: AgentConsoleSessionChoice[] = [{ id: 'console', current: true }];
    projectGroups?: AgentConsoleSessionProjectGroup[];
    ensuredSessionIds: Array<string | undefined> = [];
    messagesBySession = new Map<string, any[]>();
    ensureSessionHandlers = new Map<string, () => Promise<AgentConsoleSessionChoice>>();
    loadMessagesHandlers = new Map<string, () => Promise<any[]>>();
    sectionsBySession = new Map<string, any[]>();
    sectionCreateCount = 0;
    renameCalls: Array<{ sessionId: string; sectionId: string; label: string }> = [];
    moveCalls: Array<{ sessionId: string; sectionId: string; beforeId?: string }> = [];
    deleteCalls: Array<{ sessionId: string; sectionId: string }> = [];
    rpcRef?: AppRpcStub | null;
    protected runtimeRef: RuntimeStub;

    constructor(runtimeSource: RuntimeStub) {
        super(undefined, undefined, runtimeSource as any);
        this.runtimeRef = runtimeSource;
    }

    override async compactSession(sessionId: string, reason?: string, context?: any): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('session.compact', { sessionId, reason }, context);
            return result && typeof result === 'object' ? result : { sessionId, compacted: false };
        }
        return { sessionId, compacted: false, error: 'compaction not supported by this runtime' };
    }

    override async listApprovals(sessionId?: string): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('approval.list', sessionId ? { sessionId } : {});
            return Array.isArray(result?.requests) ? result.requests : [];
        }
        return [];
    }

    override async decideApproval(decision: 'approve' | 'deny', requestId: string): Promise<Record<string, any> | null> {
        const rpc = this.rpcRef;
        if (rpc && requestId) {
            const result = await rpc.request(decision === 'approve' ? 'approval.approve' : 'approval.reject', { requestId });
            return result ?? null;
        }
        return null;
    }

    override async listGitStepSnapshots(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('session.git_snapshot.list', { sessionId }, context);
            return Array.isArray(result) ? result : [];
        }
        return super.listGitStepSnapshots(sessionId, context);
    }

    override async diffGitStepSnapshot(sessionId: string, ref: string, context?: any): Promise<Record<string, any> | null> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('session.git_snapshot.diff', { sessionId, ref }, context);
            return result && typeof result === 'object' ? result : null;
        }
        return super.diffGitStepSnapshot(sessionId, ref, context);
    }

    override async exportSession(sessionId: string, options?: { format?: 'json' | 'jsonl' }): Promise<any> {
        const rpc = this.rpcRef;
        if (rpc) {
            const format = options?.format === 'jsonl' ? 'jsonl' : 'json';
            const result = await rpc.request('session.export', { sessionId, format });
            return (this as any).normalizeExportResult(sessionId, format, result);
        }
        return super.exportSession(sessionId, options);
    }

    override async listSummaryQuality(options?: { provider?: string; limit?: number }): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('summary_quality.list', options ?? {});
            return Array.isArray(result?.records) ? result.records : [];
        }
        return [];
    }

    override async getSummaryQualityStats(provider?: string): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('summary_quality.stats', provider ? { provider } : {});
            return Array.isArray(result?.aggregates) ? result.aggregates : [];
        }
        return [];
    }

    override async getSummaryQualityTrend(options?: { provider?: string; limit?: number; bucketSize?: number; maxBuckets?: number }): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('summary_quality.trend', options ?? {});
            return Array.isArray(result?.trend) ? result.trend : [];
        }
        return [];
    }

    override async listCompactionHistory(sessionId: string, options?: { level?: string; limit?: number }): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('compaction_history.list', { sessionId, ...options });
            return Array.isArray(result?.records) ? result.records : [];
        }
        return [];
    }

    override async getCompactionHistoryStats(sessionId?: string): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('compaction_history.stats', sessionId ? { sessionId } : {});
            return Array.isArray(result?.aggregates) ? result.aggregates : [];
        }
        return [];
    }

    override async getCompactionHistoryTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('compaction_history.trend', { ...(sessionId ? { sessionId } : {}), ...options });
            return Array.isArray(result?.trend) ? result.trend : [];
        }
        return [];
    }

    override async listTurnDiagnostics(sessionId: string, options?: { limit?: number }): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('turn_diagnostics.list', { sessionId, ...options });
            return Array.isArray(result?.records) ? result.records : [];
        }
        return [];
    }

    override async getTurnDiagnosticsStats(sessionId?: string): Promise<Record<string, any> | null> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('turn_diagnostics.stats', sessionId ? { sessionId } : {});
            return result?.aggregate ?? null;
        }
        return null;
    }

    override async getUsageStats(sessionId?: string, options: { range?: 'daily' | 'weekly' | 'cumulative'; since?: number | string } = {}): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('usage.stats', { ...(sessionId ? { sessionId } : {}), ...options });
            const usage = result?.usage ?? { daily: {}, weekly: {}, cumulative: {} };
            return { ...usage, ...(options.range ? { selectedRange: options.range, selected: usage[options.range] } : {}) };
        }
        return { daily: {}, weekly: {}, cumulative: {} };
    }

    override async getVoiceStatus(sessionId?: string): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('audio.status', sessionId ? { sessionId } : {});
            return result ?? { available: false, active: false, bufferedBytes: 0 };
        }
        return { available: false, active: false, bufferedBytes: 0 };
    }

    override async startVoiceSession(
        sessionId: string,
        options?: { format?: 'pcm16k' | 'wav' | 'webm' }
    ): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (!rpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await rpc.request('audio.start', { sessionId, ...options })) ?? { ok: false, error: 'no response from gateway' };
    }

    override async feedVoiceAudio(sessionId: string, chunk: Uint8Array): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (!rpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        const base64 = Buffer.from(chunk).toString('base64');
        return (await rpc.request('audio.feed', { sessionId, chunk: base64 })) ?? { ok: false, error: 'no response from gateway' };
    }

    override async endVoiceSession(sessionId: string): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (!rpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await rpc.request('audio.end', { sessionId })) ?? { ok: false, error: 'no response from gateway' };
    }

    override async cancelVoiceSession(sessionId: string): Promise<Record<string, any>> {
        const rpc = this.rpcRef;
        if (!rpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await rpc.request('audio.cancel', { sessionId })) ?? { ok: false, error: 'no response from gateway' };
    }

    override async getTurnDiagnosticsTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }): Promise<Array<Record<string, any>>> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('turn_diagnostics.trend', { ...(sessionId ? { sessionId } : {}), ...options });
            return Array.isArray(result?.trend) ? result.trend : [];
        }
        return [];
    }

    override async ensureSession(sessionId?: string): Promise<AgentConsoleSessionChoice> {
        const resolvedId = sessionId || `session-${this.ensuredSessionIds.length + 1}`;
        const handler = this.ensureSessionHandlers.get(resolvedId);
        if (handler) {
            this.ensuredSessionIds.push(sessionId);
            return handler();
        }
        this.ensuredSessionIds.push(sessionId);
        const existing = this.sessions.find(item => item.id === resolvedId);
        if (!existing) {
            this.sessions = [{ id: resolvedId }, ...this.sessions];
        }
        this.sessions = this.sessions.map(item => ({
            ...item,
            current: item.id === resolvedId
        }));
        return this.sessions.find(item => item.id === resolvedId)!;
    }

    override async listSessions(currentSessionId?: string): Promise<AgentConsoleSessionChoice[]> {
        return this.sessions.map(item => ({
            ...item,
            current: item.id === currentSessionId
        }));
    }

    override async listProjectSessions(currentSessionId?: string): Promise<AgentConsoleSessionProjectGroup[]> {
        if (this.projectGroups) {
            return this.projectGroups.map(group => ({
                ...group,
                sessions: group.sessions.map(item => ({
                    ...item,
                    current: item.id === currentSessionId
                }))
            }));
        }
        const buckets = new Map<string, AgentConsoleSessionChoice[]>();
        for (const session of this.sessions) {
            const projectKey = String(session.projectId || '').trim()
                ? `project:${String(session.projectId).trim()}`
                : String(session.primaryThreadId || '').trim()
                    ? `thread:${String(session.primaryThreadId).trim()}`
                    : String(session.workspace || '').trim()
                        ? `workspace:${normalizeAgentWorkspaceIdentity(String(session.workspace).trim())}`
                        : `session:${session.id}`;
            const bucket = buckets.get(projectKey) || [];
            bucket.push(session);
            buckets.set(projectKey, bucket);
        }
        return Array.from(buckets.entries()).map(([projectKey, sessions]) => ({
            projectKey,
            projectId: sessions[0]?.projectId,
            label: sessions[0]?.projectId || sessions[0]?.workspace || sessions[0]?.primaryThreadId || sessions[0]?.id,
            workspace: String(sessions[0]?.workspace || ''),
            primaryThreadId: sessions[0]?.primaryThreadId,
            sessionCount: sessions.length,
            lastActiveAt: Math.max(...sessions.map(item => item.lastActiveAt || 0), 0),
            sessions: sessions.map(item => ({
                ...item,
                current: item.id === currentSessionId
            }))
        }));
    }

    override async loadMessages(sessionId: string): Promise<any[]> {
        const handler = this.loadMessagesHandlers.get(sessionId);
        if (handler) {
            return handler();
        }
        if (this.messagesBySession.has(sessionId)) {
            return this.messagesBySession.get(sessionId)!;
        }
        return this.runtimeRef.getMessages(sessionId);
    }

    override async loadMessagesPage(sessionId: string, context?: any, options?: { cursor?: string; before?: boolean; limit?: number; }): Promise<{ messages: any[]; sections?: any[]; nextCursor?: string; hasMore?: boolean; }> {
        const rpc = this.rpcRef;
        if (rpc) {
            const params: Record<string, any> = { sessionId };
            if (options?.cursor) {
                params.cursor = options.cursor;
            }
            if (options?.before) {
                params.before = true;
            }
            if (options?.limit != null) {
                params.limit = options.limit;
            }
            const page = await rpc.request('session.messages', params, context);
            if (page && typeof page === 'object' && Array.isArray(page.messages)) {
                return { messages: page.messages, sections: page.sections, nextCursor: page.nextCursor, hasMore: !!page.hasMore };
            }
            return { messages: Array.isArray(page) ? page : [] };
        }
        const messages = await this.loadMessages(sessionId);
        return { messages, sections: this.sectionsBySession.get(sessionId) };
    }

    override async createSection(sessionId: string, label: string, context?: any, options?: { beforeId?: string; }): Promise<any> {
        const rpc = this.rpcRef;
        if (rpc) {
            return rpc.request('session.section.create', { sessionId, label, ...(options?.beforeId ? { beforeId: options.beforeId } : {}) }, context);
        }
        const section = { id: `section-${this.sectionCreateCount++}`, label, createdAt: Date.now() };
        const list = this.sectionsBySession.get(sessionId) || [];
        list.push(section);
        this.sectionsBySession.set(sessionId, list);
        return section;
    }

    override async listSections(sessionId: string, context?: any): Promise<any[]> {
        const rpc = this.rpcRef;
        if (rpc) {
            const result = await rpc.request('session.section.list', { sessionId }, context);
            return Array.isArray(result) ? result : [];
        }
        return this.sectionsBySession.get(sessionId) || [];
    }

    override async renameSection(sessionId: string, sectionId: string, label: string, context?: any): Promise<void> {
        const rpc = this.rpcRef;
        if (rpc) {
            await rpc.request('session.section.rename', { sessionId, sectionId, label }, context);
            return;
        }
        this.renameCalls.push({ sessionId, sectionId, label });
    }

    override async moveSection(sessionId: string, sectionId: string, context?: any, options?: { beforeId?: string; }): Promise<void> {
        const rpc = this.rpcRef;
        if (rpc) {
            await rpc.request('session.section.move', { sessionId, sectionId, ...(options?.beforeId ? { beforeId: options.beforeId } : {}) }, context);
            return;
        }
        this.moveCalls.push({ sessionId, sectionId, beforeId: options?.beforeId });
    }

    override async deleteSection(sessionId: string, sectionId: string, context?: any): Promise<void> {
        const rpc = this.rpcRef;
        if (rpc) {
            await rpc.request('session.section.delete', { sessionId, sectionId }, context);
            return;
        }
        this.deleteCalls.push({ sessionId, sectionId });
        const list = (this.sectionsBySession.get(sessionId) || []).filter(item => item.id !== sectionId);
        this.sectionsBySession.set(sessionId, list);
    }
}

export class ApprovalManagerStub {
    pending: AgentConsoleApprovalRequest[] = [];
    approved: string[] = [];
    denied: string[] = [];

    getPending(): AgentConsoleApprovalRequest[] {
        return this.pending.slice();
    }

    approve(requestId: string): boolean {
        if (!this.pending.some(item => item.id === requestId)) {
            return false;
        }
        this.approved.push(requestId);
        this.pending = this.pending.filter(item => item.id !== requestId);
        return true;
    }

    reject(requestId: string): boolean {
        if (!this.pending.some(item => item.id === requestId)) {
            return false;
        }
        this.denied.push(requestId);
        this.pending = this.pending.filter(item => item.id !== requestId);
        return true;
    }
}

export class InputHistoryStoreStub extends AgentConsoleInputHistoryStore {
    entries: string[] = [];
    saveCalls: string[][] = [];
    workspaces: string[] = [];
    sessionIds: string[] = [];
    entriesByScope = new Map<string, string[]>();
    saveHandlers: Array<(entries: string[], workspace?: string, sessionId?: string) => Promise<void>> = [];

    protected scopeKey(workspace?: string, sessionId?: string): string {
        return `${String(workspace || '')}::${String(sessionId || '')}`;
    }

    setScopedEntries(workspace: string | undefined, sessionId: string | undefined, entries: string[]): void {
        this.entriesByScope.set(this.scopeKey(workspace, sessionId), entries.slice());
    }

    override async load(workspace?: string, sessionId?: string): Promise<string[]> {
        this.workspaces.push(String(workspace || ''));
        this.sessionIds.push(String(sessionId || ''));
        if (this.entriesByScope.size) {
            const merged: string[] = [];
            const seen = new Set<string>();
            const records = Array.from(this.entriesByScope.entries())
                .filter(([key]) => key.startsWith(`${String(workspace || '')}::`))
                .reverse();
            for (const [, values] of records) {
                for (const entry of values) {
                    if (!seen.has(entry)) {
                        seen.add(entry);
                        merged.push(entry);
                    }
                }
            }
            return merged;
        }
        return this.entries.slice();
    }

    override async save(entries: string[], workspace?: string, sessionId?: string): Promise<void> {
        const next = entries.slice();
        const handler = this.saveHandlers.shift();
        if (handler) {
            await handler(next, workspace, sessionId);
        }
        this.saveCalls.push(next);
        this.workspaces.push(String(workspace || ''));
        this.sessionIds.push(String(sessionId || ''));
        this.entries = next;
        this.entriesByScope.delete(this.scopeKey(workspace, sessionId));
        this.entriesByScope.set(this.scopeKey(workspace, sessionId), next);
    }
}

export 
class WorkspaceSessionStoreStub {
    sessions = new Map<string, any>();

    async get(sessionId: string): Promise<any> {
        return this.sessions.get(sessionId) || {
            sessionId,
            messages: [],
            createdAt: 0,
            updatedAt: 0
        };
    }

    async has(sessionId: string): Promise<boolean> {
        return this.sessions.has(sessionId);
    }

    async listSessionIds(): Promise<string[]> {
        return Array.from(this.sessions.keys());
    }

    async listProjects(): Promise<any[]> {
        const buckets = new Map<string, any>();
        for (const state of this.sessions.values()) {
            const projectKey = String(state.projectId || '').trim()
                ? `project:${String(state.projectId).trim()}`
                : String(state.primaryThreadId || '').trim()
                    ? `thread:${String(state.primaryThreadId).trim()}`
                    : String(state.workspace || '').trim()
                        ? `workspace:${normalizeAgentWorkspaceIdentity(String(state.workspace).trim())}`
                        : `session:${state.sessionId}`;
            const existing = buckets.get(projectKey) || {
                projectKey,
                projectId: state.projectId,
                workspace: state.workspace,
                primaryThreadId: state.primaryThreadId,
                sessionIds: [],
                lastActiveAt: 0
            };
            existing.sessionIds.push(state.sessionId);
            existing.lastActiveAt = Math.max(existing.lastActiveAt || 0, state.updatedAt || state.createdAt || 0);
            existing.primaryThreadId = existing.primaryThreadId || state.primaryThreadId;
            buckets.set(projectKey, existing);
        }
        return Array.from(buckets.values());
    }

    async listThreads(): Promise<any[]> {
        const buckets = new Map<string, any>();
        for (const state of this.sessions.values()) {
            const threadId = String(state.primaryThreadId || '').trim()
                ? String(state.primaryThreadId).trim()
                : `session:${state.sessionId}`;
            const existing = buckets.get(threadId) || {
                threadId,
                projectId: state.projectId,
                workspace: state.workspace,
                title: state.focusSummary || state.rootRequest,
                rootRequest: state.rootRequest,
                status: state.threadStatus ?? (state.sessionRole === 'review' ? 'completed' : 'active'),
                stage: state.sessionRole === 'review' ? 'review'
                    : state.sessionRole === 'worker' ? 'implementation'
                    : state.sessionRole === 'branch' ? 'discovery' : undefined,
                originThreadId: state.originThreadId,
                currentSessionId: state.sessionId,
                sessionIds: [],
                lastActiveAt: 0
            };
            const lastActiveAt = state.updatedAt || state.createdAt || 0;
            if (lastActiveAt > (existing.lastActiveAt || 0)) {
                existing.currentSessionId = state.sessionId;
                existing.title = state.focusSummary || state.rootRequest;
                existing.rootRequest = state.rootRequest;
                existing.status = state.threadStatus ?? (state.sessionRole === 'review' ? 'completed' : 'active');
                existing.stage = state.sessionRole === 'review' ? 'review'
                    : state.sessionRole === 'worker' ? 'implementation'
                    : state.sessionRole === 'branch' ? 'discovery' : undefined;
                existing.originThreadId = state.originThreadId;
            }
            existing.sessionIds.push(state.sessionId);
            existing.lastActiveAt = Math.max(existing.lastActiveAt || 0, lastActiveAt);
            buckets.set(threadId, existing);
        }
        return Array.from(buckets.values());
    }

    async append(sessionId: string, message: any): Promise<any> {
        const state = await this.get(sessionId);
        state.messages = [...(state.messages || []), message];
        this.sessions.set(sessionId, state);
        return state;
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        const state = await this.get(sessionId);
        state.summary = summary;
        this.sessions.set(sessionId, state);
    }

    async setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void> {
        const state = await this.get(sessionId);
        state.ownerPrincipalId = ownerPrincipalId;
        this.sessions.set(sessionId, state);
    }

    async setWorkspace(sessionId: string, workspace?: string): Promise<void> {
        const state = await this.get(sessionId);
        state.workspace = workspace;
        this.sessions.set(sessionId, state);
    }

    async setProjectMetadata(sessionId: string, metadata: any): Promise<void> {
        const state = await this.get(sessionId);
        Object.assign(state, {
            projectId: metadata?.projectId,
            primaryThreadId: metadata?.primaryThreadId,
            originThreadId: metadata?.originThreadId,
            sessionRole: metadata?.sessionRole,
            rootRequest: metadata?.rootRequest,
            focusSummary: metadata?.focusSummary,
            threadStatus: metadata?.threadStatus
        });
        this.sessions.set(sessionId, state);
    }

    async delete(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
    }

    async clear(): Promise<void> {
        this.sessions.clear();
    }
}


export function createConsoleParts(
    runtime: RuntimeStub,
    scheduler: SchedulerStub,
    toolRegistry?: ToolRegistryStub,
    app?: ApplicationContextStub,
    approvalManager?: ApprovalManagerStub,
    workspaceMentionsProvider?: AgentConsoleWorkspaceMentionsProvider,
    sessionService?: SessionServiceStub,
    appRpc?: AppRpcStub,
    agentOptions?: any,
    inputHistoryStore?: InputHistoryStoreStub,
    audioCapture?: AudioCaptureAdapter,
    audioPlayback?: AudioPlaybackAdapter
) {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    const bridge = new AgentConsoleEventBridge(state, runtime as any, toolRegistry as any, appRpc as any, app as any);
    const sessions = sessionService || new SessionServiceStub(runtime);
    if (sessions instanceof SessionServiceStub) {
        sessions.rpcRef = appRpc || null;
    }
    const component = new AgentConsoleComponent(
        state,
        runtime as any,
        scheduler as any,
        bridge,
        (agentOptions || { ui: { title: 'Console' } }) as any,
        toolRegistry as any,
        appRpc as any,
        sessions as any,
        approvalManager as any,
        workspaceMentionsProvider as any,
        inputHistoryStore as any,
        undefined,
        undefined,
        app as any,
        undefined,
        audioCapture,
        audioPlayback
    );
    return { state, bridge, component, sessionService: sessions };
}

export function createConsole(
    runtime: RuntimeStub,
    scheduler: SchedulerStub,
    toolRegistry?: ToolRegistryStub,
    app?: ApplicationContextStub,
    approvalManager?: ApprovalManagerStub,
    workspaceMentionsProvider?: AgentConsoleWorkspaceMentionsProvider,
    sessionService?: SessionServiceStub,
    appRpc?: AppRpcStub,
    agentOptions?: any,
    inputHistoryStore?: InputHistoryStoreStub
): AgentConsoleComponent {
    return createConsoleParts(
        runtime,
        scheduler,
        toolRegistry,
        app,
        approvalManager,
        workspaceMentionsProvider,
        sessionService,
        appRpc,
        agentOptions,
        inputHistoryStore
    ).component;
}

export function createReviewTask() {
    return {
        id: 'task-1',
        title: 'Patch handlers',
        goal: 'Patch handlers',
        status: 'completed',
        createdAt: 1,
        updatedAt: 2,
        planning: {
            strategy: 'heuristic',
            complexity: 'moderate',
            steps: ['Edit handlers'],
            successCriteria: ['Diff captured']
        },
        actions: [{
            id: 'edit-1',
            title: 'Edit',
            tool: 'edit_file',
            input: {},
            status: 'completed',
            workerId: 'worker-1'
        }],
        result: {
            executionMode: 'parallel',
            completedActions: 1,
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            rollback: {
                available: true,
                checkpointId: 'checkpoint-task-1',
                mode: 'parallel_worktree'
            },
            workers: [{
                workerId: 'worker-1',
                actionIds: ['edit-1'],
                status: 'completed',
                branch: 'coding-task/task1worker1',
                worktreePath: '.worktrees/task1worker1'
            }]
        },
        metadata: {
            executionMode: 'parallel',
            useWorktree: true,
            checkpoints: [{
                id: 'checkpoint-task-1',
                label: 'pre-run',
                taskId: 'task-1',
                createdAt: 1,
                mode: 'parallel_worktree',
                status: 'available',
                patches: [{
                    workerId: 'worker-1',
                    branch: 'coding-task/task1worker1',
                    worktreePath: '.worktrees/task1worker1',
                    patch: 'diff --git a/src/a.ts b/src/a.ts\n-old line'
                }]
            }]
        }
    };
}

export function createCancelableTask() {
    const task = createReviewTask();
    return {
        ...task,
        status: 'running',
        result: {
            ...task.result,
            rollback: {
                available: false,
                checkpointId: undefined,
                mode: undefined
            }
        }
    };
}

export function createRetryableTask() {
    const task = createReviewTask();
    return {
        ...task,
        status: 'failed',
        actions: [{
            id: 'edit-1',
            title: 'Edit alpha',
            tool: 'edit_file',
            input: {},
            status: 'completed',
            workerId: 'worker-1'
        }, {
            id: 'edit-2',
            title: 'Edit beta',
            tool: 'edit_file',
            input: {},
            status: 'failed',
            workerId: 'worker-2',
            error: 'beta edit failed'
        }],
        result: {
            ...task.result,
            completedActions: 1,
            aggregate: {
                totalWorkers: 2,
                completedWorkers: 1,
                failedWorkers: 1,
                status: 'partial_failure',
                successfulWorkerIds: ['worker-1'],
                failedWorkerIds: ['worker-2'],
                isolatedFailures: [{
                    workerId: 'worker-2',
                    actionIds: ['edit-2'],
                    error: 'beta edit failed'
                }]
            },
            workers: [{
                workerId: 'worker-1',
                actionIds: ['edit-1'],
                status: 'completed',
                branch: 'coding-task/task1worker1',
                worktreePath: '.worktrees/task1worker1'
            }, {
                workerId: 'worker-2',
                actionIds: ['edit-2'],
                status: 'failed',
                error: 'beta edit failed',
                branch: 'coding-task/task1worker2',
                worktreePath: '.worktrees/task1worker2'
            }],
            rollback: {
                available: true,
                checkpointId: 'checkpoint-task-1',
                mode: 'parallel_worktree'
            }
        }
    };
}

export function createWorkspaceFixture(): string {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-mentions-'));
    fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'docs', 'guides'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'dist'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'docs', 'references'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'src', 'index.ts'), 'export const demo = 1;\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'src', 'feature.ts'), 'export const feature = () => "ok";\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'docs', 'guides', 'intro.md'), '# Intro\nworkspace mention test\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'docs', 'references', '引用文件.md'), '# Reference\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'dist', 'bundle.js'), 'console.log("compiled");\n', 'utf8');
    return workspace;
}

export function createWorkspaceMentionsProvider(): AgentConsoleWorkspaceMentionsProvider {
    return new AgentConsoleWorkspaceMentionsProvider(new TestFileAdapter());
}

export async function flushWorkspaceSuggestions(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
}

export async function waitForSuggestionMenu(state: AgentConsoleSessionState, timeoutMs = 3000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (state.selectMenu?.options?.length) {
            return;
        }
        await flushWorkspaceSuggestions();
    }
}

export async function waitForCondition(check: () => boolean, attempts = 10): Promise<void> {
    for (let index = 0; index < attempts; index++) {
        if (check()) {
            return;
        }
        await Promise.resolve();
    }
}
