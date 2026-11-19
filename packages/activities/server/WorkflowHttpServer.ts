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
    Options,
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
    IVisualWorkflowNode,
    VisualWorkflowDefinition,
    WorkflowDefinitionStore,
    WorkflowExecutionSnapshot,
    WorkflowDeploymentStatus,
    InMemoryWorkflowDefinitionStore,
    createDefaultWorkflowDefinitionStore,
    validateVisualWorkflow,
    validateVisualWorkflowDraft
} from '../src/visual';
import { toWorkflowExecutionSnapshot, VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowScheduleManager } from './WorkflowScheduleManager';
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
import { WorkflowMqttTransport } from './WorkflowMqtt';
import { WorkflowNetTransport } from './WorkflowNetTransport';
import { WorkflowWebSocketTransport } from './WorkflowWebSocket';
import { WorkflowFileTransport } from './WorkflowFileTransport';
import {
    InMemoryWorkflowContextStore,
    SqliteWorkflowContextStore,
    WORKFLOW_CONTEXT_STORE,
    WorkflowContextStore
} from './WorkflowContextStore';
import {
    InMemoryWorkflowCredentialStore,
    SqliteWorkflowCredentialStore,
    WORKFLOW_CREDENTIAL_STORE,
    WorkflowCredentialStore
} from './WorkflowCredentialStore';
import {
    InMemoryWorkflowAuditStore,
    SqliteWorkflowAuditStore,
    WORKFLOW_AUDIT_LIMIT,
    WORKFLOW_AUDIT_STORE,
    WorkflowAuditService,
    WorkflowAuditStore
} from './WorkflowAuditStore';
import {
    InMemoryWorkflowVersionStore,
    SqliteWorkflowVersionStore,
    WorkflowVersionStore
} from './WorkflowVersionStore';

export const WORKFLOW_DEFINITION_STORE = token<WorkflowDefinitionStore>('WORKFLOW_DEFINITION_STORE');
export const WORKFLOW_EXECUTION_STORE = token<WorkflowExecutionStore>('WORKFLOW_EXECUTION_STORE');
export const WORKFLOW_EXECUTION_POLICY = token<WorkflowExecutionPolicy>('WORKFLOW_EXECUTION_POLICY');
export const WORKFLOW_EXECUTION_LIMIT = token<number>('WORKFLOW_EXECUTION_LIMIT');
export const WORKFLOW_VERSION_STORE = token<WorkflowVersionStore>('WORKFLOW_VERSION_STORE');
export const WORKFLOW_EXECUTION_BYTES = token<number>('WORKFLOW_EXECUTION_BYTES');

/** Server-side execution policy for host plugins such as file/exec. */
export interface WorkflowExecutionPolicy {
    /** When set, file/exec nodes are restricted to this directory. */
    workspaceRoot?: string;
    /** Optional command allowlist for exec nodes. */
    allowedCommands?: string[];
}

/** Plugin catalog API: installed plugins plus bundled/available manifests. */
@Controller('/api/plugins')
export class WorkflowPluginController {
    constructor(
        private plugins: WorkflowPluginRegistry,
        private catalog: WorkflowPluginCatalog,
        private audit: WorkflowAuditService
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
        await this.audit.record('plugin-install', undefined, undefined, { plugin: id, installed });
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
        await this.audit.record('plugin-uninstall', undefined, undefined, { plugin: id });
        return { removed: true };
    }
}

/**
 * HTTP controller for visual workflows, using the framework's own
 * `@tsdi/service` microservice router and `@tsdi/http-microservice` transport.
 */
interface MetricsTrendPoint {
    start: number;
    end: number;
    runs: number;
    failed: number;
    avgDurationMs: number;
}

/** Split a time window into evenly sized buckets of run counts. */
function metricsTrend(
    snapshots: Array<{ startTime?: number; status?: string }>,
    since: number,
    windowMs: number,
    buckets: number
): MetricsTrendPoint[] {
    const size = Math.max(1, Math.floor(windowMs / Math.max(1, buckets)));
    const points: MetricsTrendPoint[] = Array.from({ length: buckets }, (_, index) => ({
        start: since + index * size,
        end: index === buckets - 1 ? since + windowMs : since + (index + 1) * size,
        runs: 0,
        failed: 0,
        avgDurationMs: 0
    }));
    const durations: number[][] = points.map(() => []);
    snapshots.forEach(snapshot => {
        const start = Number(snapshot.startTime) || 0;
        const index = Math.max(0, Math.min(buckets - 1, Math.floor((start - since) / size)));
        points[index].runs += 1;
        if (snapshot.status === 'failed') {
            points[index].failed += 1;
        }
        const began = Number((snapshot as any).startTime) || 0;
        const ended = Number((snapshot as any).endTime) || 0;
        if (began && ended) {
            durations[index].push(ended - began);
        }
    });
    points.forEach((point, index) => {
        const values = durations[index];
        point.avgDurationMs = values.length
            ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
            : 0;
    });
    return points;
}

