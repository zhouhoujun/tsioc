import { Type, Token, Provider, IProvider, InjectorImpl } from '@tsdi/ioc';
import { ICoreInjector } from './ICoreInjector';
import { ServiceProvider } from './services/providers';
import { IModuleLoader, IContainerBuilder } from './link';
import { ServiceOption, ServicesOption } from './resolves/context';
import { IContainer } from './IContainer';
import { LoadType } from './types';
import { CONTAINER_BUILDER, MODULE_LOADER } from './tk';
import { InjLifeScope } from './injects/lifescope';

export class CoreInjector extends InjectorImpl implements ICoreInjector {

    private servPdr: ServiceProvider;
    private injScope: InjLifeScope;


    constructor(readonly parent: ICoreInjector) {
        super(parent);
    }

    getServiceProvider(): ServiceProvider {
        if (!this.servPdr) {
            this.servPdr = this.getValue(ServiceProvider);
        }
        return this.servPdr;
    }

    /**
     * get root container.
     */
    getContainer(): IContainer {
        return this.parent?.getContainer() as IContainer;
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
            this.injScope = this.getContainer().provider.getInstance(InjLifeScope);
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

    protected destroying() {
        super.destroying();
        this.servPdr = null;
        this.injScope = null;
    }
}
