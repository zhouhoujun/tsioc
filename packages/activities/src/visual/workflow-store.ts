import { noReact } from '@tsdi/components';
import { VisualWorkflowDefinition, WorkflowExecutionSnapshot } from './types';

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

export type WorkflowVersionKind = 'save' | 'publish';

/** Immutable snapshot recorded by an explicit save or by publishing. */
export interface WorkflowVersionSummary {
    workflowId: string;
    version: number;
    kind: WorkflowVersionKind;
    contentHash: string;
    createdAt: string;
    createdBy?: string;
    name?: string;
    nodeCount?: number;
    connectionCount?: number;
}

/** Pointer to the version that run/webhook entry points execute. */
export interface WorkflowRelease {
    workflowId: string;
    version: number;
    publishedAt: string;
    publishedBy?: string;
}

export interface WorkflowAuditEntry {
    id: string;
    at: number;
    action: string;
    workflowId?: string;
    actor?: string;
    detail?: Record<string, any>;
}

export interface WorkflowDeploymentStatus {
    workflowId: string;
    running: boolean;
    startedAt: number;
    runs: number;
    /** Bound inbound listener ports (ephemeral ports are resolved). */
    ports?: number[];
}

export interface WorkflowNodeMetrics {
    nodeId: string;
    runs: number;
    failed: number;
    avgDurationMs: number;
}

export interface WorkflowMetricsTrendPoint {
    /** Bucket start (epoch ms). */
    start: number;
    /** Bucket end (epoch ms). */
    end: number;
    runs: number;
    failed: number;
    avgDurationMs: number;
}

export interface WorkflowMetricsQuery {
    /** Snapshots considered (default 200). */
    limit?: number;
    /** Only count runs inside this trailing window (ms). */
    windowMs?: number;
    /** Trend buckets across the window (default 12). */
    buckets?: number;
}

export interface WorkflowMetrics {
    workflowId: string;
    runs: number;
    running: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    avgDurationMs: number;
    lastRunAt?: number;
    lastStatus?: string;
    nodes: WorkflowNodeMetrics[];
    /** Window used for `trend` (omitted when no window was requested). */
    windowMs?: number;
    /** Evenly split run counts across `windowMs`. */
    trend?: WorkflowMetricsTrendPoint[];
}

export interface WorkflowVersionList {
    items: WorkflowVersionSummary[];
    release?: WorkflowRelease;
}

