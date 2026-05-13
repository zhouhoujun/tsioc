import { HttpMethod, GatewayRoute } from '../contracts/GatewayRoute';

interface MatchedRoute {
    route: GatewayRoute;
    params: Record<string, string>;
}

/**
 * Path pattern matching with :param and * wildcard support.
 */
export class RouteMatcher {
    private readonly routes: GatewayRoute[] = [];

    add(route: GatewayRoute): void {
        this.routes.push(route);
    }

    addMany(routes: GatewayRoute[]): void {
        for (const r of routes) this.routes.push(r);
    }

    match(method: string, pathname: string): MatchedRoute | null {
        const normalized = pathname.replace(/\/$/, '') || '/';
        // Try exact match first, then pattern match
        for (const route of this.routes) {
            if (route.method !== method.toUpperCase()) continue;
            const result = this.matchPath(route.path, normalized);
            if (result) return { route, params: result };
        }
        return null;
    }

    private matchPath(pattern: string, pathname: string): Record<string, string> | null {
        if (pattern === '/*') return {}; // catch-all

        const patternParts = pattern.split('/');
        const pathParts = pathname.split('/');

        if (patternParts.length !== pathParts.length && !pattern.includes('*')) return null;

        const params: Record<string, string> = {};

        for (let i = 0; i < patternParts.length; i++) {
            const pp = patternParts[i];
            const pv = pathParts[i];

            if (pp === '*') {
                params['*'] = pathParts.slice(i).join('/');
                return params;
            }
            if (pp.startsWith(':')) {
                params[pp.slice(1)] = pv;
            } else if (pp !== pv) {
                return null;
            }
        }

        return params;
    }

    getRoutes(): GatewayRoute[] {
        return [...this.routes];
    }
}
