/**
 * Derived view state for the gateway admin console.
 *
 * Every member reads through the reactive host proxy, so template bindings
 * keep tracking the same properties they did when this logic lived on
 * `GatewayAdminState`.
 */
export class AdminViewController {
    /**
     * Derived collections are cached by source reference. The admin state
     * replaces arrays/objects on every mutation (never `push`/`splice` on a
     * bound array), so identity checks are a safe invalidation key and avoid
     * recomputing `filter`/`sort`/`Map` work for each template binding.
     */
    private routesCache?: {
        routes: any;
        query: string;
        filter: string;
        filtered: any[];
    };
    private enabledCache?: { routes: any; count: number };
    private summaryCache?: {
        routes: any;
        serviceSummaries: any[];
        policyCounts: any;
    };
    private policyRowsCache?: { routes: any; locale: string; rows: Array<{ key: string; label: string; value: number }> };
    private diagnosticsCache?: {
        diagnostics: any;
        recentSloAlerts: any[];
        routeSloRows: any[];
        openCircuitCount: number;
        bulkheadActive: number;
        bulkheadQueued: number;
        adaptiveBulkheadCount: number;
    };
    private routeDetailCache?: { detail: any; json: string };

    constructor(private readonly host: any) { }

    get pageTitle(): string {
        switch (this.host.page) {
            case 'routes': return this.host.t('page.routes.title');
            case 'rules': return this.host.t('page.rules.title');
            case 'not-found': return this.host.t('page.notFound.title');
            default: return this.host.t('page.overview.title');
        }
    }

    get pageSubtitle(): string {
        switch (this.host.page) {
            case 'routes': return this.host.t('page.routes.subtitle');
            case 'rules': return this.host.t('page.rules.subtitle');
            case 'not-found': return this.host.t('page.notFound.subtitle');
            default: return this.host.t('page.overview.subtitle');
        }
    }

    private routesView(): { filtered: any[] } {
        const routes = this.host.routes;
        const query = String(this.host.routeQuery || '').trim().toLowerCase();
        const filter = this.host.routeFilter;
        const cache = this.routesCache;
        if (cache && cache.routes === routes && cache.query === query && cache.filter === filter) {
            return cache;
        }
        let list = routes;
        if (filter === 'enabled') {
            list = list.filter((route: any) => route.enabled !== false);
        } else if (filter === 'disabled') {
            list = list.filter((route: any) => route.enabled === false);
        }
        const filtered = !query
            ? list
            : list.filter((route: any) => [route.path, route.service, route.targetUrl, route.targetPath]
                .some((value: any) => String(value || '').toLowerCase().includes(query)));
        this.routesCache = { routes, query, filter, filtered };
        return this.routesCache;
    }

    get enabledRoutes(): number {
        const routes = this.host.routes;
        const cache = this.enabledCache;
        if (cache && cache.routes === routes) {
            return cache.count;
        }
        const count = routes.filter((route: any) => route.enabled !== false).length;
        this.enabledCache = { routes, count };
        return count;
    }

    get filteredRoutes(): any[] {
        return this.routesView().filtered;
    }

    setRouteFilter(event: Event): void {
        const value = String((event.target as HTMLSelectElement).value);
        this.host.routeFilter = value === 'enabled' || value === 'disabled' ? value : 'all';
    }

    endpointsFor(name: string): any[] {
        return this.host.serviceDetails.find((service: any) => service.name === name)?.endpoints ?? [];
    }

    endpointSummary(name: string): string {
        return this.endpointsFor(name).map((endpoint: any) => endpoint.address).join(', ');
    }

    get dashboardNavClass(): string {
        return `ga-nav-item${this.host.page === 'dashboard' ? ' is-active' : ''}`;
    }

    get routesNavClass(): string {
        return `ga-nav-item${this.host.page === 'routes' ? ' is-active' : ''}`;
    }

    get rulesNavClass(): string {
        return `ga-nav-item${this.host.page === 'rules' ? ' is-active' : ''}`;
    }

    searchRoutes(event: Event): void {
        this.host.routeQuery = (event.target as HTMLInputElement).value;
    }

    conditionSummary(rule: any): string {
        const when = rule?.when ?? [];
        if (!when.length) {
            return this.host.t('rules.matchesEvery');
        }
        return when.map((condition: any) => [
            condition.field,
            condition.name ? `(${condition.name})` : '',
            condition.operator || 'equals',
            condition.value ?? ''
        ].filter(Boolean).join(' ')).join(' · ');
    }

