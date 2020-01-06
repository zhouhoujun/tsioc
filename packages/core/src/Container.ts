import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import {
    ProviderTypes, IocContainer, Type, Token, Modules, LoadType, isToken,
    IInjector, isInjector, ActionInjectorToken, ActionInjector
} from '@tsdi/ioc';
import { ModuleLoader, IModuleLoader } from './services/ModuleLoader';
import { registerCores } from './registerCores';
import { ServiceOption, ResolveServiceContext } from './resolves/service/ResolveServiceContext';
import { ResolveServiceScope } from './resolves/service/ResolveServiceScope';
import { ServicesOption, ResolveServicesContext } from './resolves/services/ResolveServicesContext';
import { ResolveServicesScope } from './resolves/services/ResolveServicesScope';
import { InjectLifeScope } from './injectors/InjectLifeScope';



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
        return this.get(ContainerBuilderToken);
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
    use(...modules: Modules[]): this;
    use(...modules: any[]): this {
        let injector: IInjector;
        if (modules.length && isInjector(modules[0])) {
            injector = modules[0];
            modules = modules.slice(1);
        } else {
            injector = this;
        }
        (async () => {
            return this.getInstance(ActionInjector).getInstance(InjectLifeScope).register(injector, ...modules);
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
    load(...modules: LoadType[]): Promise<Type[]>;
    async load(...modules: any[]): Promise<Type[]> {
        let injector: IInjector;
        if (modules.length && isInjector(modules[0])) {
            injector = modules[0];
            modules = modules.slice(1);
        } else {
            injector = this;
        }
        let mdls = await this.getLoader().load(...modules);
        return this.getInstance(ActionInjector).getInstance(InjectLifeScope).register(injector, ...mdls);
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderTypes[]): T;
    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderTypes[]): T;
    getService<T>(injector: any, target: any, ...providers: ProviderTypes[]): T {
        let injt: IInjector;
        let tag: Token<T> | ServiceOption<T>;
        if (isInjector(injector)) {
            injt = injector;
            tag = target;
        } else {
            injt = this;
            providers.unshift(target);
            tag = injector;
        }
        let context = ResolveServiceContext.parse(injt, isToken(tag) ? { token: tag } : tag);
        providers.length && context.providers.inject(...providers);
        this.get(ActionInjectorToken)
            .get(ResolveServiceScope)
            .execute(context);
        return context.instance || null;
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @param {...ProviderTypes[]} providers
     * @returns {T[]}
     * @memberof Container
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderTypes[]): T[];
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderTypes[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderTypes[]): T[];
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderTypes[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: any, target: any, ...providers: ProviderTypes[]): T[] {
        if (!isInjector(injector)) {
            providers.unshift(target);
        }
        let maps = this.getServiceProviders(injector, target);

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
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IInjector;
    /**
     * get service providers.
     *
     * @template T
     * @param {Token<T>} target
     * @param {ResolveServicesContext} [ctx]
     * @returns {Injector}
     * @memberof Container
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IInjector;
    getServiceProviders<T>(arg1: any, arg2?: any): IInjector {
        let injector: IInjector;
        let target: Token<T> | ServicesOption<T>;
        if (isInjector(arg1)) {
            injector = arg1;
            target = arg2;
        } else {
            injector = this;
            target = arg1;
        }
        let context = ResolveServicesContext.parse(injector, isToken(target) ? { token: target } : target);
        this.get(ActionInjectorToken)
            .get(ResolveServicesScope)
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
