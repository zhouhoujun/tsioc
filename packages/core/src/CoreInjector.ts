import { Injector, Modules, Type, Token, ProviderTypes, IProviders } from '@tsdi/ioc';
import { ICoreInjector } from './ICoreInjector';
import { ServiceProvider } from './services/ServiceProvider';
import { ModuleProvider } from './services/ModuleProvider';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { IModuleLoader, ModuleLoader } from './services/ModuleLoader';
import { ServiceOption } from './resolves/service/ResolveServiceContext';
import { ServicesOption } from './resolves/services/ResolveServicesContext';
import { IContainer } from './IContainer';
import { LoadType } from './types';

export class CoreInjector extends Injector implements ICoreInjector {

    getServiceProvider(): ServiceProvider {
        return this.tryGetSingletonInRoot(ServiceProvider)
    }

    /**
     * get root container.
     */
    getContainer(): IContainer {
        return this.proxy() as IContainer;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.tryGetSingletonInRoot(ContainerBuilderToken);
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
        return this.tryGetSingletonInRoot(ModuleProvider).load(this, ...modules);
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
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderTypes[]): T {
        return this.getServiceProvider().getService(this, target, ...providers);
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
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderTypes[]): T[] {
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
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProviders {
        return this.getServiceProvider().getServiceProviders(this, target);
    }
}
