import {
    Injector, Token, ProviderType, isArray, Container,
    ServicesOption, isPlainObject, lang, ServicesProvider, TARGET, isFunction
} from '@tsdi/ioc';
import { ServiceContext, ServicesContext } from '../resolves/context';
import { ResolveServicesScope } from '../resolves/actions';

/**
 * service provider.
 */
export class Services implements ServicesProvider {

    static ρNPT = true;
    private servicesScope: ResolveServicesScope;

    constructor(private readonly container: Container) { }

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(injector: Injector, target: Token<T> | ServicesOption<T>): T[] {

        let providers: ProviderType[];
        if (isPlainObject(target)) {
            providers = (target as ServicesOption<T>).providers || [];
            if ((target as ServicesOption<T>).target) {
                providers.push({ provide: TARGET, useValue: (target as ServicesOption<T>).target });
            }
        }
        let context = {
            injector: injector,
            ...isPlainObject(target) ? target : { token: target },
        } as ServicesContext;

        this.initTargetRef(context);
        if (!this.servicesScope) {
            this.servicesScope = this.container.action().get(ResolveServicesScope);
        }

        const services = [];
        this.servicesScope.execute(context);
        context.services.forEach(fn => {
            services.push(fn(providers));
        });
        context.services.clear();
        // clean obj.
        lang.cleanObj(context);
        return services;
    }

    private initTargetRef(ctx: ServiceContext) {
        let targets = (isArray(ctx.target) ? ctx.target : [ctx.target]).filter(t => t).map(tr => isFunction(tr) ? tr : lang.getClass(tr));
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
