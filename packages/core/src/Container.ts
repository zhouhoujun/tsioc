import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { ProviderTypes, IocContainer, Type, Token, Modules, LoadType, isProvider, ProviderMap } from '@tsdi/ioc';
import { ModuleLoader, IModuleLoader, ServicesResolveLifeScope, ServiceResolveLifeScope, InjectorLifeScope } from './services';
import { registerCores } from './registerCores';
import { ResolveServiceContext, ResolveServicesContext, ServiceActionOption, ServicesActionOption } from './resolves';
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

    protected init() {
        super.init();
        registerCores(this);
    }


    /**
     * current container has register.
     *
     * @template T
     * @param {Token<T>} key
     * @returns {boolean}
     * @memberof IContainer
     */
    hasRegister<T>(key: Token<T>): boolean {
        return this.has(key);
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.get(ContainerBuilderToken);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.get(ModuleLoader);
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
        this.actions.get(InjectorLifeScope).register(...modules);
        return this;
    }

    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    async load(...modules: LoadType[]): Promise<Type<any>[]> {
        let mdls = await this.getLoader().load(...modules);
        return this.actions.get(InjectorLifeScope).register(...mdls);
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
    getService<T>(token: Token<T>, target?: TargetRefs | ResolveServiceContext<T> | ProviderTypes, ctx?: ResolveServiceContext<T> | ProviderTypes, ...providers: ProviderTypes[]): T {
        let context: ResolveServiceContext<T>;
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
            context = ResolveServiceContext.parse({
                token: token,
                target: target,
                providers: providers
            }, this);
        } else {
            context.setOptions(<ServiceActionOption<T>>{
                token: token,
                target: target,
                providers: providers
            });
        }
        this.actions.get(ServiceResolveLifeScope).execute(context);
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
    getServices<T>(token: Token<T>, target?: TargetRefs | ResolveServicesContext<T> | ProviderTypes, ctx?: ResolveServicesContext<T> | ProviderTypes, ...providers: ProviderTypes[]): T[] {
        let context: ResolveServicesContext<T>;
        let tag: TargetRefs;
        if (isProvider(target)) {
            providers.unshift(target);
            ctx = null;
            tag = null;
        } else if (target instanceof ResolveServicesContext) {
            context = target;
        } else {
            tag = target;
        }

        if (!context) {
            if (isProvider(ctx)) {
                providers.unshift(ctx);
            } else if (ctx instanceof ResolveServicesContext) {
                context = ctx;
            }
        }

        let maps = this.getServiceProviders(token, tag, context);

        let services = [];
        maps.iterator((fac) => {
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
    getServiceProviders<T>(token: Token<T>, target?: TargetRefs | ResolveServicesContext<T>, ctx?: ResolveServicesContext<T>): ProviderMap {
        let context: ResolveServicesContext<T>;
        let tag: TargetRefs;
        if (target instanceof ResolveServicesContext) {
            context = target;
        } else {
            tag = target;
        }

        if (!context && ctx instanceof ResolveServicesContext) {
            context = ctx;
        }

        if (!context) {
            context = ResolveServicesContext.parse({
                token: token,
                target: tag
            }, this);
        } else {
            context.setOptions(<ServicesActionOption<T>>{
                token: token,
                target: tag
            });
        }
        this.actions.get(ServicesResolveLifeScope).execute(context);
        return context.services;
    }
}

/**
 * is container or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Container}
 */
export function isContainer(target: any): target is Container {
    return target && target instanceof Container;
}
