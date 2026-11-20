import { Route, Routes } from './route';

export interface RouteConflict {
    /** Normalized path/pattern shared by the conflicting routes. */
    path: string;
    /** Request method key, `*` when unrestricted. */
    method: string;
    routes: readonly Route[];
}

export interface CompiledRouteSnapshot {
    revision: number;
    routes: readonly Route[];
    conflicts: readonly RouteConflict[];
}

function pathSpecificity(path: string): number {
    return String(path || '')
        .split(/[/.]/)
        .filter(Boolean)
        .reduce((score, segment) => {
            if (segment === '*' || segment === '#' || segment === '+' || segment === '?' || segment === '>') {
                return score + 1;
            }
            if (segment.startsWith(':') || segment.startsWith('${')) {
                return score + 10;
            }
            return score + 100 + segment.length;
        }, 0);
}

/**
 * Explicit priority wins, then longer/static paths, then declaration order.
 */
export function compareRoutes(left: Route, right: Route): number {
    const priority = (right.priority ?? 0) - (left.priority ?? 0);
    if (priority !== 0) {
        return priority;
    }
    return pathSpecificity(right.path) - pathSpecificity(left.path);
}

function methodKey(route: Route): string {
    if (!route.method) {
        return '*';
    }
    return Array.isArray(route.method)
        ? route.method.map(method => String(method).toUpperCase()).sort().join(',')
        : String(route.method).toUpperCase();
}

function routeKey(route: Route): string {
    const pattern = route.pattern instanceof RegExp ? route.pattern.source : String(route.pattern ?? route.path);
    return `${methodKey(route)}\u0000${pattern}`;
}

/**
 * Immutable, revision-scoped view over a route list.
 *
 * Matching continues to use the incremental trie in `OptimizedRouter`; this
 * table provides deterministic ordering, snapshots and conflict diagnostics
 * without mutating matcher state.
 */
export class CompiledRouteTable {
    readonly routes: readonly Route[];
    readonly conflicts: readonly RouteConflict[];

    constructor(routes: Routes, readonly revision: number) {
        const indexed = routes.map((route, index) => ({ route, index }));
        indexed.sort((left, right) => compareRoutes(left.route, right.route) || left.index - right.index);
        this.routes = indexed.map(item => item.route);

        const groups = new Map<string, Route[]>();
        indexed.forEach(({ route }) => {
            const key = routeKey(route);
            const list = groups.get(key);
            if (list) {
                list.push(route);
            } else {
                groups.set(key, [route]);
            }
        });
        const conflicts: RouteConflict[] = [];
        groups.forEach((group, key) => {
            if (group.length < 2) {
                return;
            }
            const [method, path] = key.split('\u0000');
            conflicts.push({ method, path, routes: group });
        });
        this.conflicts = conflicts;
    }

    snapshot(): CompiledRouteSnapshot {
        return {
            revision: this.revision,
            routes: this.routes,
            conflicts: this.conflicts
        };
    }
}
