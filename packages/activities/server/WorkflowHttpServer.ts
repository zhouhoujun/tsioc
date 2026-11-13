import { Inject, Module, Type, token } from '@tsdi/ioc';
import { Application } from '@tsdi/core';
import {
    AcceptsPriority,
    MimeAdapter,
    MimeDb,
    MimeTypes
} from '@tsdi/common';
import {
    AcceptsPriorityImpl,
    BasicMimeDb,
    MimeAdapterImpl,
    MimeTypesImpl
} from '@tsdi/mime';
import {
    BadRequestException,
    NotFoundException,
    StatusMessageAdapter
} from '@tsdi/common';
import {
    Controller,
    Delete,
    Get,
    Post,
    Put,
    RequestBody,
    RequestParam,
    RequestPath,
    provideService,
    useCookie,
    useGuards,
    useJson,
    useRouter,
    useStatics
} from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { LoggerModule } from '@tsdi/logger';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import {
    VisualWorkflowDefinition,
    WorkflowDefinitionStore,
    WorkflowExecutionSnapshot,
    InMemoryWorkflowDefinitionStore,
    createDefaultWorkflowDefinitionStore,
    validateVisualWorkflowDraft
} from '../src/visual';
import { toWorkflowExecutionSnapshot, VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowPluginCatalog } from '../src/plugins/catalog';
import { WorkflowPluginRegistry } from '../src/plugins/plugin-registry';
import { WorkflowPlugin } from '../src/plugins/types';
import { SqliteWorkflowDefinitionStore, isSqliteAvailable } from './SqliteWorkflowDefinitionStore';
import {
    InMemoryWorkflowExecutionStore,
    SqliteWorkflowExecutionStore,
    WorkflowExecutionStore
} from './WorkflowExecutionStore';

export const WORKFLOW_DEFINITION_STORE = token<WorkflowDefinitionStore>('WORKFLOW_DEFINITION_STORE');
export const WORKFLOW_EXECUTION_STORE = token<WorkflowExecutionStore>('WORKFLOW_EXECUTION_STORE');
export const WORKFLOW_EXECUTION_LIMIT = token<number>('WORKFLOW_EXECUTION_LIMIT');

/** Plugin catalog API: installed plugins plus bundled/available manifests. */
@Controller('/api/plugins')
export class WorkflowPluginController {
    constructor(
        private plugins: WorkflowPluginRegistry,
        private catalog: WorkflowPluginCatalog
    ) { }

    @Get('/')
    list() {
        return {
            installed: this.plugins.list(),
            available: this.catalog.list()
        };
    }

    @Post('/:id/install')
    async install(@RequestPath('id') id: string) {
        const plugin = this.catalog.create(id);
        if (!plugin) {
            throw new NotFoundException(`Workflow plugin not found: ${id}`);
        }
        const installed = await this.plugins.install(plugin);
        return {
            installed,
            plugin: this.plugins.list().find(item => item.id === id)
        };
    }

    @Delete('/:id')
    async remove(@RequestPath('id') id: string) {
        const removed = await this.plugins.uninstall(id);
        if (!removed) {
            throw new NotFoundException(`Workflow plugin not installed: ${id}`);
        }
        return { removed: true };
    }
}

/**
 * HTTP controller for visual workflows, using the framework's own
 * `@tsdi/service` microservice router and `@tsdi/http-microservice` transport.
 */
@Controller('/api/workflows')
export class WorkflowHttpController {
    constructor(
        @Inject(WORKFLOW_DEFINITION_STORE) private store: WorkflowDefinitionStore,
        @Inject(WORKFLOW_EXECUTION_STORE) private history: WorkflowExecutionStore,
        @Inject(WORKFLOW_EXECUTION_LIMIT) private historyLimit: number,
        private execution: VisualWorkflowService
    ) { }

    @Get('/')
    list() {
        return this.store.list();
    }

