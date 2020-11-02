import {
    DecoratorProvider, isNullOrUndefined, isClassType, InjectReference,
    IActionSetup, isToken, lang, Provider, PROVIDERS, refl, resovles
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
        this.use(RsvTagSericeScope)
            .use(RsvTokenServiceAction);
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
        this.use(RsvSuperServiceAction)
            .use(RsvDecorServiceAction);
    }
}


export const RsvDecorServiceAction = function (ctx: ServiceContext, next: () => void): void {
    let clasType = ctx.targetToken;
    let injector = ctx.injector;
    if (isClassType(clasType)) {
        let dprvoider = injector.getContainer().getActionInjector().getInstance(DecoratorProvider);
        let tk = ctx.currTK;
        refl.getIfy(clasType)
            .decors
            .some(dec => {
                if (dprvoider.has(dec.decor, tk)) {
                    ctx.instance = dprvoider.resolve(dec.decor, tk, ctx.providers);
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
        refl.getIfy(tgtk).class.extendTypes.some(ty => {
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
            ...ctx.tokens.map(t => ctx.injector.getTokenProvider(t)).filter(t => t),
            ...ctx.types || []
        ];

        ctx.services = ctx.injector.get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            let defaultTk = ctx.defaultToken;
            if (defaultTk) {
                let key = ctx.injector.getTokenKey(defaultTk);
                if (ctx.injector.hasRegister(key, ctx.alias)) {
                    ctx.services.set(key, ctx.injector.getTokenFactory(key));
                }
            }
        }
    }

    setup() {
        this.use(RsvSuperServicesAction)
            .use(RsvServicesAction);
    }
}



export const RsvSuperServicesAction = function (ctx: ServicesContext, next: () => void): void {
    let targetRefs = ctx.targetRefs;

    if (targetRefs && targetRefs.length) {
        let injector = ctx.injector;
        let types = ctx.types;
        let services = ctx.services;
        let dprvoider = injector.getContainer().getActionInjector().getInstance(DecoratorProvider);
        let alias = ctx.alias;
        targetRefs.forEach(t => {
            let tk = isToken(t) ? t : lang.getClass(t);
            let maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((fac, tk) => {
                    if (!services.has(tk, alias) && isClassType(tk) && types.some(ty => refl.getIfy(tk).class.isExtends(ty))) {
                        services.set(tk, fac);
                    }
                });
            }
            if (isClassType(tk)) {
                const rlt = refl.getIfy(tk);
                rlt.decors.some(dec => {
                    dprvoider.getProviders(dec.decor)?.iterator((fac, tk) => {
                        if (!services.has(tk, alias) && isClassType(tk) && types.some(ty => rlt.class.isExtends(ty))) {
                            services.set(tk, fac);
                        }
                    });
                });
            }
            types.forEach(ty => {
                let reftk = new InjectReference(ty, tk);
                if (!services.has(reftk, alias) && injector.hasRegister(reftk)) {
                    services.set(reftk, (...providers: Provider[]) => injector.resolve(reftk, ...providers))
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
    ctx.injector.iterator((fac, tk) => {
        if (!services.has(tk, alias) && isClassType(tk) && types.some(ty => refl.getIfy(tk).class.isExtends(ty))) {
            services.set(tk, fac);
        }
    }, true)
    next();
};
