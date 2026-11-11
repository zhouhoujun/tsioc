import { AfterViewInit, Component, ReactiveEffect, reactive } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { GatewayRouteOptions } from '@tsdi/gateway';
import {
    WorkflowDesigner,
    WorkflowDefinitionSummary,
    WorkflowNodeRegistry,
    VisualWorkflowDefinition
} from '@tsdi/activities/visual';
import { createGatewayRuleWorkflow, registerGatewayRuleNodes } from '../src/rules';
import { GatewayAdminRuleStore } from './rule-store';

interface GatewayAdminState {
    routes?: GatewayRouteOptions[];
    rules?: any[];
    services?: string[];
    auth?: { enabled: boolean; mode: 'none' | 'oidc' | 'service' };
}

type AdminPage = 'dashboard' | 'routes' | 'rules';

const DESIGNER_HIDDEN_ACTIONS = ['run', 'resume', 'cancel', 'toggle-logs', 'save', 'open-library', 'clear', 'menu'];

/**
 * Visual microservice management console.
 *
 * The default surface is an operational dashboard (routes/services/rule
 * summary). The workflow designer is only mounted when the user explicitly
 * opens "Configure rules", so the canvas never competes with day-to-day route
 * management.
 */
@Component({
    selector: 'gateway-admin',
    template: `
    <div class="ga-shell">
        <aside class="ga-sidebar">
            <div class="ga-brand">
                <div class="ga-brand-mark">TS</div>
                <div>
                    <strong>Gateway</strong>
                    <span>Microservice control</span>
                </div>
            </div>
            <nav class="ga-nav">
                <button class="ga-nav-item" [class]="dashboardNavClass" type="button" @click="goDashboard">
                    <span class="ga-nav-icon">◫</span><span>Overview</span>
                </button>
                <button class="ga-nav-item" [class]="routesNavClass" type="button" @click="goRoutes">
                    <span class="ga-nav-icon">⇄</span><span>Routes</span>
                </button>
                <button class="ga-nav-item" [class]="rulesNavClass" type="button" @click="goRules">
                    <span class="ga-nav-icon">⑂</span><span>Rules</span>
                </button>
            </nav>
            <div class="ga-sidebar-foot">
                <span class="ga-env-dot"></span>
                <span>{{authEnabled ? 'SSO protected' : 'Live gateway runtime'}}</span>
                <a v-if="authEnabled" class="ga-signout" href="/admin/auth/logout">Sign out</a>
            </div>
        </aside>

        <main class="ga-main">
            <header class="ga-topbar">
                <div class="ga-topbar-title">
                    <h1>{{pageTitle}}</h1>
                    <span>{{pageSubtitle}}</span>
                </div>
                <div class="ga-topbar-right">
                    <span class="ga-status">{{status}}</span>
                    <span class="ga-error" v-if="error">{{error}}</span>
                    <button class="ga-btn" type="button" @click="reload">Refresh</button>
                </div>
            </header>

            <div class="ga-content">
                <section class="ga-login" v-if="needsLogin">
                    <div class="ga-login-card">
                        <div class="ga-login-mark">TS</div>
                        <h2>Sign in to Gateway Admin</h2>
                        <p>The gateway management API is protected by OIDC. Use your organization account to continue.</p>
                        <a class="ga-btn ga-btn-primary" href="/admin/auth/login?redirect=/admin/">Sign in with SSO</a>
                    </div>
                </section>

                <section class="ga-page" v-if="!needsLogin && page === 'dashboard'">
                    <div class="ga-metrics">
                        <article class="ga-metric">
                            <span class="ga-metric-label">Routes</span>
                            <strong>{{routes.length}}</strong>
                            <span class="ga-metric-foot">{{enabledRoutes}} enabled</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">Services</span>
                            <strong>{{services.length}}</strong>
                            <span class="ga-metric-foot">discovery targets</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">Gateway rules</span>
                            <strong>{{rules.length}}</strong>
                            <span class="ga-metric-foot">compiled from visual workflows</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">Runtime</span>
                            <strong class="ga-metric-ok">Healthy</strong>
                            <span class="ga-metric-foot">local/admin service</span>
                        </article>
                    </div>

                    <div class="ga-dashboard-grid">
                        <article class="ga-card">
                            <div class="ga-card-head">
                                <div>
                                    <h2>Route table</h2>
                                    <p>Traffic is matched in table order.</p>
                                </div>
                                <button class="ga-btn" type="button" @click="goRoutes">Manage routes</button>
                            </div>
                            <div class="ga-compact-list">
                                <div class="ga-compact-row" v-for="route in routes.slice(0, 6)">
                                    <code>{{route.path}}</code>
                                    <span>{{route.service || 'static upstream'}}</span>
                                    <span class="ga-pill">{{routeMethods(route) || 'ANY'}}</span>
                                </div>
                                <div class="ga-empty" v-if="!routes.length">No routes configured.</div>
                            </div>
                        </article>

                        <article class="ga-card">
                            <div class="ga-card-head">
                                <div>
                                    <h2>Gateway rules</h2>
                                    <p>Evaluated before the route table.</p>
                                </div>
                                <button class="ga-btn" type="button" @click="goRules">Manage rules</button>
                            </div>
                            <div class="ga-compact-list">
                                <div class="ga-compact-row" v-for="rule in rules.slice(0, 6)">
                                    <span class="ga-status-dot" [class]="ruleTone(rule)"></span>
                                    <code>{{rule.name || rule.id}}</code>
                                    <span class="ga-pill">{{ruleActionType(rule)}}</span>
                                    <span class="ga-muted">{{ruleConditionCount(rule)}} condition(s)</span>
                                </div>
                                <div class="ga-empty" v-if="!rules.length">No rules configured.</div>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="ga-page ga-page-routes" v-if="!needsLogin && page === 'routes'">
                    <div class="ga-page-actions">
                        <div class="ga-search">
                            <span>⌕</span>
                            <input [value]="routeQuery" placeholder="Filter by path, service or upstream"
                                @input="searchRoutes($event)" />
                        </div>
                        <div class="ga-actions">
                            <button class="ga-btn ga-add-route" type="button" @click="addRoute">+ Add route</button>
                            <button class="ga-btn ga-btn-primary ga-apply-routes" type="button" @click="applyRoutes">Apply changes</button>
                        </div>
                    </div>

                    <article class="ga-card ga-table-card">
                        <table class="ga-route-table">
                            <thead>
                                <tr>
                                    <th>Path</th>
                                    <th>Service</th>
                                    <th>Upstream</th>
                                    <th>Methods</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="ga-route-row" v-for="route in filteredRoutes">
                                    <td><code>{{route.path}}</code></td>
                                    <td>{{route.service || '—'}}</td>
                                    <td class="ga-cell-muted">{{route.targetUrl || route.targetPath || 'discovery'}}</td>
                                    <td><span class="ga-pill">{{routeMethods(route) || 'ANY'}}</span></td>
                                    <td>
                                        <span class="ga-pill" [class]="route.enabled === false ? 'ga-pill is-off' : 'ga-pill is-on'">
                                            {{route.enabled === false ? 'disabled' : 'enabled'}}
                                        </span>
                                    </td>
                                    <td class="ga-cell-actions">
                                        <button class="ga-link-btn" type="button" @click="editRoute(route)">Edit</button>
                                        <button class="ga-link-btn is-danger" type="button" @click="removeRoute(route)">Remove</button>
                                    </td>
                                </tr>
                                <tr v-if="!filteredRoutes.length">
                                    <td colspan="6"><div class="ga-empty">No routes match this filter.</div></td>
                                </tr>
                            </tbody>
                        </table>
                    </article>
                </section>

                <section class="ga-page ga-page-rules" v-if="!needsLogin && page === 'rules'">
                    <div class="ga-page-actions">
                        <div>
                            <h2 class="ga-section-title">Gateway rules</h2>
                            <p class="ga-muted">Rules are stored as visual workflow documents and compiled into the live gateway runtime.</p>
                        </div>
                        <button class="ga-btn ga-btn-primary ga-edit-rules" type="button" @click="editRules">Configure rules</button>
                    </div>

                    <article class="ga-card">
                        <div class="ga-card-head">
                            <div>
                                <h2>Compiled rule set</h2>
                                <p>{{rules.length}} rule(s) · evaluated by priority before routes.</p>
                            </div>
                        </div>
                        <div class="ga-rule-list">
                            <div class="ga-rule-item" v-for="(rule, index) in rules">
                                <span class="ga-rule-index">{{index + 1}}</span>
                                <div class="ga-rule-main">
                                    <strong>{{rule.name || rule.id}}</strong>
                                    <span class="ga-muted">{{conditionSummary(rule)}}</span>
                                </div>
                                <span class="ga-pill" [class]="ruleActionType(rule) === 'deny' ? 'ga-pill is-danger' : 'ga-pill is-on'">{{ruleActionType(rule)}}</span>
                                <span class="ga-pill">priority {{rulePriority(rule)}}</span>
                            </div>
                            <div class="ga-empty" v-if="!rules.length">
                                No compiled rules yet. Open the visual designer to add conditions, route and deny actions.
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </main>

        <div class="ga-modal" v-if="routeEditorOpen">
            <div class="ga-modal-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{editingIndex >= 0 ? 'Edit route' : 'Add route'}}</h2>
                        <p>Routes are matched in the order shown in the table.</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="closeRouteEditor">✕</button>
                </header>
                <div class="ga-form-grid">
                    <label class="ga-field">
                        <span>Path</span>
                        <input data-field="path" [value]="editingRoute.path" placeholder="/api/users"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>Service</span>
                        <input data-field="service" [value]="editingRoute.service" placeholder="users-service"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>Target URL</span>
                        <input data-field="targetUrl" [value]="editingRoute.targetUrl" placeholder="http://127.0.0.1:3001"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>Target path</span>
                        <input data-field="targetPath" [value]="editingRoute.targetPath" placeholder="/users"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>Methods</span>
                        <input data-field="methods" [value]="routeMethods(editingRoute)" placeholder="GET, POST"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>Timeout (ms)</span>
                        <input data-field="timeout" type="number" [value]="editingRoute.timeout"
                            @input="editRouteField($event)" />
                    </label>
                </div>
                <div class="ga-form-row">
                    <label class="ga-check">
                        <input type="checkbox" data-field="stripPrefix" [checked]="editingRoute.stripPrefix === true"
                            @change="editRouteField($event)" />
                        <span>Strip inbound prefix</span>
                    </label>
                    <label class="ga-check">
                        <input type="checkbox" data-field="enabled" [checked]="editingRoute.enabled !== false"
                            @change="editRouteField($event)" />
                        <span>Route enabled</span>
                    </label>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="closeRouteEditor">Cancel</button>
                    <button class="ga-btn ga-btn-primary ga-route-save" type="button" @click="saveRouteEditor">Save route</button>
                </footer>
            </div>
        </div>

        <div class="ga-designer-page" v-if="designerOpen">
            <header class="ga-designer-head">
                <div>
                    <h2>Visual rule designer</h2>
                    <p>Conditions, route and deny actions compile to gateway rules. The designer is only opened while editing.</p>
                </div>
                <div class="ga-actions">
                    <button class="ga-btn ga-rules-cancel" type="button" @click="closeDesigner">Cancel</button>
                    <button class="ga-btn ga-btn-primary ga-rules-apply" type="button" @click="applyRules">Apply rules</button>
                </div>
            </header>
            <div class="ga-designer-body">
                <workflow-designer-preview
                    :designer="designer"
                    :registry="registry"
                    locale="zh-CN"
                    theme="light"
                    :hiddenActions="designerHiddenActions"
                    :showRunHistory="false"
                    :showRunLogs="false"
                    :showStatusbar="true"></workflow-designer-preview>
            </div>
        </div>
    </div>`
})
export class GatewayAdminComponent implements AfterViewInit {
    page: AdminPage = 'dashboard';
    routes: GatewayRouteOptions[] = [];
    services: string[] = [];
    rules: any[] = [];
    status = 'Loading…';
    error = '';
    routeQuery = '';
    routeEditorOpen = false;
    editingRoute: GatewayRouteOptions = {} as GatewayRouteOptions;
    editingIndex = -1;
    designerOpen = false;
    designerHiddenActions = DESIGNER_HIDDEN_ACTIONS;
    authEnabled = false;
    needsLogin = false;

