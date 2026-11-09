import { noReact } from '@tsdi/components';
import { VisualWorkflowDefinition } from './types';

/**
 * Summary row for the workflow library.
 */
export interface WorkflowDefinitionSummary {
    id: string;
    name: string;
    description?: string;
    nodeCount: number;
    connectionCount: number;
    updatedAt?: string;
}

/**
 * Minimal persistence contract for visual definitions. The editor only needs
 * list/get/save/remove; hosts can back it with memory, localStorage, a database
 * or a microservice endpoint.
 */
export interface WorkflowDefinitionStore {
    list(): Promise<WorkflowDefinitionSummary[]>;
    get(id: string): Promise<VisualWorkflowDefinition | undefined>;
    save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary>;
    remove(id: string): Promise<boolean>;
    clear(): Promise<void>;
}

export interface WorkflowStoreSaveOptions {
    /** Save as a new document instead of overwriting the current id. */
    as?: boolean;
    name?: string;
}

function summarize(definition: VisualWorkflowDefinition): WorkflowDefinitionSummary {
    return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        nodeCount: definition.nodes?.length || 0,
        connectionCount: definition.connections?.length || 0,
        updatedAt: definition.metadata?.updatedAt || new Date().toISOString()
    };
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Process-local store. Useful for tests, SSR sessions and hosts that persist
 * elsewhere.
 */
export class InMemoryWorkflowDefinitionStore implements WorkflowDefinitionStore {
    [noReact] = true;
    private readonly definitions = new Map<string, VisualWorkflowDefinition>();

    async list(): Promise<WorkflowDefinitionSummary[]> {
        return Array.from(this.definitions.values())
            .map(summarize)
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    }

    async get(id: string): Promise<VisualWorkflowDefinition | undefined> {
        const definition = this.definitions.get(id);
        return definition ? clone(definition) : undefined;
    }

    async save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary> {
        const saved: VisualWorkflowDefinition = {
            ...clone(definition),
            metadata: {
                ...(definition.metadata || {}),
                updatedAt: new Date().toISOString()
            }
        };
        this.definitions.set(saved.id, saved);
        return summarize(saved);
    }

    async remove(id: string): Promise<boolean> {
        return this.definitions.delete(id);
    }

    async clear(): Promise<void> {
        this.definitions.clear();
    }
}

/**
 * Browser localStorage-backed store. Uses `globalThis.localStorage` so the
 * module stays importable in Node/TUI hosts without touching `window`.
 */
export class LocalStorageWorkflowDefinitionStore implements WorkflowDefinitionStore {
    [noReact] = true;
    constructor(
        protected readonly key = 'tsdi.workflow.definitions.v1',
        protected readonly storage: Storage | undefined = getLocalStorage()
    ) { }

    async list(): Promise<WorkflowDefinitionSummary[]> {
        return this.readAll()
            .map(summarize)
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    }

    async get(id: string): Promise<VisualWorkflowDefinition | undefined> {
        return this.readAll().find(item => item.id === id);
    }

    async save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary> {
        const all = this.readAll().filter(item => item.id !== definition.id);
        const saved: VisualWorkflowDefinition = {
            ...clone(definition),
            metadata: {
                ...(definition.metadata || {}),
                updatedAt: new Date().toISOString()
            }
        };
        all.push(saved);
        this.writeAll(all);
        return summarize(saved);
    }

    async remove(id: string): Promise<boolean> {
        const all = this.readAll();
        const next = all.filter(item => item.id !== id);
        if (next.length === all.length) {
            return false;
        }
        this.writeAll(next);
        return true;
    }

    async clear(): Promise<void> {
        this.storage?.removeItem(this.key);
    }

