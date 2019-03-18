import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { ProviderTypes, IocContainer, Type, Token, Modules, LoadType, isProvider, ProviderMap } from '@ts-ioc/ioc';
import { ModuleLoader, IModuleLoader } from './services';
import { registerCores } from './registerCores';
import { ResolveServiceContext, ResolveServicesContext } from './actions';
import { TargetRefs } from './TargetService';
import { map } from 'rxjs/operators';


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
        this.resolveContext(context);
        return context.instance || null;
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(TargetRefs | ResolveServicesContext | ProviderTypes)} [target]
     * @param {(ResolveServicesContext | ProviderTypes)} [ctx]
     * @param {...ProviderTypes[]} providers
     * @returns {T[]}
     * @memberof Container
     */
    getServices<T>(token: Token<T>, target?: TargetRefs | ResolveServicesContext | ProviderTypes, ctx?: ResolveServicesContext | ProviderTypes, ...providers: ProviderTypes[]): T[] {
        let context: ResolveServicesContext;
        if (isProvider(ctx)) {
            providers.unshift(ctx);
            ctx = null;
        } else if (ctx instanceof ResolveServicesContext) {
            context = ctx;
        }
        if (isProvider(target)) {
            providers.unshift(target);
            target = null;
        } else if (target instanceof ResolveServicesContext) {
            context = target;
            target = null;
        }

        let maps = this.getServiceProviders(token, target as any, context);

        let services = [];
        maps.iterator((fac)=>{
            services.push(fac(...providers));
        });
        return services;
    }

    /**
     * get service providers.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(TargetRefs | ResolveServicesContext)} [target]
     * @param {ResolveServicesContext} [ctx]
     * @returns {ProviderMap}
     * @memberof Container
     */
    getServiceProviders<T>(token: Token<T>, target?: TargetRefs | ResolveServicesContext, ctx?: ResolveServicesContext): ProviderMap {
        let context: ResolveServicesContext;
        if (ctx instanceof ResolveServicesContext) {
            context = ctx;
        }
        if (target instanceof ResolveServicesContext) {
            context = target;
            target = null;
        }
        if (!context) {
            context = ResolveServicesContext.create();
        }
        if (target) {
            context.target = target;
        }
        context.setOptions({
            token: token
        });
        this.resolveContext(context);
        return context.services;
    }

    protected init() {
        super.init();
        registerCores(this);
    }
}
