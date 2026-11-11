import { AfterViewInit, Component, OnDestroy, ReactiveEffect, noReact, reactive } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { MenuBarGroup } from '@tsdi/components/common';
import { installMenuBarStyles } from '@tsdi/components/common';
import { DOCUMENT } from '@tsdi/common';
import { GatewayRouteOptions } from '@tsdi/gateway';
import {
    WorkflowDesigner,
    WorkflowDefinitionSummary,
    WorkflowNodeRegistry,
    VisualWorkflowDefinition
} from '@tsdi/activities/visual';
import { createGatewayRuleWorkflow, registerGatewayRuleNodes } from '../src/rules';
import { GatewayAdminRuleStore } from './rule-store';
import { GatewayAdminHttp } from './http';
import { AdminLocale, adminMessage } from './admin.i18n';
import { AdminPage, adminRouteHash, parseAdminRoute, redirectToAdminLogin } from './routing';
import { Router, RouterEvent } from '@tsdi/components/router';

interface GatewayAdminState {
    routes?: GatewayRouteOptions[];
    rules?: any[];
    services?: string[];
    auth?: { enabled: boolean; mode: 'none' | 'oidc' | 'oauth2' | 'service' };
}

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
                    {{t('brand.name')}}
                    {{t('brand.subtitle')}}
                </div>
            </div>
            <nav class="ga-nav">
                <button class="ga-nav-item" [class]="dashboardNavClass" type="button" @click="goDashboard">
                    <span class="ga-nav-icon">◫</span>{{t('nav.overview')}}
                </button>
                <button class="ga-nav-item" [class]="routesNavClass" type="button" @click="goRoutes">
                    <span class="ga-nav-icon">⇄</span>{{t('nav.routes')}}
                </button>
                <button class="ga-nav-item" [class]="rulesNavClass" type="button" @click="goRules">
                    <span class="ga-nav-icon">⑂</span>{{t('nav.rules')}}
                </button>
            </nav>
            <div class="ga-sidebar-foot">
                <span class="ga-env-dot"></span>
                <span>{{authEnabled ? t('sidebar.sso') : t('sidebar.live')}}</span>
                <a v-if="authEnabled" class="ga-signout" href="/admin/auth/logout">{{t('sidebar.signOut')}}</a>
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
                    <menu-bar class="ga-global-menu" icon="☰" label="" caret="▾"
                        :triggerTitle="t('top.menu')" :groups="globalMenuGroups"
                        :selectAction="globalMenuSelect"></menu-bar>
                    <button class="ga-btn" type="button" @click="reload">{{t('top.refresh')}}</button>
                </div>
            </header>

            <div class="ga-content">
                <section class="ga-login" v-if="needsLogin">
                    <div class="ga-login-card">
                        <div class="ga-login-mark">TS</div>
                        <h2>{{t('login.title')}}</h2>
                        <p>{{t('login.desc')}}</p>
                        <a class="ga-btn ga-btn-primary" href="/admin/auth/login?redirect=/admin/">{{t('login.button')}}</a>
                    </div>
                </section>

                <section class="ga-page" v-if="!needsLogin && page === 'dashboard'">
                    <div class="ga-metrics">
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.routes')}}</span>
                            <strong>{{routes.length}}</strong>
                            <span class="ga-metric-foot">{{t('metric.enabled', { count: enabledRoutes })}}</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.services')}}</span>
                            <strong>{{services.length}}</strong>
                            <span class="ga-metric-foot">{{t('metric.discoveryTargets')}}</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.rules')}}</span>
                            <strong>{{rules.length}}</strong>
                            <span class="ga-metric-foot">{{t('metric.compiled')}}</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.runtime')}}</span>
                            <strong class="ga-metric-ok">{{t('metric.healthy')}}</strong>
                            <span class="ga-metric-foot">{{t('metric.localAdmin')}}</span>
                        </article>
                    </div>

                    <div class="ga-dashboard-grid">
                        <article class="ga-card">
                            <div class="ga-card-head">
                                <div>
                                    <h2>{{t('card.routeTable')}}</h2>
                                    <p>{{t('card.routeTableDesc')}}</p>
                                </div>
                                <button class="ga-btn" type="button" @click="goRoutes">{{t('card.manageRoutes')}}</button>
                            </div>
                            <div class="ga-compact-list">
                                <div class="ga-compact-row" v-for="route in routes.slice(0, 6)">
                                    <code>{{route.path}}</code>
                                    <span>{{route.service || t('table.staticUpstream')}}</span>
                                    <span class="ga-pill">{{routeMethods(route) || t('common.any')}}</span>
                                </div>
                                <div class="ga-empty" v-if="!routes.length">{{t('card.noRoutes')}}</div>
                            </div>
                        </article>

                        <article class="ga-card">
                            <div class="ga-card-head">
                                <div>
                                    <h2>{{t('card.rules')}}</h2>
                                    <p>{{t('card.rulesDesc')}}</p>
                                </div>
                                <button class="ga-btn" type="button" @click="goRules">{{t('card.manageRules')}}</button>
                            </div>
                            <div class="ga-compact-list">
                                <div class="ga-compact-row" v-for="rule in rules.slice(0, 6)">
                                    <span class="ga-status-dot" [class]="ruleTone(rule)"></span>
                                    <code>{{rule.name || rule.id}}</code>
                                    <span class="ga-pill">{{ruleActionLabel(rule)}}</span>
                                    <span class="ga-muted">{{t('card.conditions', { count: ruleConditionCount(rule) })}}</span>
                                </div>
                                <div class="ga-empty" v-if="!rules.length">{{t('card.noRules')}}</div>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="ga-page ga-page-routes" v-if="!needsLogin && page === 'routes'">
                    <div class="ga-page-actions">
                        <div class="ga-search">
                            <span>⌕</span>
                            <input [value]="routeQuery" placeholder="{{t('routes.filter')}}"
                                @input="searchRoutes($event)" />
                        </div>
                        <div class="ga-actions">
                            <button class="ga-btn ga-add-route" type="button" @click="addRoute">{{t('routes.add')}}</button>
                            <button class="ga-btn ga-btn-primary ga-apply-routes" type="button" @click="applyRoutes">{{t('routes.apply')}}</button>
                        </div>
                    </div>

                    <article class="ga-card ga-table-card">
                        <table class="ga-route-table">
                            <thead>
                                <tr>
                                    <th>{{t('table.path')}}</th>
                                    <th>{{t('table.service')}}</th>
                                    <th>{{t('table.upstream')}}</th>
                                    <th>{{t('table.methods')}}</th>
                                    <th>{{t('table.status')}}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="ga-route-row" v-for="route in filteredRoutes">
                                    <td><code>{{route.path}}</code></td>
                                    <td>{{route.service || t('common.none')}}</td>
                                    <td class="ga-cell-muted">{{route.targetUrl || route.targetPath || t('table.discovery')}}</td>
                                    <td><span class="ga-pill">{{routeMethods(route) || t('common.any')}}</span></td>
                                    <td>
                                        <span class="ga-pill" [class]="route.enabled === false ? 'ga-pill is-off' : 'ga-pill is-on'">
                                            {{route.enabled === false ? t('status.disabled') : t('status.enabled')}}
                                        </span>
                                    </td>
                                    <td class="ga-cell-actions">
                                        <button class="ga-link-btn" type="button" @click="editRoute(route)">{{t('action.edit')}}</button>
                                        <button class="ga-link-btn is-danger" type="button" @click="removeRoute(route)">{{t('action.remove')}}</button>
                                    </td>
                                </tr>
                                <tr v-if="!filteredRoutes.length">
                                    <td colspan="6"><div class="ga-empty">{{t('routes.noneFiltered')}}</div></td>
                                </tr>
                            </tbody>
                        </table>
                    </article>
                </section>

                <section class="ga-page ga-page-rules" v-if="!needsLogin && page === 'rules'">
                    <div class="ga-page-actions">
                        <div>
                            <h2 class="ga-section-title">{{t('rules.title')}}</h2>
                            <p class="ga-muted">{{t('rules.desc')}}</p>
                        </div>
                        <button class="ga-btn ga-btn-primary ga-edit-rules" type="button" @click="editRules">{{t('rules.configure')}}</button>
                    </div>

                    <article class="ga-card">
                        <div class="ga-card-head">
                            <div>
                                <h2>{{t('rules.compiled')}}</h2>
                                <p>{{t('rules.count', { count: rules.length })}}</p>
                            </div>
                        </div>
                        <div class="ga-rule-list">
                            <div class="ga-rule-item" v-for="(rule, index) in rules">
                                <span class="ga-rule-index">{{index + 1}}</span>
                                <div class="ga-rule-main">
                                    <strong>{{rule.name || rule.id}}</strong>
                                    <span class="ga-muted">{{conditionSummary(rule)}}</span>
                                </div>
                                <span class="ga-pill" [class]="ruleActionType(rule) === 'deny' ? 'ga-pill is-danger' : 'ga-pill is-on'">{{ruleActionLabel(rule)}}</span>
                                <span class="ga-pill">{{t('rules.priority', { value: rulePriority(rule) })}}</span>
                            </div>
                            <div class="ga-empty" v-if="!rules.length">
                                {{t('rules.empty')}}
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
                        <h2>{{editingIndex >= 0 ? t('editor.editTitle') : t('editor.addTitle')}}</h2>
                        <p>{{t('editor.desc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="closeRouteEditor">✕</button>
                </header>
                <div class="ga-form-grid">
                    <label class="ga-field">
                        <span>{{t('editor.path')}}</span>
                        <input data-field="path" [value]="editingRoute.path" placeholder="/api/users"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.service')}}</span>
                        <input data-field="service" [value]="editingRoute.service" placeholder="users-service"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.targetUrl')}}</span>
                        <input data-field="targetUrl" [value]="editingRoute.targetUrl" placeholder="http://127.0.0.1:3001"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.targetPath')}}</span>
                        <input data-field="targetPath" [value]="editingRoute.targetPath" placeholder="/users"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.methods')}}</span>
                        <input data-field="methods" [value]="routeMethods(editingRoute)" placeholder="GET, POST"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.timeout')}}</span>
                        <input data-field="timeout" type="number" [value]="editingRoute.timeout"
                            @input="editRouteField($event)" />
                    </label>
                </div>
                <div class="ga-form-row">
                    <label class="ga-check">
                        <input type="checkbox" data-field="stripPrefix" [checked]="editingRoute.stripPrefix === true"
                            @change="editRouteField($event)" />
                        <span>{{t('editor.stripPrefix')}}</span>
                    </label>
                    <label class="ga-check">
                        <input type="checkbox" data-field="enabled" [checked]="editingRoute.enabled !== false"
                            @change="editRouteField($event)" />
                        <span>{{t('editor.enabled')}}</span>
                    </label>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="closeRouteEditor">{{t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-route-save" type="button" @click="saveRouteEditor">{{t('editor.save')}}</button>
                </footer>
            </div>
        </div>

        <div class="ga-designer-page" v-if="designerOpen">
            <header class="ga-designer-head">
                <div>
                    <h2>{{t('designer.title')}}</h2>
                    <p>{{t('designer.desc')}}</p>
                </div>
                <div class="ga-actions">
                    <button class="ga-btn ga-rules-cancel" type="button" @click="closeDesigner">{{t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-rules-apply" type="button" @click="applyRules">{{t('designer.apply')}}</button>
                </div>
            </header>
            <div class="ga-designer-body">
                <workflow-designer-preview
                    :designer="designer"
                    :registry="registry"
                    :locale="locale"
                    :theme="theme"
                    :hiddenActions="designerHiddenActions"
                    :showRunHistory="false"
                    :showRunLogs="false"
                    :showStatusbar="true"></workflow-designer-preview>
            </div>
        </div>
    </div>`
})
export class GatewayAdminComponent implements AfterViewInit, OnDestroy {
    page: AdminPage = 'dashboard';
    routes: GatewayRouteOptions[] = [];
    services: string[] = [];
    rules: any[] = [];
    status = '';
    locale: AdminLocale = 'en';
    theme: 'light' | 'dark' = 'light';
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

    private store: GatewayAdminRuleStore;
    private loaded = false;
    private selfRef?: GatewayAdminComponent;
    private hashHandler?: () => void;
    private routerSub?: { unsubscribe(): void };

    constructor(
        @Optional() effect?: ReactiveEffect,
        @Optional() @Inject(DOCUMENT) private documentRef?: any,
        @Optional() private router?: Router,
        @Optional() private http?: GatewayAdminHttp
    ) {
        this.store = new GatewayAdminRuleStore(this.http as GatewayAdminHttp);
        try {
            if (documentRef) {
                (documentRef as any)[noReact] = true;
            }
        } catch {
            // Documents can reject expando properties.
        }
        installMenuBarStyles(documentRef);
        this.registry = registerGatewayRuleNodes(new WorkflowNodeRegistry());
        const rawDesigner = new WorkflowDesigner({
            registry: this.registry,
            definition: createGatewayRuleWorkflow('zh-CN')
        });
        this.designer = effect ? reactive(rawDesigner, effect) : rawDesigner;
    }

    onInit(): void {
        this.selfRef = this;
        try {
            const locale = this.storage()?.getItem('tsdi-gateway-admin-locale');
            if (locale === 'zh-CN' || locale === 'en') {
                this.locale = locale;
            } else if (String(globalThis.navigator?.language || '').toLowerCase().startsWith('zh')) {
                this.locale = 'zh-CN';
            }
            const theme = this.storage()?.getItem('tsdi-gateway-admin-theme');
            if (theme === 'dark' || theme === 'light') {
                this.theme = theme;
            }
        } catch {
            // Private mode/storage failures keep the defaults.
        }
        this.status = this.t('status.loading');
        this.applyTheme();
    }

    async onAfterViewInit(): Promise<void> {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.applyTheme();
        const win = this.documentRef?.defaultView;
        if (win?.location) {
            this.page = parseAdminRoute(win.location.hash);
        }
        if (this.router) {
            this.routerSub = this.router.events.subscribe(event => this.handleRouterEvent(event));
            if (win?.addEventListener) {
                this.hashHandler = () => this.handleHashChange();
                win.addEventListener('hashchange', this.hashHandler);
            }
            await this.router.navigateByUrl(`/${this.page}`);
        }
        await this.reload();
    }

    onDestroy(): void {
        const win = this.documentRef?.defaultView;
        if (win?.removeEventListener && this.hashHandler) {
            win.removeEventListener('hashchange', this.hashHandler);
        }
        this.hashHandler = undefined;
        this.routerSub?.unsubscribe();
        this.routerSub = undefined;
    }

    t(key: string, params?: Record<string, any>): string {
        return adminMessage(this.locale, key, params);
    }

    private storage(): Storage | undefined {
        try {
            return this.documentRef?.defaultView?.localStorage
                ?? (globalThis as { localStorage?: Storage }).localStorage;
        } catch {
            return undefined;
        }
    }

    private applyTheme(): void {
        const doc = this.documentRef ?? (globalThis as { document?: Document }).document;
        if (doc?.documentElement) {
            doc.documentElement.setAttribute('data-theme', this.theme);
        }
    }

    private globalMenuCache?: { locale: AdminLocale; theme: string; groups: MenuBarGroup[] };

    get globalMenuGroups(): MenuBarGroup[] {
        const cache = this.globalMenuCache;
        if (cache && cache.locale === this.locale && cache.theme === this.theme) {
            return cache.groups;
        }
        const groups: MenuBarGroup[] = [
            {
                items: [
                    {
                        id: 'menu:language',
                        label: this.t('top.language'),
                        icon: '🌐',
                        children: [
                            { id: 'language:en', label: 'English', checked: this.locale === 'en' },
                            { id: 'language:zh-CN', label: '中文', checked: this.locale === 'zh-CN' }
                        ]
                    },
                    {
                        id: 'menu:theme',
                        label: this.t('top.theme'),
                        icon: '◐',
                        children: [
                            { id: 'theme:light', label: this.t('theme.light'), checked: this.theme === 'light' },
                            { id: 'theme:dark', label: this.t('theme.dark'), checked: this.theme === 'dark' }
                        ]
                    }
                ]
            }
        ];
        this.globalMenuCache = { locale: this.locale, theme: this.theme, groups };
        return groups;
    }

    readonly globalMenuSelect = (id: string): void => {
        if (id === 'language:en' || id === 'language:zh-CN') {
            this.setLocale(id.slice('language:'.length) as AdminLocale);
            return;
        }
        if (id === 'theme:light' || id === 'theme:dark') {
            this.setTheme(id.slice('theme:'.length) as 'light' | 'dark');
        }
    };

    private setLocale(locale: AdminLocale): void {
        const self = this.self();
        if (self.locale === locale) {
            return;
        }
        self.locale = locale;
        self.globalMenuCache = undefined;
        try {
            self.storage()?.setItem('tsdi-gateway-admin-locale', locale);
            (self.documentRef ?? globalThis.document)?.documentElement?.setAttribute('lang', locale);
        } catch {
            // ignore storage failures
        }
        if (self.loaded) {
            void self.reload();
        }
    }

    private setTheme(theme: 'light' | 'dark'): void {
        const self = this.self();
        self.theme = theme === 'dark' ? 'dark' : 'light';
        self.applyTheme();
        self.globalMenuCache = undefined;
        try {
            self.storage()?.setItem('tsdi-gateway-admin-theme', self.theme);
        } catch {
            // ignore storage failures
        }
    }

    private self(): GatewayAdminComponent {
        return (this.selfRef ?? this) as GatewayAdminComponent;
    }

    get pageTitle(): string {
        switch (this.page) {
            case 'routes': return this.t('page.routes.title');
            case 'rules': return this.t('page.rules.title');
            default: return this.t('page.overview.title');
        }
    }

    get pageSubtitle(): string {
        switch (this.page) {
            case 'routes': return this.t('page.routes.subtitle');
            case 'rules': return this.t('page.rules.subtitle');
            default: return this.t('page.overview.subtitle');
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
        this.navigate('dashboard');
    }

    goRoutes(): void {
        this.navigate('routes');
    }

    goRules(): void {
        this.navigate('rules');
    }

    private navigate(page: AdminPage): void {
        const self = this.self();
        if (self.needsLogin) {
            self.redirectToLogin();
            return;
        }
        if (self.router) {
            void self.router.navigateByUrl(`/${page}`);
            return;
        }
        self.page = page;
    }

    private handleHashChange(): void {
        const self = this.self();
        if (self.needsLogin) {
            self.redirectToLogin();
            return;
        }
        const win = self.documentRef?.defaultView;
        const page = parseAdminRoute(win?.location?.hash);
        if (page === self.page) {
            return;
        }
        if (self.router) {
            void self.router.navigateByUrl(`/${page}`);
        } else {
            self.page = page;
        }
    }

    private handleRouterEvent(event: RouterEvent): void {
        const self = this.self();
        if (event.type !== 'NavigationEnd' || !event.snapshot) {
            return;
        }
        const page = (this.router?.data?.page || event.snapshot.data?.page) as AdminPage;
        if (page) {
            self.page = page;
        }
        const win = self.documentRef?.defaultView;
        try {
            const hash = adminRouteHash(self.page);
            if (win?.history?.replaceState && win.location?.hash !== hash) {
                win.history.replaceState(null, '', hash);
            }
        } catch {
            // Embedded hosts may block history updates; state remains local.
        }
    }

    private redirectToLogin(): void {
        const win = this.documentRef?.defaultView ?? (globalThis as { window?: Window }).window;
        redirectToAdminLogin(win as any);
    }

    searchRoutes(event: Event): void {
        this.self().routeQuery = (event.target as HTMLInputElement).value;
    }

    conditionSummary(rule: any): string {
        const when = rule?.when ?? [];
        if (!when.length) {
            return this.t('rules.matchesEvery');
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

    ruleActionLabel(rule: any): string {
        return this.t(this.ruleActionType(rule) === 'deny' ? 'rule.deny' : 'rule.route');
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
                throw new Error(this.t('error.apiUnavailable', { status: response.status }));
            }
            const state = await response.json() as GatewayAdminState;
            self.authEnabled = state.auth?.enabled === true;
            self.needsLogin = false;
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.rules = state.rules ?? [];
            self.status = self.t('status.ready', { routes: self.routes.length, rules: self.rules.length });
        } catch (error) {
            self.status = self.t('status.offline');
            self.error = (error as Error).message;
        }
    }

    private requireLogin(): void {
        const self = this.self();
        self.needsLogin = true;
        self.authEnabled = true;
        self.status = self.t('status.signInRequired');
        self.redirectToLogin();
    }

    private async fetchState(): Promise<GatewayAdminState> {
        if (!this.http) {
            throw new Error('Gateway admin HTTP client is unavailable');
        }
        const response = await this.http.state();
        if (response.status === 401) {
            this.requireLogin();
            return {};
        }
        if (!response.ok) {
            throw new Error(this.t('error.apiUnavailable', { status: response.status }));
        }
        return response.body as GatewayAdminState;
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
            self.error = self.t('error.routeRequired');
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
        self.status = self.t('status.routeStaged', { count: self.routes.length });
    }

    removeRoute(route: GatewayRouteOptions): void {
        const self = this.self();
        self.routes = self.routes.filter(item => item !== route);
        self.status = self.t('status.routeRemoved', { count: self.routes.length });
    }

    async applyRoutes(): Promise<void> {
        const self = this.self();
        self.error = '';
        try {
            if (!self.http) {
                throw new Error('Gateway admin HTTP client is unavailable');
            }
            const response = await self.http.updateRoutes(self.routes);
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (!response.ok) {
                throw new Error(self.t('error.applyRoutes', { status: response.status }));
            }
            const state = response.body as GatewayAdminState;
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.status = self.t('status.routesApplied', { count: self.routes.length });
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
            self.status = self.t('status.rulesApplied', { count: summary.nodeCount });
            const state = await self.fetchState();
            self.rules = state.rules ?? [];
            self.services = state.services ?? [];
        } catch (error) {
            self.error = (error as Error).message;
        }
    }
}