export interface WorkflowPublishResult {
    version: WorkflowVersionSummary;
    release: WorkflowRelease;
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
    /**
     * Optional persisted run history. Hosts without execution persistence can
     * omit these methods; the editor then only shows the current session.
     */
    listExecutions?(workflowId: string, limit?: number): Promise<WorkflowExecutionSnapshot[]>;
    getExecution?(executionId: string): Promise<WorkflowExecutionSnapshot | undefined>;
    /**
     * Optional version/release support. Draft autosave keeps using `save`;
     * explicit saves record a version, and publishing points run/webhook entry
     * points at an immutable snapshot. Hosts may omit these methods.
     */
    saveVersion?(definition: VisualWorkflowDefinition, options?: { createdBy?: string }): Promise<WorkflowVersionSummary>;
    publish?(definition: VisualWorkflowDefinition, options?: { publishedBy?: string }): Promise<WorkflowPublishResult>;
    /** Promote an existing version to the release pointer (rollback). */
    publishVersion?(workflowId: string, version: number, options?: { publishedBy?: string }): Promise<WorkflowRelease>;
    listVersions?(workflowId: string, limit?: number): Promise<WorkflowVersionList>;
    getVersion?(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined>;
    restoreVersion?(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined>;
    /** Drop persisted run history (one workflow, or all when omitted). */
    clearExecutions?(workflowId?: string): Promise<void>;
    /** Optional aggregated execution metrics for a workflow. */
    getMetrics?(workflowId: string, query?: WorkflowMetricsQuery | number): Promise<WorkflowMetrics | undefined>;
    /** Optional deployment manager: list/start/stop hosted schedules. */
    listDeployments?(): Promise<WorkflowDeploymentStatus[]>;
    startDeployments?(workflowIds?: string[], context?: Record<string, any>): Promise<WorkflowDeploymentStatus[]>;
    stopDeployments?(workflowIds?: string[]): Promise<number>;
    /** Optional audit history for configuration/deployment changes. */
    listAudit?(filter?: { workflowId?: string; action?: string; limit?: number }): Promise<WorkflowAuditEntry[]>;
    /**
     * Optional secret storage. Values are write-only: hosts only ever return
     * credential names so secrets never travel back to the browser.
     */
    listCredentials?(): Promise<string[]>;
    setCredential?(name: string, value: string): Promise<void>;
    removeCredential?(name: string): Promise<boolean>;
}

export interface WorkflowStoreSaveOptions {
    /** Save as a new document instead of overwriting the current id. */
    as?: boolean;
    name?: string;
    /** Record an immutable version in addition to updating the draft. */
    version?: boolean;
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

/** Stable, dependency-free content hash used by the in-memory/local stores. */
export function workflowContentHash(definition: VisualWorkflowDefinition): string {
    const text = JSON.stringify(definition);
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `${hash.toString(16).padStart(8, '0')}-${text.length.toString(16)}`;
}

/**
 * Process-local store. Useful for tests, SSR sessions and hosts that persist
 * elsewhere.
 */
export class InMemoryWorkflowDefinitionStore implements WorkflowDefinitionStore {
    [noReact] = true;
    private readonly definitions = new Map<string, VisualWorkflowDefinition>();
    private readonly versions = new Map<string, Array<{ summary: WorkflowVersionSummary; definition: VisualWorkflowDefinition }>>();
    private readonly releases = new Map<string, WorkflowRelease>();

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
        const removed = this.definitions.delete(id);
        this.versions.delete(id);
        this.releases.delete(id);
        return removed;
    }

    async clear(): Promise<void> {
        this.definitions.clear();
        this.versions.clear();
        this.releases.clear();
    }

    async saveVersion(
        definition: VisualWorkflowDefinition,
        options: { createdBy?: string } = {}
    ): Promise<WorkflowVersionSummary> {
        const saved = await this.save(definition);
        const summary = await this.appendVersion(saved, definition, 'save', options.createdBy);
        return summary;
    }

    async publish(
        definition: VisualWorkflowDefinition,
        options: { publishedBy?: string } = {}
    ): Promise<WorkflowPublishResult> {
        const saved = await this.save(definition);
        const version = await this.appendVersion(saved, definition, 'publish', options.publishedBy);
        const release = await this.setRelease(saved.id, version.version, options.publishedBy);
        return { version, release };
    }

    async publishVersion(workflowId: string, version: number): Promise<WorkflowRelease> {
        const entry = (this.versions.get(workflowId) || []).find(item => item.summary.version === version);
        if (entry) {
            entry.summary.kind = 'publish';
        }
        return this.setRelease(workflowId, version);
    }

    async listVersions(workflowId: string, limit = 50): Promise<WorkflowVersionList> {
        const items = (this.versions.get(workflowId) || [])
            .map(entry => entry.summary)
            .sort((a, b) => b.version - a.version)
            .slice(0, Math.max(1, limit));
        return { items, release: this.releases.get(workflowId) };
    }

    async getVersion(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined> {
        const entry = (this.versions.get(workflowId) || []).find(item => item.summary.version === version);
        return entry ? clone(entry.definition) : undefined;
    }

    async restoreVersion(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined> {
        const definition = await this.getVersion(workflowId, version);
        if (!definition) {
            return undefined;
        }
        await this.save(definition);
        return definition;
    }

    private async appendVersion(
        summary: WorkflowDefinitionSummary,
        definition: VisualWorkflowDefinition,
        kind: WorkflowVersionKind,
        author?: string
    ): Promise<WorkflowVersionSummary> {
        const list = this.versions.get(summary.id) || [];
        const hash = workflowContentHash(definition);
        const latest = list[list.length - 1];
        // Identical content does not need another row; publishing promotes the
        // existing snapshot instead of duplicating it.
        if (latest && latest.summary.contentHash === hash) {
            if (kind === 'publish' && latest.summary.kind !== 'publish') {
                latest.summary = { ...latest.summary, kind: 'publish' };
            }
            return clone(latest.summary);
        }
        const version: WorkflowVersionSummary = {
            workflowId: summary.id,
            version: (latest?.summary.version || 0) + 1,
            kind,
            contentHash: hash,
            createdAt: new Date().toISOString(),
            createdBy: author,
            name: summary.name,
            nodeCount: summary.nodeCount,
            connectionCount: summary.connectionCount
        };
        list.push({ summary: version, definition: clone(definition) });
        // Bound the draft-save history; published snapshots are never pruned.
        const saves = list.filter(entry => entry.summary.kind === 'save');
        const keep = 20;
        const keepList = saves.length > keep
            ? new Set(saves.slice(saves.length - keep).map(entry => entry.summary.version))
            : undefined;
        this.versions.set(
            summary.id,
            keepList
                ? list.filter(entry => entry.summary.kind !== 'save' || keepList.has(entry.summary.version))
                : list
        );
        return clone(version);
    }

    private async setRelease(workflowId: string, version: number, author?: string): Promise<WorkflowRelease> {
        const release: WorkflowRelease = {
            workflowId,
            version,
            publishedAt: new Date().toISOString(),
            publishedBy: author
        };
        this.releases.set(workflowId, release);
        return clone(release);
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

    async listAudit(filter: {
        workflowId?: string;
        action?: string;
        limit?: number;
    } = {}): Promise<WorkflowAuditEntry[]> {
        const params: string[] = [];
        if (filter.workflowId) {
            params.push(`workflowId=${encodeURIComponent(filter.workflowId)}`);
        }
        if (filter.action) {
            params.push(`action=${encodeURIComponent(filter.action)}`);
        }
        params.push(`limit=${Math.max(1, filter.limit || 100)}`);
        const result = await this.request(`audit?${params.join('&')}`, { method: 'GET' });
        return result.ok && Array.isArray(result.body) ? result.body as WorkflowAuditEntry[] : [];
    }

    async listCredentials(): Promise<string[]> {
        const result = await this.request('credentials', { method: 'GET' });
        return result.ok && Array.isArray(result.body) ? result.body.map(String) : [];
    }

    async setCredential(name: string, value: string): Promise<void> {
        const result = await this.request(`credentials/${encodeURIComponent(name)}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
            headers: { 'content-type': 'application/json' }
        });
        if (!result.ok) {
            throw new Error(`Failed to save credential ${name}: HTTP ${result.status}`);
        }
    }

    async removeCredential(name: string): Promise<boolean> {
        const result = await this.request(`credentials/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (result.status === 404) {
            return false;
        }
        if (!result.ok) {
            throw new Error(`Failed to remove credential ${name}: HTTP ${result.status}`);
        }
        return true;
    }

    async listDeployments(): Promise<WorkflowDeploymentStatus[]> {
        const result = await this.request('deployments', { method: 'GET' });
        return result.ok && Array.isArray(result.body) ? result.body as WorkflowDeploymentStatus[] : [];
    }

    async startDeployments(
        workflowIds?: string[],
        context?: Record<string, any>
    ): Promise<WorkflowDeploymentStatus[]> {
        const result = await this.request('deployments/start', {
            method: 'POST',
            body: JSON.stringify({ workflowIds, context }),
            headers: { 'content-type': 'application/json' }
        });
        if (!result.ok) {
            throw new Error(`Failed to start deployments: HTTP ${result.status}`);
        }
        return Array.isArray(result.body?.started) ? result.body.started : [];
    }

    async stopDeployments(workflowIds?: string[]): Promise<number> {
        const result = await this.request('deployments/stop', {
            method: 'POST',
            body: JSON.stringify({ workflowIds }),
            headers: { 'content-type': 'application/json' }
        });
        if (!result.ok) {
            throw new Error(`Failed to stop deployments: HTTP ${result.status}`);
        }
        return Number(result.body?.stopped) || 0;
    }

    async getMetrics(
        workflowId: string,
        query: WorkflowMetricsQuery | number = {}
    ): Promise<WorkflowMetrics | undefined> {
        const options: WorkflowMetricsQuery = typeof query === 'number' ? { limit: query } : (query || {});
        const params = [`limit=${Math.max(1, options.limit || 200)}`];
        if (options.windowMs) {
            params.push(`window=${Math.max(1, Math.round(options.windowMs))}`);
        }
        if (options.buckets) {
            params.push(`buckets=${Math.max(1, Math.min(60, Math.round(options.buckets)))}`);
        }
        const result = await this.request(
            `workflows/${encodeURIComponent(workflowId)}/metrics?${params.join('&')}`,
            { method: 'GET' }
        );
        if (result.status === 404) {
            return undefined;
        }
        if (!result.ok) {
            throw new Error(`Failed to load workflow metrics ${workflowId}: HTTP ${result.status}`);
        }
        return result.body as WorkflowMetrics;
    }

    async listExecutions(workflowId: string, limit = 20): Promise<WorkflowExecutionSnapshot[]> {
        const query = `workflowId=${encodeURIComponent(workflowId)}&limit=${Math.max(1, limit)}`;
        const result = await this.request(`executions?${query}`, { method: 'GET' });
        if (!result.ok || !Array.isArray(result.body)) {
            return [];
        }
        return result.body as WorkflowExecutionSnapshot[];
    }

    async getExecution(executionId: string): Promise<WorkflowExecutionSnapshot | undefined> {
        const result = await this.request(`executions/${encodeURIComponent(executionId)}`, { method: 'GET' });
        if (result.status === 404) {
            return undefined;
        }
        return result.ok ? result.body as WorkflowExecutionSnapshot : undefined;
    }

    async saveVersion(
        definition: VisualWorkflowDefinition,
        options: { createdBy?: string } = {}
    ): Promise<WorkflowVersionSummary> {
        const body = options.createdBy ? { ...definition, createdBy: options.createdBy } : definition;
        const result = await this.request(
            `workflows/${encodeURIComponent(definition.id)}/save`,
            { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
        );
        if (!result.ok) {
            throw new Error(`Failed to save workflow version ${definition.id}: HTTP ${result.status}`);
        }
        return result.body?.version as WorkflowVersionSummary;
    }

    async publish(
        definition: VisualWorkflowDefinition,
        options: { publishedBy?: string } = {}
    ): Promise<WorkflowPublishResult> {
        const body = options.publishedBy ? { ...definition, publishedBy: options.publishedBy } : definition;
        const result = await this.request(
            `workflows/${encodeURIComponent(definition.id)}/publish`,
            { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
        );
        if (!result.ok) {
            const message = result.body?.error || result.body?.message || `HTTP ${result.status}`;
            throw new Error(`Failed to publish workflow ${definition.id}: ${message}`);
        }
        return {
            version: result.body?.version as WorkflowVersionSummary,
            release: result.body?.release as WorkflowRelease
        };
    }

    async publishVersion(workflowId: string, version: number): Promise<WorkflowRelease> {
        const result = await this.request(
            `workflows/${encodeURIComponent(workflowId)}/versions/${Math.max(1, version)}/publish`,
            { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }
        );
        if (!result.ok) {
            throw new Error(`Failed to publish workflow ${workflowId} v${version}: HTTP ${result.status}`);
        }
        return result.body?.release as WorkflowRelease;
    }

    async clearExecutions(workflowId?: string): Promise<void> {
        const query = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : '';
        const result = await this.request(`executions${query}`, { method: 'DELETE' });
        if (!result.ok) {
            throw new Error(`Failed to clear execution history: HTTP ${result.status}`);
        }
    }

    async listVersions(workflowId: string, limit = 50): Promise<WorkflowVersionList> {
        const result = await this.request(
            `workflows/${encodeURIComponent(workflowId)}/versions?limit=${Math.max(1, limit)}`,
            { method: 'GET' }
        );
        if (!result.ok) {
            return { items: [] };
        }
        return {
            items: Array.isArray(result.body?.items) ? result.body.items : [],
            release: result.body?.release
        };
    }

    async getVersion(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined> {
        const result = await this.request(
            `workflows/${encodeURIComponent(workflowId)}/versions/${Math.max(1, version)}`,
            { method: 'GET' }
        );
        return result.ok ? result.body?.definition || result.body : undefined;
    }

    async restoreVersion(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined> {
        const result = await this.request(
            `workflows/${encodeURIComponent(workflowId)}/versions/${Math.max(1, version)}/restore`,
            { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }
        );
        return result.ok ? result.body?.definition : undefined;
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
