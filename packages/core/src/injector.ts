import { Type, Token, ProviderType, IProvider, InjectorImpl } from '@tsdi/ioc';
import { LoadType } from './types';
import { ICoreInjector, IContainer, IModuleLoader, IContainerBuilder } from './link';
import { ServiceOption, ServicesOption } from './resolves/context';
import { CONTAINER_BUILDER, MODULE_LOADER } from './tk';
import { InjLifeScope } from './injects/lifescope';

export class CoreInjector extends InjectorImpl implements ICoreInjector {

    constructor(readonly parent: ICoreInjector) {
        super(parent);
    }


    /**
     * get root container.
     */
    getContainer(): IContainer {
        return this.parent?.getContainer();
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
        return this.getContainer().provider.getInstance(InjLifeScope).register(this, ...mdls);
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T {
        return this.getContainer().serv.getService(this, target, ...providers);
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @param {...ProviderType[]} providers
     * @returns {T[]}
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        return this.getContainer().serv.getServices(this, target, ...providers);
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
        return this.getContainer().serv.getServiceProviders(this, target);
    }

}
