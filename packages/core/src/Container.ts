import { Provider, IocContainer, Type, Token, IProvider } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { IContainerBuilder } from './IContainerBuilder';
import { ModuleLoader, IModuleLoader } from './services/ModuleLoader';
import { registerCores } from './registers';
import { ServiceOption, ServicesOption } from './resolves/context';
import { ModuleProvider } from './services/ModuleProvider';
import { ServiceProvider } from './services/ServiceProvider';
import { ICoreInjector } from './ICoreInjector';
import { CoreInjector } from './CoreInjector';
import { LoadType } from './types';
import { ContainerBuilderToken } from './tk';



/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends IocContainer implements IContainer {

    protected initReg() {
        super.initReg();
        registerCores(this);
    }

    getServiceProvider(): ServiceProvider {
        return this.getSingleton(ServiceProvider)
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.getSingleton(ContainerBuilderToken);
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
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    load(...modules: LoadType[]): Promise<Type[]> {
        return this.getSingleton(ModuleProvider).load(this, ...modules);
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
        return this.getServiceProvider().getService(this, target, ...providers);
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
        return this.getServiceProvider().getServices(this, target, ...providers);
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
        return this.getServiceProvider().getServiceProviders(this, target);
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
