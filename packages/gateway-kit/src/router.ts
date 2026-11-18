/** Generic HTTP route definitions shared by the agent and microservice gateways. */

export type GatewayHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

export interface GatewayRouteDefinition<THandler = unknown> {
    /** Stable identifier (diagnostics, OpenAPI operationId, capability lists). */
    id?: string;
    method: GatewayHttpMethod | string;
    /** Path pattern such as `/api/sessions/:id`; supports `:param` and `*`. */
    path: string;
    handler: THandler;
    /** `false` keeps the route public; anything else requires the gateway auth guard. */
    auth?: boolean | string;
    /** Explicit priority; higher wins before specificity is considered. */
    priority?: number;
    /** Optional allowed methods when one route handles several (microservice adapters). */
    methods?: string[];
}

export interface GatewayRouteMatch<THandler = unknown> {
    route: GatewayRouteDefinition<THandler>;
    params: Record<string, string>;
}

interface CompiledRoute<THandler> {
    route: GatewayRouteDefinition<THandler>;
    segments: string[];
    specificity: number;
    order: number;
}

function normalizePath(pathname: string): string {
    const value = String(pathname || '/');
    const withoutQuery = value.split('?')[0] || '/';
    return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') || '/' : '/';
}

function splitPath(pathname: string): string[] {
    return normalizePath(pathname).split('/').filter(Boolean);
}

function segmentScore(segment: string): number {
    if (segment === '*' || segment.startsWith('*')) return 1;
    if (segment.startsWith(':')) return 2;
    return 3;
}

/**
 * Compiled route table with specificity matching (static > `:param` > `*`).
 * Ties keep declaration order, so registering a general catch-all after the
 * specific routes behaves intuitively.
 */
export class GatewayRouter<THandler = unknown> {
    private readonly compiled: CompiledRoute<THandler>[] = [];
    private sorted = true;

    get size(): number {
        return this.compiled.length;
    }

    add(route: GatewayRouteDefinition<THandler>): this {
        if (!route || !route.path) {
            return this;
        }
        const segments = splitPath(route.path);
        const specificity = segments.reduce((total, segment) => total + segmentScore(segment), 0) * 10 + segments.length;
        this.compiled.push({ route, segments, specificity, order: this.compiled.length });
        this.sorted = false;
        return this;
    }

    /** Registered route definitions in declaration order. */
    getRoutes(): GatewayRouteDefinition<THandler>[] {
        return this.compiled.map(entry => entry.route);
    }

    addMany(routes: GatewayRouteDefinition<THandler>[]): this {
        for (const route of routes || []) {
            this.add(route);
        }
        return this;
    }

    match(method: string, pathname: string): GatewayRouteMatch<THandler> | null {
        if (!this.sorted) {
            this.compiled.sort((left, right) => {
                const priority = Number(right.route.priority ?? 0) - Number(left.route.priority ?? 0);
                return priority || right.specificity - left.specificity || left.order - right.order;
            });
            this.sorted = true;
        }
        const requestMethod = String(method || 'GET').toUpperCase();
        const parts = splitPath(pathname);
        for (const entry of this.compiled) {
            if (!this.acceptsMethod(entry.route, requestMethod)) {
                continue;
            }
            const params = this.matchSegments(entry.segments, parts);
            if (params) {
                return { route: entry.route, params };
            }
        }
        return null;
    }

    private acceptsMethod(route: GatewayRouteDefinition<THandler>, method: string): boolean {
        if (route.method === '*') {
            return true;
        }
        if (String(route.method).toUpperCase() === method) {
            return true;
        }
        const methods = (route.methods || []).map(item => String(item).toUpperCase());
        return methods.includes(method);
    }

    private matchSegments(pattern: string[], path: string[]): Record<string, string> | null {
        const params: Record<string, string> = {};
        let index = 0;
        for (; index < pattern.length; index++) {
            const expected = pattern[index];
            if (expected === '*') {
                params['*'] = path.slice(index).join('/');
                return params;
            }
            if (expected.startsWith('*')) {
                params[expected.slice(1) || '*'] = path.slice(index).join('/');
                return params;
            }
            const actual = path[index];
            if (actual === undefined) {
                return null;
            }
            if (expected.startsWith(':')) {
                params[expected.slice(1)] = actual;
                continue;
            }
            if (expected !== actual) {
                return null;
            }
        }
        return index === path.length ? params : null;
    }
}