    readonly registry: WorkflowNodeRegistry;
    readonly designer: WorkflowDesigner;

    private store = new GatewayAdminRuleStore();
    private loaded = false;
    private selfRef?: GatewayAdminComponent;

    constructor(@Optional() effect?: ReactiveEffect) {
        this.registry = registerGatewayRuleNodes(new WorkflowNodeRegistry());
        const rawDesigner = new WorkflowDesigner({
            registry: this.registry,
            definition: createGatewayRuleWorkflow('zh-CN')
        });
        this.designer = effect ? reactive(rawDesigner, effect) : rawDesigner;
    }

    onInit(): void {
        this.selfRef = this;
    }

    async onAfterViewInit(): Promise<void> {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        await this.reload();
    }

    private self(): GatewayAdminComponent {
        return (this.selfRef ?? this) as GatewayAdminComponent;
    }

    get pageTitle(): string {
        switch (this.page) {
            case 'routes': return 'Routes';
            case 'rules': return 'Rules';
            default: return 'Overview';
        }
    }

    get pageSubtitle(): string {
        switch (this.page) {
            case 'routes': return 'Manage discovered and static gateway routes.';
            case 'rules': return 'Visual workflows compiled into gateway decisions.';
            default: return 'Live operational view of the gateway runtime.';
        }
    }

