import { GatewayRouteOptions } from '@tsdi/gateway';
import { GatewayAdminHttp } from './http';
import { validateRouteFields } from './admin.state.pure';

/**
 * Host contract implemented by `GatewayAdminState` (the reactive proxy).
 */
export interface AdminRoutesHost {
    http?: GatewayAdminHttp;
    routes: GatewayRouteOptions[];
    services: string[];
    configVersion: number;
    editingRoute: GatewayRouteOptions;
    editingIndex: number;
    routeEditorOpen: boolean;
    routeErrors: Record<string, string>;
    routesDirty: boolean;
    error: string;
    status: string;
    t(key: string, params?: Record<string, unknown>): string;
    requireLogin(): void;
}

/**
 * Route staging/editor controller: list operations, drawer form fields,
 * validation and applying staged routes.
 *
 * Extracted from `GatewayAdminState`; writes through the reactive host so
 * template bindings keep updating.
 */
export class AdminRoutesController {
    constructor(private readonly host: AdminRoutesHost) { }

    toggleRoute(route: GatewayRouteOptions): void {
        const self = this.host;
        self.routes = self.routes.map(item => item === route
            ? { ...item, enabled: item.enabled === false }
            : item);
        self.routesDirty = true;
        self.status = self.t('status.routeToggled', {
            path: route.path,
            state: route.enabled === false ? self.t('status.enabled') : self.t('status.disabled')
        });
    }

    moveRoute(route: GatewayRouteOptions, delta: number): void {
        const self = this.host;
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
    }

    duplicateRoute(route: GatewayRouteOptions): void {
        const self = this.host;
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
    }

    addRoute(): void {
        const self = this.host;
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
        const self = this.host;
        self.editingIndex = self.routes.indexOf(route);
        self.editingRoute = { ...route };
        self.routeEditorOpen = true;
    }

    closeRouteEditor(): void {
        const self = this.host;
        self.routeEditorOpen = false;
        self.editingRoute = {} as GatewayRouteOptions;
        self.editingIndex = -1;
        self.routeErrors = {};
    }

    editRouteSlo(event: Event, field: 'errorRateThreshold' | 'p95ThresholdMs'): void {
        const self = this.host;
        const value = (event.target as HTMLInputElement).value.trim();
        const slo: Record<string, number> = { ...(self.editingRoute.slo as any ?? {}) };
        if (!value) {
            delete slo[field];
        } else {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) {
                slo[field] = numeric;
            }
        }
        self.editingRoute = {
            ...self.editingRoute,
            slo: Object.keys(slo).length ? slo as any : undefined
        };
    }

    editRouteField(event: Event): void {
        const self = this.host;
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

    validateEditingRoute(): boolean {
        const self = this.host;
        const errors = validateRouteFields(self.editingRoute, {
            t: key => self.t(key),
            routes: self.routes,
            index: self.editingIndex
        });
        self.routeErrors = errors;
        const first = Object.values(errors)[0];
        if (first) {
            self.error = first;
            return false;
        }
        self.error = '';
        return true;
    }

    saveRouteEditor(): void {
        const self = this.host;
        if (!this.validateEditingRoute()) {
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
        this.closeRouteEditor();
        self.routesDirty = true;
        self.status = self.t('status.routeStaged', { count: self.routes.length });
    }

    removeRoute(route: GatewayRouteOptions): void {
        const self = this.host;
        self.routes = self.routes.filter(item => item !== route);
        self.routesDirty = true;
        self.status = self.t('status.routeRemoved', { count: self.routes.length });
    }

    async applyRoutes(): Promise<void> {
        const self = this.host;
        self.error = '';
        try {
            if (!self.http) {
                throw new Error('Gateway admin HTTP client is unavailable');
            }
            const response = await self.http.updateRoutes(self.routes, self.configVersion);
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (response.status === 409) {
                throw new Error(self.t('error.configConflict'));
            }
            if (!response.ok) {
                throw new Error(self.t('error.applyRoutes', { status: response.status }));
            }
            const state = response.body as any;
            self.routes = (state.routes ?? []).map((route: GatewayRouteOptions) => ({ ...route }));
            self.services = state.services ?? [];
            self.configVersion = state.version ?? self.configVersion;
            self.routesDirty = false;
            self.status = self.t('status.routesApplied', { count: self.routes.length });
        } catch (error) {
            self.error = (error as Error).message;
        }
    }
}
