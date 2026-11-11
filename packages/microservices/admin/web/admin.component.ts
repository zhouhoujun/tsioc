import { AfterViewInit, Component, ViewChild } from '@tsdi/components';
import { GatewayRouteOptions } from '@tsdi/gateway';
import {
    WorkflowDesignerComponent,
    WorkflowDefinitionSummary,
    VisualWorkflowDefinition
} from '@tsdi/activities/visual';
import { createGatewayRuleWorkflow, registerGatewayRuleNodes } from '../src/rules';
import { GatewayAdminRuleStore } from './rule-store';

interface GatewayAdminState {
    routes?: GatewayRouteOptions[];
    rules?: any[];
    services?: string[];
}

/**
 * Root visual microservice management console.
 *
 * Left: editable gateway route table.
 * Right: activity-based workflow designer repurposed for gateway rules.
 */
@Component({
    selector: 'gateway-admin',
    template: `
    <div class="ga-shell">
        <header class="ga-header">
            <div>
                <h1>Microservice admin</h1>
                <p>Visual gateway routes and activity-based rules</p>
            </div>
            <div class="ga-header-status">
                <span class="ga-status">{{status}}</span>
                <span class="ga-error" v-if="error">{{error}}</span>
            </div>
            <div class="ga-header-actions">
                <button class="ga-btn" type="button" @click="reload">Refresh</button>
            </div>
        </header>

        <div class="ga-layout">
            <section class="ga-panel ga-routes">
                <div class="ga-panel-head">
                    <div>
                        <h2>Routes</h2>
                        <span class="ga-muted">{{routes.length}} route(s) · {{services.length}} service(s)</span>
                    </div>
                    <div class="ga-actions">
                        <button class="ga-btn" type="button" @click="addRoute">+ Route</button>
                        <button class="ga-btn ga-btn-primary" type="button" @click="saveRoutes">Apply routes</button>
                    </div>
                </div>
                <div class="ga-empty" v-if="!routes.length">
                    No routes yet. Add one or drag route/condition/deny nodes in the rules canvas.
                </div>
                <div class="ga-route-list">
                    <article class="ga-route-card" v-for="(route, index) in routes">
                        <div class="ga-route-card-head">
                            <input class="ga-input ga-input-path" [value]="route.path"
                                placeholder="/api/users" @input="updateRoute(route, 'path', $event)" />
                            <button class="ga-icon-btn" type="button" title="Remove route"
                                @click="removeRoute(index)">✕</button>
                        </div>
                        <label class="ga-field">
                            <span>Service</span>
                            <input class="ga-input" [value]="route.service" placeholder="users-service"
                                @input="updateRoute(route, 'service', $event)" />
                        </label>
                        <label class="ga-field">
                            <span>Target URL</span>
                            <input class="ga-input" [value]="route.targetUrl" placeholder="http://127.0.0.1:3001"
                                @input="updateRoute(route, 'targetUrl', $event)" />
                        </label>
                        <div class="ga-field-row">
                            <label class="ga-field">
                                <span>Target path</span>
                                <input class="ga-input" [value]="route.targetPath" placeholder="/users"
                                    @input="updateRoute(route, 'targetPath', $event)" />
                            </label>
                            <label class="ga-field">
                                <span>Timeout (ms)</span>
                                <input class="ga-input" type="number" [value]="route.timeout"
                                    @input="updateRoute(route, 'timeout', $event)" />
                            </label>
                        </div>
                        <label class="ga-check">
                            <input type="checkbox" [checked]="route.stripPrefix === true"
                                @change="updateRoute(route, 'stripPrefix', $event)" />
                            <span>Strip inbound prefix</span>
                        </label>
                    </article>
                </div>
            </section>

            <section class="ga-panel ga-rules">
                <div class="ga-panel-head">
                    <div>
                        <h2>Visual rules</h2>
                        <span class="ga-muted">Conditions, route and deny actions compile to gateway rules</span>
                    </div>
                    <div class="ga-actions">
                        <button class="ga-btn ga-btn-primary" type="button" @click="applyRules">Apply rules</button>
                    </div>
                </div>
                <div class="ga-rules-body">
                    <workflow-designer #workflow locale="zh-CN" theme="light"></workflow-designer>
                </div>
            </section>
        </div>
    </div>`
})
export class GatewayAdminComponent implements AfterViewInit {
    @ViewChild('workflow', WorkflowDesignerComponent) workflow?: WorkflowDesignerComponent;

