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
    NotFoundException
} from '@tsdi/common';
import {
    Controller,
    Delete,
    Get,
    Post,
    Put,
    RequestBody,
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
    InMemoryWorkflowDefinitionStore,
    createDefaultWorkflowDefinitionStore,
    validateVisualWorkflow
} from '../src/visual';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowPluginCatalog } from '../src/plugins/catalog';
import { WorkflowPluginRegistry } from '../src/plugins/plugin-registry';
import { WorkflowPlugin } from '../src/plugins/types';
import { SqliteWorkflowDefinitionStore, isSqliteAvailable } from './SqliteWorkflowDefinitionStore';

export const WORKFLOW_DEFINITION_STORE = token<WorkflowDefinitionStore>('WORKFLOW_DEFINITION_STORE');

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
        const validation = validateVisualWorkflow(definition);
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
        @RequestBody() body: { context?: Record<string, any> } = {}
    ) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        const result = await this.execution.execute(definition, body?.context || {});
        return this.serializeResult(result);
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
        return this.serializeResult(result);
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

export interface WorkflowHttpServerOptions {
    port?: number;
    host?: string;
    /** Static root (for example the built designer directory). */
    staticRoot?: string;
    /** Store override; defaults to SQLite (`WORKFLOW_DB_FILE` or ~/.tsdi-agent/workflows.db). */
    store?: WorkflowDefinitionStore;
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
        declarations: [WorkflowHttpController, WorkflowPluginController, ...(options.declarations || [])],
        providers: [
            { provide: WORKFLOW_DEFINITION_STORE, useValue: store },
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