    get enabledRoutes(): number {
        return this.routes.filter(route => route.enabled !== false).length;
    }

    get filteredRoutes(): GatewayRouteOptions[] {
        const query = String(this.routeQuery || '').trim().toLowerCase();
        if (!query) {
            return this.routes;
        }
        return this.routes.filter(route => [route.path, route.service, route.targetUrl, route.targetPath]
            .some(value => String(value || '').toLowerCase().includes(query)));
    }

    get dashboardNavClass(): string {
        return `ga-nav-item${this.page === 'dashboard' ? ' is-active' : ''}`;
    }

    get routesNavClass(): string {
        return `ga-nav-item${this.page === 'routes' ? ' is-active' : ''}`;
    }

    get rulesNavClass(): string {
        return `ga-nav-item${this.page === 'rules' ? ' is-active' : ''}`;
    }

    goDashboard(): void {
        this.self().page = 'dashboard';
    }

    goRoutes(): void {
        this.self().page = 'routes';
    }

    goRules(): void {
        this.self().page = 'rules';
    }

    searchRoutes(event: Event): void {
        this.self().routeQuery = (event.target as HTMLInputElement).value;
    }

    conditionSummary(rule: any): string {
        const when = rule?.when ?? [];
        if (!when.length) {
            return 'matches every request';
        }
        return when.map((condition: any) => [
            condition.field,
            condition.name ? `(${condition.name})` : '',
            condition.operator || 'equals',
            condition.value ?? ''
        ].filter(Boolean).join(' ')).join(' · ');
    }

