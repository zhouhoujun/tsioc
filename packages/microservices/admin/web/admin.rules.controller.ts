import { GatewayMatchPreview } from '@tsdi/gateway';
import { WorkflowDefinitionSummary } from '@tsdi/activities/visual';
import { GatewayAdminHttp } from './http';

/**
 * Host contract implemented by `GatewayAdminState` (the reactive proxy).
 */
export interface AdminRulesHost {
    http?: GatewayAdminHttp;
    ruleWorkflows: WorkflowDefinitionSummary[];
    ruleWorkflowId: string;
    creatingRuleWorkflow: boolean;
    matchMethod: string;
    matchPath: string;
    matchResult?: GatewayMatchPreview;
    matchLoading: boolean;
    error: string;
    status: string;
    openDesigner?: () => Promise<void>;
    t(key: string, params?: Record<string, unknown>): string;
    requireLogin(): void;
    reload(): Promise<void>;
    loadRuleWorkflows(): Promise<void>;
}

/**
 * Rule workflow and route-match testing controller.
 *
 * Extracted from `GatewayAdminState`; writes through the reactive host.
 */
export class AdminRulesController {
    constructor(private readonly host: AdminRulesHost) { }

    async editRules(id?: string): Promise<void> {
        const self = this.host;
        // Bindings without an explicit call receive the DOM event. Only a real
        // workflow id may select a document; an event here used to become the
        // requested URL (`/rules/[object PointerEvent]`).
        const workflowId = typeof id === 'string' ? id.trim() : '';
        if (workflowId) {
            self.ruleWorkflowId = workflowId;
        }
        if (self.openDesigner) {
            await self.openDesigner();
        }
    }

    setMatchMethod(event: Event): void {
        this.host.matchMethod = String((event.target as HTMLSelectElement).value || 'GET').toUpperCase();
    }

    setMatchPath(event: Event): void {
        this.host.matchPath = (event.target as HTMLInputElement).value;
    }

    async testMatch(): Promise<void> {
        const self = this.host;
        const path = String(self.matchPath || '').trim();
        if (!path.startsWith('/')) {
            self.error = self.t('validation.pathSlash');
            return;
        }
        if (!self.http) {
            return;
        }
        self.matchLoading = true;
        try {
            const response = await self.http.match(self.matchMethod, path);
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (!response.ok) {
                self.error = self.t('error.apiUnavailable', { status: response.status });
                self.matchResult = undefined;
                return;
            }
            self.matchResult = response.body;
            self.error = '';
        } finally {
            self.matchLoading = false;
        }
    }

    newRuleWorkflow(): void {
        const self = this.host;
        self.creatingRuleWorkflow = true;
        self.ruleWorkflowId = '';
        if (self.openDesigner) {
            void self.openDesigner();
        }
    }

    async duplicateRuleWorkflow(id: string): Promise<void> {
        const self = this.host;
        if (!self.http || !id) {
            return;
        }
        const response = await self.http.getRule(id);
        if (!response.ok) {
            self.error = self.t('error.apiUnavailable', { status: response.status });
            return;
        }
        const original = response.body as { id?: string; name?: string };
        const nextId = `${original.id || id}_copy_${Date.now().toString(36)}`;
        const saved = await self.http.saveRule({
            ...(response.body as Record<string, unknown>),
            id: nextId,
            name: `${original.name || original.id || id} copy`
        });
        if (!saved.ok) {
            self.error = self.t('error.apiUnavailable', { status: saved.status });
            return;
        }
        await self.loadRuleWorkflows();
        self.status = self.t('status.ruleDuplicated', { id: nextId });
    }

    async applyRuleWorkflow(id: string): Promise<void> {
        const self = this.host;
        if (!self.http || !id) {
            return;
        }
        const response = await self.http.applyRule(id);
        if (!response.ok) {
            self.error = self.t('error.ruleApply', { status: response.status });
            return;
        }
        await self.reload();
        self.ruleWorkflowId = id;
        self.status = self.t('status.rulesApplied', { count: response.body?.rules?.length ?? 0 });
    }

    async loadRuleWorkflows(): Promise<void> {
        const self = this.host;
        if (!self.http) {
            self.ruleWorkflows = [];
            return;
        }
        const response = await self.http.listRules();
        if (!response.ok) {
            return;
        }
        const body = response.body;
        self.ruleWorkflows = Array.isArray(body)
            ? body
            : Array.isArray(body?.items) ? body.items : [];
    }

    async deleteRuleWorkflow(id: string): Promise<void> {
        const self = this.host;
        if (!self.http || !id) {
            return;
        }
        const response = await self.http.removeRule(id);
        if (!response.ok && response.status !== 404) {
            self.error = self.t('error.ruleDelete', { status: response.status });
            return;
        }
        if (self.ruleWorkflowId === id) {
            self.ruleWorkflowId = '';
        }
        await self.reload();
        self.status = self.t('status.ruleDeleted', { id });
    }
}
