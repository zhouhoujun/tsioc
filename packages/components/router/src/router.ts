import { EventEmitter } from '@tsdi/components';
import { Inject, Injectable, Injector, Optional, token, Type } from '@tsdi/ioc';

export interface Route {
    path: string;
    component?: Type<any>;
    redirectTo?: string;
    pathMatch?: 'full' | 'prefix';
    children?: Routes;
    data?: Record<string, any>;
    canActivate?: Array<Type<CanActivate> | CanActivateFn>;
}

export type Routes = Route[];

export interface CanActivate {
    canActivate(route: ActivatedRouteSnapshot): boolean | Promise<boolean>;
}

export type CanActivateFn = (route: ActivatedRouteSnapshot) => boolean | Promise<boolean>;

export interface ActivatedRouteSnapshot {
    url: string;
    path: string;
    params: Record<string, string>;
    data: Record<string, any>;
    route: Route;
    children: ActivatedRouteSnapshot[];
}

export type RouterEventType = 'NavigationStart' | 'NavigationEnd' | 'NavigationCancel' | 'NavigationError' | 'RoutesRecognized';

export interface RouterEvent {
    type: RouterEventType;
    url: string;
    previousUrl?: string;
    error?: unknown;
    snapshot?: ActivatedRouteSnapshot;
}

export interface NavigationExtras {
    queryParams?: Record<string, string | number | boolean | null | undefined>;
    fragment?: string;
    replaceUrl?: boolean;
}

export const ROUTES = token<Routes>('ROUTES');
export const ROUTER_INITIAL_URL = token<string>('ROUTER_INITIAL_URL');

