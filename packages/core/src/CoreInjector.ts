import { Injector, Type, Token, Provider, IProvider, ActionInjectorToken } from '@tsdi/ioc';
import { ICoreInjector } from './ICoreInjector';
import { ServiceProvider } from './services/providers';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader, ModuleLoader } from './services/loader';
import { ServiceOption, ServicesOption } from './resolves/context';
import { IContainer } from './IContainer';
import { LoadType } from './types';
import { ContainerBuilderToken } from './tk';
import { InjLifeScope } from './injects/lifescope';

export class CoreInjector extends Injector implements ICoreInjector {

    getServiceProvider(): ServiceProvider {
        return this.getSingleton(ServiceProvider)
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
        return this.getSingleton(ContainerBuilderToken);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.getSingleton(ModuleLoader);
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
        return this.getInstance(ActionInjectorToken).getInstance(InjLifeScope).register(this, ...mdls);
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
