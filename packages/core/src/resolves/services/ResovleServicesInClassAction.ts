import { isToken, InjectReference, isClassType, ProviderTypes, lang, PROVIDERS } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { CTX_TARGET_REFS } from '../../context-tokens';


export const ResovleServicesInClassAction = function (ctx: ResolveServicesContext, next: () => void): void {
    let targetRefs = ctx.getValue(CTX_TARGET_REFS);
    let injector = ctx.injector;
    if (targetRefs && targetRefs.length) {
        targetRefs.forEach(t => {
            let tk = isToken(t) ? t : lang.getClass(t);
            let maps = injector.get(new InjectReference(PROVIDERS, tk));
            if (maps && maps.size) {
                maps.iterator((fac, tk) => {
                    if (!ctx.services.has(tk) && isClassType(tk) && ctx.types.some(ty => ctx.reflects.isExtends(tk, ty))) {
                        ctx.services.set(tk, (...providers: ProviderTypes[]) => fac(...providers));
                    }
                })
            } else {
                ctx.types.forEach(ty => {
                    let reftk = new InjectReference(ty, tk);
                    if (!ctx.services.has(reftk) && injector.hasRegister(reftk)) {
                        ctx.services.set(reftk, (...providers: ProviderTypes[]) => injector.get(reftk, ...providers))
                    }
                });
            }
        });
    }
    next();
};