    routeMethods(route: GatewayRouteOptions): string {
        return (route.methods ?? []).join(', ');
    }

    ruleActionType(rule: any): string {
        return rule?.action?.type || 'route';
    }

    ruleTone(rule: any): string {
        return rule?.action?.type === 'deny' ? 'ga-status-dot is-danger' : 'ga-status-dot';
    }

    rulePriority(rule: any): number {
        return rule?.priority ?? 0;
    }

    ruleConditionCount(rule: any): number {
        return rule?.when?.length || 0;
    }

    async reload(): Promise<void> {
        const self = this.self();
        self.error = '';
        try {
            const response = await fetch('/api/gateway-admin/state');
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (!response.ok) {
                throw new Error(`Gateway admin API unavailable: HTTP ${response.status}`);
            }
            const state = await response.json() as GatewayAdminState;
            self.authEnabled = state.auth?.enabled === true;
            self.needsLogin = false;
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.rules = state.rules ?? [];
            self.status = `Ready · ${self.routes.length} route(s) · ${self.rules.length} rule(s)`;
        } catch (error) {
            self.status = 'Offline';
            self.error = (error as Error).message;
        }
    }

    private requireLogin(): void {
        const self = this.self();
        self.needsLogin = true;
        self.authEnabled = true;
        self.status = 'Sign in required';
    }

