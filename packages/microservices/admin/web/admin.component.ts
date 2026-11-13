import { AfterViewInit, Component, OnDestroy, OnInit, ReactiveEffect, reactive } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import {
    WorkflowDesigner,
    WorkflowDesignerModule,
    WorkflowDefinitionSummary,
    WorkflowNodeRegistry,
    VisualWorkflowDefinition
} from '@tsdi/activities/visual';
import { RouterOutlet } from '@tsdi/components/router';
import { createGatewayRuleWorkflow, registerGatewayRuleNodes } from '../src/rules';
import { GatewayAdminRuleStore } from './rule-store';
import { GatewayAdminHttp } from './http';
import { GatewayAdminState } from './admin.state';

const DESIGNER_HIDDEN_ACTIONS = ['run', 'resume', 'cancel', 'toggle-logs', 'save', 'open-library', 'clear', 'menu'];

/**
 * Routed admin layout shell.
 *
 * The application component owns the root outlet; this layout is the protected
 * route component and exposes its own `<router-outlet>` for child pages
 * (dashboard/routes/rules/not-found). Changing the route swaps the child
 * component rendered by that outlet.
 */
@Component({
    selector: 'gateway-admin',
    imports: [WorkflowDesignerModule, RouterOutlet],
    template: `
    <div class="ga-shell">
        <aside class="ga-sidebar">
            <div class="ga-brand">
                <div class="ga-brand-mark">TS</div>
                <div>
                    {{state.t('brand.name')}}
                    {{state.t('brand.subtitle')}}
                </div>
            </div>
            <nav class="ga-nav">
                <button class="ga-nav-item" [class]="state.dashboardNavClass" type="button" @click="state.goDashboard">
                    <span class="ga-nav-icon">◫</span>{{state.t('nav.overview')}}
                </button>
                <button class="ga-nav-item" [class]="state.routesNavClass" type="button" @click="state.goRoutes">
                    <span class="ga-nav-icon">⇄</span>{{state.t('nav.routes')}}
                </button>
                <button class="ga-nav-item" [class]="state.rulesNavClass" type="button" @click="state.goRules">
                    <span class="ga-nav-icon">⑂</span>{{state.t('nav.rules')}}
                </button>
            </nav>
            <div class="ga-sidebar-foot">
                <span class="ga-env-dot"></span>
                <span>{{state.authEnabled ? state.t('sidebar.sso') : state.t('sidebar.live')}}</span>
                <a v-if="state.authEnabled" class="ga-signout" href="/admin/auth/logout">{{state.t('sidebar.signOut')}}</a>
            </div>
        </aside>

        <main class="ga-main">
            <header class="ga-topbar">
                <div class="ga-topbar-title">
                    <h1>{{state.pageTitle}}</h1>
                    <span>{{state.pageSubtitle}}</span>
                </div>
                <div class="ga-topbar-right">
                    <span class="ga-status">{{state.status}}</span>
                    <span class="ga-error" v-if="state.error">{{state.error}}</span>
                    <menu-bar class="ga-global-menu" icon="menu" label="" caret="caret-down"
                        :triggerTitle="state.t('top.menu')" :groups="state.globalMenuGroups"
                        :selectAction="state.globalMenuSelect"></menu-bar>
                    <button class="ga-btn" type="button" @click="state.reload">{{state.t('top.refresh')}}</button>
                </div>
            </header>

            <div class="ga-content">
                <section class="ga-login" v-if="state.needsLogin">
                    <div class="ga-login-card">
                        <div class="ga-login-mark">TS</div>
                        <h2>{{state.t('login.title')}}</h2>
                        <p>{{state.t('login.desc')}}</p>
                        <a class="ga-btn ga-btn-primary" href="/admin/auth/login?redirect=/admin/">{{state.t('login.button')}}</a>
                    </div>
                </section>

                <router-outlet></router-outlet>
            </div>
        </main>

        <div class="ga-modal" v-if="state.routeEditorOpen">
            <div class="ga-modal-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.editingIndex >= 0 ? state.t('editor.editTitle') : state.t('editor.addTitle')}}</h2>
                        <p>{{state.t('editor.desc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeRouteEditor">✕</button>
                </header>
                <div class="ga-form-grid">
                    <label class="ga-field">
                        <span>{{state.t('editor.path')}}</span>
                        <input data-field="path" [value]="state.editingRoute.path" placeholder="/api/users"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.path">{{state.routeErrors.path}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.service')}}</span>
                        <input data-field="service" [value]="state.editingRoute.service" placeholder="users-service"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.service">{{state.routeErrors.service}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.targetUrl')}}</span>
                        <input data-field="targetUrl" [value]="state.editingRoute.targetUrl" placeholder="http://127.0.0.1:3001"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.targetUrl">{{state.routeErrors.targetUrl}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.targetPath')}}</span>
                        <input data-field="targetPath" [value]="state.editingRoute.targetPath" placeholder="/users"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.targetPath">{{state.routeErrors.targetPath}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.methods')}}</span>
                        <input data-field="methods" [value]="state.routeMethods(state.editingRoute)" placeholder="GET, POST"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.methods">{{state.routeErrors.methods}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.timeout')}}</span>
                        <input data-field="timeout" type="number" [value]="state.editingRoute.timeout"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.timeout">{{state.routeErrors.timeout}}</div>
                    </label>
                </div>
                <div class="ga-form-row">
                    <label class="ga-check">
                        <input type="checkbox" data-field="stripPrefix" [checked]="state.editingRoute.stripPrefix === true"
                            @change="state.editRouteField($event)" />
                        <span>{{state.t('editor.stripPrefix')}}</span>
                    </label>
                    <label class="ga-check">
                        <input type="checkbox" data-field="enabled" [checked]="state.editingRoute.enabled !== false"
                            @change="state.editRouteField($event)" />
                        <span>{{state.t('editor.enabled')}}</span>
                    </label>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="state.closeRouteEditor">{{state.t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-route-save" type="button" @click="state.saveRouteEditor">{{state.t('editor.save')}}</button>
                </footer>
            </div>
        </div>

        <div class="ga-designer-page" v-if="designerOpen">
            <header class="ga-designer-head">
                <div>
                    <h2>{{state.t('designer.title')}}</h2>
                    <p>{{state.t('designer.desc')}}</p>
                </div>
                <div class="ga-actions">
                    <button class="ga-btn ga-rules-cancel" type="button" @click="closeDesigner">{{state.t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-rules-apply" type="button" @click="applyRules">{{state.t('designer.apply')}}</button>
                </div>
            </header>
            <div class="ga-designer-body">
                <workflow-designer-preview
                    :designer="designer"
                    :registry="registry"
                    :locale="state.locale"
                    :theme="state.theme"
                    :applyDocumentTheme="false"
                    :hiddenActions="designerHiddenActions"
                    :showRunHistory="false"
                    :showRunLogs="false"
                    :showStatusbar="true"></workflow-designer-preview>
            </div>
        </div>
    </div>`
})
export class GatewayAdminComponent implements OnInit, AfterViewInit, OnDestroy {
    designerOpen = false;
    designerHiddenActions = DESIGNER_HIDDEN_ACTIONS;
    readonly registry: WorkflowNodeRegistry;
    readonly designer: WorkflowDesigner;

