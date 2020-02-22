import { isToken, InjectReference, isClassType, ProviderTypes, lang, PROVIDERS, DecoratorProvider } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { CTX_TARGET_REFS } from '../../context-tokens';


export const ResovleServicesInClassAction = function (ctx: ResolveServicesContext, next: () => void): void {
    let targetRefs = ctx.getValue(CTX_TARGET_REFS);

    if (targetRefs && targetRefs.length) {
        let reflects = ctx.reflects;
        let injector = ctx.injector;
        let types = ctx.types;
        let services = ctx.services;
        let dprvoider = reflects.getActionInjector().getInstance(DecoratorProvider);
        targetRefs.forEach(t => {
            let tk = isToken(t) ? t : lang.getClass(t);
            let maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((fac, tk) => {
                    if (!services.has(tk) && isClassType(tk) && types.some(ty => reflects.isExtends(tk, ty))) {
                        services.set(tk, (...providers: ProviderTypes[]) => fac(...providers));
                    }
                });
            }
            if (isClassType(tk)) {
                reflects.getDecorators(tk)
                    .some(dec => {
                        dprvoider.getProviders(dec)?.iterator((fac, tk) => {
                            if (!services.has(tk) && isClassType(tk) && types.some(ty => reflects.isExtends(tk, ty))) {
                                services.set(tk, (...providers: ProviderTypes[]) => fac(...providers));
                            }
                        });
                    });
            }
            types.forEach(ty => {
                let reftk = new InjectReference(ty, tk);
                if (!services.has(reftk) && injector.hasRegister(reftk)) {
                    services.set(reftk, (...providers: ProviderTypes[]) => injector.resolve(reftk, ...providers))
                }
            });
        });
    }
    if (!ctx.getOptions().tagOnly) {
        next();
    }
};
