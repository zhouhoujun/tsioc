import { Injector, isRegExp } from '@tsdi/ioc';
import { getServiceRouterToken } from '../tokens';
import { ServiceConfig } from '../options';
import { Route } from './route';
import { Router } from './router';

type SubscribeRoute = Route & { subscribe?: boolean };

export function getSubscribeRouter(config: ServiceConfig, injector: Injector): Router | null {
    return injector.get(getServiceRouterToken(config), null as Router | null);
}

export function getSubscribeRoutes(config: ServiceConfig, injector: Injector): Route[] {
    const router = getSubscribeRouter(config, injector);
    if (!router?.routes?.length) {
        return [];
    }

    return (router.routes as SubscribeRoute[]).filter(route => !!route.subscribe && !isRegExp(route.pattern));
}

export function getSubscribePatterns(config: ServiceConfig, injector: Injector): string[] {
    const router = getSubscribeRouter(config, injector);
    if (!router) {
        return [];
    }
    const seen = new Set<string>();

    return getSubscribeRoutes(config, injector)
        .map(route => formatSubscribePattern(route, router))
        .filter((pattern): pattern is string => !!pattern)
        .filter(pattern => {
            if (seen.has(pattern)) {
                return false;
            }
            seen.add(pattern);
            return true;
        });
}

export function formatSubscribePattern(route: Route, router: Router): string | undefined {
    const pattern = route.pattern;
    if (pattern == null || isRegExp(pattern)) {
        return undefined;
    }
    return router.formatter.format(pattern);
}

export function mergeSubscribePatterns(explicit: string[] | undefined, discovered: string[], fallback?: string[]): string[] {
    const merged = new Set<string>();

    explicit?.forEach(item => item && merged.add(item));
    discovered.forEach(item => item && merged.add(item));

    if (!merged.size && fallback?.length) {
        fallback.forEach(item => item && merged.add(item));
    }

    return Array.from(merged.values());
}
