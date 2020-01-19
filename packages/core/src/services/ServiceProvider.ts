import { IocCoreService, IInjector, Token, ProviderTypes, isToken, IProviders, ContainerProxy, INJECTOR, InjectorProxyToken } from '@tsdi/ioc';
import { ServiceOption, ResolveServiceContext } from '../resolves/service/ResolveServiceContext';
import { ResolveServiceScope } from '../resolves/service/ResolveServiceScope';
import { ServicesOption, ResolveServicesContext } from '../resolves/services/ResolveServicesContext';
import { ResolveServicesScope } from '../resolves/services/ResolveServicesScope';
import { IServiceResolver } from './IServiceResolver';
import { IServicesResolver } from './IServicesResolver';

export class ServiceProvider extends IocCoreService implements IServiceResolver, IServicesResolver {
    constructor(private proxy: ContainerProxy) {
        super();
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
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderTypes[]): T {
        let context = ResolveServiceContext.parse(injector, isToken(target) ? { token: target } : target);
        providers.length && context.providers.inject(...providers);
        context.providers.inject(
            { provide: INJECTOR, useValue: injector },
            { provide: InjectorProxyToken, useValue: injector.getProxy() });
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
     * @param {...ProviderTypes[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderTypes[]): T[] {
        let maps = this.getServiceProviders(injector, target);
        let services = [];
        maps.iterator((fac) => {
            services.push(fac(...providers,
                { provide: INJECTOR, useValue: injector },
                { provide: InjectorProxyToken, useValue: injector.getProxy()}));
        });
        return services;
    }

    /**
     * get service providers.
     *
     * @template T
     * @param {Token<T>} target
     * @param {ResolveServicesContext} [ctx]
     * @returns {IProviders}
     * @memberof Container
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProviders {
        let context = ResolveServicesContext.parse(injector, isToken(target) ? { token: target } : target);
        this.proxy().getActionInjector()
            .getInstance(ResolveServicesScope)
            .execute(context);

        return context.services;
    }
}
