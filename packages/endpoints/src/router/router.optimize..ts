import { RequestContext } from '../RequestContext';
import { Route, Routes } from './route';
import { TrieRouter } from './trie';



export class OptimizedRouter {
    private trieRouter: TrieRouter = new TrieRouter();
    private cache: Map<string, Route | undefined> = new Map();

    constructor(routes?: Routes) {
        routes?.forEach(route => this.trieRouter.insert(route));
    }

    


    getRoute(ctx: RequestContext): Route | undefined {
        const url = ctx.url;
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        const route = this.trieRouter.match(url);
        this.cache.set(url, route);
        return route;
    }
}