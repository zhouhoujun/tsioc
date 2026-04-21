"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrieRouter = exports.TrieRoute = void 0;
const ioc_1 = require("@tsdi/ioc");
class TrieRoute {
    constructor(options) {
        this.options = options;
        this.routes = [];
        this.children = new Map();
    }
    find(method) {
        return this.routes.find(route => (route.handler || route.handle) && (!route.method || route.method === '*' || route.method === method || (method && route.method?.includes(method))));
    }
    filter(method) {
        return this.routes.filter(route => (route.handler || route.handle) && (!route.method || route.method === '*' || route.method === method || (method && route.method?.includes(method))));
    }
    has(route) {
        return this.routes.some(r => this.options.equals(r, route));
    }
    insert(route, prefix) {
        let parts = this.options.toParts(route.path);
        if (prefix) {
            parts = this.options.toParts(prefix).concat(parts);
        }
        let node = this;
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
                node = node.children.get(wildcard.wlidcard);
            }
            else {
                if (!node.children.has(part)) {
                    node.children.set(part, new TrieRoute(this.options));
                }
                node = node.children.get(part);
            }
            i++;
        }
        return node.bind(route);
    }
    async remove(pathParts, index = 0, route) {
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
        }
        else {
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
    bind(route) {
        let ret = false;
        if (!this.has(route)) {
            ret = true;
            this.routes.push(route);
        }
        if (route.children) {
            route.children.forEach(r => this.insert(r));
        }
        else if (route.controller || route.loadChildren || route.loadController) {
            route.loaded = false;
        }
        return ret;
    }
    get loaded() {
        return !this.routes.some(r => r.loaded === false);
    }
    match(parts, index) {
        return this.recursive(this, parts, index);
    }
    async recursive(node, parts, index, loading = true) {
        if (!node)
            return;
        if (loading && !node.loaded) {
            await node.load();
        }
        if (index === parts.length) {
            return node;
        }
        const part = parts[index];
        let nextIdx = index + 1;
        if (node.children.has(part)) {
            const result = await this.recursive(node.children.get(part), parts, nextIdx, loading);
            if (result) {
                return result;
            }
        }
        for (const wlidcard of this.options.wlidcards) {
            if (node.children.has(wlidcard.wlidcard)) {
                const subNode = node.children.get(wlidcard.wlidcard);
                const result = await this.recursive(subNode, parts, nextIdx, loading);
                if (result) {
                    return result;
                }
                if (wlidcard.mutil) {
                    if (!subNode.children.size || wlidcard.includeParent)
                        return subNode;
                    let endNode;
                    while (nextIdx < parts.length) {
                        if (subNode.children.has(parts[nextIdx])) {
                            endNode = subNode.children.get(parts[nextIdx]);
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
    async load() {
        const unloadeds = this.routes.filter(r => r.loaded === false);
        for (const route of unloadeds) {
            const routers = await this.options.loader(route);
            route.children = routers;
            routers?.forEach(route => this.insert(route));
            route.loaded = true;
        }
    }
}
exports.TrieRoute = TrieRoute;
class TrieRouter {
    constructor(options) {
        this.options = options;
        this.root = new TrieRoute(this.options);
    }
    insert(route) {
        return this.root.insert(route, route.prefix);
    }
    match(arg) {
        const parts = (0, ioc_1.isString)(arg) ? this.options.toParts(arg) : arg;
        return this.root.match(parts, 0);
    }
    remove(arg) {
        if (!arg) {
            return this.root.remove();
        }
        if ((0, ioc_1.isString)(arg)) {
            return this.root.remove(this.options.toParts(arg));
        }
        else {
            return this.root.remove(this.options.toParts(arg.path), 0, arg);
        }
    }
}
exports.TrieRouter = TrieRouter;
//# sourceMappingURL=trie.js.map