    @Get('/:id')
    async get(@RequestPath('id') id: string) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        return definition;
    }

    @Put('/:id')
    async save(@RequestPath('id') id: string, @RequestBody() body: VisualWorkflowDefinition) {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('Workflow definition body is required');
        }
        const definition: VisualWorkflowDefinition = { ...body, id };
        // Drafts (empty canvas, no start node yet, half-built graph) must be
        // savable; run-time validation happens in the execution service.
        const validation = validateVisualWorkflowDraft(definition);
        if (!validation.valid) {
            throw new BadRequestException(validation.errors.join('; '));
        }
        const summary = await this.store.save(definition);
        return { summary, definition };
    }

    @Delete('/:id')
    async remove(@RequestPath('id') id: string) {
        const removed = await this.store.remove(id);
        if (!removed) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        return { removed: true };
    }

    @Delete('/')
    async clear() {
        await this.store.clear();
        return { cleared: true };
    }

    @Post('/:id/run')
    async run(
        @RequestPath('id') id: string,
        @RequestBody() body: { context?: Record<string, any>; timeout?: number } = {}
    ) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        const timeout = Math.max(0, Number(body?.timeout) || 0);
        const result = await this.execution.execute(definition, body?.context || {}, {
            timeout: timeout || undefined
        });
        await this.persist(result);
        return this.serializeResult(result);
    }

    /**
     * Webhook entry: run a workflow from a real HTTP request. `http-in` nodes
     * match the request method/path (`?path=/orders`) and `http-response`
     * nodes shape the status, headers and body returned to the caller.
     */
    @Post('/:id/hook')
    hookPost(@RequestPath('id') id: string, adapter: StatusMessageAdapter) {
        return this.runHook(id, adapter);
    }

    @Get('/:id/hook')
    hookGet(@RequestPath('id') id: string, adapter: StatusMessageAdapter) {
        return this.runHook(id, adapter);
    }

    @Post('/:id/hook/:path')
    hookPostPath(
        @RequestPath('id') id: string,
        @RequestPath('path') path: string,
        adapter: StatusMessageAdapter
    ) {
        return this.runHook(id, adapter, `/${path}`);
    }

    @Get('/:id/hook/:path')
    hookGetPath(
        @RequestPath('id') id: string,
        @RequestPath('path') path: string,
        adapter: StatusMessageAdapter
    ) {
        return this.runHook(id, adapter, `/${path}`);
    }

    @Post('/:id/hook/:path/:sub')
    hookPostSubPath(
        @RequestPath('id') id: string,
        @RequestPath('path') path: string,
        @RequestPath('sub') sub: string,
        adapter: StatusMessageAdapter
    ) {
        return this.runHook(id, adapter, `/${path}/${sub}`);
    }

    @Get('/:id/hook/:path/:sub')
    hookGetSubPath(
        @RequestPath('id') id: string,
        @RequestPath('path') path: string,
        @RequestPath('sub') sub: string,
        adapter: StatusMessageAdapter
    ) {
        return this.runHook(id, adapter, `/${path}/${sub}`);
    }

    private async runHook(id: string, adapter: StatusMessageAdapter, pathOverride?: string) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        const request = (adapter as any).request || {};
        const query = (adapter.read('query') as Record<string, any>) || {};
        const headers = (adapter.read('headers') as Record<string, any>) || {};
        const method = String(request.method || 'POST').toUpperCase();
        const queryPath = typeof query.path === 'string' && query.path ? query.path : '';
        const requestedPath = pathOverride || queryPath || '/hook';
        const response: { statusCode?: number; headers?: Record<string, any>; body?: any } = {};
        const result = await this.execution.execute(definition, {
            request: {
                method,
                path: requestedPath,
                query,
                headers,
                body: adapter.read('body')
            },
            response
        } as any);
        await this.persist(result);

        const status = Number(response.statusCode) || (result.success ? 200 : 500);
        adapter.setStatus(status);
        Object.entries(response.headers || {}).forEach(([name, value]) => {
            if (value !== undefined && value !== null) {
                adapter.setHeader(name, value as any);
            }
        });
        if (response.body !== undefined) {
            return response.body;
        }
        return {
            success: result.success,
            status: result.data?.status,
            executionId: result.data?.executionId,
            error: result.error?.message
        };
    }

    @Post('/:id/resume')
    async resume(
        @RequestPath('id') id: string,
        @RequestBody() body: { context?: Record<string, any>; checkpoint: any }
    ) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        if (!body?.checkpoint) {
            throw new BadRequestException('checkpoint is required');
        }
        const result = await this.execution.execute(definition, body?.context || {}, {
            resumeFrom: body.checkpoint
        });
        await this.persist(result);
        return this.serializeResult(result);
    }

    private async persist(result: Awaited<ReturnType<VisualWorkflowService['execute']>>): Promise<void> {
        const snapshot = result.data?.executionState as WorkflowExecutionSnapshot | undefined;
        if (!snapshot?.executionId) {
            return;
        }
        try {
            await this.history.save(snapshot);
            await this.history.prune(snapshot.workflowId, Math.max(1, Number(this.historyLimit) || 200));
        } catch {
            // History persistence must never fail the workflow response.
        }
    }

    private serializeResult(result: Awaited<ReturnType<VisualWorkflowService['execute']>>) {
        return {
            success: result.success,
            status: result.data?.status,
            executionId: result.data?.executionId,
            executionState: result.data?.executionState,
            error: result.error?.message
        };
    }
}

