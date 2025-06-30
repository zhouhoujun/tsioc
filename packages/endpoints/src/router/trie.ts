import { Route } from './route';

export class TrieRoute {
    children: Map<string, TrieRoute> = new Map();
    route?: Route;
    isWildcard = false;
}


export class TrieRouter {
    private root: TrieRoute = new TrieRoute();

    insert(route: Route) {
        const parts = route.path.split('/').filter(part => part);
        let node = this.root;

        for (const part of parts) {
            if (part.startsWith(':')) {
                if (!node.children.has('*')) {
                    const newNode = new TrieRoute();
                    newNode.isWildcard = true;
                    node.children.set('*', newNode);
                }
                node = node.children.get('*')!;
            } else {
                if (!node.children.has(part)) {
                    node.children.set(part, new TrieRoute());
                }
                node = node.children.get(part)!;
            }
        }

        node.route = route;
    }

    match(path: string): Route | undefined {
        const parts = path.split('/').filter(part => part);
        return this.matchRecursive(this.root, parts, 0);
    }

    private matchRecursive(node: TrieRoute, parts: string[], index: number): Route | undefined {
        if (index === parts.length) {
            return node.route;
        }

        const part = parts[index];
        if (node.children.has(part)) {
            const result = this.matchRecursive(node.children.get(part)!, parts, index + 1);
            if (result) {
                return result;
            }
        }

        if (node.children.has('*')) {
            return this.matchRecursive(node.children.get('*')!, parts, index + 1);
        }

        return undefined;
    }
}
