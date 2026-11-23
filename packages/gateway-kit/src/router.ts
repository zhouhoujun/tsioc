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
    /**
     * 'exact' (default) requires the whole path to match; 'prefix' lets a route
     * match when all of its segments are consumed (microservice route table).
     */
    matchMode?: 'exact' | 'prefix';
    /** Optional request host allowlist (microservice canary/host rules). */
    hosts?: string[];
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
    /** Position in the priority-sorted list; used to keep candidate order stable. */
    rank: number;
    /** Cached upper-case method allowlist (rebuilt when `route.methods` changes). */
    methods?: Set<string>;
    methodsSource?: string[];
}

interface TrieNode<THandler> {
    statics: Map<string, TrieNode<THandler>>;
    param?: TrieNode<THandler>;
    wildcards: CompiledRoute<THandler>[];
    routes: CompiledRoute<THandler>[];
}

function createNode<THandler>(): TrieNode<THandler> {
    return { statics: new Map(), wildcards: [], routes: [] };
}

function normalizePath(pathname: string): string {
    let value = String(pathname || '/');
    const query = value.indexOf('?');
    if (query >= 0) {
        value = value.slice(0, query);
    }
    if (!value) {
        return '/';
    }
    if (value.length > 1 && value.charCodeAt(value.length - 1) === 47) {
        let end = value.length;
        while (end > 1 && value.charCodeAt(end - 1) === 47) {
            end--;
        }
        value = value.slice(0, end);
    }
    return value;
}

function splitPath(pathname: string): string[] {
    const value = normalizePath(pathname);
    if (value === '/') {
        return [];
    }
    const parts = (value.charCodeAt(0) === 47 ? value.slice(1) : value).split('/');
    return parts.indexOf('') === -1 ? parts : parts.filter(Boolean);
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
 *
 * Routes are compiled into a segment trie once per `add` batch; matching only
 * walks the branches reachable from the request path instead of scanning every
 * registered route.
 */
export class GatewayRouter<THandler = unknown> {
    private readonly compiled: CompiledRoute<THandler>[] = [];
    private root: TrieNode<THandler> = createNode();
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
        this.compiled.push({
            route,
            segments,
            specificity,
            order: this.compiled.length,
            rank: this.compiled.length
        });
        this.sorted = false;
        return this;
    }

    /** Registered route definitions in declaration order. */
    getRoutes(): GatewayRouteDefinition<THandler>[] {
        // `compiled` is sorted by priority during `match`; restore the original
        // declaration order for diagnostics/OpenAPI.
        return this.compiled
            .slice()
            .sort((left, right) => left.order - right.order)
            .map(entry => entry.route);
    }

    addMany(routes: GatewayRouteDefinition<THandler>[]): this {
        for (const route of routes || []) {
            this.add(route);
        }
        return this;
    }

    match(
        method: string,
        pathname: string,
        request: { host?: string; accept?: (route: GatewayRouteDefinition<THandler>) => boolean } = {}
    ): GatewayRouteMatch<THandler> | null {
        if (!this.sorted) {
            this.rebuild();
        }
        const requestMethod = String(method || 'GET').toUpperCase();
        const parts = splitPath(pathname);
        const candidates: CompiledRoute<THandler>[] = [];
        this.collect(this.root, parts, 0, candidates);
        if (candidates.length > 1) {
            candidates.sort((left, right) => left.rank - right.rank);
        }
        for (const entry of candidates) {
            if (!this.acceptsMethod(entry, requestMethod)) {
                continue;
            }
            if (entry.route.hosts?.length && request.host !== undefined && !entry.route.hosts.includes(request.host)) {
                continue;
            }
            if (request.accept && !request.accept(entry.route)) {
                continue;
            }
            const params = this.matchSegments(entry.segments, parts, entry.route.matchMode === 'prefix');
            if (params) {
                return { route: entry.route, params };
            }
        }
        return null;
    }

    /**
     * Sort by priority once, then build the segment trie. `rank` records the
     * global order so candidates collected from different branches can be
     * merged deterministically.
     */
    private rebuild(): void {
        this.compiled.sort((left, right) => {
            // An explicit priority replaces the computed specificity (the
            // microservice table passes its own score for parity).
            const leftScore = left.route.priority ?? left.specificity;
            const rightScore = right.route.priority ?? right.specificity;
            return (rightScore - leftScore) || (left.order - right.order);
        });
        this.root = createNode();
        for (let rank = 0; rank < this.compiled.length; rank++) {
            const entry = this.compiled[rank];
            entry.rank = rank;
            this.insert(entry);
        }
        this.sorted = true;
    }

    private insert(entry: CompiledRoute<THandler>): void {
        let node = this.root;
        for (const segment of entry.segments) {
            if (segment === '*' || segment.startsWith('*')) {
                node.wildcards.push(entry);
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
        node.routes.push(entry);
    }

    /**
     * Walk the request path through the trie. Terminals at every reached depth
     * are candidates: prefix routes may consume less than the request path,
     * exact routes are filtered by `matchSegments`.
     */
    private collect(
        node: TrieNode<THandler>,
        parts: string[],
        index: number,
        out: CompiledRoute<THandler>[]
    ): void {
        for (const route of node.routes) {
            out.push(route);
        }
        for (const route of node.wildcards) {
            out.push(route);
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

    private acceptsMethod(entry: CompiledRoute<THandler>, method: string): boolean {
        const source = entry.route.methods;
        if (!source?.length) {
            // A method allowlist wins over the catch-all marker.
            if (entry.route.method === '*') {
                return true;
            }
            return String(entry.route.method).toUpperCase() === method;
        }
        if (entry.methodsSource !== source) {
            entry.methodsSource = source;
            entry.methods = new Set(source.map(item => String(item).toUpperCase()));
        }
        return entry.methods!.has(method);
    }

    private matchSegments(pattern: string[], path: string[], prefix = false): Record<string, string> | null {
        // Allocate params lazily so literal-only mismatches stay allocation-free.
        let params: Record<string, string> | null = null;
        let index = 0;
        for (; index < pattern.length; index++) {
            const expected = pattern[index];
            if (expected === '*') {
                (params ??= {})['*'] = path.slice(index).join('/');
                return params;
            }
            if (expected.startsWith('*')) {
                (params ??= {})[expected.slice(1) || '*'] = path.slice(index).join('/');
                return params;
            }
            const actual = path[index];
            if (actual === undefined) {
                return null;
            }
            if (expected.startsWith(':')) {
                (params ??= {})[expected.slice(1)] = actual;
                continue;
            }
            if (expected !== actual) {
                return null;
            }
        }
        if (index === path.length) {
            return params ?? {};
        }
        if (!prefix) {
            return null;
        }
        // Prefix mode: the route matched its segments; the rest stays addressable.
        (params ??= {})['*'] = path.slice(index).join('/');
        return params;
    }
}
