import { noReact } from '@tsdi/components';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import {
    MenuBarGroup,
    installMenuBarStyles,
} from '@tsdi/components/common/menu-bar';
import { DOCUMENT } from '@tsdi/common';
import { GatewayMatchPreview, GatewayRouteOptions, GatewayRuntimeSnapshot } from '@tsdi/gateway';
import { WorkflowDefinitionSummary } from '@tsdi/activities/visual';
import { Router, RouterEvent } from '@tsdi/components/router';
import { AdminLocale, adminMessage } from './admin.i18n';
import { AdminPage, redirectToAdminLogin } from './routing';
import { GatewayAdminHttp } from './http';

/** Structural document view used by the console (keeps decorator metadata DOM-free). */
interface AdminDocumentLike {
    defaultView?: Window | null;
    documentElement?: { setAttribute(name: string, value: string): void } | null;
}

export interface GatewayAdminRuleCondition {
    field?: string;
    name?: string;
    operator?: string;
    value?: unknown;
}

export interface GatewayAdminRuleSummary {
    id?: string;
    name?: string;
    priority?: number;
    when?: GatewayAdminRuleCondition[];
    action?: { type?: string };
}

export interface GatewayAdminApiState {
    routes?: GatewayRouteOptions[];
    rules?: GatewayAdminRuleSummary[];
    services?: string[];
    dynamic?: { routes?: unknown[]; rules?: unknown[] };
    auth?: { enabled: boolean; mode: 'none' | 'oidc' | 'oauth2' | 'service' };
}

export interface GatewayAdminServiceSummary {
    name: string;
    routes: number;
    enabled: number;
}

export interface GatewayAdminServiceEndpoint {
    id: string;
    address: string;
    protocol?: string;
    port?: number;
    status?: string;
    weight?: number;
    version?: string;
    tags?: string[];
}

export interface GatewayAdminServiceDetail {
    name: string;
    endpoints: GatewayAdminServiceEndpoint[];
}

/**
 * Shared console state (Angular service pattern).
 *
 * The routed layout and every child route page inject this service; the router
 * outlet decides which page component renders, and pages never reach into the
 * layout component instance.
 */
@Injectable()
export class GatewayAdminState {
    page: AdminPage = 'dashboard';
    routes: GatewayRouteOptions[] = [];
    services: string[] = [];
    rules: GatewayAdminRuleSummary[] = [];
    status = '';
    locale: AdminLocale = 'en';
    theme: 'light' | 'dark' = 'light';
    error = '';
    routeQuery = '';
    routeFilter: 'all' | 'enabled' | 'disabled' = 'all';
    routeEditorOpen = false;
    editingRoute: GatewayRouteOptions = {} as GatewayRouteOptions;
    editingIndex = -1;
    routeErrors: Record<string, string> = {};
    routesDirty = false;
    ruleWorkflows: WorkflowDefinitionSummary[] = [];
    ruleWorkflowId = '';
    creatingRuleWorkflow = false;
    matchMethod = 'GET';
    matchPath = '/api';
    matchResult?: GatewayMatchPreview;
    matchLoading = false;
    authMode: 'none' | 'oidc' | 'oauth2' | 'service' = 'none';
    dynamicRoutes = false;
    dynamicRules = false;
    routeDetail?: GatewayRouteOptions;
    routeDetailIndex = -1;
    routeJsonOpen = false;
    routeJsonText = '';
    routeJsonError = '';
    ruleDetail?: GatewayAdminRuleSummary;
    importOpen = false;
    importText = '';
    importError = '';
    diagnostics?: GatewayRuntimeSnapshot;
    serviceDetails: GatewayAdminServiceDetail[] = [];
    authEnabled = false;
    needsLogin = false;
    /** Set by the routed layout; the rules page calls it to open the designer. */
    openDesigner?: () => Promise<void>;

    private loaded = false;
    private selfRef?: GatewayAdminState;
    private routerSub?: { unsubscribe(): void };

    constructor(
        @Optional() @Inject(DOCUMENT) private documentRef?: AdminDocumentLike,
        @Optional() private router?: Router,
        @Optional() private http?: GatewayAdminHttp
    ) {
        try {
            if (documentRef) {
                (documentRef as unknown as Record<PropertyKey, unknown>)[noReact] = true;
            }
        } catch {
            // Documents can reject expando properties.
        }
        installMenuBarStyles(documentRef as unknown as Document | undefined);
    }