function normalizeUrl(url: string): string {
    const value = String(url || '/').trim();
    const hashless = value.split('#')[0];
    const queryless = hashless.split('?')[0];
    const normalized = queryless.startsWith('/') ? queryless : `/${queryless}`;
    return normalized.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

function splitUrl(url: string): string[] {
    const normalized = normalizeUrl(url);
    return normalized === '/' ? [] : normalized.slice(1).split('/').filter(Boolean);
}

function serializeUrl(commands: string | any[], extras?: NavigationExtras): string {
    const parts = (Array.isArray(commands) ? commands : [commands]).map(part => String(part ?? '').trim()).filter(Boolean);
    let url = normalizeUrl(parts.join('/'));
    const query = Object.entries(extras?.queryParams || {})
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    if (query.length) {
        url += `?${query.join('&')}`;
    }
    if (extras?.fragment) {
        url += `#${extras.fragment}`;
    }
    return url;
}

interface RouteMatch {
    snapshot: ActivatedRouteSnapshot;
    consumed: number;
    redirectTo?: string;
    resolvedUrl?: string;
}

@Injectable()
export class Router {
    readonly events = new EventEmitter<RouterEvent>();
    protected routes: Routes = [];
    protected _url = '/';
    protected _activeRoute: ActivatedRouteSnapshot | null = null;
    protected _navigating = false;

    constructor(
        @Optional() @Inject(ROUTES) routes: Routes = [],
        @Optional() @Inject(ROUTER_INITIAL_URL) initialUrl = '/',
        @Optional() injector?: Injector
    ) {
        this.injector = injector;
        this.resetConfig(routes);
        this._url = normalizeUrl(initialUrl);
        const match = this.match(this.routes, splitUrl(this._url));
        this._activeRoute = match?.snapshot || null;
    }

    protected injector?: Injector;

    get url(): string { return this._url; }
    get activeRoute(): ActivatedRouteSnapshot | null { return this._activeRoute; }
    get rootRoute(): ActivatedRouteSnapshot | null { return this._activeRoute; }
    get params(): Record<string, string> { return this.leafRoute()?.params || {}; }
    get data(): Record<string, any> { return this.leafRoute()?.data || {}; }
    get navigating(): boolean { return this._navigating; }

    resetConfig(routes: Routes = []): void {
        this.routes = Array.isArray(routes) ? routes : [];
    }

    async navigate(commands: string | any[], extras?: NavigationExtras): Promise<boolean> {
        return this.navigateByUrl(serializeUrl(commands, extras), extras);
    }

    async navigateByUrl(url: string, extras?: NavigationExtras): Promise<boolean> {
        const target = normalizeUrl(url);
        const requested = String(url || '/').trim();
        const displayUrl = requested.startsWith('/') ? requested : `/${requested}`;
        const previousUrl = this._url;
        if (this._navigating) {
            return false;
        }
        this._navigating = true;
        this.events.emit({ type: 'NavigationStart', url: target, previousUrl });
        try {
            const resolved = await this.resolveUrl(target, 0);
            if (!resolved) {
                this.events.emit({ type: 'NavigationCancel', url: target, previousUrl });
                return false;
            }
            const snapshot = resolved.snapshot;
            this.events.emit({ type: 'RoutesRecognized', url: target, previousUrl, snapshot });
            if (!await this.runGuards(snapshot)) {
                this.events.emit({ type: 'NavigationCancel', url: target, previousUrl, snapshot });
                return false;
            }
            this._url = resolved.resolvedUrl || displayUrl;
            this._activeRoute = snapshot;
            this.events.emit({ type: 'NavigationEnd', url: target, previousUrl, snapshot });
            return true;
        } catch (error) {
            this.events.emit({ type: 'NavigationError', url: target, previousUrl, error });
            return false;
        } finally {
            this._navigating = false;
        }
    }

    isActive(url: string, exact = false): boolean {
        const current = normalizeUrl(this._url);
        const target = normalizeUrl(url);
        return exact ? current === target : current === target || current.startsWith(`${target}/`);
    }

    protected async resolveUrl(url: string, redirects: number): Promise<RouteMatch | undefined> {
        if (redirects > 10) {
            throw new Error('Router redirect loop detected');
        }
        const match = this.match(this.routes, splitUrl(url));
        if (!match) {
            return undefined;
        }
        if (match.redirectTo !== undefined) {
            const redirect = serializeUrl(match.redirectTo);
            this.events.emit({ type: 'NavigationStart', url: redirect, previousUrl: url });
            const next = await this.resolveUrl(redirect, redirects + 1);
            if (next) {
                next.resolvedUrl = next.resolvedUrl || redirect;
            }
            return next;
        }
        return match;
    }

    protected match(routes: Routes, segments: string[], parentUrl = ''): RouteMatch | undefined {
        for (const route of routes) {
            if (!route || typeof route.path !== 'string') {
                continue;
            }
            const path = route.path;
            if (path === '**') {
                const url = parentUrl || '/';
                return {
                    consumed: segments.length,
                    snapshot: {
                        url,
                        path: '**',
                        params: {},
                        data: { ...(route.data || {}) },
                        route,
                        children: []
                    }
                };
            }
            const routeSegments = path === '' ? [] : path.split('/').filter(Boolean);
            if (routeSegments.length > segments.length) {
                continue;
            }
            const params: Record<string, string> = {};
            let matched = true;
            for (let index = 0; index < routeSegments.length; index++) {
                const expected = routeSegments[index];
                const actual = segments[index];
                if (expected.startsWith(':')) {
                    params[expected.slice(1)] = decodeURIComponent(actual);
                } else if (expected !== actual) {
                    matched = false;
                    break;
                }
            }
            if (!matched) {
                continue;
            }
            const remaining = segments.slice(routeSegments.length);
            if (remaining.length && !route.children?.length) {
                continue;
            }
            if (route.pathMatch === 'full' && remaining.length) {
                continue;
            }
            const url = normalizeUrl(`${parentUrl}/${routeSegments.map((segment, index) => segment.startsWith(':') ? segments[index] : segment).join('/')}`);
            if (route.children?.length) {
                const child = this.match(route.children, remaining, url);
                if (child) {
                    return {
                        consumed: segments.length,
                        redirectTo: child.redirectTo,
                        snapshot: {
                            url,
                            path,
                            params,
                            data: { ...(route.data || {}) },
                            route,
                            children: [child.snapshot]
                        }
                    };
                }
            }
            if (remaining.length && route.pathMatch !== 'full') {
                continue;
            }
            return {
                consumed: segments.length,
                redirectTo: route.redirectTo,
                snapshot: {
                    url,
                    path,
                    params,
                    data: { ...(route.data || {}) },
                    route,
                    children: []
                }
            };
        }
        return undefined;
    }

    protected async runGuards(snapshot: ActivatedRouteSnapshot): Promise<boolean> {
        const guards = snapshot.route.canActivate || [];
        for (const guard of guards) {
            const result = await this.invokeGuard(guard, snapshot);
            if (!result) {
                return false;
            }
        }
        for (const child of snapshot.children) {
            if (!await this.runGuards(child)) {
                return false;
            }
        }
        return true;
    }

    protected invokeGuard(guard: Type<CanActivate> | CanActivateFn, snapshot: ActivatedRouteSnapshot): boolean | Promise<boolean> {
        if (guard && typeof (guard as any).prototype?.canActivate === 'function') {
            const instance = this.injector
                ? this.injector.get(guard as Type<CanActivate>)
                : new (guard as Type<CanActivate>)();
            return instance.canActivate(snapshot);
        }
        return (guard as CanActivateFn)(snapshot);
    }

    protected leafRoute(snapshot: ActivatedRouteSnapshot | null = this._activeRoute): ActivatedRouteSnapshot | null {
        if (!snapshot) return null;
        let leaf = snapshot;
        while (leaf.children.length) {
            leaf = leaf.children[leaf.children.length - 1];
        }
        return leaf;
    }
}