/**
 * Execution inspection API: list recent runs, read one snapshot, and cancel a
 * running execution. Snapshots are the same serializable shape the designer
 * replays on the canvas.
 */
@Controller('/api/executions')
export class WorkflowExecutionController {
    constructor(
        private execution: VisualWorkflowService,
        @Inject(WORKFLOW_EXECUTION_STORE) private history: WorkflowExecutionStore
    ) { }

    @Get('/')
    async list(
        @RequestParam('workflowId', { nullable: true }) workflowId?: string,
        @RequestParam('limit', { nullable: true }) limit?: string
    ) {
        const size = Math.max(1, Number(limit) || 50);
        const merged = new Map<string, WorkflowExecutionSnapshot>();
        (await this.history.list(workflowId, size)).forEach(item => merged.set(item.executionId, item));
        // In-flight runs are not persisted yet, so live snapshots win.
        this.execution.getExecutions()
            .filter(state => !workflowId || state.workflowId === workflowId)
            .map(state => toWorkflowExecutionSnapshot(state))
            .forEach(item => merged.set(item.executionId, item));
        return Array.from(merged.values())
            .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
            .slice(0, size);
    }

    @Get('/:id')
    async get(@RequestPath('id') id: string) {
        const snapshot = this.execution.getExecutionSnapshot(id)
            || await this.history.get(id);
        if (!snapshot) {
            throw new NotFoundException(`Execution not found: ${id}`);
        }
        return snapshot;
    }

    @Post('/:id/cancel')
    async cancel(@RequestPath('id') id: string) {
        const state = this.execution.getExecution(id);
        if (state) {
            if (state.status !== 'running') {
                return { cancelled: false, status: state.status };
            }
            await this.execution.cancelExecution(id);
            return { cancelled: true, status: 'cancelled' };
        }
        const stored = await this.history.get(id);
        if (!stored) {
            throw new NotFoundException(`Execution not found: ${id}`);
        }
        return { cancelled: false, status: stored.status };
    }
}

export interface WorkflowHttpServerOptions {
    port?: number;
    host?: string;
    /** Static root (for example the built designer directory). */
    staticRoot?: string;
    /** Store override; defaults to SQLite (`WORKFLOW_DB_FILE` or ~/.tsdi-agent/workflows.db). */
    store?: WorkflowDefinitionStore;
    /** Execution history store; defaults to SQLite next to the definition store. */
    executionStore?: WorkflowExecutionStore;
    /** Snapshots kept per workflow (default 200). */
    executionHistoryLimit?: number;
    /** SQLite database path when `store` is not supplied. */
    databaseFile?: string;
    /** Programmatic plugins installed when the server starts. */
    plugins?: WorkflowPlugin[];
    /** Built-in plugin ids installed when the server starts (mqtt/redis/nats/coap). */
    installPlugins?: string[];
    /** Extra modules imported by the generated workflow module (auth, persistence, ...). */
    imports?: any[];
    /** Extra controllers/declarations (login, auth, ...). */
    declarations?: any[];
    /** Extra providers (auth config, guards, stores, ...). */
    providers?: any[];
    /** Global router/message guards (for example a session guard). */
    guards?: any[];
    /** Enable cookie parsing (auth sessions, ...). */
    cookies?: boolean;
    /** Enable JSON request/response handling. */
    json?: boolean;
}

