import { noReact } from '@tsdi/components';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import {
    MenuBarGroup,
    installMenuBarStyles,
} from '@tsdi/components/common/menu-bar';
import { installTabBarStyles } from '@tsdi/components/common/tab-bar';
import { DOCUMENT } from '@tsdi/common';
import { GatewayConfigDiff, GatewayConfigHistoryEntry, GatewayMatchPreview, GatewayRouteOptions, GatewayRuntimeSnapshot } from '@tsdi/gateway';
import { WorkflowDefinitionSummary } from '@tsdi/activities/visual';
import { Router, RouterEvent } from '@tsdi/components/router';
import { AdminLocale, adminMessage } from './admin.i18n';
import { AdminPage, redirectToAdminLogin } from './routing';
import { GatewayAdminHttp } from './http';
import { buildSloAlertsCsv, formatAlertTime, validateRouteFields } from './admin.state.pure';
import { AdminConfigController } from './admin.config.controller';
import { AdminRoutesController } from './admin.routes.controller';
import { AdminRulesController } from './admin.rules.controller';

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
    version?: number;
    auth?: { enabled: boolean; mode: 'none' | 'oidc' | 'oauth2' | 'service' };
}

export interface GatewayAdminConfigEntry {
    version: number;
    timestamp: string;
    source?: string;
    actor?: string;
    diff?: GatewayConfigDiff;
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
    configVersion = 0;
    configHistory: GatewayAdminConfigEntry[] = [];
    configHistoryOpen = false;
    configDiff?: GatewayConfigDiff;
    configDiffOpen = false;
    configLoading = false;
    authEnabled = false;
    needsLogin = false;
    /** Set by the routed layout; the rules page calls it to open the designer. */
    openDesigner?: () => Promise<void>;

    private loaded = false;
    private selfRef?: GatewayAdminState;
    private configController?: AdminConfigController;
    private routesController?: AdminRoutesController;
    private rulesController?: AdminRulesController;
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
        installTabBarStyles(documentRef as unknown as Document | undefined);
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

    private config(): AdminConfigController {
        if (!this.configController) {
            this.configController = new AdminConfigController(this.self() as any);
        }
        return this.configController;
    }

    private routesCtl(): AdminRoutesController {
        if (!this.routesController) {
            this.routesController = new AdminRoutesController(this.self() as any);
        }
        return this.routesController;
    }

    private rulesCtl(): AdminRulesController {
        if (!this.rulesController) {
            this.rulesController = new AdminRulesController(this.self() as any);
        }
        return this.rulesController;
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

    get recentSloAlerts() {
        return (this.diagnostics?.alerts ?? []).slice(0, 5);
    }

    formatAlertTime(timestamp: number): string {
        return formatAlertTime(timestamp);
    }

    readonly exportSloAlerts = (): void => {
        const self = this.selfRef ?? this;
        const data = JSON.stringify(self.diagnostics?.alerts ?? [], null, 2);
        const doc = (self.documentRef ?? (globalThis as { document?: Document }).document) as Document | undefined;
        const createUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
        if (doc && createUrl && typeof Blob !== 'undefined') {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = doc.createElement('a');
            link.href = url;
            link.download = 'gateway-slo-alerts.json';
            link.click();
            URL.revokeObjectURL(url);
        }
        self.status = self.t('status.sloExported');
    };

    sloAlertsCsv(): string {
        const alerts = this.selfRef?.diagnostics?.alerts ?? this.diagnostics?.alerts ?? [];
        return buildSloAlertsCsv(alerts);
    }

    readonly exportSloAlertsCsv = (): void => {
        const self = this.selfRef ?? this;
        const csv = self.sloAlertsCsv();
        const doc = (self.documentRef ?? (globalThis as { document?: Document }).document) as Document | undefined;
        const createUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
        if (doc && createUrl && typeof Blob !== 'undefined') {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = doc.createElement('a');
            link.href = url;
            link.download = 'gateway-slo-alerts.csv';
            link.click();
            URL.revokeObjectURL(url);
        }
        self.status = self.t('status.sloExported');
    };

    get routeSloRows() {
        return [...(this.diagnostics?.routes ?? [])]
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 5);
    }

    get bulkheadActive(): number {
        return (this.diagnostics?.bulkheads ?? []).reduce((sum, item) => sum + (item.active ?? 0), 0);
    }

