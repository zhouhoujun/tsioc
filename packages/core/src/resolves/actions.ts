import { isNil, InjectReference, IActionSetup, isToken, lang, ProviderType, PROVIDERS, refl, resovles, getTokenKey, isProvide, isFunction } from '@tsdi/ioc';
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
            let tokens = ctx.tokens;
            ctx.targetRefs.some(t => {
                let tgtk = isToken(t) ? t : lang.getClass(t);
                ctx.targetToken = tgtk;
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
    let clasType = ctx.targetToken;
    let injector = ctx.injector;
    if (isFunction(clasType)) {
        let tk = ctx.currTK;
        refl.get(clasType)
            .class.decors.some(dec => {
                if (dec.decorType !== 'class') {
                    return false;
                }
                const dprvoider = dec.decorPdr.getProvider(injector)
                if (dprvoider.has(tk)) {
                    ctx.instance = dprvoider.get(tk, ctx.providers);
                }
                if (ctx.instance) {
                    return true;
                }
                let refDec = new InjectReference(tk, dec.decor);
                if (injector.has(refDec, true)) {
                    ctx.instance = injector.get(refDec, ctx.providers);
                }
                return !!ctx.instance;
            });
    }

    if (isNil(ctx.instance)) {
        return next();
    }
};

export const RsvSuperServiceAction = function (ctx: ServiceContext, next?: () => void): void {
    let injector = ctx.injector;
    let tgtk = ctx.targetToken;
    if (isFunction(tgtk)) {
        refl.get(tgtk).class.extendTypes.some(ty => {
            ctx.instance = injector.resolve({ token: ctx.currTK, target: ty, tagOnly: true }, ctx.providers);
            return ctx.instance;
        });
    } else {
        ctx.instance = injector.resolve({ token: ctx.currTK, target: tgtk, tagOnly: true }, ctx.providers);
    }

    if (isNil(ctx.instance)) {
        next();
    }
};

export const RsvTokenServiceAction = function (ctx: ServiceContext, next: () => void): void {
    const injector = ctx.injector;
    ctx.tokens.some(tk => {
        ctx.instance = injector.resolve(tk, ctx.providers);
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
        const tkTypes = ctx.tokens.map(t => isProvide(t) ? ctx.injector.getTokenProvider(t) : t).filter(t => t);

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

        ctx.services = ctx.injector.getContainer().get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            let defaultTk = ctx.defaultToken;
            if (defaultTk) {
                const injector = ctx.injector;
                let key = getTokenKey(defaultTk);
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
    let targetRefs = ctx.targetRefs;

    if (targetRefs && targetRefs.length) {
        const injector = ctx.injector;
        const services = ctx.services;
        const alias = ctx.alias;
        const matchs = ctx.matchs;
        targetRefs.forEach(t => {
            const tk = isToken(t) ? t : lang.getClass(t);
            const maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((pdr, tk) => {
                    if (!services.has(tk, alias)
                        && (
                            (isFunction(tk) && matchs.some(mch => mch(tk)))
                            || (pdr.provider && matchs.some(mch => mch(pdr.provider)))
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
                                (isFunction(tk) && matchs.some(mch => mch(tk)))
                                || (pdr.provider && matchs.some(mch => mch(pdr.provider)))
                            )
                        ) {
                            services.set(tk, pdr, true);
                        }
                    });
                });
            }

            ctx.types.forEach(ty => {
                let reftk = new InjectReference(ty, tk);
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
    const matchs = ctx.matchs;
    const services = ctx.services;
    const alias = ctx.alias;
    ctx.injector.iterator((pdr, tk) => {
        if (!services.has(tk, alias)
            && (
                (isFunction(tk) && matchs.some(mch => mch(tk)))
                || (pdr.provider && matchs.some(mch => mch(pdr.provider)))
            )
        ) {
            services.set(tk, pdr, true);
        }
    }, true);

    next();
};
