import { IocCoreService, IInjector, Token, Provider, isToken, IProvider, INJECTOR, InjectorProxyToken, PROVIDERS, InjectorProxy, Type, ActionInjectorToken } from '@tsdi/ioc';
import { ServiceOption, ServiceContext, ServicesOption, ServicesContext } from '../resolves/context';
import { ResolveServiceScope, ResolveServicesScope } from '../resolves/actions';
import { IServiceResolver } from './IServiceResolver';
import { IServicesResolver } from './IServicesResolver';
import { IContainer } from '../IContainer';
import { IModuleLoader, ModuleLoader } from './loader';
import { LoadType } from '../types';
import { InjLifeScope } from '../injects/lifescope';

export class ServiceProvider extends IocCoreService implements IServiceResolver, IServicesResolver {
    constructor(private proxy: InjectorProxy<IContainer>) {
        super();
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
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: Provider[]): T {
        let context = ServiceContext.parse(injector, isToken(target) ? { token: target } : target);
        let pdr = context.providers;
        providers.length && pdr.inject(...providers);
        if (!pdr.hasTokenKey(INJECTOR)) {
            pdr.inject(
                { provide: INJECTOR, useValue: injector },
                { provide: InjectorProxyToken, useValue: injector.getProxy() }
            );
        }

        this.proxy().getActionInjector()
            .getInstance(ResolveServiceScope)
            .execute(context);
        return context.instance as T || null;
    }

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...Provider[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: Provider[]): T[] {
        let maps = this.getServiceProviders(injector, target);
        let services = [];
        let pdr = injector.get(PROVIDERS).inject(...providers);
        if (!pdr.hasTokenKey(INJECTOR)) {
            pdr.inject(
                { provide: INJECTOR, useValue: injector },
                { provide: InjectorProxyToken, useValue: injector.getProxy() });
        }
        maps.iterator((fac) => {
            services.push(fac(pdr));
        });
        return services;
    }

    /**
     * get service providers.
     *
     * @template T
     * @param {Token<T>} target
     * @param {ServicesContext} [ctx]
     * @returns {IProvider}
     * @memberof Container
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider {
        let context = ServicesContext.parse(injector, isToken(target) ? { token: target } : target);
        this.proxy().getActionInjector()
            .getInstance(ResolveServicesScope)
            .execute(context);

        return context.services;
    }
}





export class ModuleProvider extends IocCoreService {

    constructor(private proxy: InjectorProxy<IContainer>) {
        super();
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.proxy().getInstance(ModuleLoader);
    }

    /**
     * load modules.
     *
     * @param {IInjector} injector
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    async load(injector: IInjector, ...modules: LoadType[]): Promise<Type[]> {
        let mdls = await this.getLoader().load(...modules);
        return this.proxy().getInstance(ActionInjectorToken).getInstance(InjLifeScope).register(injector, ...mdls);
    }
}