    routes: GatewayRouteOptions[] = [];
    services: string[] = [];
    rules: any[] = [];
    status = 'Loading…';
    error = '';
    locale: 'zh-CN' | 'en' = 'zh-CN';
    private store = new GatewayAdminRuleStore();
    private loaded = false;
    private selfRef?: GatewayAdminComponent;

    onInit(): void {
        this.selfRef = this;
    }

    async onAfterViewInit(): Promise<void> {
        if (!this.workflow || this.loaded) {
            return;
        }
        this.loaded = true;
        registerGatewayRuleNodes(this.workflow.registry);
        // The palette cache is keyed by locale + registry revision; nudge the
        // locale so the binding re-runs after late node registration.
        const locale = this.workflow.locale;
        this.workflow.locale = locale === 'zh-CN' ? 'en' : 'zh-CN';
        this.workflow.locale = locale;
        this.workflow.store = this.store;
        this.workflow.autosave = false;
        await this.reload();
    }

    async reload(): Promise<void> {
        const self = (this.selfRef ?? this) as GatewayAdminComponent;
        self.error = '';
        try {
            const state = await self.fetchState();
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.rules = state.rules ?? [];
            await self.loadRuleDocument();
            self.status = `Ready · ${self.routes.length} route(s) · ${self.rules.length} rule(s)`;
        } catch (error) {
            self.status = 'Offline';
            self.error = (error as Error).message;
            if (self.workflow) {
                const starter = createGatewayRuleWorkflow(self.locale);
                self.workflow.designer.load(starter);
                (self.workflow as any).syncActiveTabId?.();
            }
        }
    }

    private async fetchState(): Promise<GatewayAdminState> {
        const response = await fetch('/api/gateway-admin/state');
        if (!response.ok) {
            throw new Error(`Gateway admin API unavailable: HTTP ${response.status}`);
        }
        return await response.json() as GatewayAdminState;
    }

    private async loadRuleDocument(): Promise<void> {
        if (!this.workflow) {
            return;
        }
        const summaries = await this.store.list().catch(() => [] as WorkflowDefinitionSummary[]);
        let definition: VisualWorkflowDefinition | undefined;
        if (summaries.length) {
            definition = await this.store.get(summaries[0].id);
        }
        if (!definition) {
            definition = createGatewayRuleWorkflow(this.locale);
        }
        this.workflow.designer.load(definition);
        (this.workflow as any).syncActiveTabId?.();
    }

    addRoute(): void {
        const self = (this.selfRef ?? this) as GatewayAdminComponent;
        self.routes = [...self.routes, {
            path: '/api/new',
            service: 'my-service',
            stripPrefix: true
        } as GatewayRouteOptions];
    }

    removeRoute(index: number): void {
        const self = (this.selfRef ?? this) as GatewayAdminComponent;
        self.routes = self.routes.filter((_, current) => current !== index);
    }

    updateRoute(route: GatewayRouteOptions, key: string, event: Event): void {
        const self = (this.selfRef ?? this) as GatewayAdminComponent;
        const target = event.target as HTMLInputElement;
        const value: any = key === 'stripPrefix' ? target.checked
            : key === 'timeout' ? (target.value ? Number(target.value) : undefined)
                : target.value;
        (route as any)[key] = value;
        self.routes = [...self.routes];
    }

    async saveRoutes(): Promise<void> {
        const self = (this.selfRef ?? this) as GatewayAdminComponent;
        self.error = '';
        try {
            const response = await fetch('/api/gateway-admin/routes', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ routes: self.routes })
            });
            if (!response.ok) {
                throw new Error(`Failed to apply routes: HTTP ${response.status}`);
            }
            const state = await response.json() as GatewayAdminState;
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.status = `Routes applied · ${self.routes.length} route(s)`;
        } catch (error) {
            self.error = (error as Error).message;
        }
    }

    async applyRules(): Promise<void> {
        const self = (this.selfRef ?? this) as GatewayAdminComponent;
        if (!self.workflow) {
            return;
        }
        self.error = '';
        try {
            const definition = self.workflow.designer.definition;
            const summary = await self.store.save(definition);
            self.status = `Rules applied · ${summary.nodeCount} node(s)`;
            const state = await self.fetchState();
            self.rules = state.rules ?? [];
            self.services = state.services ?? [];
        } catch (error) {
            self.error = (error as Error).message;
        }
    }
}
