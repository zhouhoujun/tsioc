import { Route } from './route';

export class TrieRoute {

    children: Map<string, TrieRoute> = new Map();

    route?: Route;

    private _loaded = true;
    get loaded() {
        return this._loaded;
    }

    constructor(
        readonly wlidcards: Wlidcards,
        readonly isWildcard = false
    ) { }


    insert(route: Route): this {
        const parts = route.path.split('/').filter(part => part);
        let node = this as TrieRoute;

        const keys = Object.keys(this.wlidcards);
        for (const part in parts) {
            const wildcard = keys.find(key => this.wlidcards[key](part));
            if (wildcard) {
                if (!node.children.has(wildcard)) {
                    const newNode = new TrieRoute(this.wlidcards, true);
                    node.children.set(wildcard, newNode);
                }
                node = node.children.get(wildcard)!;
            } else {
                if (!node.children.has(part)) {
                    node.children.set(part, new TrieRoute(this.wlidcards));
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

}



export type Wlidcards = Record<string, (part: string) => boolean>;

const restWildcards: Wlidcards = {
    '*': (part: string) => part.startsWith(':'),
};


export class TrieRouter {
    private root: TrieRoute;

    constructor(
        readonly wlidcards: Wlidcards = restWildcards
    ) {
        this.root = new TrieRoute(this.wlidcards);
    }


    insert(route: Route): this {
        this.root.insert(route);
        return this;
    }

    match(path: string): TrieRoute | undefined {
        const parts = path.split('/').filter(part => part);
        return this.matchRecursive(this.root, Object.keys(this.wlidcards), parts, 0);
    }

    remove(path: string) {
        const keys = Object.keys(this.wlidcards);
        const parts = path.split('/').filter(part => part).map(part => {
            const wildcard = keys.find(key => this.wlidcards[key](part));
            return wildcard ? wildcard : part;
        });
        this.root.remove(parts, 0);
    }

    private matchRecursive(node: TrieRoute, wlidcards: string[], parts: string[], index: number): TrieRoute | undefined {
        if (index === parts.length || !node.loaded) {
            return node;
        }

        const part = parts[index];
        if (node.children.has(part)) {
            const result = this.matchRecursive(node.children.get(part)!, wlidcards, parts, index + 1);
            if (result) {
                return result;
            }
        }

        for (const wlidcard of wlidcards) {
            if (node.children.has(wlidcard)) {
                return this.matchRecursive(node.children.get(wlidcard)!, wlidcards, parts, index + 1);
            }
        }

        return undefined;
    }
}
