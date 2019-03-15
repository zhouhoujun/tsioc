import {
    IocCoreService, IResolverContainer, Singleton, ResovleActionContext,
    Token, IResolver, ProviderTypes, IContextResolver
} from '@ts-ioc/ioc';

@Singleton
export class DIModuleExports extends IocCoreService implements IResolver, IContextResolver {

    /**
    * resolvers
    *
    * @protected
    * @type {IResolverContainer[]}
    * @memberof ResolverChain
    */
    protected resolvers: IResolverContainer[];

    constructor() {
        super();
        this.resolvers = [];
    }

    has<T>(key: Token<T>, alias?: string): boolean {
        return this.resolvers.some(r => r.has(key, alias));
    }

    resolveContext<T extends ResovleActionContext>(ctx: T): T {
        this.resolvers.some(r => {
            r.resolveContext(ctx);
            return !!ctx.instance;
        });
        return ctx;
    }

    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        let inst: T;
        this.resolvers.some(r => {
            inst = r.resolve(token, ...providers);
            return !!inst;
        });
        return inst || null;
    }

    unregister<T>(token: Token<T>): this {
        this.resolvers.forEach(r => {
            r.unregister(token);
        });
        return this;
    }


    /**
     * get resolvers.
     *
     * @returns {IResolverContainer[]}
     * @memberof DIModuleExports
     */
    getResolvers(): IResolverContainer[] {
        return this.resolvers;
    }

    /**
     * reigister next resolver.
     *
     * @param {IResolverContainer} resolver
     * @param {boolean} [first]
     * @returns {this}
     * @memberof ExportResolvers
     */
    use(resolver: IResolverContainer, first?: boolean): this {
        if (this.hasResolver(resolver)) {
            return this;
        }
        if (first) {
            this.resolvers.unshift(resolver);
        } else {
            this.resolvers.push(resolver);
        }
        return this;
    }

    /**
     * has resolver or not.
     *
     * @param {IResolverContainer} resolver
     * @returns
     * @memberof ResolverChain
     */
    hasResolver(resolver: IResolverContainer): boolean {
        return this.resolvers.indexOf(resolver) >= 0;
    }

}
