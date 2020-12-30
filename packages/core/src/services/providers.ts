import { IocCoreService, IInjector, Token, ProviderType, isToken, IProvider, INJECTOR, PROVIDERS, isArray, lang, IContainer, Injector, InjectorProxyToken, IServiceProvider, getTokenKey } from '@tsdi/ioc';
import { ServiceOption, ServiceContext, ServicesOption, ServicesContext } from '../resolves/context';
import { ResolveServiceScope, ResolveServicesScope } from '../resolves/actions';


export class ServiceProvider extends IocCoreService implements IServiceProvider {

    private serviceScope: ResolveServiceScope;
    private servicesScope: ResolveServicesScope;
    constructor(private readonly container: IContainer) {
        super();
    }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...ProviderType[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T {
        providers.unshift({ provide: INJECTOR, useValue: injector }, { provide: Injector, useValue: injector }, { provide: InjectorProxyToken, useValue: injector.getProxy()});
        let context = {
            injector,
            ...isToken(target) ? { token: target } : target
        } as ServiceContext;
        if (isArray(context.providers)) {
            context.providers = injector.get(PROVIDERS).inject(...context.providers);
        } else {
            context.providers = injector.get(PROVIDERS);
        }
        let pdr = context.providers;
        providers.length && pdr.inject(...providers);
        this.initTargetRef(context);

        if (!this.serviceScope) {
            this.serviceScope = this.container.provider.getInstance(ResolveServiceScope);
        }

        this.serviceScope.execute(context);
        const instance = context.instance;
        // clean obj.
        lang.cleanObj(context);
        return instance || null;
    }

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        let maps = this.getServiceProviders(injector, target);
        let services = [];

        providers.unshift({ provide: INJECTOR, useValue: injector }, { provide: Injector, useValue: injector }, { provide: InjectorProxyToken, useValue: injector.getProxy()});
        let pdr = injector.get(PROVIDERS).inject(...providers);

        maps.iterator(p => {
            services.push(p.value ? p.value : p.fac(pdr));
        });
        return services;
    }

    /**
     * get service providers.
     *
     * @template T
     * @param {IInjector} injector
     * @param {Token<T> | ServicesOption<T>} target
     * @returns {IProvider}
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider {
        let context = {
            injector,
            ...isToken(target) ? { token: target } : target
        } as ServicesContext;
        if (isArray(context.providers)) {
            context.providers = injector.get(PROVIDERS).inject(...context.providers);
        } else {
            context.providers = injector.get(PROVIDERS);
        }
        this.initTargetRef(context);
        if (!this.servicesScope) {
            this.servicesScope = this.container.provider.getInstance(ResolveServicesScope);
        }
        this.servicesScope.execute(context);
        const services = context.services;
        // clean obj.
        lang.cleanObj(context);
        return services;
    }

    private initTargetRef(ctx: ServiceContext) {
        let targets = (isArray(ctx.target) ? ctx.target : [ctx.target]).filter(t => t);
        if (targets.length) {
            ctx.targetRefs = targets;
        }
        let tokens = ctx.tokens || [];
        if (tokens.length) {
            tokens = tokens.filter(t => t).map(t => getTokenKey(t, ctx.alias));
        }
        if (ctx.token) {
            tokens.unshift(getTokenKey(ctx.token, ctx.alias));
        }
        ctx.tokens = tokens;
        ctx.reflects = this.container.getTypeReflects();
    }
}
