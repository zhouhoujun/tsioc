import { Provider, IocContainer, Type, Token, IProvider } from '@tsdi/ioc';
import { ICoreInjector, IContainer, IContainerBuilder, IModuleLoader, IServiceProvider } from './link';
import { CoreInjector } from './injector';
import { LoadType } from './types';
import { CONTAINER_BUILDER, MODULE_LOADER } from './tk';
import { InjLifeScope } from './injects/lifescope';
import { ServiceOption, ServicesOption } from './resolves/context';
import { registerCores } from './regs';
import { ServiceProvider } from './services/providers';



/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends IocContainer implements IContainer {

    private _serv: IServiceProvider;
    get serv(): IServiceProvider {
        if (!this._serv) {
            this._serv = new ServiceProvider(this);
        }
        return this._serv;
    }

    protected initReg() {
        super.initReg();
        registerCores(this);
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     */
    getBuilder(): IContainerBuilder {
        return this.getValue(CONTAINER_BUILDER);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): IModuleLoader {
        return this.getValue(MODULE_LOADER);
    }

    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    async load(...modules: LoadType[]): Promise<Type[]> {
        let mdls = await this.getLoader().load(...modules);
        return this.provider.getInstance(InjLifeScope).register(this, ...mdls);
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...Provider[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: Provider[]): T {
        return this.serv.getService(this, target, ...providers);
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @param {...Provider[]} providers
     * @returns {T[]}
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: Provider[]): T[] {
        return this.serv.getServices(this, target, ...providers);
    }

    /**
     * get service providers.
     *
     * @template T
     * @param {Token<T>} target
     * @param {ResolveServicesContext} [ctx]
     * @returns {Injector}
     */
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.serv.getServiceProviders(this, target);
    }

    protected destroying() {
        super.destroying();
        this._serv = null;
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
