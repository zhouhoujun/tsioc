import { noReact } from '@tsdi/components';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { installMenuBarStyles } from '@tsdi/components/common/menu-bar';
import { installTabBarStyles } from '@tsdi/components/common/tab-bar';
import { DOCUMENT } from '@tsdi/common';
import { GatewayConfigDiff, GatewayConfigHistoryEntry, GatewayMatchPreview, GatewayRouteOptions, GatewayRuntimeSnapshot } from '@tsdi/gateway';
import { WorkflowDefinitionSummary } from '@tsdi/activities/visual';
import { Router } from '@tsdi/components/router';
import { AdminLocale, adminMessage } from './admin.i18n';
import { AdminPage } from './routing';
import { GatewayAdminHttp } from './http';
import { buildSloAlertsCsv, formatAlertTime, validateRouteFields } from './admin.state.pure';
import { AdminConfigController } from './admin.config.controller';
import { AdminRoutesController } from './admin.routes.controller';
import { AdminRulesController } from './admin.rules.controller';
import { AdminRoutesTransferController } from './admin.routes-transfer.controller';
import { AdminDiagnosticsController } from './admin.diagnostics.controller';
import { AdminViewController } from './admin.view.controller';
import { AdminMenuController } from './admin.menu.controller';
import { AdminShellController } from './admin.shell.controller';

/** Structural document view used by the console (keeps decorator metadata DOM-free). */
interface AdminDocumentLike {
    defaultView?: Window | null;
    documentElement?: { setAttribute(name: string, value: string): void } | null;
}

