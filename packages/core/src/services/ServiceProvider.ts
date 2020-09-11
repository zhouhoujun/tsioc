import { IocCoreService, IInjector, Token, Provider, isToken, IProvider, INJECTOR, InjectorProxyToken, PROVIDERS, InjectorProxy } from '@tsdi/ioc';
import { ServiceOption, ServiceContext, ServicesOption, ServicesContext } from '../resolves/context';
import { ResolveServiceScope, ResolveServicesScope } from '../resolves/actions';
import { IServiceResolver } from './IServiceResolver';
import { IServicesResolver } from './IServicesResolver';
import { IContainer } from '../IContainer';

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
