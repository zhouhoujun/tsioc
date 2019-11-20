import { IocResolveServicesAction } from './IocResolveServicesAction';
import { isToken, InjectReference, ProviderMap, isClassType, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { CTX_TARGET_REFS } from './ResolveServiceContext';


export class ResovleServicesInTargetAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        let targetRefs = ctx.getContext(CTX_TARGET_REFS);
        if (targetRefs && targetRefs.length) {
            targetRefs.forEach(t => {
                let tk = isToken(t) ? t : t.getToken();
                let maps = this.container.get(new InjectReference(ProviderMap, tk));
                if (maps && maps.size) {
                    maps.iterator((fac, tk) => {
                        if (isClassType(tk) && ctx.types.some(ty => ctx.reflects.isExtends(tk, ty))) {
                            ctx.services.register(tk, (...providers: ProviderTypes[]) => fac(...providers));
                        }
                    })
                }
            });
            if (ctx.both) {
                next();
            }
        } else {
            next();
        }
    }
}