    get bulkheadQueued(): number {
        return (this.diagnostics?.bulkheads ?? []).reduce((sum, item) => sum + (item.queued ?? 0), 0);
    }

    get adaptiveBulkheadCount(): number {
        return (this.diagnostics?.bulkheads ?? []).filter(item => item.adaptive === true).length;
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

    diffFields(diff: GatewayConfigDiff | undefined, kind: 'routes' | 'rules', key: string): string {
        return this.config().diffFields(diff, kind, key);
    }

    diffSummary(entry: GatewayAdminConfigEntry): string {
        return this.config().diffSummary(entry);
    }

    async loadConfig(): Promise<void> {
        await this.config().loadConfig();
    }

    readonly previewConfigChanges = async (): Promise<void> => {
        await this.config().previewConfigChanges();
    };

    readonly closeConfigDiff = (): void => {
        this.config().closeConfigDiff();
    };

    readonly openConfigHistory = async (): Promise<void> => {
        await this.config().openConfigHistory();
    };

    readonly closeConfigHistory = (): void => {
        this.config().closeConfigHistory();
    };

    readonly rollbackConfig = async (version: number): Promise<void> => {
        await this.config().rollbackConfig(version);
    };

    readonly editRules = async (id?: string): Promise<void> => {
        await this.rulesCtl().editRules(id);
    };

    readonly setMatchMethod = (event: Event): void => {
        this.rulesCtl().setMatchMethod(event);
    };

    readonly setMatchPath = (event: Event): void => {
        this.rulesCtl().setMatchPath(event);
    };

    readonly testMatch = async (): Promise<void> => {
        await this.rulesCtl().testMatch();
    };

    readonly newRuleWorkflow = (): void => {
        this.rulesCtl().newRuleWorkflow();
    };

    readonly duplicateRuleWorkflow = async (id: string): Promise<void> => {
        await this.rulesCtl().duplicateRuleWorkflow(id);
    };

    readonly applyRuleWorkflow = async (id: string): Promise<void> => {
        await this.rulesCtl().applyRuleWorkflow(id);
    };

    async loadRuleWorkflows(): Promise<void> {
        await this.rulesCtl().loadRuleWorkflows();
    }

    readonly deleteRuleWorkflow = async (id: string): Promise<void> => {
        await this.rulesCtl().deleteRuleWorkflow(id);
    };

    // Event handlers used inside `v-for` rows are arrow properties: the
    // template binds `this` to the row scope, so they must capture the service.
    readonly toggleRoute = (route: GatewayRouteOptions): void => {
        this.routesCtl().toggleRoute(route);
    };

    readonly moveRoute = (route: GatewayRouteOptions, delta: number): void => {
        this.routesCtl().moveRoute(route, delta);
    };

    readonly duplicateRoute = (route: GatewayRouteOptions): void => {
        this.routesCtl().duplicateRoute(route);
    };

    validateRoute(route: GatewayRouteOptions, index = -1): Record<string, string> {
        return validateRouteFields(route, {
            t: key => this.t(key),
            routes: this.routes,
            index
        });
    }

    validateEditingRoute(): boolean {
        return this.routesCtl().validateEditingRoute();
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
            self.configVersion = state.version ?? 0;
            void self.loadRuleWorkflows();
            void self.loadDiagnostics();
            void self.loadServices();
            self.status = self.t('status.ready', { routes: self.routes.length, rules: self.rules.length });
        } catch (error) {
            self.status = self.t('status.offline');
            self.error = (error as Error).message;
        }
    }

    requireLogin(): void {
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
        this.routesCtl().addRoute();
    }

    readonly editRoute = (route: GatewayRouteOptions): void => {
        this.routesCtl().editRoute(route);
    };

    closeRouteEditor(): void {
        this.routesCtl().closeRouteEditor();
    }

    editRouteSlo(event: Event, field: 'errorRateThreshold' | 'p95ThresholdMs'): void {
        this.routesCtl().editRouteSlo(event, field);
    }

    editRouteField(event: Event): void {
        this.routesCtl().editRouteField(event);
    }

    saveRouteEditor(): void {
        this.routesCtl().saveRouteEditor();
    }

    readonly removeRoute = (route: GatewayRouteOptions): void => {
        this.routesCtl().removeRoute(route);
    };

    async applyRoutes(): Promise<void> {
        await this.routesCtl().applyRoutes();
    }

}
