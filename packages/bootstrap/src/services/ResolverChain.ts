import { IocCoreService, IResolver, Token, ParamProviders, lang, Singleton, Inject } from '@ts-ioc/ioc';
import { IContainer, ContainerToken } from '@ts-ioc/core';

@Singleton
export class ResolverChain extends IocCoreService implements IResolver {

    /**
    * resolvers
    *
    * @protected
    * @type {IResolver[]}
    * @memberof ResolverChain
    */
    protected resolvers: IResolver[];

    constructor(@Inject(ContainerToken) protected container: IContainer) {
        super();
        this.resolvers = [container];
    }

    /**
     * reigister next resolver.
     *
     * @param {IResolver} resolver
     * @memberof ResolverChain
     */
    use(resolver: IResolver) {
        if (!this.hasResolver(resolver)) {
            this.resolvers.push(resolver);
        }
    }

    /**
     * has resolver or not.
     *
     * @param {IResolver} resolver
     * @returns
     * @memberof ResolverChain
     */
    hasResolver(resolver: IResolver) {
        if (resolver === this.container) {
            return true;
        }
        return this.resolvers.indexOf(resolver) >= 0;
    }

    /**
     * resove token via registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof ResolverChain
     */
    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let ctx: {
            instance: T;
        };
        lang.execAction(
            this.resolvers.map(r => (ctx, next) => {
                    if (r.has(token)) {
                        ctx.instance = r.resolve(token, ...providers);
                    }
                    if (!ctx.instance) {
                        next();
                    }
                }),
            ctx);
        return ctx.instance || null;
    }

    /**
     * unregister token in registered resolver chain.
     *
     * @template T
     * @param {SymbolType<T>} token
     * @memberof ResolverChain
     */
    unregister<T>(token: Token<T>) {
        lang.execAction(
            this.resolvers.map(r => (ctx, next) => {
                    if (r.has(token)) {
                        r.unregister(token);
                    }
                    next();
                }),
            true);
        return this;
    }

    /**
     *  has token or not
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {boolean}
     * @memberof ResolverChain
     */
    has<T>(token: Token<T>, alias?: string): boolean {
        let has = false;
        let key = this.container.getTokenKey(token, alias);

        lang.execAction(
            this.resolvers.map(r => (ctx, next) => {
                    has = r.has(key);
                    if (!has) {
                        next();
                    }
                }),
            has);

        return has;
    }
}