function createServerExecutionStore(options: WorkflowHttpServerOptions): WorkflowExecutionStore {
    if (options.executionStore) {
        return options.executionStore;
    }
    if (options.store instanceof SqliteWorkflowDefinitionStore) {
        return new SqliteWorkflowExecutionStore({ file: options.store.databaseFile });
    }
    if (options.store) {
        return new InMemoryWorkflowExecutionStore();
    }
    if (options.databaseFile || isSqliteAvailable()) {
        return new SqliteWorkflowExecutionStore({ file: options.databaseFile });
    }
    return new InMemoryWorkflowExecutionStore();
}

function createServerWorkflowStore(options: WorkflowHttpServerOptions): WorkflowDefinitionStore {
    if (options.store) {
        return options.store;
    }
    if (options.databaseFile || isSqliteAvailable()) {
        return new SqliteWorkflowDefinitionStore({ file: options.databaseFile });
    }
    return createDefaultWorkflowDefinitionStore();
}

/**
 * Create a framework microservice module serving workflows CRUD/run/resume.
 * The module uses `useRouter()` + `useHttpTransport()` exactly like other HTTP
 * microservices in this repository.
 */
export function createWorkflowHttpModule(options: WorkflowHttpServerOptions = {}): Type<any> {
    const store = createServerWorkflowStore(options);
    const executionStore = createServerExecutionStore(options);
    const features: any[] = [
        provideService(
            useRouter(),
            ...(options.cookies ? [useCookie()] : []),
            ...(options.guards?.length ? [useGuards(...options.guards)] : []),
            ...(options.staticRoot ? [useStatics({ root: options.staticRoot })] : []),
            ...(options.json ? [useJson()] : []),
            useHttpTransport({
                listenOpts: {
                    host: options.host || '127.0.0.1',
                    port: options.port ?? 3000
                },
                asDefault: true
            })
        )
    ];

    @Module({
        imports: [LoggerModule, WorkflowModule, ServerCommonModule, ...(options.imports || [])],
        declarations: [
            WorkflowHttpController,
            WorkflowPluginController,
            WorkflowExecutionController,
            ...(options.declarations || [])
        ],
        providers: [
            { provide: WORKFLOW_DEFINITION_STORE, useValue: store },
            { provide: WORKFLOW_EXECUTION_STORE, useValue: executionStore },
            { provide: WORKFLOW_EXECUTION_LIMIT, useValue: options.executionHistoryLimit ?? 200 },
            ...(options.providers || []),
            WorkflowPluginCatalog,
            ...features,
            // Register MIME providers after the transport feature. The feature
            // also imports MimeModule exports; re-registering here ensures the
            // concrete implementations win in embedded/test injectors.
            { provide: MimeTypes, useClass: MimeTypesImpl },
            { provide: MimeDb, useClass: BasicMimeDb },
            { provide: MimeAdapter, useClass: MimeAdapterImpl },
            { provide: AcceptsPriority, useClass: AcceptsPriorityImpl }
        ]
    })
    class WorkflowHttpServerModule { }

    return WorkflowHttpServerModule;
}

export async function startWorkflowHttpServer(options: WorkflowHttpServerOptions = {}) {
    const ctx = await Application.run(createWorkflowHttpModule(options));
    const registry = ctx.get(WorkflowPluginRegistry, null);
    if (registry) {
        for (const plugin of options.plugins || []) {
            await registry.install(plugin);
        }
        const configured = options.installPlugins
            || String(process.env.WORKFLOW_PLUGINS || '')
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);
        const catalog = new WorkflowPluginCatalog();
        for (const id of configured) {
            const plugin = catalog.create(id);
            if (plugin) {
                await registry.install(plugin);
            }
        }
    }
    return ctx;
}

export { InMemoryWorkflowDefinitionStore, SqliteWorkflowDefinitionStore };