@Controller('/api/workflows')
export class WorkflowHttpController {
    constructor(
        @Inject(WORKFLOW_DEFINITION_STORE) private store: WorkflowDefinitionStore,
        @Inject(WORKFLOW_EXECUTION_STORE) private history: WorkflowExecutionStore,
        @Inject(WORKFLOW_EXECUTION_LIMIT) private historyLimit: number,
        @Inject(WORKFLOW_EXECUTION_BYTES) private historyBytes: number,
        @Inject(WORKFLOW_VERSION_STORE) private versions: WorkflowVersionStore,
        @Inject(WORKFLOW_EXECUTION_POLICY) private policy: WorkflowExecutionPolicy,
        private schedules: WorkflowScheduleManager,
        private audit: WorkflowAuditService,
        @Inject(WORKFLOW_CREDENTIAL_STORE) private credentials: WorkflowCredentialStore,
        private mqtt: WorkflowMqttTransport,
        private netTransport: WorkflowNetTransport,
        private webSocketTransport: WorkflowWebSocketTransport,
        private fileTransport: WorkflowFileTransport,
        @Inject(WORKFLOW_CONTEXT_STORE) private contextStore: WorkflowContextStore,
        private execution: VisualWorkflowService
    ) {
        this.execution.setDefinitionResolver(id => this.store.get(id));
        this.execution.setCredentialResolver(name => this.credentials.getCredential(name));
        this.execution.setMqttPublisher(message => this.mqtt.publish(message));
        this.execution.setTcpSender(message => this.netTransport.sendTcp(message));
        this.execution.setUdpSender(message => this.netTransport.sendUdp(message));
        this.execution.setWebSocketSender(message => this.netTransport.sendWebSocket(message));
        this.execution.setWebSocketBroadcaster(message => this.webSocketTransport.broadcast(message));
        this.execution.setContextStore(this.contextStore);
        this.execution.setFileAccess({
            read: request => this.fileTransport.read(request),
            write: request => this.fileTransport.write(request)
        });
    }

