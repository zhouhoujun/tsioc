import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import {
    ProviderTypes, IocContainer, Type, Token, Modules, LoadType, isProvider, ProviderMap, IProviderParser,
    TypeReflects, Factory, ParamProviders, IParameter, SymbolType, InstanceFactory, IResolver
} from '@tsdi/ioc';
import { ModuleLoader, IModuleLoader, ServicesResolveLifeScope, ServiceResolveLifeScope, ResolveLifeScope, InjectorLifeScope } from './services';
import { registerCores } from './registerCores';
import { ResolveServiceContext, ResolveServicesContext, ResovleActionContext } from './resolves';
import { TargetRefs } from './TargetService';


/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container implements IContainer {

    ioc: IocContainer;
    constructor() {
        this.init()
    }

    protected init() {
        this.ioc = new IocContainer();
        registerCores(this);
    }


    get size(): number {
        return this.ioc.size;
    }


    /**
   * resolve type instance with token and param provider.
   *
   * @template T
   * @param {Token<T>} token
   * @param {T} [notFoundValue]
   * @param {...ProviderTypes[]} providers
   * @memberof Container
   */
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        let context = ResovleActionContext.parse({
            token: token,
            providers: providers
        }, this);
        this.resolveContext(context);
        return context.instance || null;
    }


    /**
     * resolve by context.
     *
     * @template T
     * @param {T} ctx
     * @returns {T}
     * @memberof IocContainer
     */
    resolveContext<T extends ResovleActionContext>(ctx: T): T {
        this.get(ResolveLifeScope).execute(ctx);
        return ctx as T;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.ioc.resolve(ContainerBuilderToken);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.ioc.resolve(ModuleLoader);
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
        this.get(InjectorLifeScope).register(...modules);
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
        return this.get(InjectorLifeScope).register(...mdls);
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
            context = ResolveServiceContext.parse({
                token: token,
                target: target,
                providers: providers
            }, this);
        } else {
            context.setOptions({
                token: token,
                target: target,
                providers: providers
            });
        }
        this.get(ServiceResolveLifeScope).execute(context);
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
    getServiceProviders<T>(token: Token<T>, target?: TargetRefs | ResolveServicesContext, ctx?: ResolveServicesContext): ProviderMap {
        let context: ResolveServicesContext;
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
            context.setOptions({
                token: token,
                target: tag
            });
        }
        this.get(ServicesResolveLifeScope).execute(context);
        return context.services;
    }

    getProviderParser(): IProviderParser {
        return this.ioc.getProviderParser();
    }
    getTypeReflects(): TypeReflects {
        return this.ioc.getTypeReflects();
    }
    hasRegister<T>(key: Token<T>): boolean {
        return this.ioc.has(key);
    }
    get<T>(token: Token<T>, alias?: string | ProviderTypes, ...providers: ProviderTypes[]): T {
        return this.ioc.get(token, alias, ...providers);
    }

    register<T>(token: Token<T>, value?: Factory<T>): this {
        this.ioc.register(token, value);
        return this;
    }
    registerSingleton<T>(token: Token<T>, value?: Factory<T>): this {
        this.ioc.registerSingleton(token, value);
        return this;
    }
    registerValue<T>(token: Token<T>, value: T): this {
        this.ioc.registerValue(token, value);
        return this;
    }
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        this.ioc.bindProvider(provide, provider);
        return this;
    }
    bindProviders(target?: Token<any> | ProviderTypes, onceBinded?: ProviderTypes | ((mapTokenKey: Token<any>) => void), ...providers: ProviderTypes[]): this {
        this.ioc.bindProviders(target, onceBinded, ...providers);
        return this;
    }

    bindRefProvider<T>(target: Token<any>, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string, onceBinded?: (refToken: Token<T>) => void): this {
        this.ioc.bindRefProvider(target, provide, provider);
        return this;
    }
    clearCache(targetType: Type<any>) {
        this.ioc.clearCache(targetType);
    }
    getToken<T>(target: Token<T>, alias?: string): Token<T> {
        return this.ioc.getToken(target, alias);
    }
    invoke<T>(target: Token<any>, propertyKey: string, instance?: any, ...providers: ParamProviders[]): T {
        return this.ioc.invoke(target, propertyKey, instance, ...providers);
    }
    createParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.ioc.createParams(params, ...providers);
    }
    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.ioc.getTokenProvider(token);
    }
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        return this.ioc.getTokenKey(token, alias);
    }
    iterator(callbackfn: (fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => boolean | void): boolean | void {
        this.ioc.iterator(callbackfn);
    }
    has<T>(key: Token<T>, alias?: string): boolean {
        return this.ioc.has(key, alias);
    }
    unregister<T>(token: Token<T>): this {
        this.ioc.unregister(token);
        return this;
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
