import {
    IInjector, Token, ProviderType, IProvider, isArray, IContainer,
    ServicesOption, isPlainObject, lang, ServicesProvider, TARGET, resolveRecord, isFunction
} from '@tsdi/ioc';
import { ServiceContext, ServicesContext } from '../resolves/context';
import { ResolveServicesScope } from '../resolves/actions';

/**
 * service provider.
 */
export class Services implements ServicesProvider {

    static ρNPT = true;
    private servicesScope: ResolveServicesScope;

    constructor(private readonly container: IContainer) { }

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
            if ((target as ServicesOption<T>).target) {
                providers.push({ provide: TARGET, useValue: (target as ServicesOption<T>).target });
            }
            providers.unshift(...(target as ServicesOption<T>).providers || []);
        }
        const pdr = injector.toProvider(providers, true);

        maps.iterator(p => {
            services.push(resolveRecord(p, pdr));
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
            injector: injector,
            ...isPlainObject(target) ? target : { token: target },
            providers: null,
        } as ServicesContext;

        this.initTargetRef(context);
        if (!this.servicesScope) {
            this.servicesScope = this.container.action().get(ResolveServicesScope);
        }
        this.servicesScope.execute(context);
        const services = context.services;
        // clean obj.
        lang.cleanObj(context);
        return services;
    }

    private initTargetRef(ctx: ServiceContext) {
        let targets = (isArray(ctx.target) ? ctx.target : [ctx.target]).filter(t => t).map(tr=> isFunction(tr) ? tr : lang.getClass(tr));
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
