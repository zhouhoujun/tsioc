import { GatewayRouteOptions, ResolvedGatewayRoute } from './gateway.options';

/**
 * A route compiled once per config revision.
 */
export interface CompiledGatewayRoute {
    readonly source: GatewayRouteOptions;
    readonly resolved: ResolvedGatewayRoute;
    readonly methods?: ReadonlySet<string>;
    readonly hosts?: ReadonlySet<string>;
    readonly segments: readonly string[];
    readonly specificity: number;
    readonly index: number;
}

export interface GatewayRouteTableOptions {
    /**
     * config revision the table was compiled from (diagnostics only).
     */
    version?: number;
    /**
     * merge global defaults into a route. Called once per route at compile
     * time, never per request.
     */
    resolve(route: GatewayRouteOptions): ResolvedGatewayRoute;
    /**
     * normalize a route path (query strip + configured prefix handling).
     */
    normalizePath(path: string): string;
}

export interface GatewayRouteMatchRequest {
    /**
     * Request path without query, already normalized by the caller.
     */
    url: string;
    /**
     * Upper-cased HTTP method.
     */
    method: string;
    /**
     * Request host header (may be empty).
     */
    host?: string;
    /**
     * legacy prefix matching (`url.startsWith(route.path)`).
     */
    legacy?: boolean;
    /**
     * Route-level request checks (headers, canary) that need the request.
     */
    accepts?(route: ResolvedGatewayRoute): boolean;
}

interface TrieNode {
    /** routes whose pattern ends exactly at this node */
    routes: CompiledGatewayRoute[];
    /** routes ending with `*` at this node */
    wildcard: CompiledGatewayRoute[];
    statics: Map<string, TrieNode>;
    param?: TrieNode;
}

function createNode(): TrieNode {
    return { routes: [], wildcard: [], statics: new Map() };
}

/**
 * Segment-aware prefix match, implemented with a static/param trie.
 *
 * A route path is a prefix of the request path (so `/api/users` matches
 * `/api/users/profile`) but must align on segment boundaries (so it does not
 * match `/api/users2`). `:name` captures one segment and a trailing `*`
 * matches the remainder.
 */
export class GatewayRouteTable {
    readonly version: number;
    private readonly compiled: CompiledGatewayRoute[] = [];
    private readonly root = createNode();

    private constructor(private readonly options: GatewayRouteTableOptions) {
        this.version = options.version ?? 0;
    }

    static compile(routes: GatewayRouteOptions[], options: GatewayRouteTableOptions): GatewayRouteTable {
        const table = new GatewayRouteTable(options);
        routes.forEach((route, index) => {
            if (!route || route.enabled === false) {
                return;
            }
            const compiled = table.compileRoute(route, index);
            table.compiled.push(compiled);
            table.insert(compiled);
        });
        return table;
    }

    get size(): number {
        return this.compiled.length;
    }

    /**
     * Find the route that handles a request.
     *
     * Segment mode picks the most specific accepted route (static segments
     * beat parameters, longer beats shorter; ties keep declaration order).
     * Legacy mode preserves the historical first-prefix-wins behavior.
     */
    match(request: GatewayRouteMatchRequest): ResolvedGatewayRoute | null {
        const url = request.url || '/';
        if (request.legacy) {
            for (const route of this.compiled) {
                if (!url.startsWith(route.source.path)) {
                    continue;
                }
                if (this.accepts(route, request)) {
                    return route.resolved;
                }
            }
            return null;
        }

        const parts = splitPath(url);
        const candidates: CompiledGatewayRoute[] = [];
        this.collect(this.root, parts, 0, candidates);
        candidates.sort((a, b) => b.specificity - a.specificity || a.index - b.index);
        for (const candidate of candidates) {
            if (this.accepts(candidate, request)) {
                return candidate.resolved;
            }
        }
        return null;
    }

    private compileRoute(route: GatewayRouteOptions, index: number): CompiledGatewayRoute {
        const normalized = this.options.normalizePath(route.path || '/');
        const segments = splitPath(normalized);
        return {
            source: route,
            resolved: this.options.resolve(route),
            methods: route.methods?.length
                ? new Set(route.methods.map(method => method.toUpperCase()))
                : undefined,
            hosts: route.hosts?.length ? new Set(route.hosts) : undefined,
            segments,
            specificity: specificity(segments),
            index
        };
    }

    private insert(route: CompiledGatewayRoute): void {
        let node = this.root;
        for (const segment of route.segments) {
            if (segment === '*') {
                node.wildcard.push(route);
                return;
            }
            if (segment.startsWith(':')) {
                node.param ??= createNode();
                node = node.param;
                continue;
            }
            let child = node.statics.get(segment);
            if (!child) {
                child = createNode();
                node.statics.set(segment, child);
            }
            node = child;
        }
        node.routes.push(route);
    }

    private collect(node: TrieNode, parts: string[], index: number, out: CompiledGatewayRoute[]): void {
        if (node.routes.length) {
            out.push(...node.routes);
        }
        if (node.wildcard.length) {
            out.push(...node.wildcard);
        }
        if (index >= parts.length) {
            return;
        }
        const child = node.statics.get(parts[index]);
        if (child) {
            this.collect(child, parts, index + 1, out);
        }
        if (node.param) {
            this.collect(node.param, parts, index + 1, out);
        }
    }

    private accepts(route: CompiledGatewayRoute, request: GatewayRouteMatchRequest): boolean {
        if (route.methods && !route.methods.has(request.method)) {
            return false;
        }
        if (route.hosts && !route.hosts.has(request.host ?? '')) {
            return false;
        }
        return request.accepts ? request.accepts(route.resolved) : true;
    }
}

function splitPath(path: string): string[] {
    return path.split('/').filter(Boolean);
}

/**
 * Higher is more specific: static segments beat parameters, longer paths beat
 * shorter ones, wildcards are least specific.
 */
function specificity(segments: readonly string[]): number {
    return segments.reduce((score, segment) => {
        if (segment === '*') {
            return score + 1;
        }
        if (segment.startsWith(':')) {
            return score + 10;
        }
        return score + 100 + segment.length;
    }, 0);
}