    protected readAll(): VisualWorkflowDefinition[] {
        if (!this.storage) {
            return [];
        }
        try {
            const raw = this.storage.getItem(this.key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    protected writeAll(definitions: VisualWorkflowDefinition[]): void {
        if (!this.storage) {
            return;
        }
        try {
            this.storage.setItem(this.key, JSON.stringify(definitions));
        } catch {
            // Quota or private-mode failures must not break the editor.
        }
    }
}

function getLocalStorage(): Storage | undefined {
    try {
        return (globalThis as { localStorage?: Storage }).localStorage;
    } catch {
        return undefined;
    }
}

/**
 * Prefer localStorage in browsers; fall back to an in-memory store in Node/TUI.
 */
export function createDefaultWorkflowDefinitionStore(): WorkflowDefinitionStore {
    return getLocalStorage()
        ? new LocalStorageWorkflowDefinitionStore()
        : new InMemoryWorkflowDefinitionStore();
}

export interface HttpWorkflowDefinitionStoreOptions {
    /** Base gateway URL, e.g. `http://localhost:3000/api`. */
    baseUrl: string;
    /** Bearer token applied to every request. */
    token?: string;
    headers?: Record<string, string>;
    /** Injectable fetch for Node hosts, tests or custom transports. */
    fetchImpl?: typeof fetch;
}

interface HttpResult {
    ok: boolean;
    status: number;
    body: any;
}

/**
 * HTTP / microservice backed store. The editor only needs list/get/save/remove,
 * so any gateway exposing these four routes can persist workflows:
 *
 *   GET    {base}/workflows
 *   GET    {base}/workflows/:id
 *   PUT    {base}/workflows/:id
 *   DELETE {base}/workflows/:id
 *   DELETE {base}/workflows
 */
export class HttpWorkflowDefinitionStore implements WorkflowDefinitionStore {
    [noReact] = true;

    constructor(protected readonly options: HttpWorkflowDefinitionStoreOptions) { }

    async list(): Promise<WorkflowDefinitionSummary[]> {
        const result = await this.request('workflows', { method: 'GET' });
        if (!result.ok) {
            return [];
        }
        const body = result.body;
        const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
        return items.map((item: any) => this.normalizeSummary(item));
    }

    async get(id: string): Promise<VisualWorkflowDefinition | undefined> {
        const result = await this.request(`workflows/${encodeURIComponent(id)}`, { method: 'GET' });
        if (result.status === 404) {
            return undefined;
        }
        if (!result.ok) {
            throw new Error(`Failed to load workflow ${id}: HTTP ${result.status}`);
        }
        return (result.body?.definition || result.body) as VisualWorkflowDefinition;
    }

    async save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary> {
        const result = await this.request(
            `workflows/${encodeURIComponent(definition.id)}`,
            {
                method: 'PUT',
                body: JSON.stringify(definition),
                headers: { 'content-type': 'application/json' }
            }
        );
        if (!result.ok) {
            throw new Error(`Failed to save workflow ${definition.id}: HTTP ${result.status}`);
        }
        return this.normalizeSummary(result.body?.summary || result.body || definition);
    }

    async remove(id: string): Promise<boolean> {
        const result = await this.request(`workflows/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (result.status === 404) {
            return false;
        }
        if (!result.ok) {
            throw new Error(`Failed to remove workflow ${id}: HTTP ${result.status}`);
        }
        return true;
    }

    async clear(): Promise<void> {
        const result = await this.request('workflows', { method: 'DELETE' });
        if (!result.ok) {
            throw new Error(`Failed to clear workflows: HTTP ${result.status}`);
        }
    }

    protected async request(path: string, init: RequestInit): Promise<HttpResult> {
        const fetchImpl = this.options.fetchImpl
            || (globalThis as { fetch?: typeof fetch }).fetch;
        if (typeof fetchImpl !== 'function') {
            throw new Error('fetch is not available for HttpWorkflowDefinitionStore');
        }
        const base = String(this.options.baseUrl || '').replace(/\/+$/, '');
        const headers: Record<string, string> = {
            ...(this.options.headers || {}),
            ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
            ...((init.headers as Record<string, string>) || {})
        };
        const response = await fetchImpl(`${base}/${path}`, { ...init, headers });
        let body: any = undefined;
        const text = typeof response.text === 'function'
            ? await response.text()
            : '';
        if (text) {
            try {
                body = JSON.parse(text);
            } catch {
                body = text;
            }
        }
        return { ok: response.ok, status: response.status, body };
    }

    protected normalizeSummary(item: any): WorkflowDefinitionSummary {
        if (item && item.definition) {
            return summarize(item.definition);
        }
        if (item && Array.isArray(item.nodes)) {
            return summarize(item as VisualWorkflowDefinition);
        }
        return {
            id: String(item?.id || ''),
            name: String(item?.name || item?.id || ''),
            description: item?.description,
            nodeCount: Number(item?.nodeCount) || 0,
            connectionCount: Number(item?.connectionCount) || 0,
            updatedAt: item?.updatedAt
        };
    }
}

export function summarizeWorkflowDefinition(
    definition: VisualWorkflowDefinition
): WorkflowDefinitionSummary {
    return summarize(definition);
}

export interface WorkflowStoreHttpRequest {
    method: string;
    /** Path such as `/api/workflows` or `/workflows/:id`. Query string is ignored. */
    path: string;
    body?: any;
}

export interface WorkflowStoreHttpResponse {
    status: number;
    body?: any;
    headers?: Record<string, string>;
}

function errorBody(status: number, message: string): WorkflowStoreHttpResponse {
    return { status, body: { error: message }, headers: { 'content-type': 'application/json' } };
}

/**
 * Transport-neutral workflows CRUD handler. Mount it in any gateway/router:
 *
 * ```ts
 * const handle = createWorkflowStoreHandler(store);
 * const response = await handle({ method: req.method, path: req.path, body: req.body });
 * res.status(response.status).json(response.body);
 * ```
 */
export function createWorkflowStoreHandler(
    store: WorkflowDefinitionStore
): (request: WorkflowStoreHttpRequest) => Promise<WorkflowStoreHttpResponse> {
    return async (request: WorkflowStoreHttpRequest) => {
        const method = String(request.method || 'GET').toUpperCase();
        const path = String(request.path || '').split('?')[0].replace(/\/+$/, '');
        const match = path.match(/(?:^|\/)workflows(?:\/([^/]+))?$/);
        if (!match) {
            return errorBody(404, 'Not found');
        }
        let body = request.body;
        if (typeof body === 'string') {
            try {
                body = body ? JSON.parse(body) : undefined;
            } catch {
                return errorBody(400, 'Invalid JSON body');
            }
        }
        const id = match[1] ? decodeURIComponent(match[1]) : undefined;

        try {
            if (method === 'GET' && !id) {
                return {
                    status: 200,
                    body: { items: await store.list() },
                    headers: { 'content-type': 'application/json' }
                };
            }
            if (method === 'GET' && id) {
                const definition = await store.get(id);
                return definition
                    ? { status: 200, body: definition, headers: { 'content-type': 'application/json' } }
                    : errorBody(404, `Workflow not found: ${id}`);
            }
            if ((method === 'PUT' || method === 'POST') && id) {
                if (!body || typeof body !== 'object') {
                    return errorBody(400, 'Workflow definition body is required');
                }
                const definition = { ...body, id } as VisualWorkflowDefinition;
                const summary = await store.save(definition);
                return {
                    status: 200,
                    body: { summary, definition },
                    headers: { 'content-type': 'application/json' }
                };
            }
            if (method === 'DELETE' && id) {
                const removed = await store.remove(id);
                return removed ? { status: 204 } : errorBody(404, `Workflow not found: ${id}`);
            }
            if (method === 'DELETE' && !id) {
                await store.clear();
                return { status: 204 };
            }
            return errorBody(405, `Method not allowed: ${method}`);
        } catch (error) {
            return errorBody(500, (error as Error).message);
        }
    };
}
