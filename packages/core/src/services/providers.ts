import {
    IInjector, Token, ProviderType, IProvider, isArray, IContainer,
    ServiceOption, ServicesOption, isPlainObject, lang, IServiceProvider
} from '@tsdi/ioc';
import { ServiceContext, ServicesContext } from '../resolves/context';
import { ResolveServiceScope, ResolveServicesScope } from '../resolves/actions';

/**
 * service provider.
 */
export class ServiceProvider implements IServiceProvider {

    static ρNPT = true;
    private serviceScope: ResolveServiceScope;
    private servicesScope: ResolveServicesScope;

    constructor(private readonly container: IContainer) { }

    /**
     *  get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T {
        let option: ServiceOption<T>;
        if (isPlainObject(target)) {
            option = target as ServiceOption<T>;
            if (option.providers) providers.unshift(...option.providers);
        } else {
            option = { token: target };
        }

        const pdr = injector.parseProvider(...providers);

        const context = {
            injector,
            ...option,
            providers: pdr
        } as ServiceContext;

        this.initTargetRef(context);

        if (!this.serviceScope) {
            this.serviceScope = this.container.action().getInstance(ResolveServiceScope);
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
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        const maps = this.getServiceProviders(injector, target);
        const services = [];
        if (!maps.size) return services;

        if (isPlainObject(target)) {
            providers.unshift(...(target as ServicesOption<T>).providers || []);
        }
        const pdr = injector.parseProvider(...providers);

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
            ...isPlainObject(target) ? target : { token: target },
            providers: null,
        } as ServicesContext;

        this.initTargetRef(context);
        if (!this.servicesScope) {
            this.servicesScope = this.container.action().getInstance(ResolveServicesScope);
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
            tokens = tokens.filter(t => t)
        }
        if (ctx.token) {
            tokens.unshift(ctx.token);
        }
        ctx.tokens = tokens;
    }
}
