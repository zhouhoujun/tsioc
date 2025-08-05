import { isString } from '@tsdi/ioc';
import { Route, Routes } from './route';


export class TrieRoute {

    private routes: Route[] = [];
    children: Map<string, TrieRoute> = new Map();

    constructor(
        private options: TrieOptions
    ) { }


    find(method?: string) {
        return this.routes.find(route => (route.handler || route.handle) && (!route.method || route.method === '*' || route.method === method || (method && route.method?.includes(method))));
    }

    filter(method?: string) {
        return this.routes.filter(route => (route.handler || route.handle) && (!route.method || route.method === '*' || route.method === method || (method && route.method?.includes(method))));
    }

    has(route: Route) {
        return this.routes.some(r => this.options.equals(r, route));
    }

    insert(route: Route, prefix?: string): boolean {
        let parts = this.options.toParts(route.path);
        if (prefix) {
            parts = this.options.toParts(prefix).concat(parts);
        }
        let node = this as TrieRoute;

        const start = (route.prefix && route.prefix != prefix) ? this.options.toParts(route.prefix).length : 0;
        let i = 0;
        for (const part of parts) {
            const wildcard = this.options.wlidcards.find(w => w.match(part, parts, i));
            if (wildcard) {
                route.isWildcard = true;
                if (wildcard.toPath) {
                    if (!route.pathParams) {
                        route.pathParams = {};
                    }
                    route.pathParams[wildcard.toPath(part)] = i + start;
                }
                if (!node.children.has(wildcard.wlidcard)) {
                    const newNode = new TrieRoute(this.options);
                    node.children.set(wildcard.wlidcard, newNode);
                }
                node = node.children.get(wildcard.wlidcard)!;
            } else {
                if (!node.children.has(part)) {
                    node.children.set(part, new TrieRoute(this.options));
                }
                node = node.children.get(part)!;
            }
            i++;
        }

        return node.bind(route);

    }

    async remove(pathParts?: string[], index = 0, route?: Route) {
        if (!pathParts) {
            if (route) {
                this.routes.splice(this.routes.indexOf(route), 1);
            }
            this.routes = [];
            this.children.clear();
            return;
        }

        if (route) {
            const troute = await this.recursive(this, pathParts, index, false);
            if (troute) {
                troute.routes?.splice(troute.routes.indexOf(route), 1);
                route.children?.forEach(child => troute.remove(this.options.toParts(child.path), 0));
            }

        } else {
            const parts = pathParts.slice(0, pathParts.length - 1);
            const part = pathParts[pathParts.length - 1];
            const parent = await this.recursive(this, parts, index, false);
            parent?.children.delete(part);
        }
    }

    // forEach(cb: (route: Route) => void | false): void | false {
    //     if (this.routes?.length) {
    //         if (this.routes.some(route => cb(route) === false)) return false;
    //     }
    //     for (const child of this.children.values()) {
    //         if (child.forEach(cb) === false) return false;
    //     }
    // }

    bind(route: Route): boolean {
        let ret = false;
        if (!this.has(route)) {
            ret = true;
            this.routes.push(route);
        }
        if (route.children) {
            route.children.forEach(r => this.insert(r));
        } else if (route.controller || route.loadChildren || route.loadController) {
            route.loaded = false;
        }
        return ret;
    }

    get loaded() {
        return !this.routes.some(r => r.loaded === false);
    }

    match(parts: string[], index: number) {
        return this.recursive(this, parts, index);
    }


    protected async recursive(node: TrieRoute, parts: string[], index: number, loading = true): Promise<TrieRoute | undefined> {
        if (!node) return;

        if (loading && !node.loaded) {
            await node.load();
        }

        if (index === parts.length) {
            return node;
        }

        const part = parts[index];
        let nextIdx = index + 1;
        if (node.children.has(part)) {
            const result = await this.recursive(node.children.get(part)!, parts, nextIdx, loading);
            if (result) {
                return result;
            }
        }


        for (const wlidcard of this.options.wlidcards) {
            if (node.children.has(wlidcard.wlidcard)) {
                const subNode = node.children.get(wlidcard.wlidcard)!;
                const result = await this.recursive(subNode, parts, nextIdx, loading);
                if (result) {
                    return result;
                }

                if (wlidcard.mutil) {
                    if (!subNode.children.size || wlidcard.includeParent) return subNode;

                    let endNode: TrieRoute | undefined;
                    while (nextIdx < parts.length) {
                        if (subNode.children.has(parts[nextIdx])) {
                            endNode = subNode.children.get(parts[nextIdx])!;
                            break;
                        }
                        nextIdx++;
                    }
                    if (endNode) {
                        const result = await this.recursive(endNode, parts, nextIdx, loading);
                        if (result) {
                            return result;
                        }
                    }
                }

            }
        }

    }

    protected async load() {
        const unloadeds = this.routes.filter(r => r.loaded === false);
        for (const route of unloadeds) {
            const routers = await this.options.loader(route);
            route.children = routers;
            routers?.forEach(route => this.insert(route));
            route.loaded = true;
        }
    }



}

export interface Wlidcard {
    wlidcard: string;
    match: (part: string, parts: string[], index: number) => boolean;
    toPath?: (part: string) => string;
    includeParent?: boolean;
    mutil?: boolean;
    startMutil?: boolean;
}


export interface TrieOptions {
    loader: (route: Route) => Promise<Routes>,
    toParts: (path: string) => string[];
    equals: (r1: Route, r2: Route) => boolean;
    wlidcards: Wlidcard[];
    microservice?: boolean
}


export class TrieRouter {
    private root: TrieRoute;

    constructor(
        private options: TrieOptions
    ) {
        this.root = new TrieRoute(this.options);
    }


    insert(route: Route): boolean {
        return this.root.insert(route, route.prefix);
    }

    match(path: string): Promise<TrieRoute | undefined>;
    match(parts: string[]): Promise<TrieRoute | undefined>;
    match(arg: string | string[]): Promise<TrieRoute | undefined> {
        const parts = isString(arg) ? this.options.toParts(arg) : arg;
        return this.root.match(parts, 0);
    }

    remove(): void
    remove(route: Route): void;
    remove(path: string): void;
    remove(arg?: string | Route) {
        if (!arg) {
            return this.root.remove();
        }
        if (isString(arg)) {
            return this.root.remove(this.options.toParts(arg))
        } else {
            return this.root.remove(this.options.toParts(arg.path), 0, arg)
        }

    }

    // forEach(cb: (route: Route) => void | false): void | false {
    //     return this.root.forEach(cb);
    // }

}