import type { GatewayAdminRuleCondition, GatewayAdminRuleSummary, GatewayAdminApiState, GatewayAdminConfigEntry, GatewayAdminServiceSummary, GatewayAdminServiceEndpoint, GatewayAdminServiceDetail } from './admin.types';
export type { GatewayAdminRuleCondition, GatewayAdminRuleSummary, GatewayAdminApiState, GatewayAdminConfigEntry, GatewayAdminServiceSummary, GatewayAdminServiceEndpoint, GatewayAdminServiceDetail } from './admin.types';

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

    private selfRef?: GatewayAdminState;
    private configController?: AdminConfigController;
    private routesController?: AdminRoutesController;
    private rulesController?: AdminRulesController;
    private routesTransferController?: AdminRoutesTransferController;
    private diagnosticsController?: AdminDiagnosticsController;
    private viewController?: AdminViewController;
    private menuController?: AdminMenuController;
    private shellController?: AdminShellController;

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
        this.shell().init();
    }

    async start(): Promise<void> {
        await this.shell().start();
    }

    destroy(): void {
        this.shell().destroy();
    }

    t(key: string, params?: Record<string, unknown>): string {
        return adminMessage(this.locale, key, params);
    }

    get globalMenuGroups() {
        return this.menu().groups;
    }

    readonly globalMenuSelect = (id: string): void => {
        this.menu().select(id);
    };

    setLocale(locale: AdminLocale): void {
        this.shell().setLocale(locale);
    }

    setTheme(theme: 'light' | 'dark'): void {
        this.shell().setTheme(theme);
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

    private transferCtl(): AdminRoutesTransferController {
        if (!this.routesTransferController) {
            this.routesTransferController = new AdminRoutesTransferController(this.self() as any);
        }
        return this.routesTransferController;
    }

    private diagnosticsCtl(): AdminDiagnosticsController {
        if (!this.diagnosticsController) {
            this.diagnosticsController = new AdminDiagnosticsController(this.self() as any);
        }
        return this.diagnosticsController;
    }

    private view(): AdminViewController {
        if (!this.viewController) {
            this.viewController = new AdminViewController(this.self() as any);
        }
        return this.viewController;
    }

    private shell(): AdminShellController {
        if (!this.shellController) {
            this.shellController = new AdminShellController(this.self() as any);
        }
        return this.shellController;
    }

    private menu(): AdminMenuController {
        if (!this.menuController) {
            this.menuController = new AdminMenuController(this.self() as any);
        }
        return this.menuController;
    }

    get pageTitle(): string { return this.view().pageTitle; }

    get pageSubtitle(): string { return this.view().pageSubtitle; }

    get enabledRoutes(): number { return this.view().enabledRoutes; }

    get filteredRoutes(): GatewayRouteOptions[] {
        return this.view().filteredRoutes;
    }

    readonly setRouteFilter = (event: Event): void => {
        this.view().setRouteFilter(event);
    };

    endpointsFor(name: string): GatewayAdminServiceEndpoint[] {
        return this.view().endpointsFor(name);
    }

    endpointSummary(name: string): string {
        return this.view().endpointSummary(name);
    }

    get dashboardNavClass(): string { return this.view().dashboardNavClass; }

    get routesNavClass(): string { return this.view().routesNavClass; }

    get rulesNavClass(): string { return this.view().rulesNavClass; }

    goDashboard(): void {
        this.shell().navigate('dashboard');
    }

    goRoutes(): void {
        this.shell().navigate('routes');
    }

    goRules(): void {
        this.shell().navigate('rules');
    }

    redirectToLogin(): void {
        this.shell().redirectToLogin();
    }

    searchRoutes(event: Event): void {
        this.view().searchRoutes(event);
    }

    conditionSummary(rule: GatewayAdminRuleSummary): string {
        return this.view().conditionSummary(rule);
    }

    routeMethods(route: GatewayRouteOptions): string {
        return this.view().routeMethods(route);
    }

    ruleActionType(rule: GatewayAdminRuleSummary): string {
        return this.view().ruleActionType(rule);
    }

    ruleActionLabel(rule: GatewayAdminRuleSummary): string {
        return this.view().ruleActionLabel(rule);
    }

    ruleTone(rule: GatewayAdminRuleSummary): string {
        return this.view().ruleTone(rule);
    }

    rulePriority(rule: GatewayAdminRuleSummary): number {
        return this.view().rulePriority(rule);
    }

    ruleConditionCount(rule: GatewayAdminRuleSummary): number {
        return this.view().ruleConditionCount(rule);
    }

    get openCircuitCount(): number {
        return this.view().openCircuitCount;
    }

    get recentSloAlerts() {
        return this.view().recentSloAlerts;
    }

    formatAlertTime(timestamp: number): string {
        return formatAlertTime(timestamp);
    }

    readonly exportSloAlerts = (): void => {
        this.diagnosticsCtl().exportSloAlerts();
    };

    sloAlertsCsv(): string {
        const alerts = this.selfRef?.diagnostics?.alerts ?? this.diagnostics?.alerts ?? [];
        return buildSloAlertsCsv(alerts);
    }

    readonly exportSloAlertsCsv = (): void => {
        this.diagnosticsCtl().exportSloAlertsCsv();
    };

    get routeSloRows() {
        return this.view().routeSloRows;
    }

    get bulkheadActive(): number {
        return this.view().bulkheadActive;
    }

    get bulkheadQueued(): number {
        return this.view().bulkheadQueued;
    }

    get adaptiveBulkheadCount(): number {
        return this.view().adaptiveBulkheadCount;
    }

    async loadServices(): Promise<void> {
        await this.diagnosticsCtl().loadServices();
    }

    async loadDiagnostics(): Promise<void> {
        await this.diagnosticsCtl().loadDiagnostics();
    }

    get routeDetailJson(): string {
        return this.view().routeDetailJson;
    }

    get serviceSummaries(): GatewayAdminServiceSummary[] {
        return this.view().serviceSummaries;
    }

    get policyCounts(): { auth: number; rateLimit: number; circuitBreaker: number; cache: number; mock: number; canary: number } {
        return this.view().policyCounts;
    }

    get policyRows(): Array<{ key: string; label: string; value: number }> {
        return this.view().policyRows;
    }

    get authModeLabel(): string {
        return this.view().authModeLabel;
    }

    readonly openRouteDetail = (route: GatewayRouteOptions): void => {
        this.transferCtl().openRouteDetail(route);
    };

    readonly closeRouteDetail = (): void => {
        this.transferCtl().closeRouteDetail();
    };

    readonly editRouteDetailJson = (): void => {
        this.transferCtl().editRouteDetailJson();
    };

    readonly cancelRouteDetailJson = (): void => {
        this.transferCtl().cancelRouteDetailJson();
    };

    readonly setRouteJson = (event: Event): void => {
        this.transferCtl().setRouteJson(event);
    };

    readonly saveRouteDetailJson = (): void => {
        this.transferCtl().saveRouteDetailJson();
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
        this.transferCtl().openImport();
    };

    readonly closeImport = (): void => {
        this.transferCtl().closeImport();
    };

    readonly setImportText = (event: Event): void => {
        this.transferCtl().setImportText(event);
    };

    readonly exportRoutes = (): void => {
        this.transferCtl().exportRoutes();
    };

    readonly importRoutes = (): void => {
        this.transferCtl().importRoutes();
    };

    readonly resetRoutes = async (): Promise<void> => {
        await this.transferCtl().resetRoutes();
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
