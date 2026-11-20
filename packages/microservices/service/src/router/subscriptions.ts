import { Injector, isDefined, isRegExp } from '@tsdi/ioc';
import { getServiceRouterToken } from '../tokens';
import { ServiceConfig } from '../options';
import { Route } from './route';
import { Router } from './router';
import { Pattern } from '@tsdi/common';

type SubscribeRoute = Route & { subscribe?: boolean };

export function getSubscribeRouter(config: ServiceConfig, injector: Injector): Router | null {
    return injector.get(getServiceRouterToken(config), null as Router | null);
}

export function getSubscribeRoutes(config: ServiceConfig, injector: Injector): Route[] {
    const router = getSubscribeRouter(config, injector);
    if (!router?.routes?.length) {
        return [];
    }

    return (router.routes as SubscribeRoute[]).filter(route => {
        const source = getSubscribeSource(route);
        if (isRegExp(source)) {
            return false;
        }
        if (route.subscribe === true) {
            return true;
        }
        if (route.subscribe === false) {
            return false;
        }
        // Topic-based microservice handlers (@Handle) also need broker subscriptions.
        return !route.method;
    });
}

const subscribePatternCache = new WeakMap<Router, { revision: number; patterns: string[] }>();

export function getSubscribePatterns(config: ServiceConfig, injector: Injector): string[] {
    const router = getSubscribeRouter(config, injector);
    if (!router) {
        return [];
    }
    const revision = (router as any).revision as number | undefined;
    if (typeof revision === 'number') {
        const cached = subscribePatternCache.get(router);
        if (cached?.revision === revision) {
            return cached.patterns.slice();
        }
    }
    const seen = new Set<string>();
    const patterns = getSubscribeRoutes(config, injector)
        .map(route => formatSubscribePattern(route, router))
        .filter((pattern): pattern is string => !!pattern)
        .filter(pattern => {
            if (seen.has(pattern)) {
                return false;
            }
            seen.add(pattern);
            return true;
        });
    if (typeof revision === 'number') {
        subscribePatternCache.set(router, { revision, patterns: patterns.slice() });
    }
    return patterns;
}

export function formatSubscribePattern(route: Route, router: Router): string | undefined {
    const pattern = getSubscribeSource(route);
    if (pattern == null || isRegExp(pattern)) {
        return undefined;
    }
    return router.formatter.format(pattern);
}

export function getSubscribeSource(route: Route): Pattern | undefined {
    return isDefined(route.pattern) ? route.pattern ?? undefined : route.path;
}

/**
 * Watch route-table revisions and coalesce subscription updates per tick.
 * The callback receives the full desired pattern set; transport servers apply
 * a diff against their current broker subscriptions.
 */
export function watchSubscribePatterns(
    config: ServiceConfig,
    injector: Injector,
    listener: (patterns: string[]) => void
): () => void {
    const router = getSubscribeRouter(config, injector);
    const changes = (router as any)?.changes as { subscribe?: (next: () => void) => { unsubscribe(): void } } | undefined;
    if (!changes?.subscribe) {
        return () => undefined;
    }
    let scheduled = false;
    const subscription = changes.subscribe(() => {
        if (scheduled) {
            return;
        }
        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            try {
                listener(getSubscribePatterns(config, injector));
            } catch {
                // Broker sync failures are logged by the transport adapter.
            }
        });
    });
    return () => subscription.unsubscribe();
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
