import {
    IocResolveScope, IActionSetup, PROVIDERS, isClassType, DecoratorProvider,
    isToken, lang, InjectReference, ProviderTypes
} from '@tsdi/ioc';
import { ServicesContext } from './ServicesContext';
import { CTX_TARGET_REFS } from '../context-tokens';


export class ResolveServicesScope extends IocResolveScope implements IActionSetup {

    execute(ctx: ServicesContext, next?: () => void): void {
        if (!ctx.tokens || !ctx.tokens.length) {
            return;
        }
        ctx.services = ctx.injector.get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            // after all resolve default.
            let defaultTk = ctx.defaultToken;
            if (defaultTk) {
                let key = ctx.injector.getTokenKey(defaultTk);
                if (ctx.injector.hasRegister(key, ctx.alias)) {
                    ctx.services.set(key, ctx.injector.getTokenFactory(key));
                }
            }
        }
        // after all clean.
        ctx.destroy();
    }
    setup() {
        this.use(RsvSuperServicesAction)
            .use(RsvServicesAction);
    }
}



export const RsvSuperServicesAction = function (ctx: ServicesContext, next: () => void): void {
    let targetRefs = ctx.getValue(CTX_TARGET_REFS);

    if (targetRefs && targetRefs.length) {
        let reflects = ctx.reflects;
        let injector = ctx.injector;
        let types = ctx.types;
        let services = ctx.services;
        let dprvoider = reflects.getActionInjector().getInstance(DecoratorProvider);
        let alias = ctx.alias;
        targetRefs.forEach(t => {
            let tk = isToken(t) ? t : lang.getClass(t);
            let maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((fac, tk) => {
                    if (!services.has(tk, alias) && isClassType(tk) && types.some(ty => reflects.isExtends(tk, ty))) {
                        services.set(tk, fac);
                    }
                });
            }
            if (isClassType(tk)) {
                reflects.getDecorators(tk)
                    .some(dec => {
                        dprvoider.getProviders(dec)?.iterator((fac, tk) => {
                            if (!services.has(tk, alias) && isClassType(tk) && types.some(ty => reflects.isExtends(tk, ty))) {
                                services.set(tk, fac);
                            }
                        });
                    });
            }
            types.forEach(ty => {
                let reftk = new InjectReference(ty, tk);
                if (!services.has(reftk, alias) && injector.hasRegister(reftk)) {
                    services.set(reftk, (...providers: ProviderTypes[]) => injector.resolve(reftk, ...providers))
                }
            });
        });
    }
    if (!ctx.getOptions().tagOnly) {
        next();
    }
};


export const RsvServicesAction = function (ctx: ServicesContext, next: () => void): void {
    let types = ctx.types;
    let services = ctx.services;
    let reflects = ctx.reflects;
    let alias = ctx.alias;
    ctx.injector.iterator((fac, tk) => {
        if (!services.has(tk, alias) && isClassType(tk) && types.some(ty => reflects.isExtends(tk, ty))) {
            services.set(tk, fac);
        }
    }, true)
    next();
};
