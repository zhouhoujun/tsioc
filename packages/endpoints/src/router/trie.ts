import { isString } from '@tsdi/ioc';
import { Route, Routes } from './route';


export class TrieRoute {

    private routes: Route[] = [];
    children: Map<string, TrieRoute> = new Map();

    param?: string;

    constructor(
        readonly wlidcards: Wlidcard[],
        private loader: (route: Route) => Promise<Routes>,
        readonly equals: (r1: Route, r2: Route) => boolean
    ) { }


    get(method: string) {
        return this.routes.find(route => route.method === '*' || route.method === method || route.method?.includes(method));
    }

    has(route: Route) {
        return this.routes.some(r => this.equals(r, route));
    }

    insert(route: Route): this {
        const parts = route.path.split('/').filter(part => part);
        let node = this as TrieRoute;


        for (const part of parts) {
            const wildcard = this.wlidcards.find(w => w.match(part));
            if (wildcard) {
                if (!node.children.has(wildcard.wlidcard)) {
                    const newNode = new TrieRoute(this.wlidcards, this.loader, this.equals);
                    if (wildcard.toPath) {
                        newNode.param = wildcard.toPath(part);
                    }
                    node.children.set(wildcard.wlidcard, newNode);
                }
                node = node.children.get(wildcard.wlidcard)!;
            } else {
                if (!node.children.has(part)) {
                    node.children.set(part, new TrieRoute(this.wlidcards, this.loader, this.equals));
                }
                node = node.children.get(part)!;
            }
        }

        node.bind(route);

        return this;
    }

    remove(pathParts: string[], index: number, route?: Route): boolean {
        if (index === pathParts.length) {
            // 到达目标节点，删除路由
            if (route) {
                this.routes.splice(this.routes.findIndex(r => this.equals(r, route)), 1);
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

    bind(route: Route) {
        if (!this.has(route)) {
            this.routes.push(route);
        }
        if (route.children) {
            route.children.forEach(r => this.insert(r));
        } else if (route.controller || route.loadChildren || route.loadController) {
            route.loaded = false;
        }
    }

    get loaded() {
        return !this.routes.some(r => r.loaded === false);
    }

    match(parts: string[], index: number, params: Record<string, string> = {}) {
        return this.recursive(this, parts, index, params);
    }


    protected async recursive(node: TrieRoute, parts: string[], index: number, params: Record<string, string>): Promise<TrieRoute | undefined> {
        if(!node) return;
        if (node.param) {
            params[node.param] = parts[index - 1];
        }

        if (index === parts.length) {
            return node;
        }

        if (!node.loaded) {
            await node.load();
        }

        const part = parts[index];
        if (node.children.has(part)) {
            const result = await this.recursive(node.children.get(part)!, parts, index + 1, params);
            if (result) {
                return result;
            }
        }

        for (const wlidcard of this.wlidcards) {
            if (node.children.has(wlidcard.wlidcard)) {
                return await this.recursive(node.children.get(wlidcard.wlidcard)!, parts, index + 1, params);
            }
        }

    }

    protected async load() {
        const unloadeds = this.routes.filter(r => r.loaded === false);
        for (const route of unloadeds) {
            const routers = await this.loader(route);
            routers?.forEach(route => this.insert(route));
            route.loaded = true;
        }
    }



}

export interface Wlidcard {
    wlidcard: string;
    match: (part: string) => boolean;
    toPath?: (part: string) => string;
}


const restWildcards: Wlidcard[] = [
    { wlidcard: '*', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
];


export class TrieRouter {
    private root: TrieRoute;

    constructor(
        private loader: (route: Route) => Promise<Routes>,
        private equals: (r1: Route, r2: Route) => boolean,
        private wlidcards: Wlidcard[] = restWildcards
    ) {
        this.root = new TrieRoute(this.wlidcards, this.loader, this.equals);
    }


    insert(route: Route): this {
        this.root.insert(route);
        return this;
    }

    match(path: string, params: Record<string, string>): Promise<TrieRoute | undefined> {
        const parts = path.split('/').filter(part => part);
        return this.root.match(parts, 0, params);
    }

    remove(route: Route): void;
    remove(path: string): void;
    remove(arg: string | Route) {
        const path = isString(arg) ? arg : arg.path;
        const parts = path.split('/').filter(part => part).map(part => {
            const wildcard = this.wlidcards.find(w => w.match(part));
            return wildcard ? wildcard.wlidcard : part;
        });
        this.root.remove(parts, 0, isString(arg) ? undefined : arg);
    }

    // private matchRecursive(node: TrieRoute, wlidcards: string[], parts: string[], index: number): TrieRoute | undefined {
    //     if (index === parts.length || !node.loaded) {
    //         return node;
    //     }

    //     const part = parts[index];
    //     if (node.children.has(part)) {
    //         const result = this.matchRecursive(node.children.get(part)!, wlidcards, parts, index + 1);
    //         if (result) {
    //             return result;
    //         }
    //     }

    //     for (const wlidcard of wlidcards) {
    //         if (node.children.has(wlidcard)) {
    //             return this.matchRecursive(node.children.get(wlidcard)!, wlidcards, parts, index + 1);
    //         }
    //     }

    //     return undefined;
    // }
}