    private store: GatewayAdminRuleStore;

    constructor(
        public readonly state: GatewayAdminState,
        @Optional() effect?: ReactiveEffect,
        @Optional() private http?: GatewayAdminHttp
    ) {
        this.store = new GatewayAdminRuleStore(http as GatewayAdminHttp);
        this.registry = registerGatewayRuleNodes(new WorkflowNodeRegistry());
        const rawDesigner = new WorkflowDesigner({
            registry: this.registry,
            definition: createGatewayRuleWorkflow('zh-CN')
        });
        this.designer = effect ? reactive(rawDesigner, effect) : rawDesigner;
    }

    onInit(): void {
        this.state.openDesigner = () => this.editRules();
        this.state.init();
    }

    async onAfterViewInit(): Promise<void> {
        await this.state.start();
    }

    onDestroy(): void {
        this.state.destroy();
    }

    async editRules(): Promise<void> {
        this.state.error = '';
        await this.loadRuleDocument();
        this.designerOpen = true;
    }

    private async loadRuleDocument(): Promise<void> {
        if (this.state.creatingRuleWorkflow) {
            this.state.creatingRuleWorkflow = false;
            const definition = createGatewayRuleWorkflow('zh-CN');
            definition.id = `gateway_rules_${Date.now().toString(36)}`;
            this.state.ruleWorkflowId = definition.id;
            this.designer.load(definition);
            return;
        }
        const summaries = await this.store.list().catch(() => [] as WorkflowDefinitionSummary[]);
        const id = this.state.ruleWorkflowId || summaries[0]?.id || '';
        let definition: VisualWorkflowDefinition | undefined;
        if (id) {
            definition = await this.store.get(id);
        }
        this.state.ruleWorkflowId = id;
        this.designer.load(definition ?? createGatewayRuleWorkflow('zh-CN'));
    }

    closeDesigner(): void {
        this.designerOpen = false;
    }

    async applyRules(): Promise<void> {
        this.state.error = '';
        try {
            const summary = await this.store.save(this.designer.definition);
            this.designerOpen = false;
            this.state.ruleWorkflowId = this.designer.definition.id;
            await this.state.loadRuleWorkflows();
            this.state.status = this.state.t('status.rulesApplied', { count: summary.nodeCount });
            const state = await this.state.fetchState();
            this.state.rules = state.rules ?? [];
            this.state.services = state.services ?? [];
        } catch (error) {
            this.state.error = (error as Error).message;
        }
    }
}
