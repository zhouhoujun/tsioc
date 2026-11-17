import { GatewayRouteOptions } from '@tsdi/gateway';
import { GatewayAdminHttp } from './http';

interface AdminDocumentLike {
    defaultView?: { document?: Document } | null;
    createElement?: (tag: string) => any;
}

/**
 * Host contract implemented by `GatewayAdminState` (the reactive proxy).
 */
export interface AdminRoutesTransferHost {
    http?: GatewayAdminHttp;
    routes: GatewayRouteOptions[];
    routeDetail?: GatewayRouteOptions;
    routeDetailIndex: number;
    routeJsonOpen: boolean;
    routeJsonText: string;
    routeJsonError: string;
    importOpen: boolean;
    importText: string;
    importError: string;
    routesDirty: boolean;
    status: string;
    error: string;
    documentRef?: AdminDocumentLike;
    t(key: string, params?: Record<string, unknown>): string;
    validateRoute(route: GatewayRouteOptions, index?: number): Record<string, string>;
    requireLogin(): void;
    reload(): Promise<void>;
}

/**
 * Route detail drawer, JSON editing, import/export and reset controller.
 *
 * Extracted from `GatewayAdminState`; the reactive host keeps bindings live.
 */
export class AdminRoutesTransferController {
    constructor(private readonly host: AdminRoutesTransferHost) { }

    openRouteDetail(route: GatewayRouteOptions): void {
        const self = this.host;
        self.routeDetail = { ...route };
        self.routeDetailIndex = self.routes.indexOf(route);
        self.routeJsonOpen = false;
        self.routeJsonError = '';
    }

    closeRouteDetail(): void {
        const self = this.host;
        self.routeDetail = undefined;
        self.routeDetailIndex = -1;
        self.routeJsonOpen = false;
        self.routeJsonText = '';
        self.routeJsonError = '';
    }

    editRouteDetailJson(): void {
        const self = this.host;
        self.routeJsonText = JSON.stringify(self.routeDetail ?? {}, null, 2);
        self.routeJsonOpen = true;
        self.routeJsonError = '';
    }

    cancelRouteDetailJson(): void {
        const self = this.host;
        self.routeJsonOpen = false;
        self.routeJsonError = '';
    }

    setRouteJson(event: Event): void {
        this.host.routeJsonText = (event.target as HTMLTextAreaElement).value;
    }

    saveRouteDetailJson(): void {
        const self = this.host;
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
        this.closeRouteDetail();
        self.status = self.t('status.routeStaged', { count: self.routes.length });
    }

    openImport(): void {
        const self = this.host;
        self.importOpen = true;
        self.importError = '';
    }

    closeImport(): void {
        const self = this.host;
        self.importOpen = false;
        self.importText = '';
        self.importError = '';
    }

    setImportText(event: Event): void {
        this.host.importText = (event.target as HTMLTextAreaElement).value;
    }

    exportRoutes(): void {
        const self = this.host;
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
    }

    importRoutes(): void {
        const self = this.host;
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
        this.closeImport();
        self.status = self.t('status.routesImported', { count: self.routes.length });
    }

    async resetRoutes(): Promise<void> {
        const self = this.host;
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
    }
}
