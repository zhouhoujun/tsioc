import { isNil, InjectReference, IActionSetup, lang, ProviderType, PROVIDERS, refl, resovles, getTokenKey, isProvide, isFunction, isTypeObject } from '@tsdi/ioc';
import { ServiceContext, ServicesContext } from './context';

// service actions
export class ResolveServiceScope extends resovles.IocResolveScope<ServiceContext> implements IActionSetup {
    execute(ctx: ServiceContext, next?: () => void): void {
        if (ctx.instance || !ctx.tokens || !ctx.tokens.length) {
            return;
        }

        super.execute(ctx);

        next && next();

        if (!ctx.instance) {
            if (ctx.defaultToken) {
                ctx.instance = ctx.injector.get(ctx.defaultToken, ctx.providers);
            }
        }
    }

    setup() {
        this.use(RsvTagSericeScope, RsvTokenServiceAction);
    }
}


export class RsvTagSericeScope extends resovles.IocResolveScope<ServiceContext> implements IActionSetup {

    execute(ctx: ServiceContext, next?: () => void): void {
        if (ctx.targetRefs) {
            const tokens = ctx.tokens;
            ctx.targetRefs.some(t => {
                ctx.targetToken = isTypeObject(t) ? lang.getClass(t) : t;
                return tokens.some(tk => {
                    ctx.currTK = tk;
                    super.execute(ctx);
                    return !!ctx.instance;
                });
            });

            ctx.currTK = null;
        }
        if (!ctx.instance) {
            next && next();
        }
    }

    setup() {
        this.use(RsvSuperServiceAction, RsvDecorServiceAction);
    }
}


export const RsvDecorServiceAction = function (ctx: ServiceContext, next: () => void): void {
    if (isFunction(ctx.targetToken)) {
        const { injector, providers, currTK } = ctx;
        refl.get(ctx.targetToken)
            .class.decors.some(dec => {
                if (dec.decorType !== 'class') {
                    return false;
                }
                const dprvoider = dec.decorPdr.getProvider(injector)
                if (dprvoider.has(currTK)) {
                    ctx.instance = dprvoider.get(currTK, providers);
                }
                if (ctx.instance) {
                    return true;
                }
                const refDec = new InjectReference(currTK, dec.decor);
                if (injector.has(refDec, true)) {
                    ctx.instance = injector.get(refDec, providers);
                }
                return !!ctx.instance;
            });
    }

    if (isNil(ctx.instance)) {
        return next();
    }
};

export const RsvSuperServiceAction = function (ctx: ServiceContext, next?: () => void): void {
    if (isFunction(ctx.targetToken)) {
        const { injector, currTK, providers } = ctx;
        refl.get(ctx.targetToken).class.extendTypes.some(ty => {
            ctx.instance = injector.resolve({ token: currTK, target: ty, tagOnly: true }, providers);
            return ctx.instance;
        });
    } else {
        ctx.instance = ctx.injector.resolve({ token: ctx.currTK, target: ctx.targetToken, tagOnly: true }, ctx.providers);
    }

    if (isNil(ctx.instance)) {
        next();
    }
};

export const RsvTokenServiceAction = function (ctx: ServiceContext, next: () => void): void {
    const { injector, providers } = ctx;
    ctx.tokens.some(tk => {
        ctx.instance = injector.resolve(tk, providers);
        return !!ctx.instance;
    });

    if (!ctx.instance && next) {
        next();
    }
}

/**
 * default service type match.
 * @param tag
 * @param base 
 */
const typeMatch = (tag, base) => lang.getParentClass(base) ? refl.get(tag)?.class.isExtends(base) ?? lang.isExtendsClass(tag, base) : lang.isBaseOf(tag, base);

// services actions
export class ResolveServicesScope extends resovles.IocResolveScope implements IActionSetup {

    execute(ctx: ServicesContext, next?: () => void): void {
        if (!ctx.tokens || !ctx.tokens.length) {
            return;
        }


        const tkTypes = ctx.tokens.map(t => isProvide(t) ? ctx.injector.getTokenProvider(t) : t).filter(t => t);

        if (ctx.types) {
            ctx.types.push(...tkTypes);
        } else {
            ctx.types = tkTypes;
        }

        if (!ctx.match) {
            ctx.match = typeMatch;
        }

        ctx.services = ctx.injector.getContainer().get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            if (ctx.defaultToken) {
                const key = getTokenKey(ctx.defaultToken, ctx.alias);
                const injector = ctx.injector;
                if (injector.has(key, true)) {
                    ctx.services.set(key, (...prds) => injector.getInstance(key, ...prds));
                }
            }
        }
    }

    setup() {
        this.use(RsvSuperServicesAction, RsvServicesAction);
    }
}



export const RsvSuperServicesAction = function (ctx: ServicesContext, next: () => void): void {
    if (ctx.targetRefs && ctx.targetRefs.length) {
        const { injector, services, alias, types, match } = ctx;
        ctx.targetRefs.forEach(t => {
            const tk = isTypeObject(t) ? lang.getClass(t) : t;
            const maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((pdr, tk) => {
                    if (!services.has(tk, alias)
                        && (
                            (isFunction(tk) && types.some(ty => match(tk, ty)))
                            || (pdr.provider && types.some(ty => match(pdr.provider, ty)))
                        )
                    ) {
                        services.set(tk, pdr, true);
                    }
                });
            }
            const rlt = isFunction(tk) ? refl.get(tk) : null
            if (rlt) {
                rlt.class.classDecors.forEach(dec => {
                    const dprvoider = dec.decorPdr.getProvider(injector)
                    dprvoider.iterator((pdr, tk) => {
                        if (!services.has(tk, alias)
                            && (
                                (isFunction(tk) && types.some(ty => match(tk, ty)))
                                || (pdr.provider && types.some(ty => match(pdr.provider, ty)))
                            )
                        ) {
                            services.set(tk, pdr, true);
                        }
                    });
                });
            }

            ctx.types.forEach(ty => {
                const reftk = new InjectReference(ty, tk);
                if (!services.has(reftk, alias) && injector.has(reftk)) {
                    services.set(reftk, (...providers: ProviderType[]) => injector.resolve(reftk, ...providers))
                }
            });
        });
    }
    if (!ctx.tagOnly) {
        next();
    }
};


export const RsvServicesAction = function (ctx: ServicesContext, next: () => void): void {
    const { services, alias, types, match } = ctx;
    ctx.injector.iterator((pdr, tk) => {
        if (!services.has(tk, alias)
            && (
                (isFunction(tk) && types.some(ty => match(tk, ty)))
                || (pdr.provider && types.some(ty => match(pdr.provider, ty)))
            )
        ) {
            services.set(tk, pdr, true);
        }
    }, true);

    next();
};
