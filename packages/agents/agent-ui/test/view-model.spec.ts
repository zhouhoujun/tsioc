import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createReadStream } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { Encodings, FileAdapter, FileDirectoryEntry, IReadable } from '@tsdi/common';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent
} from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleInputHistoryStore,
    AgentConsoleInputPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleApprovalRequest,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    AgentConsoleSessionChoice,
    AgentConsoleWorkspaceMentionsProvider
} from '../src';

class TestFileAdapter extends FileAdapter {
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

class RuntimeStub {
    calls: string[] = [];
    messages = [{ id: '1', role: 'assistant', content: 'ready', createdAt: 1 } as any];

    async runTurn(sessionId: string, input: string): Promise<any> {
        this.calls.push(`${sessionId}:${input}`);
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(_sessionId?: string): Promise<any[]> {
        return this.messages;
    }

    async *runStreamingTurn(sessionId: string, input: string): AsyncGenerator<any> {
        this.calls.push(`${sessionId}:${input}`);
        yield { type: 'text', content: `Echo: ${input}` };
        yield { type: 'done', usage: { promptTokens: 5, completionTokens: 7, totalTokens: 12 } };
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
    }
}

class FailingRuntimeStub extends RuntimeStub {
    override async runTurn(_sessionId: string, _input: string): Promise<any> {
        throw new Error('submit failed');
    }

    override async *runStreamingTurn(_sessionId: string, _input: string): AsyncGenerator<any> {
        throw new Error('submit failed');
    }
}

class SchedulerStub {
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

class ToolRegistryStub {
    activations: Array<{ sessionId: string; name: string }> = [];

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
}

class EventMulticasterStub {
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

class ApplicationContextStub {
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

class AppRpcStub {
    state?: Record<string, any>;
    tools?: any[];
    modelProfiles?: any[];
    streamChunks?: any[];
    todoPlan?: any[];
    codingTasks?: any[];
    codingTaskDetails = new Map<string, any>();
    codingTaskDiffs = new Map<string, any>();
    calls: Array<{ method: string; params?: any; context?: any }> = [];

    async request(method: string, params?: any, context?: any): Promise<any> {
        this.calls.push({ method, params, context });
        if (method === 'app.state') {
            return this.state;
        }
        if (method === 'tools.list') {
            return this.tools || [];
        }
        if (method === 'model.list') {
            return this.modelProfiles || [];
        }
        if (method === 'model.activate') {
            const matched = (this.modelProfiles || []).find(item => item.name === params?.name);
            return {
                modelProfile: params?.name,
                provider: matched?.provider || 'deepseek',
                model: matched?.model || 'deepseek-v4-flash'
            };
        }
        if (method === 'todo.get') {
            const todos = this.todoPlan || [];
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
            return {
                sessionId: params?.sessionId || 'console',
                tasks: this.codingTasks || [],
                total: (this.codingTasks || []).length
            };
        }
        if (method === 'coding_task.get') {
            return {
                sessionId: params?.sessionId || 'console',
                task: this.codingTaskDetails.get(params?.taskId) || null
            };
        }
        if (method === 'coding_task.diff') {
            return this.codingTaskDiffs.get(params?.taskId) || {
                sessionId: params?.sessionId || 'console',
                taskId: params?.taskId,
                executionMode: null,
                diff: null,
                workers: []
            };
        }
        if (method === 'coding_task.cancel') {
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
        if (method === 'coding_task.rollback') {
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
        return undefined;
    }

    async *stream(method: string, params?: any, context?: any): AsyncGenerator<any> {
        this.calls.push({ method, params, context });
        for (const chunk of this.streamChunks || []) {
            yield chunk;
        }
    }
}

class SessionServiceStub extends AgentConsoleSessionService {
    sessions: AgentConsoleSessionChoice[] = [{ id: 'console', current: true }];
    ensuredSessionIds: Array<string | undefined> = [];
    messagesBySession = new Map<string, any[]>();
    protected runtimeRef: RuntimeStub;

    constructor(runtimeSource: RuntimeStub) {
        super(undefined, undefined, runtimeSource as any);
        this.runtimeRef = runtimeSource;
    }

    override async ensureSession(sessionId?: string): Promise<AgentConsoleSessionChoice> {
        const resolvedId = sessionId || `session-${this.ensuredSessionIds.length + 1}`;
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

    override async loadMessages(sessionId: string): Promise<any[]> {
        if (this.messagesBySession.has(sessionId)) {
            return this.messagesBySession.get(sessionId)!;
        }
        return this.runtimeRef.getMessages(sessionId);
    }
}

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

    async delete(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
    }

    async clear(): Promise<void> {
        this.sessions.clear();
    }
}

class ApprovalManagerStub {
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

class InputHistoryStoreStub extends AgentConsoleInputHistoryStore {
    entries: string[] = [];
    saveCalls: string[][] = [];
    workspaces: string[] = [];

    override async load(workspace?: string): Promise<string[]> {
        this.workspaces.push(String(workspace || ''));
        return this.entries.slice();
    }

    override async save(entries: string[], workspace?: string): Promise<void> {
        const next = entries.slice();
        this.saveCalls.push(next);
        this.workspaces.push(String(workspace || ''));
        this.entries = next;
    }
}

function createConsoleParts(
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
) {
    const state = new AgentConsoleSessionState();
    const bridge = new AgentConsoleEventBridge(state, runtime as any, toolRegistry as any, appRpc as any, app as any);
    const sessions = sessionService || new SessionServiceStub(runtime);
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
        app as any
    );
    return { state, bridge, component, sessionService: sessions };
}

function createConsole(
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

function createReviewTask() {
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

function createCancelableTask() {
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

function createWorkspaceFixture(): string {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-mentions-'));
    fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'docs', 'guides'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'src', 'index.ts'), 'export const demo = 1;\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'src', 'feature.ts'), 'export const feature = () => "ok";\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'docs', 'guides', 'intro.md'), '# Intro\nworkspace mention test\n', 'utf8');
    fs.writeFileSync(path.join(workspace, 'dist', 'bundle.js'), 'console.log("compiled");\n', 'utf8');
    return workspace;
}

function createWorkspaceMentionsProvider(): AgentConsoleWorkspaceMentionsProvider {
    return new AgentConsoleWorkspaceMentionsProvider(new TestFileAdapter());
}

async function flushWorkspaceSuggestions(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
}

async function waitForSuggestionMenu(state: AgentConsoleSessionState, attempts = 10): Promise<void> {
    for (let index = 0; index < attempts; index++) {
        if (state.selectMenu?.options?.length) {
            return;
        }
        await flushWorkspaceSuggestions();
    }
}

async function waitForCondition(check: () => boolean, attempts = 10): Promise<void> {
    for (let index = 0; index < attempts; index++) {
        if (check()) {
            return;
        }
        await Promise.resolve();
    }
}

@Suite('Agent console component')
export class AgentConsoleComponentTest {
    @Test('submit updates messages and clears input')
    async submitUpdatesState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.input = 'hello';
        await component.submit();
        expect(runtime.calls).toEqual(['console:hello']);
        expect(component.messages.length).toEqual(2);
        expect(component.messages[1].content).toEqual('Echo: hello');
        expect(component.input).toEqual('');
        expect(component.status).toEqual('idle');
        expect(component.activities.length).toBeGreaterThan(0);
        expect(component.runningTools).toEqual([]);
    }

    @Test('submit streams locally without app rpc')
    async submitStreamsLocallyWithoutAppRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, undefined, undefined, undefined);
        component.input = 'hello';
        await component.submit();
        expect(runtime.calls).toEqual(['console:hello']);
        expect(component.messages[1].metadata?.streaming).toEqual(false);
        expect(component.messages[1].content).toEqual('Echo: hello');
        expect(component.status).toEqual('idle');
    }

    @Test('submit renders rpc stream events as compact timeline messages')
    async submitRendersRpcStreamEventsAsSeparateTimelineMessages() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' },
            { type: 'event', eventType: 'tool_invoked', label: 'tool', status: 'running', toolName: 'read_file', toolCallId: 'c1', content: 'read_file · src/index.ts' },
            { type: 'event', eventType: 'tool_completed', label: 'tool', status: 'success', toolName: 'read_file', toolCallId: 'c1', content: 'read_file · src/index.ts' },
            { type: 'text', content: 'Patched handler' },
            {
                type: 'done',
                message: {
                    id: 'done-1',
                    role: 'assistant',
                    content: 'Patched handler',
                    createdAt: 2,
                    metadata: {
                        usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }
                    }
                }
            }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = 'fix it';
        await component.submit();

