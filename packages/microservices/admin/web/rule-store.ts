import {
    VisualWorkflowDefinition,
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    summarizeWorkflowDefinition
} from '@tsdi/activities/visual';

interface RuleListBody {
    items?: WorkflowDefinitionSummary[];
}

async function readJson(response: Response): Promise<any> {
    const text = typeof response.text === 'function' ? await response.text() : '';
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * Browser store backed by the gateway admin HTTP API. Saving a definition also
 * compiles and applies it to the live gateway.
 */
export class GatewayAdminRuleStore implements WorkflowDefinitionStore {
    constructor(protected readonly baseUrl = '/api/gateway-admin') { }

    async list(): Promise<WorkflowDefinitionSummary[]> {
        const response = await this.request('rules', { method: 'GET' });
        if (!response.ok) {
            return [];
        }
        const body = await readJson(response) as RuleListBody | WorkflowDefinitionSummary[];
        const items = Array.isArray(body) ? body : body?.items ?? [];
        return items as WorkflowDefinitionSummary[];
    }

    async get(id: string): Promise<VisualWorkflowDefinition | undefined> {
        const response = await this.request(`rules/${encodeURIComponent(id)}`, { method: 'GET' });
        if (response.status === 404) {
            return undefined;
        }
        if (!response.ok) {
            throw new Error(`Failed to load gateway rules: HTTP ${response.status}`);
        }
        return await readJson(response) as VisualWorkflowDefinition;
    }

    async save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary> {
        const response = await this.request(`rules/${encodeURIComponent(definition.id)}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        if (!response.ok) {
            const body = await readJson(response);
            throw new Error(body?.message || body?.error || `Failed to apply gateway rules: HTTP ${response.status}`);
        }
        const body = await readJson(response);
        return body?.summary ?? summarizeWorkflowDefinition(definition);
    }

    async remove(id: string): Promise<boolean> {
        const response = await this.request(`rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return response.ok || response.status === 404;
    }

    async clear(): Promise<void> {
        const response = await this.request('rules', { method: 'GET' });
        if (!response.ok) {
            return;
        }
        const summary = await this.list();
        await Promise.all(summary.map(item => this.remove(item.id)));
    }

    protected request(path: string, init: RequestInit): Promise<Response> {
        const fetchImpl = (globalThis as { fetch?: typeof fetch }).fetch;
        if (typeof fetchImpl !== 'function') {
            return Promise.reject(new Error('fetch is not available'));
        }
        const base = this.baseUrl.replace(/\/+$/, '');
        return fetchImpl(`${base}/${path}`, init);
    }
}
