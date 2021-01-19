import { isNil, InjectReference, IActionSetup, isToken, lang, ProviderType, PROVIDERS, refl, resovles, getTokenKey, isProvide, isFunction, isTypeObject, Token, IProvider, TypeReflect } from '@tsdi/ioc';
import { getParentClass, isBaseOf } from 'packages/ioc/src/utils/lang';
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
            ctx.targetRefs.some(t => {
                ctx.targetToken = isToken(t) ? t : lang.getClass(t);
                return ctx.tokens.some(tk => {
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
        let dprvoider: IProvider, refDec: Token;
        refl.get(ctx.targetToken)
            .class.decors.some(dec => {
                if (dec.decorType !== 'class') {
                    return false;
                }
                dprvoider = dec.decorPdr.getProvider(ctx.injector)
                if (dprvoider.has(ctx.currTK)) {
                    ctx.instance = dprvoider.get(ctx.currTK, ctx.providers);
                }
                if (ctx.instance) {
                    return true;
                }
                refDec = new InjectReference(ctx.currTK, dec.decor);
                if (ctx.injector.has(refDec, true)) {
                    ctx.instance = ctx.injector.get(refDec, ctx.providers);
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
        refl.get(ctx.targetToken).class.extendTypes.some(ty => {
            ctx.instance = ctx.injector.resolve({ token: ctx.currTK, target: ty, tagOnly: true }, ctx.providers);
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
    ctx.tokens.some(tk => {
        ctx.instance = ctx.injector.resolve(tk, ctx.providers);
        return !!ctx.instance;
    });

    if (!ctx.instance && next) {
        next();
    }
}



// services actions
export class ResolveServicesScope extends resovles.IocResolveScope implements IActionSetup {

    execute(ctx: ServicesContext, next?: () => void): void {
        if (!ctx.tokens || !ctx.tokens.length) {
            return;
        }

        const injector = ctx.injector;
        const tkTypes = ctx.tokens.map(t => isProvide(t) ? injector.getTokenProvider(t) : t).filter(t => t);

        if (ctx.types) {
            ctx.types.push(...tkTypes);
        } else {
            ctx.types = tkTypes;
        }

        const tymchs = ctx.types.map(t => getParentClass(t) ?
            (tag) => refl.get(tag)?.class.isExtends(t)
            : (tag) => isBaseOf(tag, t));

        if (ctx.matchs) {
            ctx.matchs.push(...tymchs);
        } else {
            ctx.matchs = tymchs;
        }

        ctx.services = injector.getContainer().get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            if (ctx.defaultToken) {
                let key = getTokenKey(ctx.defaultToken);
                if (injector.has(key, ctx.alias, true)) {
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
        const injector = ctx.injector;
        let tk: Token, reftk: Token;
        let maps: IProvider, dprvoider: IProvider;
        let rlt: TypeReflect;
        ctx.targetRefs.forEach(t => {
            tk = isTypeObject(t) ? lang.getClass(t) : t;
            maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((pdr, tk) => {
                    if (!ctx.services.has(tk, ctx.alias)
                        && (
                            (isFunction(tk) && ctx.matchs.some(mch => mch(tk)))
                            || (pdr.provider && ctx.matchs.some(mch => mch(pdr.provider)))
                        )
                    ) {
                        ctx.services.set(tk, pdr, true);
                    }
                });
            }
            rlt = isFunction(tk) ? refl.get(tk) : null
            if (rlt) {
                rlt.class.classDecors.forEach(dec => {
                    dprvoider = dec.decorPdr.getProvider(injector)
                    dprvoider.iterator((pdr, tk) => {
                        if (!ctx.services.has(tk, ctx.alias)
                            && (
                                (isFunction(tk) && ctx.matchs.some(mch => mch(tk)))
                                || (pdr.provider && ctx.matchs.some(mch => mch(pdr.provider)))
                            )
                        ) {
                            ctx.services.set(tk, pdr, true);
                        }
                    });
                });
            }

            ctx.types.forEach(ty => {
                reftk = new InjectReference(ty, tk);
                if (!ctx.services.has(reftk, ctx.alias) && injector.has(reftk)) {
                    ctx.services.set(reftk, (...providers: ProviderType[]) => injector.resolve(reftk, ...providers))
                }
            });
        });
    }
    if (!ctx.tagOnly) {
        next();
    }
};


export const RsvServicesAction = function (ctx: ServicesContext, next: () => void): void {
    ctx.injector.iterator((pdr, tk) => {
        if (!ctx.services.has(tk, ctx.alias)
            && (
                (isFunction(tk) && ctx.matchs.some(mch => mch(tk)))
                || (pdr.provider && ctx.matchs.some(mch => mch(pdr.provider)))
            )
        ) {
            ctx.services.set(tk, pdr, true);
        }
    }, true);

    next();
};
