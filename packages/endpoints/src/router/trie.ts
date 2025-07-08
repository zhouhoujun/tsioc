import { isArray, isString } from '@tsdi/ioc';
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

    insert(route: Route): boolean {
        const parts = this.options.toParts(route.path);
        let node = this as TrieRoute;

        const start = route.prefix ? this.options.toParts(route.prefix).length : 0;
        let i = start;
        for (const part of parts) {
            const wildcard = this.options.wlidcards.find(w => w.match(part, parts, i - start));
            if (wildcard) {
                route.isWildcard = true;
                if (wildcard.toPath) {
                    if (!route.pathParams) {
                        route.pathParams = {};
                    }
                    route.pathParams[wildcard.toPath(part)] = i;
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

    remove(pathParts: string[], index: number, route?: Route): boolean {
        if (index === pathParts.length) {
            // 到达目标节点，删除路由
            if (route) {
                this.routes.splice(this.routes.findIndex(r => this.options.equals(r, route)), 1);
            } else {
                this.routes = [];
            }
            return this.children.size === 0 && this.routes.length === 0;
        }

        const part = pathParts[index];
        const child = this.children.get(part);
        if (!child) {
            return false; // 路径不存在
        }

        // 递归删除子节点
        const shouldDeleteChild = child.remove(pathParts, index + 1, route);
        if (shouldDeleteChild) {
            // 子节点没有路由且没有其他子节点，可以删除
            this.children.delete(part);
        }

        // 如果当前节点没有路由且没有子节点，可以删除
        return this.routes.length === 0 && this.children.size === 0;
    }

    forEach(cb: (route: Route) => void | false): void | false {
        if (this.routes?.length) {
            if (this.routes.some(route => cb(route) === false)) return false;
        }
        for (const child of this.children.values()) {
            if (child.forEach(cb) === false) return false;
        }
    }

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


    protected async recursive(node: TrieRoute, parts: string[], index: number): Promise<TrieRoute | undefined> {
        if (!node) return;

        if (!node.loaded) {
            await node.load();
        }

        if (index === parts.length) {
            return node;
        }

        const part = parts[index];
        if (node.children.has(part)) {
            const result = await this.recursive(node.children.get(part)!, parts, index + 1);
            if (result) {
                return result;
            }
        }


        for (const wlidcard of this.options.wlidcards) {
            if (node.children.has(wlidcard.wlidcard)) {
                const result = await this.recursive(node.children.get(wlidcard.wlidcard)!, parts, index + 1);
                if (result) {
                    return result;
                }

                if (wlidcard.startWith) {
                    return node;
                }
            }
        }

    }

    protected async load() {
        const unloadeds = this.routes.filter(r => r.loaded === false);
        for (const route of unloadeds) {
            const routers = await this.options.loader(route);
            routers?.forEach(route => this.insert(route));
            route.loaded = true;
        }
    }



}

export interface Wlidcard {
    wlidcard: string;
    match: (part: string, parts: string[], index: number) => boolean;
    toPath?: (part: string) => string;
    startWith?: boolean;
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
        return this.root.insert(route);
    }

    match(path: string): Promise<TrieRoute | undefined>;
    match(parts: string[]): Promise<TrieRoute | undefined>;
    match(arg: string | string[]): Promise<TrieRoute | undefined> {
        const parts = isString(arg) ? this.options.toParts(arg) : arg;
        return this.root.match(parts, 0);
    }

    remove(route: Route): void;
    remove(path: string): void;
    remove(arg: string | Route) {
        const path = isString(arg) ? arg : arg.path;
        const parts = this.options.toParts(path);
        const wparts = parts.map((part, idx) => {
            const wildcard = this.options.wlidcards.find(w => w.match(part, parts, idx));
            return wildcard ? wildcard.wlidcard : part;
        });
        this.root.remove(wparts, 0, isString(arg) ? undefined : arg);
    }

    forEach(cb: (route: Route) => void | false): void | false {
        return this.root.forEach(cb);
    }

}
