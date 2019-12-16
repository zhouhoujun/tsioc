import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { ProviderTypes, IocContainer, Type, Token, Modules, LoadType, isToken, ActionInjector, IInjector, isInjector } from '@tsdi/ioc';
import { ModuleLoader, IModuleLoader } from './services/ModuleLoader';
import { registerCores } from './registerCores';
import { InjectorLifeScope } from './injectors/InjectorLifeScope';
import { ServiceOption, ResolveServiceContext } from './resolves/ResolveServiceContext';
import { ServiceResolveLifeScope } from './resolves/ServiceResolveLifeScope';
import { ServicesOption, ResolveServicesContext } from './resolves/ResolveServicesContext';
import { ServicesResolveLifeScope } from './resolves/ServicesResolveLifeScope';


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
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.getInstance(ContainerBuilderToken.toString());
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.getInstance(ModuleLoader);
    }

    /**
     * use modules.
     *
     * @param {IInjector} injector
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(injector: IInjector, ...modules: Modules[]): this;
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Container
     */
    use(...modules: Modules[]): this {
        let injector: IInjector;
        if (modules.length && isInjector(modules[0])) {
            injector = modules[0];
            modules = modules.slice(1);
        } else {
            injector = this;
        }
        (async () => {
            this.getInstance(ActionInjector).get(InjectorLifeScope).register(injector, ...modules);
        })();
        return this;
    }

    /**
     * load modules.
     *
     * @param {IInjector} injector
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    load(injector: IInjector, ...modules: LoadType[]): Promise<Type[]>;
    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    async load(...modules: LoadType[]): Promise<Type[]> {
        let injector: IInjector;
        if (modules.length && isInjector(modules[0])) {
            injector = modules[0];
            modules = modules.slice(1);
        } else {
            injector = this;
        }
        let mdls = await this.getLoader().load(...modules);
        return this.getInstance(ActionInjector).get(InjectorLifeScope).register(injector, ...mdls);
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T> | ResolveServiceContext<T>)} target
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(target: Token<T> | ServiceOption<T> | ResolveServiceContext<T>, ...providers: ProviderTypes[]): T {
        let context: ResolveServiceContext<T>;
        if (target instanceof ResolveServiceContext) {
            context = target;
        } else {
            context = ResolveServiceContext.parse(isToken(target) ? { token: target } : target, this.getFactory());
        }
        providers.length && context.providers.inject(...providers);

        this.getInstance(ActionInjector)
            .get(ServiceResolveLifeScope)
            .execute(context);
        return context.instance || null;
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T> | ResolveServicesContext<T>)} target
     * @param {...ProviderTypes[]} providers
     * @returns {T[]}
     * @memberof Container
     */
    getServices<T>(target: Token<T> | ServicesOption<T> | ResolveServicesContext<T>, ...providers: ProviderTypes[]): T[] {
        let maps = this.getServiceProviders(target);
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
     * @param {Token<T>} target
     * @param {ResolveServicesContext} [ctx]
     * @returns {Injector}
     * @memberof Container
     */
    getServiceProviders<T>(target: Token<T> | ServicesOption<T> | ResolveServicesContext<T>, ctx?: ResolveServicesContext<T>): IInjector {
        let context: ResolveServicesContext<T>;
        if (target instanceof ResolveServicesContext) {
            context = target;
        } else {
            context = ResolveServicesContext.parse(isToken(target) ? { token: target } : target, this.getFactory());
        }
        this.getInstance(ActionInjector)
            .get(ServicesResolveLifeScope)
            .execute(context);

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
