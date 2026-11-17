/**
 * Derived view state for the gateway admin console.
 *
 * Every member reads through the reactive host proxy, so template bindings
 * keep tracking the same properties they did when this logic lived on
 * `GatewayAdminState`.
 */
export class AdminViewController {
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

    get enabledRoutes(): number {
        return this.host.routes.filter((route: any) => route.enabled !== false).length;
    }

    get filteredRoutes(): any[] {
        const query = String(this.host.routeQuery || '').trim().toLowerCase();
        let list = this.host.routes;
        if (this.host.routeFilter === 'enabled') {
            list = list.filter((route: any) => route.enabled !== false);
        } else if (this.host.routeFilter === 'disabled') {
            list = list.filter((route: any) => route.enabled === false);
        }
        if (!query) {
            return list;
        }
        return list.filter((route: any) => [route.path, route.service, route.targetUrl, route.targetPath]
            .some((value: any) => String(value || '').toLowerCase().includes(query)));
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

    get openCircuitCount(): number {
        return this.host.diagnostics?.circuits?.filter((circuit: any) => circuit.open).length ?? 0;
    }

    get recentSloAlerts(): any[] {
        return (this.host.diagnostics?.alerts ?? []).slice(0, 5);
    }

    get routeSloRows(): any[] {
        return [...(this.host.diagnostics?.routes ?? [])]
            .sort((a: any, b: any) => b.requests - a.requests)
            .slice(0, 5);
    }

    get bulkheadActive(): number {
        return (this.host.diagnostics?.bulkheads ?? []).reduce((sum: number, item: any) => sum + (item.active ?? 0), 0);
    }

    get bulkheadQueued(): number {
        return (this.host.diagnostics?.bulkheads ?? []).reduce((sum: number, item: any) => sum + (item.queued ?? 0), 0);
    }

    get adaptiveBulkheadCount(): number {
        return (this.host.diagnostics?.bulkheads ?? []).filter((item: any) => item.adaptive === true).length;
    }

    get routeDetailJson(): string {
        if (!this.host.routeDetail) {
            return '';
        }
        return JSON.stringify(this.host.routeDetail, null, 2);
    }

    get serviceSummaries(): any[] {
        const byService = new Map<string, any>();
        this.host.routes.forEach((route: any) => {
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
        return this.host.routes.reduce((counts: any, route: any) => {
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
            { key: 'auth', label: this.host.t('policy.auth'), value: counts.auth },
            { key: 'rateLimit', label: this.host.t('policy.rateLimit'), value: counts.rateLimit },
            { key: 'circuitBreaker', label: this.host.t('policy.circuitBreaker'), value: counts.circuitBreaker },
            { key: 'cache', label: this.host.t('policy.cache'), value: counts.cache },
            { key: 'mock', label: this.host.t('policy.mock'), value: counts.mock },
            { key: 'canary', label: this.host.t('policy.canary'), value: counts.canary }
        ];
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
