import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { ProviderTypes, IocContainer, Type, Token, Modules, LoadType, isProvider } from '@ts-ioc/ioc';
import { ModuleLoader, IModuleLoader } from './services';
import { registerCores } from './registerCores';
import { ResolveServiceContext } from './actions';
import { TargetRefs } from './TargetService';


/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends IocContainer implements IContainer {

    constructor() {
        super();
    }

    get size(): number {
        return this.factories.size;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.resolve(ContainerBuilderToken);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.resolve(ModuleLoader);
    }

    /**
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {boolean} [inchain]
     * @returns {Type<T>}
     * @memberof Container
     */
    getTokenImpl<T>(token: Token<T>): Type<T> {
        return this.getTokenProvider(token);
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Container
     */
    use(...modules: Modules[]): this {
        this.getBuilder().syncLoadModule(this, ...modules);
        return this;
    }

    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    loadModule(...modules: LoadType[]): Promise<Type<any>[]> {
        return this.getBuilder().loadModule(this, ...modules);
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(TargetRefs | ResolveServiceContext | ProviderTypes)} [target]
     * @param {(ResolveServiceContext | ProviderTypes)} [ctx]
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(token: Token<T>, target?: TargetRefs | ResolveServiceContext | ProviderTypes, ctx?: ResolveServiceContext | ProviderTypes, ...providers: ProviderTypes[]): T {
        let context = this.vailfyServiceContext(token, target, ctx, ...providers);
        this.contextResolve(context);
        return context.instance || null;
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(TargetRefs | ResolveServiceContext | ProviderTypes)} [target]
     * @param {(ResolveServiceContext | ProviderTypes)} [ctx]
     * @param {...ProviderTypes[]} providers
     * @returns {T[]}
     * @memberof Container
     */
    getServices<T>(token: Token<T>, target?: TargetRefs | ResolveServiceContext | ProviderTypes, ctx?: ResolveServiceContext | ProviderTypes, ...providers: ProviderTypes[]): T[] {
        let context = this.vailfyServiceContext(token, target, ctx, ...providers)
        context.all = true;
        this.contextResolve(context);
        return context.instance || [];
    }

    protected vailfyServiceContext<T>(token: Token<T>, target?: TargetRefs | ResolveServiceContext | ProviderTypes, ctx?: ResolveServiceContext | ProviderTypes, ...providers: ProviderTypes[]): ResolveServiceContext {
        let context: ResolveServiceContext;
        if (isProvider(ctx)) {
            providers.unshift(ctx);
            ctx = null;
        } else if (ctx instanceof ResolveServiceContext) {
            context = ctx;
        }
        if (isProvider(target)) {
            providers.unshift(target);
            target = null;
        } else if (target instanceof ResolveServiceContext) {
            context = target;
            target = null;
        }
        if (!context) {
            context = ResolveServiceContext.create();
        }
        if (target) {
            context.target = target;
        }
        context.setOptions({
            token: token,
            providers: providers
        });
        return context;
    }

    protected init() {
        super.init();
        registerCores(this);
    }
}
