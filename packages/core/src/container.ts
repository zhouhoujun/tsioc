import { Provider, IocContainer, Type, Token, IProvider } from '@tsdi/ioc';
import { ICoreInjector, IContainer, IContainerBuilder, IModuleLoader, IServiceProvider } from './link';
import { CoreInjector } from './injector';
import { LoadType } from './types';
import { CONTAINER_BUILDER, MODULE_LOADER } from './tk';
import { InjLifeScope } from './injects/lifescope';
import { ServiceOption, ServicesOption } from './resolves/context';
import { ServiceProvider } from './services/providers';
import { registerCores } from './regs';



/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends IocContainer implements IContainer {

    protected servPdr: IServiceProvider;
    protected injScope: InjLifeScope;

    protected initReg() {
        this.servPdr = new ServiceProvider(this);
        super.initReg();
        registerCores(this);
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.getValue(CONTAINER_BUILDER);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.getValue(MODULE_LOADER);
    }

    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    async load(...modules: LoadType[]): Promise<Type[]> {
        let mdls = await this.getLoader().load(...modules);
        if (!this.injScope) {
            this.injScope = this.provider.getInstance(InjLifeScope)
        }
        return this.injScope.register(this, ...mdls);
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: Provider[]): T {
        return this.servPdr.getService(this, target, ...providers);
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @param {...Provider[]} providers
     * @returns {T[]}
     * @memberof Container
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: Provider[]): T[] {
        return this.servPdr.getServices(this, target, ...providers);
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
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.servPdr.getServiceProviders(this, target);
    }

    protected destroying() {
        super.destroying();
        this.servPdr = null;
        this.injScope = null;
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


export function isCoreInjector(target: any): target is ICoreInjector {
    return target && (target instanceof CoreInjector || target instanceof Container);
}
