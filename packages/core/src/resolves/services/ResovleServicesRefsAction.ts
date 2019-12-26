import { isToken, InjectReference, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { IocResolveServicesAction } from './IocResolveServicesAction';
import { CTX_TARGET_REFS } from '../context-tokens';


export class ResovleServicesRefsAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        let targetRefs = ctx.get(CTX_TARGET_REFS);
        if (targetRefs && targetRefs.length) {
            let injector = ctx.injector;
            targetRefs.forEach(t => {
                let tk = isToken(t) ? t : t.getToken();
                ctx.types.forEach(ty => {
                    let reftk = new InjectReference(ty, tk);
                    if (!ctx.services.has(reftk) && injector.has(reftk)) {
                        ctx.services.set(reftk, (...providers: ProviderTypes[]) => injector.get(reftk, ...providers))
                    }
                });
            })
        }
        next();
    }
}
