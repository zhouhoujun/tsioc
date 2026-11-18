import { GatewayRouter } from '@tsdi/gateway-kit';
import { GatewayRoute } from '../contracts/GatewayRoute';

interface MatchedRoute {
    route: GatewayRoute;
    params: Record<string, string>;
}

/**
 * Agent gateway route matcher.
 *
 * Matching (specificity, `:param`, `*`, method and explicit priority) is shared
 * with the microservice gateway through `@tsdi/gateway-kit`; this class keeps
 * the historical registration API used by the gateway bootstrap.
 */
export class RouteMatcher {
    private readonly router = new GatewayRouter<GatewayRoute>();

    add(route: GatewayRoute): void {
        this.router.add(route as any);
    }

    addMany(routes: GatewayRoute[]): void {
        this.router.addMany(routes as any);
    }

    getRoutes(): GatewayRoute[] {
        return this.router.getRoutes() as unknown as GatewayRoute[];
    }

    match(method: string, pathname: string): MatchedRoute | null {
        const matched = this.router.match(method, pathname);
        return matched ? { route: matched.route as unknown as GatewayRoute, params: matched.params } : null;
    }
}