    routeMethods(route: any): string {
        return (route.methods ?? []).join(', ');
    }

    ruleActionType(rule: any): string {
        return rule?.action?.type || 'route';
    }

    ruleActionLabel(rule: any): string {
        return this.host.t(this.ruleActionType(rule) === 'deny' ? 'rule.deny' : 'rule.route');
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

    private diagnosticsView(): NonNullable<AdminViewController['diagnosticsCache']> {
        const diagnostics = this.host.diagnostics;
        const cache = this.diagnosticsCache;
        if (cache && cache.diagnostics === diagnostics) {
            return cache;
        }
        const circuits = diagnostics?.circuits ?? [];
        const alerts = diagnostics?.alerts ?? [];
        const buckets = diagnostics?.bulkheads ?? [];
        this.diagnosticsCache = {
            diagnostics,
            recentSloAlerts: alerts.slice(0, 5),
            routeSloRows: [...(diagnostics?.routes ?? [])]
                .sort((a: any, b: any) => b.requests - a.requests)
                .slice(0, 5),
            openCircuitCount: circuits.filter((circuit: any) => circuit.open).length,
            bulkheadActive: buckets.reduce((sum: number, item: any) => sum + (item.active ?? 0), 0),
            bulkheadQueued: buckets.reduce((sum: number, item: any) => sum + (item.queued ?? 0), 0),
            adaptiveBulkheadCount: buckets.filter((item: any) => item.adaptive === true).length
        };
        return this.diagnosticsCache;
    }

    get openCircuitCount(): number {
        return this.diagnosticsView().openCircuitCount;
    }

    get recentSloAlerts(): any[] {
        return this.diagnosticsView().recentSloAlerts;
    }

    get routeSloRows(): any[] {
        return this.diagnosticsView().routeSloRows;
    }

    get bulkheadActive(): number {
        return this.diagnosticsView().bulkheadActive;
    }

    get bulkheadQueued(): number {
        return this.diagnosticsView().bulkheadQueued;
    }

    get adaptiveBulkheadCount(): number {
        return this.diagnosticsView().adaptiveBulkheadCount;
    }

    get routeDetailJson(): string {
        const detail = this.host.routeDetail;
        if (!detail) {
            return '';
        }
        const cache = this.routeDetailCache;
        if (cache && cache.detail === detail) {
            return cache.json;
        }
        const json = JSON.stringify(detail, null, 2);
        this.routeDetailCache = { detail, json };
        return json;
    }

    private summaryView(): { serviceSummaries: any[]; policyCounts: any } {
        const routes = this.host.routes;
        const cache = this.summaryCache;
        if (cache && cache.routes === routes) {
            return cache;
        }
        const serviceSummaries = this.buildServiceSummaries(routes);
        const policyCounts = this.buildPolicyCounts(routes);
        this.summaryCache = { routes, serviceSummaries, policyCounts };
        return this.summaryCache;
    }

    get serviceSummaries(): any[] {
        return this.summaryView().serviceSummaries;
    }

    private buildServiceSummaries(routes: any[]): any[] {
        const byService = new Map<string, any>();
        routes.forEach((route: any) => {
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
        return this.summaryView().policyCounts;
    }

    private buildPolicyCounts(routes: any[]): { auth: number; rateLimit: number; circuitBreaker: number; cache: number; mock: number; canary: number } {
        return routes.reduce((counts: any, route: any) => {
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
        const locale = this.host.locale;
        const cache = this.policyRowsCache;
        if (cache && cache.routes === this.host.routes && cache.locale === locale) {
            return cache.rows;
        }
        const rows = [
            { key: 'auth', label: this.host.t('policy.auth'), value: counts.auth },
            { key: 'rateLimit', label: this.host.t('policy.rateLimit'), value: counts.rateLimit },
            { key: 'circuitBreaker', label: this.host.t('policy.circuitBreaker'), value: counts.circuitBreaker },
            { key: 'cache', label: this.host.t('policy.cache'), value: counts.cache },
            { key: 'mock', label: this.host.t('policy.mock'), value: counts.mock },
            { key: 'canary', label: this.host.t('policy.canary'), value: counts.canary }
        ];
        this.policyRowsCache = { routes: this.host.routes, locale, rows };
        return rows;
    }

    get authModeLabel(): string {
        switch (this.host.authMode) {
            case 'oidc': return this.host.t('auth.oidc');
            case 'oauth2': return this.host.t('auth.oauth2');
            case 'service': return this.host.t('auth.service');
            default: return this.host.t('auth.none');
        }
    }
}