    private executionContext(context: Record<string, any> = {}): Record<string, any> {
        const merged = { ...(context || {}) };
        if (this.policy?.workspaceRoot) {
            merged.workspaceRoot = this.policy.workspaceRoot;
        }
        if (this.policy?.allowedCommands?.length) {
            merged.allowedCommands = [...this.policy.allowedCommands];
        }
        return merged;
    }

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
        this.schedules.restart(id, definition);
        await this.audit.record('save', id, (body as any)?.updatedBy);
        return { summary, definition };
    }

    /** Explicit save: record an immutable version of the current document. */
    @Post('/:id/save')
    async saveVersion(@RequestPath('id') id: string, @RequestBody() body: VisualWorkflowDefinition) {
        const definition = this.definitionFrom(id, body);
        const validation = validateVisualWorkflowDraft(definition);
        if (!validation.valid) {
            throw new BadRequestException(validation.errors.join('; '));
        }
        const summary = await this.store.save(definition);
        this.schedules.restart(id, definition);
        await this.audit.record('save-version', id, (body as any)?.createdBy);
        const version = await this.versions.append(definition, {
            kind: 'save',
            createdBy: (body as any)?.createdBy
        });
        return { summary, version };
    }

    /**
     * Publish: validate the whole graph, record an immutable version and point
     * run/webhook entry points at it. Later draft edits stay unpublished.
     */
    @Post('/:id/publish')
    async publish(@RequestPath('id') id: string, @RequestBody() body: VisualWorkflowDefinition) {
        const definition = this.definitionFrom(id, body);
        const validation = validateVisualWorkflow(definition);
        if (!validation.valid) {
            throw new BadRequestException(validation.errors.join('; '));
        }
        const summary = await this.store.save(definition);
        this.schedules.restart(id, definition);
        await this.audit.record('publish', id, (body as any)?.publishedBy);
        const version = await this.versions.append(definition, {
            kind: 'publish',
            createdBy: (body as any)?.publishedBy
        });
        const release = await this.versions.publish(id, version.version, (body as any)?.publishedBy);
        return { summary, version, release };
    }

    @Get('/:id/versions')
    async listVersions(@RequestPath('id') id: string) {
        return this.versions.list(id, 50);
    }

    @Get('/:id/versions/:version')
    async getVersion(@RequestPath('id') id: string, @RequestPath('version') version: string) {
        const definition = await this.versions.get(id, Number(version));
        if (!definition) {
            throw new NotFoundException(`Workflow version not found: ${id} v${version}`);
        }
        return { definition, version: Number(version) };
    }

    /** Point run/webhook entry points at an existing version (rollback). */
    @Post('/:id/versions/:version/publish')
    async publishVersion(@RequestPath('id') id: string, @RequestPath('version') version: string) {
        const number = Number(version);
        const definition = await this.versions.get(id, number);
        if (!definition) {
            throw new NotFoundException(`Workflow version not found: ${id} v${version}`);
        }
        const release = await this.versions.publish(id, number);
        await this.audit.record('publish-version', id, undefined, { version: number });
        return { release };
    }

    /** Copy a historical version back into the editable draft. */
    @Post('/:id/versions/:version/restore')
    async restoreVersion(@RequestPath('id') id: string, @RequestPath('version') version: string) {
        const definition = await this.versions.get(id, Number(version));
        if (!definition) {
            throw new NotFoundException(`Workflow version not found: ${id} v${version}`);
        }
        const summary = await this.store.save(definition);
        await this.audit.record('restore-version', id, undefined, { version: Number(version) });
        return { summary, definition };
    }

    /** Normalize a request body into a definition bound to the route id. */
    private definitionFrom(id: string, body: VisualWorkflowDefinition): VisualWorkflowDefinition {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('Workflow definition body is required');
        }
        const { createdBy, publishedBy, ...definition } = body as any;
        return { ...definition, id };
    }

    /** Entry points run the published version when one exists, else the draft. */
    private async definitionToRun(id: string): Promise<VisualWorkflowDefinition> {
        const release = await this.versions.release(id);
        if (release) {
            const released = await this.versions.get(id, release.version);
            if (released) {
                return released;
            }
        }
        const draft = await this.store.get(id);
        if (!draft) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        return draft;
    }

    @Delete('/:id')
    async remove(@RequestPath('id') id: string) {
        const removed = await this.store.remove(id);
        if (!removed) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        this.schedules.stop(id);
        await this.history.removeWorkflow(id);
        await this.versions.removeWorkflow(id);
        await this.audit.record('delete', id);
        return { removed: true };
    }

    @Delete('/')
    async clear() {
        this.schedules.stopAll();
        await this.store.clear();
        await this.history.clear();
        await this.versions.clear();
        await this.audit.record('clear');
        return { cleared: true };
    }

    @Post('/:id/run')
    async run(
        @RequestPath('id') id: string,
        @RequestBody() body: { context?: Record<string, any>; timeout?: number } = {}
    ) {
        const definition = await this.definitionToRun(id);
        const timeout = Math.max(
            0,
            Number(body?.timeout) || Number((definition.metadata as any)?.timeout) || 0
        );
        const result = await this.execution.execute(definition, this.executionContext(body?.context), {
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
    /** CORS preflight for webhook paths (answered 204 by enabled http-in nodes). */
    @Options('/:id/hook')
    hookOptions(@RequestPath('id') id: string, adapter: StatusMessageAdapter) {
        return this.runHook(id, adapter);
    }

    @Options('/:id/hook/:path')
    hookOptionsPath(
        @RequestPath('id') id: string,
        @RequestPath('path') path: string,
        adapter: StatusMessageAdapter
    ) {
        return this.runHook(id, adapter, `/${path}`);
    }

    @Options('/:id/hook/:path/:sub')
    hookOptionsSubPath(
        @RequestPath('id') id: string,
        @RequestPath('path') path: string,
        @RequestPath('sub') sub: string,
        adapter: StatusMessageAdapter
    ) {
        return this.runHook(id, adapter, `/${path}/${sub}`);
    }

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

    /** The http-in node that owns this method/path (first match wins). */
    private matchingHttpInNode(
        definition: VisualWorkflowDefinition,
        method: string,
        requestedPath: string
    ): IVisualWorkflowNode | undefined {
        return (definition.nodes || []).find(node => {
            if (node.type !== 'http-in') {
                return false;
            }
            const config = node.config || {};
            const declaredMethod = String(config.method || 'ANY').toUpperCase();
            // A preflight request must find the node by path to answer CORS.
            if (method !== 'OPTIONS' && declaredMethod !== 'ANY' && declaredMethod !== method) {
                return false;
            }
            const declaredPath = String(config.path || '');
            return !declaredPath || declaredPath === requestedPath;
        });
    }

    private applyCorsHeaders(adapter: StatusMessageAdapter, node: IVisualWorkflowNode): void {
        const config = node.config || {};
        adapter.setHeader('Access-Control-Allow-Origin', String(config.corsOrigin || '*') as any);
        adapter.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        adapter.setHeader(
            'Access-Control-Allow-Headers',
            String(config.corsHeaders || 'content-type, authorization')
        );
        adapter.setHeader('Vary', 'Origin');
    }

    /** Validate http-in basic/bearer credentials (resolved through the store). */
    private async authorizeHook(
        node: IVisualWorkflowNode,
        headers: Record<string, any>
    ): Promise<{ status: number; message: string; headers: Record<string, string> } | undefined> {
        const config = node.config || {};
        const authType = String(config.authType || 'none');
        if (authType === 'none') {
            return undefined;
        }
        const raw = String(headers.authorization || headers.Authorization || '');
        if (authType === 'basic') {
            const encoded = raw.match(/^Basic\s+(.+)$/i)?.[1];
            const expectedUser = String(await this.credentialsOf(config.username) ?? '');
            const expectedPass = String(await this.credentialsOf(config.password) ?? '');
            const actual = encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
            if (expectedUser && actual === `${expectedUser}:${expectedPass}`) {
                return undefined;
            }
            return {
                status: 401,
                message: 'Unauthorized',
                headers: { 'WWW-Authenticate': 'Basic realm="workflow"' }
            };
        }
        if (authType === 'bearer') {
            const provided = raw.match(/^Bearer\s+(.+)$/i)?.[1] || '';
            const expected = String(await this.credentialsOf(config.token) ?? '');
            if (expected && provided === expected) {
                return undefined;
            }
            return { status: 401, message: 'Unauthorized', headers: {} };
        }
        return undefined;
    }

    private credentialValue(value: any): Promise<string | undefined> {
        const text = String(value ?? '').trim();
        const match = /^\{\{\s*credential:([^}]+?)\s*\}\}$/.exec(text);
        if (!match) {
            return Promise.resolve(text || undefined);
        }
        return this.credentials.getCredential(match[1].trim());
    }

    /** Alias kept short for the auth checks above. */
    private credentialsOf(value: any): Promise<string | undefined> {
        return this.credentialValue(value);
    }

    private async runHook(id: string, adapter: StatusMessageAdapter, pathOverride?: string) {
        const definition = await this.definitionToRun(id);
        const request = (adapter as any).request || {};
        const query = (adapter.read('query') as Record<string, any>) || {};
        const headers = (adapter.read('headers') as Record<string, any>) || {};
        const method = String(
            (adapter as any).method || request.method || 'POST'
        ).toUpperCase();
        const queryPath = typeof query.path === 'string' && query.path ? query.path : '';
        const requestedPath = pathOverride || queryPath || '/hook';
        const response: { statusCode?: number; headers?: Record<string, any>; body?: any } = {};
        const hookNode = this.matchingHttpInNode(definition, method, requestedPath);

        // CORS preflight short-circuits before auth: browsers never send credentials.
        const cors = hookNode?.config?.cors === true;
        if (cors && method === 'OPTIONS') {
            this.applyCorsHeaders(adapter, hookNode);
            adapter.setStatus(204);
            return undefined;
        }
        if (cors) {
            this.applyCorsHeaders(adapter, hookNode);
        }

        if (hookNode) {
            const rejection = await this.authorizeHook(hookNode, headers);
            if (rejection) {
                adapter.setStatus(rejection.status);
                Object.entries(rejection.headers).forEach(([name, value]) => adapter.setHeader(name, value));
                return { error: rejection.message };
            }
            // Default headers declared on http-in; http-response nodes may override.
            const declared = hookNode.config?.responseHeaders;
            if (declared && typeof declared === 'object' && !Array.isArray(declared)) {
                response.headers = { ...(declared as Record<string, any>) };
            }
        }

        const timeout = Math.max(0, Number((definition.metadata as any)?.timeout) || 0);
        const result = await this.execution.execute(definition, this.executionContext({
            request: {
                method,
                path: requestedPath,
                query,
                headers,
                body: adapter.read('body'),
                files: (request as any).files,
                fields: (request as any).fields
            },
            response
        }) as any, {
            timeout: timeout || undefined
        });
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

    /** Start the inject interval/cron/once schedule for a deployed workflow. */
    @Post('/:id/schedule')
    async startSchedule(
        @RequestPath('id') id: string,
        @RequestBody() body: { context?: Record<string, any>; execution?: any } = {}
    ) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        const status = this.schedules.start(id, definition, {
            context: this.executionContext(body?.context),
            execution: body?.execution,
            onResult: (result: any) => {
                void this.persist(result);
            }
        });
        await this.audit.record('schedule-start', id, undefined, { context: body?.context });
        return status;
    }

    @Get('/:id/schedule')
    async getSchedule(@RequestPath('id') id: string) {
        const status = this.schedules.status(id);
        if (!status) {
            throw new NotFoundException(`Workflow is not scheduled: ${id}`);
        }
        return status;
    }

    @Delete('/:id/schedule')
    async stopSchedule(@RequestPath('id') id: string) {
        const stopped = this.schedules.stop(id);
        await this.audit.record('schedule-stop', id);
        return { stopped };
    }

    /** Clear rate-limit/queue state for a workflow. */
    @Delete('/:id/runtime')
    async clearRuntime(@RequestPath('id') id: string) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        this.execution.clearNodeRuntimeState(id);
        await this.audit.record('runtime-clear', id);
        return { cleared: true };
    }

    /**
     * Aggregate run counts/durations computed from persisted + live snapshots.
     * `window` (ms) limits the period and `buckets` returns an evenly split
     * trend so hosts can draw a compact history chart.
     */
    @Get('/:id/metrics')
    async metrics(
        @RequestPath('id') id: string,
        @RequestParam('limit', { nullable: true }) limit?: string,
        @RequestParam('window', { nullable: true }) window?: string,
        @RequestParam('buckets', { nullable: true }) buckets?: string
    ) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        const size = Math.max(1, Math.min(1000, Number(limit) || 200));
        const snapshots = new Map<string, any>();
        (await this.history.list(id, size)).forEach(snapshot => {
            snapshots.set(snapshot.executionId, snapshot);
        });
        this.execution.getExecutions()
            .filter(state => state.workflowId === id)
            .map(state => toWorkflowExecutionSnapshot(state))
            .forEach(snapshot => snapshots.set(snapshot.executionId, snapshot));

        const windowMs = Math.max(0, Math.round(Number(window) || 0));
        const bucketCount = Math.max(1, Math.min(60, Number(buckets) || 12));
        const since = windowMs > 0 ? Date.now() - windowMs : 0;
        const all = Array.from(snapshots.values())
            .filter(snapshot => !since || (Number(snapshot.startTime) || 0) >= since);
        const durations = all
            .filter(snapshot => snapshot.startTime && snapshot.endTime)
            .map(snapshot => snapshot.endTime - snapshot.startTime);
        const last = [...all].sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0];
        const nodes = new Map<string, { nodeId: string; runs: number; failed: number; durationMs: number; timed: number }>();
        all.forEach(snapshot => {
            Object.values(snapshot.nodeStates || {}).forEach((state: any) => {
                if (state.status !== 'success' && state.status !== 'failed') {
                    return;
                }
                const entry = nodes.get(state.nodeId) || {
                    nodeId: state.nodeId, runs: 0, failed: 0, durationMs: 0, timed: 0
                };
                entry.runs += 1;
                if (state.status === 'failed') {
                    entry.failed += 1;
                }
                if (state.startedAt && state.finishedAt) {
                    entry.durationMs += state.finishedAt - state.startedAt;
                    entry.timed += 1;
                }
                nodes.set(state.nodeId, entry);
            });
        });
        const trend = since ? metricsTrend(all, since, windowMs, bucketCount) : [];
        return {
            workflowId: id,
            runs: all.length,
            running: all.filter(snapshot => snapshot.status === 'running').length,
            succeeded: all.filter(snapshot => snapshot.status === 'completed').length,
            failed: all.filter(snapshot => snapshot.status === 'failed').length,
            cancelled: all.filter(snapshot => snapshot.status === 'cancelled').length,
            avgDurationMs: durations.length
                ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
                : 0,
            lastRunAt: last?.startTime,
            lastStatus: last?.status,
            nodes: Array.from(nodes.values())
                .map(entry => ({
                    nodeId: entry.nodeId,
                    runs: entry.runs,
                    failed: entry.failed,
                    avgDurationMs: entry.timed
                        ? Math.round(entry.durationMs / entry.timed)
                        : 0
                }))
                .sort((a, b) => b.runs - a.runs),
            windowMs: windowMs || undefined,
            trend
        };
    }

    /** Per-node runtime state (rate-limit windows, queues) for diagnostics. */
    @Get('/:id/runtime')
    async runtime(@RequestPath('id') id: string) {
        const definition = await this.store.get(id);
        if (!definition) {
            throw new NotFoundException(`Workflow not found: ${id}`);
        }
        return this.execution.getNodeRuntimeState(id);
    }

    @Post('/:id/resume')
    async resume(
        @RequestPath('id') id: string,
        @RequestBody() body: { context?: Record<string, any>; checkpoint: any }
    ) {
        const definition = await this.definitionToRun(id);
        if (!body?.checkpoint) {
            throw new BadRequestException('checkpoint is required');
        }
        const timeout = Math.max(0, Number((definition.metadata as any)?.timeout) || 0);
        const result = await this.execution.execute(definition, this.executionContext(body?.context), {
            resumeFrom: body.checkpoint,
            timeout: timeout || undefined
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
            // Count caps do not bound databases where one run carries large payloads.
            if (typeof this.history.pruneBytes === 'function') {
                await this.history.pruneBytes(snapshot.workflowId, Math.max(0, Number(this.historyBytes) || 0));
            }
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

    /** Drop run history for one workflow, or everything when no id is given. */
    @Delete('/')
    async clear(@RequestParam('workflowId', { nullable: true }) workflowId?: string) {
        if (workflowId) {
            await this.history.removeWorkflow(workflowId);
        } else {
            await this.history.clear();
        }
        // In-flight runs stay; finished in-memory snapshots must disappear too,
        // otherwise the list keeps returning what was just cleared.
        this.execution.clearExecutions(workflowId);
        return { cleared: true };
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

/**
 * Deployment manager for hosted schedules. Starts every stored workflow with an
 * interval/once/cron inject trigger, or an explicit subset.
 */
@Controller('/api/deployments')
export class WorkflowDeploymentController {
    constructor(
        @Inject(WORKFLOW_DEFINITION_STORE) private store: WorkflowDefinitionStore,
        @Inject(WORKFLOW_EXECUTION_STORE) private history: WorkflowExecutionStore,
        @Inject(WORKFLOW_EXECUTION_LIMIT) private historyLimit: number,
        @Inject(WORKFLOW_EXECUTION_POLICY) private policy: WorkflowExecutionPolicy,
        private schedules: WorkflowScheduleManager,
        private audit: WorkflowAuditService
    ) { }

    @Get('/')
    list(): WorkflowDeploymentStatus[] {
        return this.schedules.list();
    }

    @Post('/start')
    async start(
        @RequestBody() body: { workflowIds?: string[]; context?: Record<string, any>; execution?: any } = {}
    ): Promise<{ started: WorkflowDeploymentStatus[] }> {
        const requested = Array.isArray(body?.workflowIds) && body.workflowIds.length
            ? body.workflowIds.map(String)
            : (await this.store.list()).map(item => item.id);
        const started: WorkflowDeploymentStatus[] = [];
        for (const id of requested) {
            const definition = await this.store.get(id);
            if (!definition || !this.isSchedulable(definition)) {
                continue;
            }
            started.push(this.schedules.start(id, definition, {
                context: this.executionContext(body?.context),
                execution: body?.execution,
                onResult: result => {
                    void this.persist(result);
                }
            }));
        }
        await this.audit.record('deployment-start', undefined, undefined, {
            workflows: started.map(item => item.workflowId)
        });
        return { started };
    }

    @Post('/stop')
    stop(@RequestBody() body: { workflowIds?: string[] } = {}): { stopped: number } {
        const ids = Array.isArray(body?.workflowIds) ? body.workflowIds.map(String) : [];
        let stopped = 0;
        if (!ids.length) {
            const count = this.schedules.list().length;
            this.schedules.stopAll();
            stopped = count;
        } else {
            stopped = ids.filter(id => this.schedules.stop(id)).length;
        }
        void this.audit.record('deployment-stop', undefined, undefined, {
            workflows: ids.length ? ids : 'all',
            stopped
        });
        return { stopped };
    }

    private isSchedulable(definition: VisualWorkflowDefinition): boolean {
        return (definition.nodes || []).some(node => {
            if (node.type !== 'inject') {
                return false;
            }
            const trigger = String(node.config?.trigger || 'manual');
            return trigger === 'interval' || trigger === 'once' || trigger === 'cron';
        });
    }

    private executionContext(context: Record<string, any> = {}): Record<string, any> {
        const merged = { ...(context || {}) };
        if (this.policy?.workspaceRoot) {
            merged.workspaceRoot = this.policy.workspaceRoot;
        }
        if (this.policy?.allowedCommands?.length) {
            merged.allowedCommands = [...this.policy.allowedCommands];
        }
        return merged;
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
            // Scheduling must survive history persistence failures.
        }
    }
}

/** Secret storage API. Values are never returned, only names. */
@Controller('/api/credentials')
export class WorkflowCredentialController {
    constructor(
        @Inject(WORKFLOW_CREDENTIAL_STORE) private store: WorkflowCredentialStore,
        private audit: WorkflowAuditService
    ) { }

    @Get('/')
    list() {
        return this.store.list();
    }

    @Put('/:name')
    async set(@RequestPath('name') name: string, @RequestBody() body: { value?: string }) {
        if (typeof body?.value !== 'string') {
            throw new BadRequestException('Credential value is required');
        }
        await this.store.setCredential(name, body.value);
        await this.audit.record('credential-set', undefined, undefined, { name });
        return { saved: true, name };
    }

    @Delete('/:name')
    async remove(@RequestPath('name') name: string) {
        const removed = await this.store.remove(name);
        if (!removed) {
            throw new NotFoundException(`Credential not found: ${name}`);
        }
        await this.audit.record('credential-delete', undefined, undefined, { name });
        return { removed: true };
    }
}

/** Read-only audit history for configuration, deployment and plugin changes. */
@Controller('/api/audit')
export class WorkflowAuditController {
    constructor(private audit: WorkflowAuditService) { }

    @Get('/')
    list(
        @RequestParam('workflowId', { nullable: true }) workflowId?: string,
        @RequestParam('action', { nullable: true }) action?: string,
        @RequestParam('limit', { nullable: true }) limit?: string
    ) {
        return this.audit.list({
            workflowId: workflowId || undefined,
            action: action || undefined,
            limit: Math.max(1, Math.min(1000, Number(limit) || 100))
        });
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
    /** Audit history store; defaults to SQLite next to the definition store. */
    auditStore?: WorkflowAuditStore;
    /** Audit entries kept on disk (default 2000). */
    auditHistoryLimit?: number;
    /** Enable multipart body parsing for `http-in` uploads (default true). */
    upload?: boolean;
    /** Context storage override (SQLite next to the definition store by default). */
    contextStore?: WorkflowContextStore;
    /** Credential store override (encrypted SQLite by default when a key exists). */
    credentialStore?: WorkflowCredentialStore;
    /** Encryption key; defaults to WORKFLOW_CREDENTIAL_KEY. */
    credentialKey?: string;
    /** Version/release store; defaults to SQLite next to the definition store. */
    versionStore?: WorkflowVersionStore;
    /** Draft-save versions kept per workflow (default 20; published ones persist). */
    versionHistoryLimit?: number;
    /** Snapshots kept per workflow (default 200). */
    executionHistoryLimit?: number;
    /** Bytes kept per workflow across its snapshots (default 5 MB, 0 disables). */
    executionHistoryBytes?: number;
    /** SQLite database path when `store` is not supplied. */
    databaseFile?: string;
    /** Restrict file/exec plugin nodes to this directory (defaults to WORKFLOW_WORKSPACE_ROOT). */
    workspaceRoot?: string;
    /** Optional command allowlist for exec plugin nodes. */
    allowedCommands?: string[];
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

function createServerContextStore(options: WorkflowHttpServerOptions): WorkflowContextStore {
    if (options.contextStore) {
        return options.contextStore;
    }
    if (options.store instanceof SqliteWorkflowDefinitionStore) {
        return new SqliteWorkflowContextStore({ file: options.store.databaseFile });
    }
    if (options.store) {
        return new InMemoryWorkflowContextStore();
    }
    if (options.databaseFile || isSqliteAvailable()) {
        return new SqliteWorkflowContextStore({ file: options.databaseFile });
    }
    return new InMemoryWorkflowContextStore();
}

function createServerCredentialStore(options: WorkflowHttpServerOptions): WorkflowCredentialStore {
    if (options.credentialStore) {
        return options.credentialStore;
    }
    const key = options.credentialKey
        || (globalThis as { process?: { env?: Record<string, string | undefined> } })
            .process?.env?.WORKFLOW_CREDENTIAL_KEY;
    if (key && (options.databaseFile || options.store instanceof SqliteWorkflowDefinitionStore
        || (!options.store && isSqliteAvailable()))) {
        return new SqliteWorkflowCredentialStore({
            file: options.store instanceof SqliteWorkflowDefinitionStore
                ? options.store.databaseFile
                : options.databaseFile,
            key
        });
    }
    return new InMemoryWorkflowCredentialStore();
}

function createServerAuditStore(options: WorkflowHttpServerOptions): WorkflowAuditStore {
    if (options.auditStore) {
        return options.auditStore;
    }
    if (options.store instanceof SqliteWorkflowDefinitionStore) {
        return new SqliteWorkflowAuditStore({ file: options.store.databaseFile });
    }
    if (options.store) {
        return new InMemoryWorkflowAuditStore();
    }
    if (options.databaseFile || isSqliteAvailable()) {
        return new SqliteWorkflowAuditStore({ file: options.databaseFile });
    }
    return new InMemoryWorkflowAuditStore();
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

function createServerVersionStore(options: WorkflowHttpServerOptions): WorkflowVersionStore {
    if (options.versionStore) {
        return options.versionStore;
    }
    const keepSaves = options.versionHistoryLimit;
    if (options.store instanceof SqliteWorkflowDefinitionStore) {
        return new SqliteWorkflowVersionStore({ file: options.store.databaseFile, keepSaves });
    }
    if (options.store) {
        return new InMemoryWorkflowVersionStore();
    }
    if (options.databaseFile || isSqliteAvailable()) {
        return new SqliteWorkflowVersionStore({ file: options.databaseFile, keepSaves });
    }
    return new InMemoryWorkflowVersionStore();
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
    const auditStore = createServerAuditStore(options);
    const credentialStore = createServerCredentialStore(options);
    const contextStore = createServerContextStore(options);
    const fileTransport = new WorkflowFileTransport(
        options.workspaceRoot || (typeof process !== 'undefined' ? process.env.WORKFLOW_WORKSPACE_ROOT : undefined)
    );
    const versionStore = createServerVersionStore(options);
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
                // http-in `upload` needs multipart bodies parsed into files/fields.
                upload: options.upload === false ? false : { enabled: true },
                asDefault: true
            })
        )
    ];

    @Module({
        imports: [LoggerModule, WorkflowModule, ServerCommonModule, ...(options.imports || [])],
        declarations: [
            WorkflowHttpController,
            WorkflowPluginController,
            WorkflowCredentialController,
            WorkflowExecutionController,
            WorkflowDeploymentController,
            WorkflowAuditController,
            ...(options.declarations || [])
        ],
        providers: [
            { provide: WORKFLOW_DEFINITION_STORE, useValue: store },
            { provide: WORKFLOW_EXECUTION_STORE, useValue: executionStore },
            { provide: WORKFLOW_EXECUTION_LIMIT, useValue: options.executionHistoryLimit ?? 200 },
            { provide: WORKFLOW_AUDIT_STORE, useValue: auditStore },
            { provide: WORKFLOW_CREDENTIAL_STORE, useValue: credentialStore },
            { provide: WorkflowFileTransport, useValue: fileTransport },
            { provide: WORKFLOW_CONTEXT_STORE, useValue: contextStore },
            { provide: WORKFLOW_AUDIT_LIMIT, useValue: options.auditHistoryLimit ?? 2000 },
            WorkflowAuditService,
            {
                provide: WORKFLOW_EXECUTION_POLICY,
                useValue: {
                    workspaceRoot: options.workspaceRoot || process.env.WORKFLOW_WORKSPACE_ROOT || undefined,
                    allowedCommands: options.allowedCommands?.length ? options.allowedCommands : undefined
                } as WorkflowExecutionPolicy
            },
            { provide: WORKFLOW_EXECUTION_BYTES, useValue: options.executionHistoryBytes ?? 5_000_000 },
            { provide: WORKFLOW_VERSION_STORE, useValue: versionStore },
            ...(options.providers || []),
            WorkflowPluginCatalog,
            WorkflowScheduleManager,
            WorkflowMqttTransport,
            WorkflowNetTransport,
            WorkflowWebSocketTransport,
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
export { InMemoryWorkflowVersionStore, SqliteWorkflowVersionStore, WorkflowVersionStore };