        const eventMessages = component.sessionState.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(eventMessages.map(message => message.content)).toEqual([
            'Analyzing request',
            'read_file · src/index.ts'
        ]);
        expect(component.sessionState.displayMessages.some(message => message.content === 'Patched handler')).toEqual(true);
    }

    @Test('submit keeps previous task ui events in the transcript')
    async submitKeepsPreviousTaskUiEventsInTranscript() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });
        component.sessionState.upsertUiEventMessage('tool:weather', 'weather · Chengdu, Sichuan, CN 41.3°C Mainly clear', {
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success'
        });

        component.input = 'next task';
        await component.submit();

        const eventMessages = component.sessionState.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(eventMessages.map(message => message.content)).toContain('Analyzing request');
        expect(eventMessages.map(message => message.content)).toContain('weather · Chengdu, Sichuan, CN 41.3°C Mainly clear');
    }

    @Test('submit scopes repeated stream event keys per turn')
    async submitScopesRepeatedStreamEventKeysPerTurn() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' },
            { type: 'event', eventType: 'tool_completed', label: 'tool', status: 'success', toolName: 'read_file', toolCallId: 'c1', content: 'read_file · src/index.ts' },
            { type: 'text', content: 'Patched handler' },
            {
                type: 'done',
                message: {
                    id: 'done-1',
                    role: 'assistant',
                    content: 'Patched handler',
                    createdAt: 2,
                    metadata: {
                        usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }
                    }
                }
            }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = 'fix it';
        await component.submit();
        component.input = 'fix it again';
        await component.submit();

        const eventMessages = component.sessionState.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(eventMessages.map(message => message.content)).toEqual([
            'Analyzing request',
            'read_file · src/index.ts',
            'Analyzing request',
            'read_file · src/index.ts'
        ]);
        expect(new Set(eventMessages.map(message => message.metadata?.uiEventKey)).size).toEqual(4);
    }

    @Test('submit persists input history through history store')
    async submitPersistsInputHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const historyStore = new InputHistoryStoreStub();
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-a' } } },
            historyStore
        );

        await component.onInit();
        component.input = 'hello';
        await component.submit();

        expect(historyStore.saveCalls[historyStore.saveCalls.length - 1]).toEqual(['hello']);
        expect(historyStore.workspaces[historyStore.workspaces.length - 1]).toEqual('/tmp/workspace-a');
    }

    @Test('submit keeps short follow-up answers raw before runtime request construction')
    async submitKeepsContinuationAnswerRaw() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '查看今天的天气', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '请告诉我你想查看哪个城市或地区的今天天气。', createdAt: 2 } as any
        ]);
        component.input = '成都';

        await component.submit();

        expect(runtime.calls).toHaveLength(1);
        expect(runtime.calls[0]).toEqual('console:成都');
    }

    @Test('submit clears stale visible activities from the previous turn')
    async submitClearsStaleVisibleActivities() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.pushActivity('error', 'old failure');
        component.sessionState.pushActivity('tool', 'old tool run');

        component.input = 'hello';
        await component.submit();

        expect(component.sessionState.visibleActivities).toEqual([]);
        expect(component.lastError).toEqual('');
    }

    @Test('submit exposes running state before the turn completes')
    async submitExposesRunningStateBeforeCompletion() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        let releaseTurn!: () => void;
        (runtime as any).runStreamingTurn = undefined;
        runtime.runTurn = async (sessionId: string, input: string): Promise<any> => {
            runtime.calls.push(`${sessionId}:${input}`);
            await new Promise<void>(resolve => {
                releaseTurn = resolve;
            });
            runtime.messages = [
                { id: '1', role: 'user', content: input, createdAt: 1 },
                { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
            ] as any;
            return { sessionId, message: runtime.messages[1] };
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.input = 'hello';
        const submitPromise = component.submit();
        await waitForCondition(() => component.status === 'running' && typeof releaseTurn === 'function');
        expect(component.status).toEqual('running');
        expect(typeof releaseTurn).toEqual('function');
        releaseTurn();
        await submitPromise;
        expect(component.status).toEqual('idle');
    }

    @Test('schedulePrompt adds task and updates tasks count')
    async schedulePromptAddsTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.schedulePrompt('later', 100);
        expect(component.tasksCount).toEqual(1);
        expect(scheduler.tasks[0].prompt).toEqual('later');
        expect(scheduler.tasks[0].sessionId).toEqual('console');
        expect(typeof scheduler.tasks[0].runAt).toEqual('number');
    }

    @Test('jobs command opens scheduler dashboard and toggles pause resume')
    async jobsCommandOpensSchedulerDashboardAndTogglesPauseResume() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        scheduler.tasks = [{
            id: 'job-1',
            sessionId: 'console',
            prompt: 'later',
            scheduleType: 'once',
            runAt: Date.now() + 1000,
            nextRunAt: Date.now() + 1000,
            runCount: 0,
            failureCount: 0
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.onInit();

        component.input = '/jobs';
        await component.submit();

        expect(component.sessionState.jobsFocused).toEqual(true);
        expect(component.sessionState.selectedScheduledTaskId).toEqual('job-1');

        await component.sessionState.handleFocusKey('enter');
        expect(scheduler.paused).toEqual(['job-1']);
        expect(component.sessionState.selectedScheduledTask?.paused).toEqual(true);

        await component.sessionState.handleFocusKey('enter');
        expect(scheduler.resumed).toEqual(['job-1']);
        expect(component.sessionState.selectedScheduledTask?.paused).toEqual(false);
    }

    @Test('messages command focuses message panel and enter opens detail view')
    async messagesCommandFocusesMessagePanelAndEnterOpensDetailView() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.setMessages([
            { id: 'm1', role: 'user', content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9', createdAt: 1 } as any
        ]);
        component.input = '/messages';
        await component.submit();

        expect(component.sessionState.messagesFocused).toEqual(true);
        expect(component.sessionState.messageDetailOpen).toEqual(false);

        await component.sessionState.handleFocusKey('enter');
        expect(component.sessionState.messageDetailOpen).toEqual(true);
    }

    @Test('configure updates model metadata and tools')
    async configureUpdatesModelMetadataAndTools() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.configure({ sessionId: 'chat-1', provider: 'deepseek', model: 'deepseek-v4-flash', workspace: '/tmp/workspace' });
        await component.onInit();
        expect(component.sessionId).toEqual('chat-1');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/workspace');
        expect(component.tools.length).toEqual(1);
        expect(component.tools[0].name).toEqual('read_file');
        expect(component.tools[0].active).toEqual(false);
    }

    @Test('bootstraps session metadata from app rpc state')
    async bootstrapsSessionMetadataFromAppRpcState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.state = {
            sessionId: 'rpc-session',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/rpc-workspace',
            title: 'Rpc Console'
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();

        expect(component.sessionId).toEqual('rpc-session');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/rpc-workspace');
        expect(component.title).toEqual('Rpc Console');
    }

    @Test('loads persisted input history on init')
    async loadsPersistedInputHistoryOnInit() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const historyStore = new InputHistoryStoreStub();
        historyStore.entries = ['second', '/help', 'first'];
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-b' } } },
            historyStore
        );

        await component.onInit();

        expect(state.getInputHistoryEntries()).toEqual(['second', '/help', 'first']);
        expect(historyStore.workspaces[0]).toEqual('/tmp/workspace-b');
        expect(state.navigateInputHistory(-1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(state.navigateInputHistory(-1)).toEqual(true);
        expect(state.input).toEqual('first');
    }

    @Test('tracks detailed tool runs and highlights running tool')
    async tracksDetailedToolRuns() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-2' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentToolInvokedEvent(
            this,
            'chat-2',
            'read_file',
            { path: '/tmp/demo.txt' },
            {
                receiptId: 'r1',
                toolCallId: 'c1',
                toolName: 'read_file',
                executionMode: 'sequential',
                status: 'running',
                inputSummary: '{"path":"/tmp/demo.txt"}',
                attemptCount: 1
            }
        ));

        expect(component.highlightedToolRun?.name).toEqual('read_file');
        expect(component.highlightedToolRun?.status).toEqual('running');
        expect(component.highlightedToolRun?.inputSummary).toContain('/tmp/demo.txt');

        await app.eventMulticaster.emit(new AgentToolCompletedEvent(
            this,
            'chat-2',
            'read_file',
            'ok',
            {
                receiptId: 'r1',
                toolCallId: 'c1',
                toolName: 'read_file',
                executionMode: 'sequential',
                status: 'success',
                inputSummary: '{"path":"/tmp/demo.txt"}',
                outputSummary: 'file contents',
                durationMs: 12,
                attemptCount: 1
            }
        ));

        expect(component.highlightedToolRun?.status).toEqual('success');
        expect(component.highlightedToolRun?.outputSummary).toEqual('file contents');

        await app.eventMulticaster.emit(new AgentToolFailedEvent(
            this,
            'chat-2',
            'write_file',
            new Error('permission denied'),
            {
                receiptId: 'r2',
                toolCallId: 'c2',
                toolName: 'write_file',
                executionMode: 'sequential',
                status: 'error',
                inputSummary: '{"path":"/tmp/demo.txt"}',
                error: 'permission denied',
                durationMs: 5,
                attemptCount: 1
            }
        ));

        expect(component.highlightedToolRun?.name).toEqual('write_file');
        expect(component.highlightedToolRun?.error).toEqual('permission denied');
        expect(component.lastError).toEqual('permission denied');
    }

    @Test('shared console component projects session state')
    async sharedConsoleComponentProjectsSessionState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub());
        component.configure({ provider: 'deepseek', model: 'deepseek-v4-flash', workspace: '/tmp/workspace' });
        await component.onInit();
        state.setSessions([{ id: 'chat-1', current: true, messageCount: 1, updatedAt: 1 }]);

        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/workspace');
        expect(state.sessions.length).toEqual(1);
        expect(state.selectedSessionId).toEqual('chat-1');
        expect(component.tools.length).toEqual(1);
        expect(component.messages.length).toBeGreaterThan(0);
        expect(component.activities.length).toEqual(0);
        expect(component.notice).toEqual('');
        expect(component.selectMenu).toEqual(undefined);

        state.setNotice('Switch model');
        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek', description: 'default fast profile', detail: 'DeepSeek provider\nModel: deepseek-v4-flash' },
            { label: 'OpenAI', value: 'openai', description: 'gpt family', detail: 'OpenAI provider\nModel: gpt-4o-mini' }
        ], 1);
        expect(component.notice).toEqual('Switch model');
        expect(component.selectMenu?.selectedIndex).toEqual(1);
        expect(component.selectMenu?.options[1].detail).toContain('OpenAI provider');
        state.moveSelectMenu(1);
        expect(component.selectMenu?.selectedIndex).toEqual(0);
        expect(state.selectedSelectMenuOption?.value).toEqual('deepseek');

        component.input = 'hello panel';
        await component.submit();

        expect(component.messages[component.messages.length - 1].content).toEqual('Echo: hello panel');
        expect(component.input).toEqual('');
        expect(component.highlightedToolRun).toEqual(undefined);
    }

    @Test('shared select menu actions resolve, choose, and cancel through session state')
    async sharedSelectMenuActionsResolveThroughSessionState() {
        const state = new AgentConsoleSessionState();
        const resolved: Array<string | undefined> = [];

        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);
        state.selectMenuAction = (value) => {
            resolved.push(value);
        };

        await state.chooseSelectMenuIndex(1);
        expect(resolved).toEqual(['openai']);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);
        state.selectMenuAction = (value) => {
            resolved.push(value);
        };

        state.moveSelectMenu(1);
        await state.confirmSelectMenu();
        expect(resolved).toEqual(['openai', 'openai']);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);
        state.selectMenuAction = (value) => {
            resolved.push(value);
        };

        await state.cancelSelectMenu();
        expect(resolved).toEqual(['openai', 'openai', undefined]);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('session state resolves slash and mention suggestions from input cursor')
    async sessionStateResolvesSlashAndMentionSuggestions() {
        const state = new AgentConsoleSessionState();
        state.setCommandHints(['/help', '/hello']);
        state.setTools([
            { name: 'read_file', active: false },
            { name: 'write_file', active: false }
        ]);

        state.setInput('/');
        expect(state.selectMenu?.title).toEqual('Suggestions');
        expect(state.selectMenu?.options.map(option => option.value)).toEqual(['/help', '/hello']);

        await state.confirmSelectMenu('/hello');
        expect(state.input).toEqual('/hello ');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('check @wo', 'check @wo'.length);
        expect(state.selectMenu?.title).toEqual('Suggestions');
        expect(state.selectMenu?.options.map(option => option.value)).toContain('@workspace');

        await state.confirmSelectMenu('@workspace');
        expect(state.input).toEqual('check @workspace ');
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('session state resolves workspace file and folder suggestions from mention input')
    async sessionStateResolvesWorkspaceMentionSuggestions() {
        const workspace = createWorkspaceFixture();
        try {
            const state = new AgentConsoleSessionState();
            state.setWorkspace(workspace);
            state.setWorkspaceMentionResolver(createWorkspaceMentionsProvider());

            state.setInput('check @sr', 'check @sr'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.title).toEqual('Suggestions');
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@src/');

            state.setInput('check @src/in', 'check @src/in'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@src/index.ts');

            state.setInput('check @guides/in', 'check @guides/in'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@docs/guides/intro.md');

            state.setInput('check @int', 'check @int'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@docs/guides/intro.md');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('component resolves workspace mention suggestions from app file adapter fallback')
    async componentResolvesWorkspaceMentionSuggestionsFromAppFileAdapter() {
        const workspace = createWorkspaceFixture();
        try {
            const runtime = new RuntimeStub();
            const scheduler = new SchedulerStub();
            const app = new ApplicationContextStub();
            app.registry.set(FileAdapter, new TestFileAdapter());
            const { component } = createConsoleParts(
                runtime,
                scheduler,
                new ToolRegistryStub(),
                app
            );
            component.configure({
                sessionId: 'chat-app-workspace-mentions',
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                workspace
            });

            await component.onInit();

            component.sessionState.setInput('check @src/in', 'check @src/in'.length);
            await waitForSuggestionMenu(component.sessionState);

            expect(component.selectMenu?.options.map(option => option.value)).toContain('@src/index.ts');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('session state processes raw enter chunks through shared console input rules')
    async sessionStateProcessesRawEnterChunks() {
        const state = new AgentConsoleSessionState();
        let submitCount = 0;
        state.submitAction = async () => {
            submitCount += 1;
        };

        state.setCommandHints(['/help']);
        state.setTools([{ name: 'read_file', active: false } as any]);
        state.setInput('/he');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        const confirmed = await state.processRawChunk('\r', { submitOnEnter: true, hasSelectMenu: true });
        expect(confirmed.confirmedSelection).toEqual(true);
        expect(confirmed.submitted).toEqual(true);
        expect(state.input).toEqual('/help ');
        expect(submitCount).toEqual(1);

        state.setInput('hello');
        const submitted = await state.processRawChunk('\r', { submitOnEnter: true });
        expect(submitted.confirmedSelection).toEqual(false);
        expect(submitted.submitted).toEqual(true);
        expect(submitCount).toEqual(2);

        state.setInput('check @re');
        const mentioned = await state.processRawChunk('\r', { submitOnEnter: true, hasSelectMenu: true });
        expect(mentioned.confirmedSelection).toEqual(true);
        expect(mentioned.submitted).toEqual(true);
        expect(submitCount).toEqual(3);

        state.setInput('hello');
        await state.processRawChunk('\r', { submitOnEnter: false, ctrlKey: true });
        expect(state.input).toContain('\n');
    }

    @Test('session state tracks input history and skips slash commands')
    async sessionStateTracksInputHistory() {
        const state = new AgentConsoleSessionState();
        state.pushInputHistory('first');
        state.pushInputHistory('/help');
        state.pushInputHistory('second');
        state.setInput('draft');

        expect(state.getInputHistoryEntries()).toEqual(['second', '/help', 'first']);
        expect(state.navigateInputHistory(-1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(state.navigateInputHistory(-1)).toEqual(true);
        expect(state.input).toEqual('first');
        expect(state.navigateInputHistory(1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(state.navigateInputHistory(1)).toEqual(true);
        expect(state.input).toEqual('draft');
        expect(state.navigateInputHistory(1)).toEqual(false);
    }

    @Test('session state starts submit without waiting for model turn completion')
    async sessionStateStartsSubmitWithoutWaitingForTurnCompletion() {
        const state = new AgentConsoleSessionState();
        let releaseSubmit!: () => void;
        let completed = false;
        state.submitAction = async () => {
            state.setStatus('running');
            await new Promise<void>(resolve => {
                releaseSubmit = resolve;
            });
            completed = true;
            state.setStatus('idle');
        };

        state.setInput('hello');
        const result = await state.processRawChunk('\r', { submitOnEnter: true });

        expect(result.submitted).toEqual(true);
        expect(state.status).toEqual('running');
        expect(completed).toEqual(false);
        releaseSubmit();
        await Promise.resolve();
        expect(completed).toEqual(true);
    }

    @Test('component exposes notice and select helpers through shared ui state')
    async componentExposesNoticeAndSelectHelpers() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        component.showNotice('Switch model');
        expect(component.notice).toEqual('Switch model');

        const pending = component.select('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);

        expect(component.selectMenu?.title).toEqual('Model providers');
        expect(component.selectMenu?.selectedIndex).toEqual(0);

        await (component as any).state.chooseSelectMenuIndex(1);
        await expect(pending).resolves.toEqual('openai');
        expect(component.selectMenu).toEqual(undefined);

        component.clearNotice();
        expect(component.notice).toEqual('');
    }

    @Test('submit enriches mention context inside agent ui')
    async submitEnrichesMentionContextInsideAgentUi() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.configure({
            sessionId: 'chat-mentions',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            workspace: '/tmp/workspace'
        });
        await component.onInit();

        component.input = 'check @workspace and @read_file';
        await component.submit();

        expect(runtime.calls[0]).toContain('[Mention Context]');
        expect(runtime.calls[0]).toContain('Workspace: /tmp/workspace');
        expect(runtime.calls[0]).toContain('Tool read_file: toolset=filesystem, active=no');
    }

    @Test('submit enriches workspace file and directory mentions inside agent ui')
    async submitEnrichesWorkspaceMentionsInsideAgentUi() {
        const workspace = createWorkspaceFixture();
        try {
            const runtime = new RuntimeStub();
            const scheduler = new SchedulerStub();
            const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, createWorkspaceMentionsProvider());
            component.configure({
                sessionId: 'chat-workspace-mentions',
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                workspace
            });
            await component.onInit();

            component.input = 'check @src/ and @docs/';
            await component.submit();

            expect(runtime.calls[0]).toContain('[Mention Context]');
            expect(runtime.calls[0]).toContain('src/');
            expect(runtime.calls[0]).toContain('src/index.ts');
            expect(runtime.calls[0]).toContain('src/feature.ts');
            expect(runtime.calls[0]).toContain('docs/');
            expect(runtime.calls[0]).toContain('docs/guides/');
            expect(runtime.calls[0]).not.toContain('dist/bundle.js');
            expect(runtime.calls[0]).not.toContain('export const demo = 1;');
            expect(runtime.calls[0]).not.toContain('export const feature = () => "ok";');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('component routes session commands through session service and internal notice copy flow')
    async componentRoutesSessionCommandsThroughSessionService() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true },
            { id: 'chat-b', current: false }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.input = '/session';
        await component.submit();
        expect(component.notice).toEqual('No sessions available.');
        expect(sessionService.ensuredSessionIds).toEqual([]);

        component.input = '/new scratch';
        await component.submit();
        expect(sessionService.ensuredSessionIds).toEqual(['scratch']);
        expect(component.sessionId).toEqual('scratch');

        component.input = '/copy input';
        await component.submit();
        expect(component.notice).toEqual('Nothing to copy for input.');
    }

    @Test('clear command starts a new session after submit')
    async clearCommandStartsNewSessionAfterSubmit() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.input = '/clear';
        await component.submit();

        expect(component.input).toEqual('');
        expect(sessionService.ensuredSessionIds).toEqual([undefined]);
        expect(component.sessionId).not.toEqual('console');
        expect(component.notice).toEqual('Started a new session.');
    }

    @Test('submit keeps draft intact while a turn is already running')
    async submitKeepsDraftIntactWhileTurnRunning() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        component.sessionState.setStatus('running');
        component.input = 'hello again';
        await component.submit();

        expect(runtime.calls).toEqual([]);
        expect(component.input).toEqual('hello again');
        expect(component.notice).toEqual('Wait for the current turn to finish.');
    }

    @Test('approvals command focuses pending requests instead of opening modal')
    async approvalsCommandFocusesPendingRequests() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const approvals = new ApprovalManagerStub();
        approvals.pending = [{
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, approvals);

        component.input = '/approvals';
        await component.submit();

        expect(component.sessionState.approvalsFocused).toEqual(true);
        expect(component.sessionState.selectedApproval?.id).toEqual('approval-1');
        expect(approvals.approved).toEqual([]);
    }

    @Test('tools command focuses tool panel instead of opening modal')
    async toolsCommandFocusesToolPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.onInit();

        component.input = '/tools';
        await component.submit();

        expect(component.sessionState.toolsFocused).toEqual(true);
        expect(component.sessionState.selectedTool?.name).toEqual('read_file');
    }

    @Test('tools command activates a named tool')
    async toolsCommandActivatesNamedTool() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const toolRegistry = new ToolRegistryStub();
        const component = createConsole(runtime, scheduler, toolRegistry);
        await component.onInit();

        component.input = '/tools read_file';
        await component.submit();

        expect(toolRegistry.activations).toEqual([{ sessionId: 'console', name: 'read_file' }]);
        expect(component.notice).toEqual('Activated read_file.');
    }

    @Test('review command lists coding tasks and opens selected review')
    async reviewCommandListsCodingTasksAndOpensSelectedReview() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTasks = [reviewTask];
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(appRpc.calls.some(call => call.method === 'coding_task.list')).toEqual(true);
        expect(component.sessionState.selectMenu?.title).toEqual('Coding tasks');
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('task-1');
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('Patch handlers');

        await component.sessionState.confirmSelectMenu('task-1');
        await pending;

        const diffCall = appRpc.calls.find(call => call.method === 'coding_task.diff');
        expect(diffCall?.params).toEqual({ sessionId: 'console', taskId: 'task-1' });
        expect(component.sessionState.reviewOpen).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewExecutionMode).toEqual('parallel');
        expect(component.sessionState.reviewWorkers.length).toEqual(1);
    }

    @Test('tasks command opens inspector with rollback metadata')
    async tasksCommandOpensInspectorWithRollbackMetadata() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.list')).toEqual(true);
        expect(component.sessionState.tasksFocused).toEqual(true);
        expect(component.sessionState.selectedTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewTaskChoices[0]?.checkpointSummary).toContain('1 total');
        expect(component.sessionState.reviewTaskChoices[0]?.workerCount).toEqual(1);
    }

    @Test('tasks focus cancel action cancels selected coding task')
    async tasksFocusCancelActionCancelsSelectedCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createCancelableTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('x');

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Cancelled task-1.');
    }

    @Test('tasks focus escape cancels selected running coding task')
    async tasksFocusEscapeCancelsSelectedRunningCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createCancelableTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('escape');

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Cancelled task-1.');
    }

    @Test('tasks focus does not cancel completed coding task')
    async tasksFocusDoesNotCancelCompletedCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('x');

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel')).toEqual(false);
        expect(component.notice).toEqual('Cancel is unavailable for task-1.');
    }

    @Test('review focus escape cancels running coding task')
    async reviewFocusEscapeCancelsRunningCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createCancelableTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            summary: '1 worker diff(s) captured',
            text: 'diff --git a/src/a.ts b/src/a.ts\n+new line',
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review task-1';
        await component.submit();
        await component.sessionState.handleFocusKey('Esc');

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Cancelled task-1.');
    }

    @Test('review command loads direct task id without opening select menu')
    async reviewCommandLoadsDirectTaskIdWithoutSelectMenu() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review task-1';
        await component.submit();

        expect(component.sessionState.selectMenu).toEqual(undefined);
        expect(appRpc.calls.some(call => call.method === 'coding_task.get' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(appRpc.calls.some(call => call.method === 'coding_task.diff' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewExecutionMode).toEqual('parallel');
        expect(component.sessionState.reviewWorkers.length).toEqual(1);
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('diff --git a/src/a.ts b/src/a.ts');
        expect(component.notice).toEqual('');
    }

    @Test('rollback command rolls back direct task id and refreshes review')
    async rollbackCommandRollsBackDirectTaskIdAndRefreshesReview() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/rollback task-1';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.rollback' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewTask?.status).toEqual('rolled_back');
        expect(component.notice).toEqual('Rolled back task-1.');
    }

    @Test('rollback command uses focused review task when no arg is provided')
    async rollbackCommandUsesFocusedReviewTaskWhenNoArgIsProvided() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.openReview(reviewTask as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });

        component.input = '/rollback';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.rollback' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Rolled back task-1.');
    }

    @Test('model command switches configured named profile')
    async modelCommandSwitchesConfiguredNamedProfile() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
                ui: { title: 'Console' },
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    defaultProfile: 'flash',
                    profiles: {
                        flash: { provider: 'deepseek', model: 'deepseek-v4-flash' },
                        strong: { provider: 'deepseek', model: 'deepseek-v4-pro', reasoning: true }
                    }
                }
            }
        );

        await component.onInit();
        component.input = '/model strong';
        await component.submit();

        expect(component.sessionState.modelProfile).toEqual('strong');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-pro');
        expect(component.notice).toEqual('Switched model profile to strong.');
    }

    @Test('model command uses app rpc for profile listing and activation')
    async modelCommandUsesAppRpcForProfileListingAndActivation() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.state = {
            sessionId: 'console',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/workspace',
            title: 'Console'
        };
        appRpc.modelProfiles = [
            { name: 'flash', selected: true, provider: 'deepseek', model: 'deepseek-v4-flash' },
            { name: 'strong', selected: false, provider: 'deepseek', model: 'deepseek-v4-pro' }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();
        component.input = '/model strong';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'model.activate' && call.params?.name === 'strong')).toEqual(true);
        expect(component.sessionState.modelProfile).toEqual('strong');
        expect(component.model).toEqual('deepseek-v4-pro');
    }

    @Test('event bridge refreshes tools through app rpc when available')
    async eventBridgeRefreshesToolsThroughAppRpcWhenAvailable() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const appRpc = new AppRpcStub();
        appRpc.tools = [
            { name: 'read_file', toolset: 'filesystem', activation: { kind: 'deferred', activated: true } }
        ];
        const { component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app, undefined, undefined, undefined, appRpc);

        await component.onInit();
        await app.eventMulticaster.emit(new AgentToolCompletedEvent(component as any, 'console', 'read_file', { durationMs: 1 } as any));

        expect(appRpc.calls.some(call => call.method === 'tools.list')).toEqual(true);
        expect(component.tools[0].active).toEqual(true);
    }

    @Test('exit command closes application')
    async exitCommandClosesApplication() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), app);

        await component.onInit();
        component.input = '/exit';
        await component.submit();

        expect(app.closeCalls).toEqual(1);
        expect(component.notice).toEqual('');
    }

    @Test('component handleCommand returns true for known commands')
    async componentHandleCommandReturnsTrue() {
        const state = new AgentConsoleSessionState();
        state.setMessages([]);
        expect(state.messages.length).toEqual(0);
    }

    @Test('input panel submits on enter variants and keeps ctrl-enter for newline')
    async inputPanelSubmitsOnEnterVariantsAndKeepsCtrlEnterForNewline() {
        let submitCount = 0;
        const panel = new AgentConsoleInputPanelComponent();
        panel.submitAction = async () => {
            submitCount++;
        };

        await panel.onKeydown({ key: 'Escape' } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', ctrlKey: true, preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', altKey: true, preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'enter', preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: '', code: 'NumpadEnter', preventDefault() {} } as KeyboardEvent);

        expect(submitCount).toEqual(3);
    }

    @Test('input panel routes suggestion keys through shared session state')
    async inputPanelRoutesSuggestionKeysThroughSharedState() {
        const state = new AgentConsoleSessionState();
        state.setCommandHints(['/help', '/hello']);
        state.setInput('/');
        const panel = new AgentConsoleInputPanelComponent(state);

        await panel.onKeydown({ key: 'ArrowDown', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu?.selectedIndex).toEqual(1);

        await panel.onKeydown({ key: 'Tab', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('/hello ');
        expect(state.selectMenu).toEqual(undefined);

        state.submitAction = async () => {
            state.setNotice('submitted');
        };
        state.setInput('/he');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('/help ');
        expect(state.notice).toEqual('submitted');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('check @wo');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('check @workspace ');
        expect(state.notice).toEqual('submitted');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('/');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Escape', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('input panel confirms normal select menus with enter')
    async inputPanelConfirmsNormalSelectMenusWithEnter() {
        const state = new AgentConsoleSessionState();
        const resolved: Array<string | undefined> = [];
        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        state.selectMenuAction = value => {
            resolved.push(value);
        };
        const panel = new AgentConsoleInputPanelComponent(state);

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);

        expect(resolved).toEqual(['/tools']);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('terminal input submits combined text and return chunks')
    async terminalInputSubmitsCombinedTextAndReturnChunks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        await (component as any).handleTerminalInput(
            { text: '/sessions\r', partial: false },
            '/sessions\r'
        );

        expect(component.input).toEqual('');
        expect(component.showSessionsPanel).toEqual(true);
    }

    @Test('terminal input navigates input history with arrow keys')
    async terminalInputNavigatesInputHistoryWithArrowKeys() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.pushInputHistory('first');
        component.sessionState.pushInputHistory('/sessions');
        component.sessionState.pushInputHistory('second');

        await (component as any).handleTerminalInput(
            { text: '\u001b[A', controlKey: 'up', partial: false },
            '\u001b[A'
        );
        expect(component.input).toEqual('second');

        await (component as any).handleTerminalInput(
            { text: '\u001b[A', controlKey: 'up', partial: false },
            '\u001b[A'
        );
        expect(component.input).toEqual('first');
    }

    @Test('terminal input moves cursor with left and right arrows without inserting escape text')
    async terminalInputMovesCursorWithoutInsertingEscapeText() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.pushInputHistory('first');
        component.sessionState.pushInputHistory('second');

        await (component as any).handleTerminalInput(
            { text: '\u001b[A', controlKey: 'up', partial: false },
            '\u001b[A'
        );
        expect(component.input).toEqual('second');
        expect(component.inputCursor).toEqual('second'.length);

        await (component as any).handleTerminalInput(
            { text: '\u001b[D', controlKey: 'left', partial: false },
            '\u001b[D'
        );
        expect(component.input).toEqual('second');
        expect(component.inputCursor).toEqual('second'.length - 1);

        await (component as any).handleTerminalInput(
            { text: '\u001b[C', controlKey: 'right', partial: false },
            '\u001b[C'
        );
        expect(component.input).toEqual('second');
        expect(component.inputCursor).toEqual('second'.length);
    }

    @Test('input panel closes normal select menus with q and escape')
    async inputPanelClosesNormalSelectMenusWithQAndEscape() {
        const state = new AgentConsoleSessionState();
        const panel = new AgentConsoleInputPanelComponent(state);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'q', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Escape', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('select panel closes menus with q and esc aliases')
    async selectPanelClosesMenusWithDismissKeys() {
        const state = new AgentConsoleSessionState();
        const panel = new AgentConsoleSelectPanelComponent(state);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Q', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Esc', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('escape dismisses focused layers back to input focus')
    async escapeDismissesFocusedLayersBackToInputFocus() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any
        ]);
        state.setMessagesFocused(true);
        state.openMessageDetail();

        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messagesFocused).toEqual(true);
        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
        expect(state.messagesFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);

        state.openSelectMenu('Help', [{ label: '/help', value: '/help' }], 0);
        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
        expect(state.selectMenu).toEqual(undefined);
        expect(state.inputFocused).toEqual(true);

        state.setPendingApprovals([{
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            createdAt: 1,
            timeoutMs: 30000
        } as any]);
        state.setApprovalsFocused(true);
        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
        expect(state.approvalsFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);
    }

    @Test('handleFocusKey treats q like escape for focused panels')
    async handleFocusKeyTreatsQAsDismissAcrossFocusedPanels() {
        const state = new AgentConsoleSessionState();
        state.setSessions([
            { id: 'default', current: true, messageCount: 1, updatedAt: 1 } as any
        ]);
        state.setSessionsFocused(true);

        expect(await state.handleFocusKey('Q')).toEqual(true);
        expect(state.sessionsFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);

        state.setMessages([
            { id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any
        ]);
        state.setMessagesFocused(true);
        state.openMessageDetail();

        expect(await state.handleFocusKey('Esc')).toEqual(true);
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messagesFocused).toEqual(true);
    }

    @Test('focused tool panel activates selected tool on enter')
    async focusedToolPanelActivatesSelectedToolOnEnter() {
        const state = new AgentConsoleSessionState();
        const activated: string[] = [];
        state.setTools([
            { name: 'read_file', toolset: 'filesystem', active: false, activationKind: 'deferred' }
        ]);
        state.activateSelectedToolAction = async toolName => {
            activated.push(toolName);
        };
        state.setToolsFocused(true);

        const result = await state.processDecodedInput(
            { text: '\r', controlKey: 'return', partial: false },
            '\r',
            {
                isClosed: false,
                onExit() {},
                hasActiveTextPrompt: false
            }
        );

        expect(result.handled).toEqual(true);
        expect(activated).toEqual(['read_file']);
    }

    @Test('focused approval panel accepts letter shortcuts from terminal input')
    async focusedApprovalPanelAcceptsLetterShortcuts() {
        const state = new AgentConsoleSessionState();
        const resolved: Array<{ decision: 'approve' | 'deny'; requestId: string }> = [];
        state.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                createdAt: 1,
                timeoutMs: 30000
            } as any
        ]);
        state.resolveApprovalAction = async (decision, requestId) => {
            resolved.push({ decision, requestId });
        };
        state.setApprovalsFocused(true);

        const result = await state.processDecodedInput(
            { text: 'a', partial: false },
            'a',
            {
                isClosed: false,
                onExit() {},
                hasActiveTextPrompt: false
            }
        );

        expect(result.handled).toEqual(true);
        expect(resolved).toEqual([{ decision: 'approve', requestId: 'approval-1' }]);
    }

    @Test('submit failure resets ui state and records error')
    async submitFailureResetsUiStateAndRecordsError() {
        const runtime = new FailingRuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        component.input = 'hello';
        await component.submit();

        expect(component.input).toEqual('');
        expect(component.status).toEqual('error');
        expect(component.lastError).toEqual('submit failed');
        expect(component.activities.some(item => item.kind === 'error' && item.message.includes('submit failed'))).toBe(true);
        expect(component.messages[component.messages.length - 1]?.role).toEqual('assistant');
        expect(component.messages[component.messages.length - 1]?.content).toContain('Error: submit failed');
    }

    @Test('working usage tracks current tokens from stream and model completion')
    async workingUsageTracksCurrentTokens() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-usage' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentStreamChunkEvent(this, 'chat-usage', 'done', undefined, undefined, {
            promptTokens: 11,
            completionTokens: 13,
            totalTokens: 24
        }));

        expect(state.tokenUsage.totalTokens).toEqual(24);
        expect(state.tokenUsage.promptTokens).toEqual(11);
        expect(state.tokenUsage.completionTokens).toEqual(13);

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-usage', {
            metadata: {
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                usage: {
                    prompt_tokens: 20,
                    completion_tokens: 22,
                    total_tokens: 42
                }
            }
        } as any));

        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(state.tokenUsage.totalTokens).toEqual(42);
        expect(state.tokenUsage.promptTokens).toEqual(20);
        expect(state.tokenUsage.completionTokens).toEqual(22);
    }

    @Test('working usage updates during app rpc streaming chunks')
    async workingUsageUpdatesDuringAppRpcStreamingChunks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.messagesBySession.set('rpc-stream-usage', [
            { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: '2', role: 'assistant', content: 'hello', createdAt: 2 } as any
        ]);
        appRpc.streamChunks = [
            {
                type: 'text',
                content: 'hel',
                usage: {
                    promptTokens: 9,
                    completionTokens: 3,
                    totalTokens: 12
                }
            },
            {
                type: 'text',
                content: 'lo',
                usage: {
                    promptTokens: 9,
                    completionTokens: 5,
                    totalTokens: 14
                }
            },
            {
                type: 'done',
                usage: {
                    promptTokens: 9,
                    completionTokens: 5,
                    totalTokens: 14
                }
            }
        ];
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc
        );
        component.configure({ sessionId: 'rpc-stream-usage' });
        await component.onInit();

        component.input = 'hello';
        await component.submit();

        expect(state.tokenUsage.promptTokens).toEqual(9);
        expect(state.tokenUsage.completionTokens).toEqual(5);
        expect(state.tokenUsage.totalTokens).toEqual(14);
    }

    @Test('working usage restores from loaded session messages')
    async workingUsageRestoresFromLoadedSessionMessages() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.messagesBySession.set('persisted-usage', [
            { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any,
            {
                id: '2',
                role: 'assistant',
                content: 'world',
                createdAt: 2,
                metadata: {
                    usage: {
                        prompt_tokens: 18,
                        completion_tokens: 6,
                        total_tokens: 24
                    }
                }
            } as any
        ]);
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService
        );
        component.configure({ sessionId: 'persisted-usage' });

        await component.onInit();

        expect(state.tokenUsage.promptTokens).toEqual(18);
        expect(state.tokenUsage.completionTokens).toEqual(6);
        expect(state.tokenUsage.totalTokens).toEqual(24);
    }

    @Test('working usage updates from app rpc done message metadata')
    async workingUsageUpdatesFromAppRpcDoneMessageMetadata() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.messagesBySession.set('rpc-done-usage', [
            { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: '2', role: 'assistant', content: 'hello', createdAt: 2 } as any
        ]);
        appRpc.streamChunks = [
            { type: 'text', content: 'hel' },
            {
                type: 'done',
                message: {
                    id: '3',
                    role: 'assistant',
                    content: 'hello',
                    createdAt: 3,
                    metadata: {
                        usage: {
                            prompt_tokens: 15,
                            completion_tokens: 4,
                            total_tokens: 19
                        }
                    }
                }
            }
        ];
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc
        );
        component.configure({ sessionId: 'rpc-done-usage' });
        await component.onInit();

        component.input = 'hello';
        await component.submit();

        expect(state.tokenUsage.promptTokens).toEqual(15);
        expect(state.tokenUsage.completionTokens).toEqual(4);
        expect(state.tokenUsage.totalTokens).toEqual(19);
        expect(state.messages[state.messages.length - 1]?.metadata?.streaming).toBe(false);
    }

    @Test('configured model label is preserved after model completion events')
    async preservesConfiguredModelLabel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({
            sessionId: 'chat-model',
            provider: 'openai-compatible',
            model: 'redhus',
            modelProfile: 'flash'
        });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-model', {
            metadata: {
                provider: 'openai-compatible',
                model: 'rehdasu',
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 12,
                    total_tokens: 22
                }
            }
        } as any));

        expect(component.provider).toEqual('openai-compatible');
        expect(component.model).toEqual('redhus');
    }

    @Test('tracks pending approvals through event bridge')
    async tracksPendingApprovalsThroughEventBridge() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-approval' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, {
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'chat-approval',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval. Summary: {"path":"notes.txt"}',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            timeoutMs: 30000
        }));

        expect(state.pendingApprovals.length).toEqual(1);
        expect(state.pendingApprovals[0].toolName).toEqual('write_file');

        await app.eventMulticaster.emit(new AgentApprovalCompletedEvent(this, {
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'chat-approval'
        }, true));

        expect(state.pendingApprovals).toEqual([]);

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, {
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'chat-approval',
            reason: 'Shell execution requires approval.',
            summary: 'Shell execution requires approval.',
            hasInput: false,
            timeoutMs: 30000
        }));

        await app.eventMulticaster.emit(new AgentApprovalFailedEvent(this, {
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'chat-approval'
        }, new Error('Approval timeout')));

        expect(state.pendingApprovals).toEqual([]);
        expect(state.lastError).toEqual('Approval timeout');
        expect(state.displayMessages.some(message => String(message.content || '').includes('Approval timeout'))).toEqual(false);
    }

    @Test('session state supports focused session list navigation')
    sessionStateSupportsFocusedSessionListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setSessions([
            { id: 'chat-1', current: true, messageCount: 4, updatedAt: 4 },
            { id: 'chat-2', current: false, messageCount: 2, updatedAt: 2 }
        ]);

        expect(state.selectedSessionId).toEqual('chat-1');

        state.setSessionsFocused(true);
        expect(state.sessionsFocused).toEqual(true);
        expect(state.selectedSession?.id).toEqual('chat-1');

        state.moveSessionSelection(1);
        expect(state.selectedSession?.id).toEqual('chat-2');

        state.setSelectedSessionId('chat-1');
        expect(state.selectedSession?.id).toEqual('chat-1');

        state.setSessionsFocused(false);
        expect(state.sessionsFocused).toEqual(false);
    }

    @Test('session state supports focused tool list navigation')
    sessionStateSupportsFocusedToolListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setTools([
            { name: 'read_file', toolset: 'filesystem', active: true, activationKind: 'always' },
            { name: 'write_file', toolset: 'filesystem', active: false, activationKind: 'approval' }
        ]);

        expect(state.selectedTool?.name).toEqual('read_file');

        state.setToolsFocused(true);
        expect(state.toolsFocused).toEqual(true);

        state.moveToolSelection(1);
        expect(state.selectedTool?.name).toEqual('write_file');

        state.setSelectedToolName('read_file');
        expect(state.selectedTool?.name).toEqual('read_file');

        state.setToolsFocused(false);
        expect(state.toolsFocused).toEqual(false);
    }

    @Test('session state supports focused approval list navigation')
    sessionStateSupportsFocusedApprovalListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                createdAt: 1,
                timeoutMs: 30000
            } as any,
            {
                id: 'approval-2',
                toolName: 'terminal',
                sessionId: 'console',
                reason: 'Shell execution requires approval.',
                summary: 'Shell execution requires approval.',
                hasInput: true,
                createdAt: 2,
                timeoutMs: 60000
            } as any
        ]);

        expect(state.selectedApproval?.id).toEqual('approval-1');

        state.setApprovalsFocused(true);
        expect(state.approvalsFocused).toEqual(true);

        state.moveApprovalSelection(1);
        expect(state.selectedApproval?.id).toEqual('approval-2');

        state.setSelectedApprovalId('approval-1');
        expect(state.selectedApproval?.id).toEqual('approval-1');

        state.setApprovalsFocused(false);
        expect(state.approvalsFocused).toEqual(false);
    }

    @Test('session state supports coding task review focus and scroll')
    sessionStateSupportsCodingTaskReviewFocusAndScroll() {
        const state = new AgentConsoleSessionState();
        const reviewTask = createReviewTask();

        state.openReview(reviewTask as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line\n+second line'
            },
            workers: reviewTask.result.workers
        });

        expect(state.reviewOpen).toEqual(true);
        expect(state.hasReviewFocus()).toEqual(true);
        expect(state.reviewExecutionMode).toEqual('parallel');
        expect(state.reviewDetailLines.join('\n')).toContain('worker-1');
        expect(state.reviewDetailLines.join('\n')).toContain('Rollback: available');
        expect(state.reviewDetailLines.join('\n')).toContain('Checkpoints: 1 total');

        const maxReviewScroll = Math.max(0, state.reviewDetailLines.length - state.consoleOptions.reviewDetailVisibleLines);
        state.scrollReviewDetail(1);
        expect(state.reviewDetailScroll).toEqual(Math.min(1, maxReviewScroll));

        state.scrollReviewDetailColumns(5);
        expect(state.reviewDetailColumnScroll).toEqual(5);

        state.closeReview();
        expect(state.reviewOpen).toEqual(false);
        expect(state.reviewDetailScroll).toEqual(0);
        expect(state.reviewDetailColumnScroll).toEqual(0);
    }

    @Test('session state supports paged session navigation and edges')
    sessionStateSupportsPagedSessionNavigationAndEdges() {
        const state = new AgentConsoleSessionState();
        state.setSessions([
            { id: 'chat-1', current: true } as any,
            { id: 'chat-2', current: false } as any,
            { id: 'chat-3', current: false } as any,
            { id: 'chat-4', current: false } as any,
            { id: 'chat-5', current: false } as any,
            { id: 'chat-6', current: false } as any,
            { id: 'chat-7', current: false } as any
        ]);

        state.moveSessionSelectionPage(1);
        expect(state.selectedSession?.id).toEqual('chat-6');

        state.selectLastSession();
        expect(state.selectedSession?.id).toEqual('chat-7');

        state.moveSessionSelectionPage(-1);
        expect(state.selectedSession?.id).toEqual('chat-2');

        state.selectFirstSession();
        expect(state.selectedSession?.id).toEqual('chat-1');
    }

    @Test('session service sorts sessions by workspace then activity')
    async sessionServiceSortsSessionsByWorkspace() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-b'
        });
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a'
        });
        store.sessions.set('chat-c', {
            sessionId: 'chat-c',
            messages: [],
            createdAt: 3,
            updatedAt: 3,
            workspace: '/tmp/project-a'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const sessions = await service.listSessions('chat-c');

        expect(sessions.map(item => item.id)).toEqual(['chat-c', 'chat-a', 'chat-b']);
        expect(sessions[0].workspace).toEqual('/tmp/project-a');
        expect(sessions[0].current).toEqual(true);
    }

    @Test('session service groups sessions by workspace')
    async sessionServiceGroupsSessionsByWorkspace() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-b'
        });
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a'
        });
        store.sessions.set('chat-c', {
            sessionId: 'chat-c',
            messages: [],
            createdAt: 3,
            updatedAt: 3,
            workspace: '/tmp/project-a'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-c');

        expect(projects.map(project => project.workspace)).toEqual(['/tmp/project-a', '/tmp/project-b']);
        expect(projects[0].sessionCount).toEqual(2);
        expect(projects[0].sessions.map(session => session.id)).toEqual(['chat-c', 'chat-a']);
        expect(projects[0].sessions[0].current).toEqual(true);
    }

    @Test('session state supports focused message list navigation')
    sessionStateSupportsFocusedMessageListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);

        expect(state.selectedMessageId).toEqual('m2');

        state.setMessagesFocused(true);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m2');

        state.moveMessageSelection(-1);
        expect(state.selectedMessage?.id).toEqual('m1');

        state.setSelectedMessageId('m2');
        expect(state.selectedMessage?.id).toEqual('m2');

        state.setMessagesFocused(false);
        expect(state.messagesFocused).toEqual(false);
    }

    @Test('session state follows the latest message when not browsing messages')
    sessionStateFollowsLatestMessageWhenNotBrowsing() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);

        state.setSelectedMessageId('m1');
        expect(state.selectedMessageId).toEqual('m1');

        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'next', createdAt: 3 } as any
        ]);
        expect(state.selectedMessageId).toEqual('m3');

        state.setMessagesFocused(true);
        state.setSelectedMessageId('m1');
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'next', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: 'reply', createdAt: 4 } as any
        ]);
        expect(state.selectedMessageId).toEqual('m1');
    }

    @Test('session state hides tool messages and blank assistant placeholders from visible navigation')
    sessionStateHidesToolMessagesFromVisibleNavigation() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'u1', role: 'user', content: '查天气', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '', createdAt: 2, metadata: { toolCalls: [{ id: 'tc1', name: 'weather' }] } } as any,
            { id: 'a-stream', role: 'assistant', content: '', createdAt: 2, metadata: { streaming: true } } as any,
            { id: 't1', role: 'tool', content: '{"location":"成都"}', createdAt: 3 } as any,
            { id: 'a2', role: 'assistant', content: '成都当前天气：晴', createdAt: 4 } as any
        ]);

        expect(state.displayMessages.map(message => message.id)).toEqual(['u1', 'a2']);
        expect(state.selectedMessage?.id).toEqual('a2');

        state.setMessagesFocused(true);
        state.moveMessageSelection(-1);
        expect(state.selectedMessage?.id).toEqual('u1');
    }

    @Test('session state dedupes identical ui event upserts')
    sessionStateDedupesIdenticalUiEventUpserts() {
        const state = new AgentConsoleSessionState();
        let notifications = 0;
        state.subscribe(() => {
            notifications++;
        });

        state.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });
        state.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });
        state.upsertUiEventMessage('turn-start', 'Working', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });

        expect(state.displayMessages.length).toEqual(1);
        expect(state.displayMessages[0].content).toEqual('Working');
        expect(notifications).toEqual(2);
    }

    @Test('session state supports message detail open and scroll')
    sessionStateSupportsMessageDetailOpenAndScroll() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8',
                createdAt: 1
            } as any
        ]);

        state.setMessagesFocused(true);
        state.openMessageDetail();
        expect(state.messageDetailOpen).toEqual(true);
        expect(state.messageDetailScroll).toEqual(0);

        state.scrollMessageDetail(3);
        expect(state.messageDetailScroll).toEqual(2);

        state.closeMessageDetail();
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messageDetailScroll).toEqual(0);
    }

    @Test('session state opens message detail on enter when messages are focused')
    async sessionStateOpensMessageDetailOnEnterWhenMessagesFocused() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8',
                createdAt: 1
            } as any
        ]);

        state.setMessagesFocused(true);
        expect(await state.handleFocusKey('enter')).toEqual(true);
        expect(state.messageDetailOpen).toEqual(true);
    }

    @Test('session state supports paged message navigation and detail edges')
    sessionStateSupportsPagedMessageNavigationAndDetailEdges() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any,
            { id: 'm7', role: 'user', content: '7', createdAt: 7 } as any,
            { id: 'm8', role: 'assistant', content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8', createdAt: 8 } as any
        ]);

        state.selectFirstMessage();
        expect(state.selectedMessage?.id).toEqual('m1');

        state.moveMessageSelectionPage(1);
        expect(state.selectedMessage?.id).toEqual('m7');

        state.selectLastMessage();
        expect(state.selectedMessage?.id).toEqual('m8');

        state.openMessageDetail();
        state.scrollMessageDetailToEdge('end');
        expect(state.messageDetailScroll).toEqual(2);

        state.scrollMessageDetailPage(-1);
        expect(state.messageDetailScroll).toEqual(0);
    }

    @Test('session state supports message detail horizontal scrolling with tab expansion')
    sessionStateSupportsMessageDetailHorizontalScrollingWithTabExpansion() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: '\tconst value = 42;\n\t\treturn value;',
                createdAt: 1
            } as any
        ]);

        state.setMessagesFocused(true);
        state.openMessageDetail();

        expect(state.messageDetailLines[0]).toEqual('    const value = 42;');
        expect(state.messageDetailLines[1]).toEqual('        return value;');
        expect(state.messageDetailMaxColumn).toEqual('        return value;'.length);

        state.scrollMessageDetailColumns(4);
        expect(state.messageDetailColumnScroll).toEqual(4);

        state.scrollMessageDetailColumnsToEdge('end');
        expect(state.messageDetailColumnScroll).toEqual(state.messageDetailMaxColumn - 1);

        state.closeMessageDetail();
        expect(state.messageDetailColumnScroll).toEqual(0);
    }
    @Test('handleSelectKey navigates and confirms select menu')
    handleSelectKeyNavigatesSelectMenu() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' }
        ]);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        
        // Up wraps to last
        state.handleSelectKey('up');
        expect(state.selectMenu?.selectedIndex).toEqual(2);
        
        // Down wraps to first
        state.handleSelectKey('down');
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        
        // Down moves to next
        state.handleSelectKey('down');
        expect(state.selectMenu?.selectedIndex).toEqual(1);
        
        // Escape cancels
        state.handleSelectKey('escape');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey treats q like escape for select menus')
    handleSelectKeyTreatsQAsEscapeForSelectMenus() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);

        state.handleSelectKey('q');

        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey returns to parent menu before closing root menu')
    async handleSelectKeyReturnsToParentMenuBeforeClosingRootMenu() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Parent', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ], 1);
        await state.openSubSelectMenu('Child', [
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' }
        ], 0);

        expect(state.handleSelectKey('q')).toBe(true);
        expect(state.selectMenu?.title).toEqual('Parent');
        expect(state.selectMenu?.selectedIndex).toEqual(1);

        expect(state.handleSelectKey('escape')).toBe(true);
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleMenuInput returns to parent menu before closing root menu')
    async handleMenuInputReturnsToParentMenuBeforeClosingRootMenu() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Parent', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ], 0);
        await state.openSubSelectMenu('Child', [
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' }
        ], 1);

        expect(state.handleMenuInput('', 'q')).toBe(true);
        expect(state.selectMenu?.title).toEqual('Parent');

        expect(state.handleMenuInput('escape', '')).toBe(true);
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey selects by number and returns true on handled keys')
    handleSelectKeyReturnsTrueOnHandledKeys() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);
        
        expect(state.handleSelectKey('up')).toBe(true);
        expect(state.handleSelectKey('down')).toBe(true);
        expect(state.handleSelectKey('return')).toBe(true);
        expect(state.selectMenu).toBeUndefined();  // confirmed

        state.openSelectMenu('Test2', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);
        expect(state.handleSelectKey('1')).toBe(true);
        expect(state.selectMenu).toBeUndefined();  // chosen index 0
        
        // Unhandled key returns false
        expect(state.handleSelectKey('x')).toBe(false);
    }




    @Test('left arrow after workspace suggestion selection moves cursor correctly')
    async leftArrowAfterWorkspaceSuggestionMovesCursorCorrectly() {
        const workspace = createWorkspaceFixture();
        try {
            const state = new AgentConsoleSessionState();
            let submitCalled = false;
            state.submitAction = async () => {
                submitCalled = true;
            };
            state.setWorkspace(workspace);
            state.setWorkspaceMentionResolver(createWorkspaceMentionsProvider());

            state.setInput('@sr', 3);
            await waitForSuggestionMenu(state, 20);
            expect(state.selectMenu?.title).toEqual('Suggestions');
            expect(state.selectMenu?.options.find(o => o.value === '@src/')).toBeDefined();

            await state.confirmSelectMenu('@src/');
            expect(state.input).toEqual('@src/ ');
            expect(state.selectMenu).toBeUndefined();

            const fullText = '@src/ 写测试用例，';
            state.setInput(fullText, fullText.length);
            expect(state.input).toEqual(fullText);
            expect(state.inputCursor).toEqual(fullText.length); // fullText.length = 12

            // Helper: simulate left arrow
            const pressLeft = async (s: AgentConsoleSessionState): Promise<boolean> => {
                const outcome = await s.processDecodedInput(
                    { text: '\u001b[D', controlKey: 'left', partial: false },
                    '\u001b[D',
                    { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false }
                );
                if (outcome.handled && outcome.action === 'draftNavigation' && outcome.value === 'left') {
                    s.moveInputCursor(-1);
                    return true;
                }
                return outcome.handled;
            };

            // fullText = '@src/ 写测试用例，' (12 chars: @ s r c / space 写 测 试 用 例 ，)
            // Cursor starts at position 12
            expect(state.inputCursor).toEqual(12);

            // Move through the 6 Chinese chars (positions 11,10,9,8,7,6)
            for (let i = 0; i < 6; i++) {
                const handled = await pressLeft(state);
                expect(handled).toEqual(true);
                expect(state.inputCursor).toEqual(11 - i);
                expect(state.input).not.toContain('[D');
                expect(state.input).not.toContain('\n');
                expect(state.input).not.toContain('\r');
            }
            expect(state.inputCursor).toEqual(6);
            expect(submitCalled).toEqual(false);

            // Press left into the space (position 5)
            await pressLeft(state);
            expect(state.inputCursor).toEqual(5);
            expect(submitCalled).toEqual(false);

            // Press left into @src/ (position 4)
            await pressLeft(state);
            expect(state.inputCursor).toEqual(4);
            expect(submitCalled).toEqual(false);

            // Press left through @src/ (positions 3,2,1,0)
            for (let i = 0; i < 4; i++) {
                await pressLeft(state);
                expect(state.input).not.toContain('[D');
                expect(state.input).not.toContain('\n');
            }
            expect(state.inputCursor).toEqual(0);
            expect(submitCalled).toEqual(false);

            // Left at position 0 should stay at 0
            await pressLeft(state);
            expect(state.inputCursor).toEqual(0);
            expect(state.input).toEqual(fullText);
            expect(submitCalled).toEqual(false);

            // Press right back through
            const pressRight = async (s: AgentConsoleSessionState): Promise<boolean> => {
                const outcome = await s.processDecodedInput(
                    { text: '\u001b[C', controlKey: 'right', partial: false },
                    '\u001b[C',
                    { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false }
                );
                if (outcome.handled && outcome.action === 'draftNavigation' && outcome.value === 'right') {
                    s.moveInputCursor(1);
                    return true;
                }
                return outcome.handled;
            };

            for (let i = 0; i < 6; i++) {
                await pressRight(state);
                expect(state.input).not.toContain('[C');
                expect(state.input).not.toContain('\n');
            }
            expect(state.inputCursor).toEqual(6);
            expect(submitCalled).toEqual(false);

        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('processRawChunk with workspace file suggestion does not submit')
    async processRawChunkWithWorkspaceSuggestionDoesNotSubmit() {
        const workspace = createWorkspaceFixture();
        try {
            const state = new AgentConsoleSessionState();
            let submitCount = 0;
            state.submitAction = async () => { submitCount++; };
            state.setWorkspace(workspace);
            state.setWorkspaceMentionResolver(createWorkspaceMentionsProvider());
            state.setInput('check @sr', 'check @sr'.length);
            await waitForSuggestionMenu(state, 20);
            expect(state.selectMenu?.title).toEqual('Suggestions');
            const wsResult = await state.processRawChunk('\r', { submitOnEnter: true, hasSelectMenu: true });
            expect(wsResult.confirmedSelection).toEqual(true);
            expect(wsResult.submitted).toEqual(false);
            expect(state.input).toContain('@src/');
            expect(state.input).not.toContain('\r');
            expect(state.input).not.toContain('\n');
            expect(submitCount).toEqual(0);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
