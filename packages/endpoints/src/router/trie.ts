import { Route, Routes } from './route';

export class TrieRoute {

    children: Map<string, TrieRoute> = new Map();

    route?: Route;

    private _loaded = true;
    get loaded() {
        return this._loaded;
    }

    param?: string;

    constructor(
        readonly wlidcards: Wlidcard[],
        private loader: (route: Route) => Promise<Routes>,
        readonly isWildcard = false
    ) { }


    insert(route: Route): this {
        const parts = route.path.split('/').filter(part => part);
        let node = this as TrieRoute;


        for (const part in parts) {
            const wildcard = this.wlidcards.find(w => w.match(part));
            if (wildcard) {
                if (!node.children.has(wildcard.wlidcard)) {
                    const newNode = new TrieRoute(this.wlidcards, this.loader, true);
                    if (wildcard.toPath) {
                        newNode.param = wildcard.toPath(part);
                    }
                    node.children.set(wildcard.wlidcard, newNode);
                }
                node = node.children.get(wildcard.wlidcard)!;
            } else {
                if (!node.children.has(part)) {
                    node.children.set(part, new TrieRoute(this.wlidcards, this.loader));
                }
                node = node.children.get(part)!;
            }
        }

        node.bind(route);

        return this;
    }

    remove(pathParts: string[], index: number): boolean {
        if (index === pathParts.length) {
            // 到达目标节点，删除路由
            const hadRoute = this.route !== undefined;
            this.route = undefined;
            return hadRoute;
        }

        const part = pathParts[index];
        const child = this.children.get(part);
        if (!child) {
            return false; // 路径不存在
        }

        // 递归删除子节点
        const shouldDeleteChild = child.remove(pathParts, index + 1);
        if (shouldDeleteChild && child.children.size === 0 && !child.route) {
            // 子节点没有路由且没有其他子节点，可以删除
            this.children.delete(part);
        }

        // 如果当前节点没有路由且没有子节点，可以删除
        return this.route === undefined && this.children.size === 0;
    }

    bind(route: Route) {
        this.route = route;
        if (route.children) {
            route.children.forEach(r => this.insert(r));
        } else if (route.controller || route.loadChildren || route.loadController) {
            this._loaded = false;
        }
    }

    // forEach(cb: (route: Route) => void | false): void | false {
    //     if (this.route) {
    //         if (cb(this.route) === false) return false;
    //     }
    //     for (const child of this.children.values()) {
    //         if (child.forEach(cb) === false) return false;
    //     }
    // }

    match(parts: string[], index: number, params: Record<string, string> = {}) {
        return this.recursive(this, parts, index, params);
    }


    protected async recursive(node: TrieRoute, parts: string[], index: number, params: Record<string, string>): Promise<TrieRoute | undefined> {

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
        if (this.children.has(part)) {
            const result = this.recursive(node.children.get(part)!, parts, index + 1, params);
            if (result) {
                return result;
            }
        }

        for (const wlidcard of this.wlidcards) {
            if (node.children.has(wlidcard.wlidcard)) {
                return this.recursive(node.children.get(wlidcard.wlidcard)!, parts, index + 1, params);
            }
        }

    }

    protected async load() {
        const routers = await this.loader(this.route!);
        routers?.forEach(route => this.insert(route));
        this._loaded = true;
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
        private wlidcards: Wlidcard[] = restWildcards
    ) {
        this.root = new TrieRoute(this.wlidcards, this.loader);
    }


    insert(route: Route): this {
        this.root.insert(route);
        return this;
    }

    match(path: string, params: Record<string, string>): Promise<TrieRoute | undefined> {
        const parts = path.split('/').filter(part => part);
        return this.root.match(parts, 0, params);
    }

    remove(path: string) {
        const parts = path.split('/').filter(part => part).map(part => {
            const wildcard = this.wlidcards.find(w => w.match(part));
            return wildcard ? wildcard.wlidcard : part;
        });
        this.root.remove(parts, 0);
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
