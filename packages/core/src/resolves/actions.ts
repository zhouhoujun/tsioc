import {
    isNullOrUndefined, isClassType, InjectReference,
    IActionSetup, isToken, lang, ProviderType, PROVIDERS, refl, resovles
} from '@tsdi/ioc';
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
    if (isClassType(clasType)) {
        let tk = ctx.currTK;
        refl.get(clasType)
            .decors
            .some(dec => {
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
                if (injector.hasRegister(refDec)) {
                    ctx.instance = injector.get(refDec, ctx.providers);
                }
                return !!ctx.instance;
            });
    }

    if (isNullOrUndefined(ctx.instance)) {
        return next();
    }
};

export const RsvSuperServiceAction = function (ctx: ServiceContext, next?: () => void): void {
    let injector = ctx.injector;
    let tgtk = ctx.targetToken;
    if (isClassType(tgtk)) {
        refl.get(tgtk).class.extendTypes.some(ty => {
            ctx.instance = injector.resolve({ token: ctx.currTK, target: ty, tagOnly: true }, ctx.providers);
            return ctx.instance;
        });
    } else {
        ctx.instance = injector.resolve({ token: ctx.currTK, target: tgtk, tagOnly: true }, ctx.providers);
    }

    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

export const RsvTokenServiceAction = function (ctx: ServiceContext, next: () => void): void {
    let injector = ctx.injector;
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
        ctx.types = [
            ...ctx.tokens.map(t => isClassType(t) ? t : ctx.injector.getTokenProvider(t)).filter(t => t),
            ...ctx.types || []
        ];

        ctx.services = ctx.injector.get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            let defaultTk = ctx.defaultToken;
            if (defaultTk) {
                const injector = ctx.injector;
                let key = injector.getTokenKey(defaultTk);
                if (injector.hasRegister(key, ctx.alias)) {
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
        let injector = ctx.injector;
        let types = ctx.types;
        let services = ctx.services;
        let alias = ctx.alias;
        targetRefs.forEach(t => {
            let tk = isToken(t) ? t : lang.getClass(t);
            let maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((pdr, tk) => {
                    if (!services.has(tk, alias)
                        && (
                            (isClassType(tk) && types.some(ty => refl.get(tk)?.class.isExtends(ty)))
                            || (pdr.provider && types.some(ty => refl.get(pdr.provider)?.class.isExtends(ty)))
                        )
                    ) {
                        services.set(tk, pdr.value ? () => pdr.value : pdr.fac);
                    }
                });
            }
            const rlt = isClassType(tk) ? refl.get(tk) : null
            if (rlt) {
                rlt.decors.forEach(dec => {
                    if (dec.decorType === 'class') {
                        const dprvoider = dec.decorPdr.getProvider(injector)
                        dprvoider.iterator((pdr, tk) => {
                            if (!services.has(tk, alias)
                                && (
                                    (isClassType(tk) && types.some(ty => refl.get(tk)?.class.isExtends(ty)))
                                    || (pdr.provider && types.some(ty => refl.get(pdr.provider)?.class.isExtends(ty)))
                                )
                            ) {
                                services.set(tk, pdr.value ? () => pdr.value : pdr.fac);
                            }
                        });
                    }
                });
            }

            types.forEach(ty => {
                let reftk = new InjectReference(ty, tk);
                if (!services.has(reftk, alias) && injector.hasRegister(reftk)) {
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
    let types = ctx.types;
    let services = ctx.services;
    let alias = ctx.alias;
    ctx.injector.iterator((pdr, tk) => {
        if (!services.has(tk, alias)
            && (
                (isClassType(tk) && types.some(ty => refl.get(tk).class.isExtends(ty)))
                || (pdr.provider && types.some(ty => refl.get(pdr.provider).class.isExtends(ty)))
            )
        ) {
            services.set(tk, pdr.value ? () => pdr.value : pdr.fac);
        }
    }, true);

    next();
};