    init(): void {
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

    async start(): Promise<void> {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.applyTheme();
        const win = this.documentRef?.defaultView;
        if (this.router) {
            const initialPage = this.router.data?.page as AdminPage | undefined;
            if (initialPage) {
                this.page = initialPage;
            }
            this.routerSub = this.router.events.subscribe(event => this.handleRouterEvent(event));
            const initial = win?.location?.hash
                ? String(win.location.hash).replace(/^#/, '')
                : '/';
            await this.router.navigateByUrl(initial || '/');
        }
        await this.reload();
    }

    destroy(): void {
        this.routerSub?.unsubscribe();
        this.routerSub = undefined;
    }

    t(key: string, params?: Record<string, unknown>): string {
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
        const doc = this.documentRef
            ?? (globalThis as { document?: AdminDocumentLike }).document;
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
            (self.documentRef ?? (globalThis as { document?: AdminDocumentLike }).document)?.documentElement?.setAttribute('lang', locale);
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

    private self(): GatewayAdminState {
        return (this.selfRef ?? this) as GatewayAdminState;
    }

    get pageTitle(): string {
        switch (this.page) {
            case 'routes': return this.t('page.routes.title');
            case 'rules': return this.t('page.rules.title');
            case 'not-found': return this.t('page.notFound.title');
            default: return this.t('page.overview.title');
        }
    }

    get pageSubtitle(): string {
        switch (this.page) {
            case 'routes': return this.t('page.routes.subtitle');
            case 'rules': return this.t('page.rules.subtitle');
            case 'not-found': return this.t('page.notFound.subtitle');
            default: return this.t('page.overview.subtitle');
        }
    }

    get enabledRoutes(): number {
        return this.routes.filter(route => route.enabled !== false).length;
    }

    get filteredRoutes(): GatewayRouteOptions[] {
        const query = String(this.routeQuery || '').trim().toLowerCase();
        let list = this.routes;
        if (this.routeFilter === 'enabled') {
            list = list.filter(route => route.enabled !== false);
        } else if (this.routeFilter === 'disabled') {
            list = list.filter(route => route.enabled === false);
        }
        if (!query) {
            return list;
        }
        return list.filter(route => [route.path, route.service, route.targetUrl, route.targetPath]
            .some(value => String(value || '').toLowerCase().includes(query)));
    }

    readonly setRouteFilter = (event: Event): void => {
        const self = this.selfRef ?? this;
        const value = String((event.target as HTMLSelectElement).value);
        self.routeFilter = value === 'enabled' || value === 'disabled' ? value : 'all';
    };

    endpointsFor(name: string): GatewayAdminServiceEndpoint[] {
        return this.serviceDetails.find(service => service.name === name)?.endpoints ?? [];
    }

    endpointSummary(name: string): string {
        return this.endpointsFor(name).map(endpoint => endpoint.address).join(', ');
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

    private handleRouterEvent(event: RouterEvent): void {
        const self = this.self();
        if (event.type !== 'NavigationEnd' || !event.snapshot) {
            return;
        }
        const page = (this.router?.data?.page || event.snapshot.data?.page) as AdminPage;
        if (page) {
            self.page = page;
        }
    }

    private redirectToLogin(): void {
        const win = this.documentRef?.defaultView ?? (globalThis as { window?: Window }).window;
        redirectToAdminLogin(win ?? undefined);
    }

    searchRoutes(event: Event): void {
        this.self().routeQuery = (event.target as HTMLInputElement).value;
    }

    conditionSummary(rule: GatewayAdminRuleSummary): string {
        const when = rule?.when ?? [];
        if (!when.length) {
            return this.t('rules.matchesEvery');
        }
        return when.map(condition => [
            condition.field,
            condition.name ? `(${condition.name})` : '',
            condition.operator || 'equals',
            condition.value ?? ''
        ].filter(Boolean).join(' ')).join(' · ');
    }

    routeMethods(route: GatewayRouteOptions): string {
        return (route.methods ?? []).join(', ');
    }

    ruleActionType(rule: GatewayAdminRuleSummary): string {
        return rule?.action?.type || 'route';
    }

    ruleActionLabel(rule: GatewayAdminRuleSummary): string {
        return this.t(this.ruleActionType(rule) === 'deny' ? 'rule.deny' : 'rule.route');
    }

    ruleTone(rule: GatewayAdminRuleSummary): string {
        return rule?.action?.type === 'deny' ? 'ga-status-dot is-danger' : 'ga-status-dot';
    }

    rulePriority(rule: GatewayAdminRuleSummary): number {
        return rule?.priority ?? 0;
    }

    ruleConditionCount(rule: GatewayAdminRuleSummary): number {
        return rule?.when?.length || 0;
    }

    get openCircuitCount(): number {
        return this.diagnostics?.circuits?.filter(circuit => circuit.open).length ?? 0;
    }

    async loadServices(): Promise<void> {
        const self = this.selfRef ?? this;
        if (!self.http) {
            return;
        }
        const response = await self.http.services();
        if (response.ok) {
            self.serviceDetails = Array.isArray(response.body) ? response.body : [];
        }
    }

    async loadDiagnostics(): Promise<void> {
        const self = this.selfRef ?? this;
        if (!self.http) {
            return;
        }
        const response = await self.http.diagnostics();
        if (response.ok) {
            self.diagnostics = response.body;
        }
    }

    get routeDetailJson(): string {
        if (!this.routeDetail) {
            return '';
        }
        return JSON.stringify(this.routeDetail, null, 2);
    }

    get serviceSummaries(): GatewayAdminServiceSummary[] {
        const byService = new Map<string, GatewayAdminServiceSummary>();
        this.routes.forEach(route => {
            const name = String(route.service || '').trim();
            if (!name) {
                return;
            }
            const entry = byService.get(name) ?? { name, routes: 0, enabled: 0 };
            entry.routes += 1;
            if (route.enabled !== false) {
                entry.enabled += 1;
            }
            byService.set(name, entry);
        });
        return Array.from(byService.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    get policyCounts(): { auth: number; rateLimit: number; circuitBreaker: number; cache: number; mock: number; canary: number } {
        return this.routes.reduce((counts, route) => {
            if (route.auth) counts.auth += 1;
            if (route.rateLimit !== undefined && route.rateLimit !== false) counts.rateLimit += 1;
            if (route.circuitBreaker) counts.circuitBreaker += 1;
            if (route.cache) counts.cache += 1;
            if (route.mock) counts.mock += 1;
            if (route.canary) counts.canary += 1;
            return counts;
        }, { auth: 0, rateLimit: 0, circuitBreaker: 0, cache: 0, mock: 0, canary: 0 });
    }

    get policyRows(): Array<{ key: string; label: string; value: number }> {
        const counts = this.policyCounts;
        return [
            { key: 'auth', label: this.t('policy.auth'), value: counts.auth },
            { key: 'rateLimit', label: this.t('policy.rateLimit'), value: counts.rateLimit },
            { key: 'circuitBreaker', label: this.t('policy.circuitBreaker'), value: counts.circuitBreaker },
            { key: 'cache', label: this.t('policy.cache'), value: counts.cache },
            { key: 'mock', label: this.t('policy.mock'), value: counts.mock },
            { key: 'canary', label: this.t('policy.canary'), value: counts.canary }
        ];
    }

    get authModeLabel(): string {
        switch (this.authMode) {
            case 'oidc': return this.t('auth.oidc');
            case 'oauth2': return this.t('auth.oauth2');
            case 'service': return this.t('auth.service');
            default: return this.t('auth.none');
        }
    }

    readonly openRouteDetail = (route: GatewayRouteOptions): void => {
        const self = this.selfRef ?? this;
        self.routeDetail = { ...route };
        self.routeDetailIndex = self.routes.indexOf(route);
        self.routeJsonOpen = false;
        self.routeJsonError = '';
    };

    readonly closeRouteDetail = (): void => {
        const self = this.selfRef ?? this;
        self.routeDetail = undefined;
        self.routeDetailIndex = -1;
        self.routeJsonOpen = false;
        self.routeJsonText = '';
        self.routeJsonError = '';
    };

    readonly editRouteDetailJson = (): void => {
        const self = this.selfRef ?? this;
        self.routeJsonText = JSON.stringify(self.routeDetail ?? {}, null, 2);
        self.routeJsonOpen = true;
        self.routeJsonError = '';
    };

    readonly cancelRouteDetailJson = (): void => {
        const self = this.selfRef ?? this;
        self.routeJsonOpen = false;
        self.routeJsonError = '';
    };

    readonly setRouteJson = (event: Event): void => {
        const self = this.selfRef ?? this;
        self.routeJsonText = (event.target as HTMLTextAreaElement).value;
    };

    readonly saveRouteDetailJson = (): void => {
        const self = this.selfRef ?? this;
        let parsed: unknown;
        try {
            parsed = JSON.parse(self.routeJsonText);
        } catch {
            self.routeJsonError = self.t('import.invalidJson');
            return;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            self.routeJsonError = self.t('import.invalidRoute');
            return;
        }
        const route = parsed as GatewayRouteOptions;
        const errors = self.validateRoute(route, self.routeDetailIndex);
        const first = Object.values(errors)[0];
        if (first) {
            self.routeJsonError = first;
            return;
        }
        if (self.routeDetailIndex < 0 || self.routeDetailIndex >= self.routes.length) {
            return;
        }
        const next = self.routes.slice();
        next[self.routeDetailIndex] = { ...route };
        self.routes = next;
        self.routesDirty = true;
        self.closeRouteDetail();
        self.status = self.t('status.routeStaged', { count: self.routes.length });
    };

    readonly openRuleDetail = (rule: GatewayAdminRuleSummary): void => {
        (this.selfRef ?? this).ruleDetail = { ...rule };
    };

    readonly closeRuleDetail = (): void => {
        (this.selfRef ?? this).ruleDetail = undefined;
    };

    get ruleDetailJson(): string {
        return this.ruleDetail ? JSON.stringify(this.ruleDetail, null, 2) : '';
    }

    readonly openImport = (): void => {
        const self = this.selfRef ?? this;
        self.importOpen = true;
        self.importError = '';
    };

    readonly closeImport = (): void => {
        const self = this.selfRef ?? this;
        self.importOpen = false;
        self.importText = '';
        self.importError = '';
    };

    readonly setImportText = (event: Event): void => {
        const self = this.selfRef ?? this;
        self.importText = (event.target as HTMLTextAreaElement).value;
    };

    readonly exportRoutes = (): void => {
        const self = this.selfRef ?? this;
        const data = JSON.stringify(self.routes, null, 2);
        const doc = (self.documentRef ?? (globalThis as { document?: Document }).document) as Document | undefined;
        const createUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
        if (!doc || !createUrl || typeof Blob === 'undefined') {
            self.importText = data;
            self.importOpen = true;
            return;
        }
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = doc.createElement('a');
        link.href = url;
        link.download = 'gateway-routes.json';
        link.click();
        URL.revokeObjectURL(url);
        self.status = self.t('status.routesExported');
    };

    readonly importRoutes = (): void => {
        const self = this.selfRef ?? this;
        const text = String(self.importText || '').trim();
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            self.importError = self.t('import.invalidJson');
            return;
        }
        const list = Array.isArray(parsed)
            ? parsed
            : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { routes?: unknown[] }).routes)
                ? (parsed as { routes: unknown[] }).routes
                : undefined);
        if (!Array.isArray(list)) {
            self.importError = self.t('import.invalidShape');
            return;
        }
        const invalid = list.find(route => {
            const entry = route as GatewayRouteOptions;
            return !entry || typeof entry.path !== 'string' || !entry.path.startsWith('/')
                || (!entry.service && !entry.targetUrl);
        });
        if (invalid) {
            self.importError = self.t('import.invalidRoute');
            return;
        }
        self.routes = list.map(route => ({ ...(route as GatewayRouteOptions) }));
        self.routesDirty = true;
        self.closeImport();
        self.status = self.t('status.routesImported', { count: self.routes.length });
    };

    readonly resetRoutes = async (): Promise<void> => {
        const self = this.selfRef ?? this;
        if (!self.http) {
            return;
        }
        const response = await self.http.resetRoutes();
        if (response.status === 401) {
            self.requireLogin();
            return;
        }
        if (!response.ok) {
            self.error = self.t('error.resetRoutes', { status: response.status });
            return;
        }
        await self.reload();
        self.status = self.t('status.routesReset');
    };

    readonly editRules = async (id?: string): Promise<void> => {
        const self = this.selfRef ?? this;
        if (id) {
            self.ruleWorkflowId = id;
        }
        if (self.openDesigner) {
            await self.openDesigner();
        }
    };

    readonly setMatchMethod = (event: Event): void => {
        const self = this.selfRef ?? this;
        self.matchMethod = String((event.target as HTMLSelectElement).value || 'GET').toUpperCase();
    };

    readonly setMatchPath = (event: Event): void => {
        const self = this.selfRef ?? this;
        self.matchPath = (event.target as HTMLInputElement).value;
    };

    readonly testMatch = async (): Promise<void> => {
        const self = this.selfRef ?? this;
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
    };

    readonly newRuleWorkflow = (): void => {
        const self = this.selfRef ?? this;
        self.creatingRuleWorkflow = true;
        self.ruleWorkflowId = '';
        if (self.openDesigner) {
            void self.openDesigner();
        }
    };

    readonly duplicateRuleWorkflow = async (id: string): Promise<void> => {
        const self = this.selfRef ?? this;
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
    };

    readonly applyRuleWorkflow = async (id: string): Promise<void> => {
        const self = this.selfRef ?? this;
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
    };

    async loadRuleWorkflows(): Promise<void> {
        const self = this.self();
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

    readonly deleteRuleWorkflow = async (id: string): Promise<void> => {
        const self = this.selfRef ?? this;
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
    };

    // Event handlers used inside `v-for` rows are arrow properties: the
    // template binds `this` to the row scope, so they must capture the service.
    readonly toggleRoute = (route: GatewayRouteOptions): void => {
        const self = this.selfRef ?? this;
        self.routes = self.routes.map(item => item === route
            ? { ...item, enabled: item.enabled === false }
            : item);
        self.routesDirty = true;
        self.status = self.t('status.routeToggled', {
            path: route.path,
            state: route.enabled === false ? self.t('status.enabled') : self.t('status.disabled')
        });
    };

    readonly moveRoute = (route: GatewayRouteOptions, delta: number): void => {
        const self = this.selfRef ?? this;
        const index = self.routes.indexOf(route);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= self.routes.length) {
            return;
        }
        const next = self.routes.slice();
        [next[index], next[target]] = [next[target], next[index]];
        self.routes = next;
        self.routesDirty = true;
        self.status = self.t('status.routeMoved', { path: route.path });
    };

    readonly duplicateRoute = (route: GatewayRouteOptions): void => {
        const self = this.selfRef ?? this;
        const base = String(route.path || '/');
        const paths = new Set(self.routes.map(item => String(item.path)));
        let path = `${base}-copy`;
        let counter = 2;
        while (paths.has(path)) {
            path = `${base}-copy-${counter++}`;
        }
        const copy = { ...route, path };
        const index = self.routes.indexOf(route);
        const next = self.routes.slice();
        next.splice(index + 1, 0, copy);
        self.routes = next;
        self.routesDirty = true;
        self.status = self.t('status.routeDuplicated', { path });
    };

    private routeMethodsKey(route: GatewayRouteOptions): string {
        const methods = (route.methods ?? [])
            .map(method => String(method).trim().toUpperCase())
            .filter(Boolean);
        return (methods.length ? Array.from(new Set(methods)).sort() : ['ANY']).join(',');
    }

    validateRoute(route: GatewayRouteOptions, index = -1): Record<string, string> {
        const errors: Record<string, string> = {};
        const path = String(route.path || '').trim();
        if (!path) {
            errors.path = this.t('validation.pathRequired');
        } else if (!path.startsWith('/')) {
            errors.path = this.t('validation.pathSlash');
        } else if (/\s/.test(path)) {
            errors.path = this.t('validation.pathSpace');
        }
        if (!route.service && !route.targetUrl) {
            errors.service = this.t('validation.serviceRequired');
        }
        if (route.targetUrl && !/^(https?:\/\/|\/)/i.test(String(route.targetUrl))) {
            errors.targetUrl = this.t('validation.url');
        }
        if (route.targetPath && !String(route.targetPath).startsWith('/')) {
            errors.targetPath = this.t('validation.pathSlash');
        }
        if (route.timeout !== undefined && route.timeout !== null) {
            const timeout = Number(route.timeout);
            if (!Number.isFinite(timeout) || timeout < 0 || timeout > 600000) {
                errors.timeout = this.t('validation.timeout');
            }
        }
        const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'];
        const methods = (route.methods ?? []).map(method => String(method).trim().toUpperCase()).filter(Boolean);
        if (methods.some(method => !allowed.includes(method))) {
            errors.methods = this.t('validation.methods');
        }
        const methodKey = this.routeMethodsKey(route);
        const duplicate = this.routes.some((item, itemIndex) =>
            itemIndex !== index
            && String(item.path || '').trim() === path
            && this.routeMethodsKey(item) === methodKey);
        if (duplicate) {
            errors.path = this.t('validation.duplicate');
        }
        return errors;
    }

    validateEditingRoute(): boolean {
        const self = this.self();
        const errors = self.validateRoute(self.editingRoute, self.editingIndex);
        self.routeErrors = errors;
        const first = Object.values(errors)[0];
        if (first) {
            self.error = first;
            return false;
        }
        self.error = '';
        return true;
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
            const state = await response.json() as GatewayAdminApiState;
            self.authEnabled = state.auth?.enabled === true;
            self.authMode = state.auth?.mode ?? 'none';
            self.dynamicRoutes = Array.isArray(state.dynamic?.routes) && state.dynamic.routes.length > 0;
            self.dynamicRules = Array.isArray(state.dynamic?.rules) && state.dynamic.rules.length > 0;
            self.needsLogin = false;
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.rules = state.rules ?? [];
            self.routesDirty = false;
            void self.loadRuleWorkflows();
            void self.loadDiagnostics();
            void self.loadServices();
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

    async fetchState(): Promise<GatewayAdminApiState> {
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
        return response.body as GatewayAdminApiState;
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

    readonly editRoute = (route: GatewayRouteOptions): void => {
        const self = this.selfRef ?? this;
        self.editingIndex = self.routes.indexOf(route);
        self.editingRoute = { ...route };
        self.routeEditorOpen = true;
    };

    closeRouteEditor(): void {
        const self = this.self();
        self.routeEditorOpen = false;
        self.editingRoute = {} as GatewayRouteOptions;
        self.editingIndex = -1;
        self.routeErrors = {};
    }

    editRouteField(event: Event): void {
        const self = this.self();
        const target = event.target as HTMLInputElement;
        const key = target.getAttribute('data-field') || '';
        if (!key) {
            return;
        }
        let value: string | number | boolean | string[] | undefined = target.checked;
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
        (self.editingRoute as unknown as Record<string, unknown>)[key] = value;
        self.editingRoute = { ...self.editingRoute };
        if (self.routeErrors[key]) {
            const next = { ...self.routeErrors };
            delete next[key];
            self.routeErrors = next;
        }
    }

    saveRouteEditor(): void {
        const self = this.self();
        if (!self.validateEditingRoute()) {
            return;
        }
        const route = self.editingRoute;
        self.error = '';
        if (self.editingIndex >= 0) {
            const next = self.routes.slice();
            next[self.editingIndex] = { ...route };
            self.routes = next;
        } else {
            self.routes = [...self.routes, { ...route }];
        }
        self.closeRouteEditor();
        self.routesDirty = true;
        self.status = self.t('status.routeStaged', { count: self.routes.length });
    }

    readonly removeRoute = (route: GatewayRouteOptions): void => {
        const self = this.selfRef ?? this;
        self.routes = self.routes.filter(item => item !== route);
        self.routesDirty = true;
        self.status = self.t('status.routeRemoved', { count: self.routes.length });
    };

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
            const state = response.body as GatewayAdminApiState;
            self.routes = (state.routes ?? []).map(route => ({ ...route }));
            self.services = state.services ?? [];
            self.routesDirty = false;
            self.status = self.t('status.routesApplied', { count: self.routes.length });
        } catch (error) {
            self.error = (error as Error).message;
        }
    }
}