    private async fetchState(): Promise<GatewayAdminState> {
        const response = await fetch('/api/gateway-admin/state');
        if (response.status === 401) {
            this.requireLogin();
            return {};
        }
        if (!response.ok) {
            throw new Error(`Gateway admin API unavailable: HTTP ${response.status}`);
        }
        return await response.json() as GatewayAdminState;
    }

    addRoute(): void {
        const self = this.self();
        self.editingIndex = -1;
        self.editingRoute = {
            path: '/api/new',
            service: 'my-service',
            stripPrefix: true,
            enabled: true
        } as GatewayRouteOptions;
        self.routeEditorOpen = true;
    }

    editRoute(route: GatewayRouteOptions): void {
        const self = this.self();
        self.editingIndex = self.routes.indexOf(route);
        self.editingRoute = { ...route };
        self.routeEditorOpen = true;
    }

    closeRouteEditor(): void {
        const self = this.self();
        self.routeEditorOpen = false;
        self.editingRoute = {} as GatewayRouteOptions;
        self.editingIndex = -1;
    }

    editRouteField(event: Event): void {
        const self = this.self();
        const target = event.target as HTMLInputElement;
        const key = target.getAttribute('data-field') || '';
        if (!key) {
            return;
        }
        let value: any = target.checked;
        if (key !== 'stripPrefix' && key !== 'enabled') {
            value = target.value;
        }
        if (key === 'timeout') {
            value = target.value ? Number(target.value) : undefined;
        }
        if (key === 'methods') {
            value = String(target.value || '')
                .split(',')
                .map(item => item.trim().toUpperCase())
                .filter(Boolean);
        }
        (self.editingRoute as any)[key] = value;
        self.editingRoute = { ...self.editingRoute };
    }

    saveRouteEditor(): void {
        const self = this.self();
        const route = self.editingRoute;
        if (!route.path || (!route.service && !route.targetUrl)) {
            self.error = 'Route requires a path and either service or targetUrl.';
            return;
        }
        self.error = '';
        if (self.editingIndex >= 0) {
            const next = self.routes.slice();
            next[self.editingIndex] = { ...route };
            self.routes = next;
        } else {
            self.routes = [...self.routes, { ...route }];
        }
        self.closeRouteEditor();
        self.status = `Route staged · ${self.routes.length} route(s). Apply changes to publish.`;
    }

    removeRoute(route: GatewayRouteOptions): void {
        const self = this.self();
        self.routes = self.routes.filter(item => item !== route);
        self.status = `Route removed locally · ${self.routes.length} route(s). Apply changes to publish.`;
    }

    async applyRoutes(): Promise<void> {
        const self = this.self();
        self.error = '';
        try {
            const response = await fetch('/api/gateway-admin/routes', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ routes: self.routes })
            });
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
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

    async editRules(): Promise<void> {
        const self = this.self();
        self.error = '';
        await self.loadRuleDocument();
        self.designerOpen = true;
    }

    private async loadRuleDocument(): Promise<void> {
        const self = this.self();
        const summaries = await self.store.list().catch(() => [] as WorkflowDefinitionSummary[]);
        let definition: VisualWorkflowDefinition | undefined;
        if (summaries.length) {
            definition = await self.store.get(summaries[0].id);
        }
        self.designer.load(definition ?? createGatewayRuleWorkflow('zh-CN'));
    }

    closeDesigner(): void {
        this.self().designerOpen = false;
    }

    async applyRules(): Promise<void> {
        const self = this.self();
        self.error = '';
        try {
            const summary = await self.store.save(self.designer.definition);
            self.designerOpen = false;
            self.status = `Rules applied · ${summary.nodeCount} node(s)`;
            const state = await self.fetchState();
            self.rules = state.rules ?? [];
            self.services = state.services ?? [];
        } catch (error) {
            self.error = (error as Error).message;
        }
    }
}
