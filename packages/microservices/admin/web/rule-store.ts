import {
    VisualWorkflowDefinition,
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    summarizeWorkflowDefinition
} from '@tsdi/activities/visual';
import { GatewayAdminHttp, AdminHttpResult } from './http';

/**
 * Workflow store backed by the gateway admin HTTP API through
 * `@tsdi/common/http`. Saving a definition also compiles and applies it to the
 * live gateway.
 */
export class GatewayAdminRuleStore implements WorkflowDefinitionStore {
    constructor(private readonly http: GatewayAdminHttp) { }

    async list(): Promise<WorkflowDefinitionSummary[]> {
        const result = await this.http.listRules();
        if (!result.ok) {
            return [];
        }
        const body = result.body;
        const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
        return items as WorkflowDefinitionSummary[];
    }

    async get(id: string): Promise<VisualWorkflowDefinition | undefined> {
        const result = await this.http.getRule(id);
        if (result.status === 404) {
            return undefined;
        }
        if (!result.ok) {
            throw new Error(`Failed to load gateway rules: HTTP ${result.status}`);
        }
        return result.body as VisualWorkflowDefinition;
    }

    async save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary> {
        const result = await this.http.saveRule(definition);
        if (!result.ok) {
            throw new Error(result.body?.message || result.body?.error || `Failed to apply gateway rules: HTTP ${result.status}`);
        }
        return result.body?.summary ?? summarizeWorkflowDefinition(definition);
    }

    async remove(id: string): Promise<boolean> {
        const result = await this.http.removeRule(id);
        return result.ok || result.status === 404;
    }

    async clear(): Promise<void> {
        const summaries = await this.list();
        await Promise.all(summaries.map(item => this.remove(item.id)));
    }
}
