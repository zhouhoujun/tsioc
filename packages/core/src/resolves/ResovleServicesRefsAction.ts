import { isToken, InjectReference, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { IocResolveServicesAction } from './IocResolveServicesAction';
import { CTX_TARGET_REFS } from '../context-tokens';


export class ResovleServicesRefsAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        let targetRefs = ctx.get(CTX_TARGET_REFS);
        if (targetRefs && targetRefs.length) {
            targetRefs.forEach(t => {
                let tk = isToken(t) ? t : t.getToken();
                ctx.types.forEach(ty => {
                    let reftk = new InjectReference(ty, tk);
                    if (this.container.has(reftk)) {
                        ctx.services.register(reftk, (...providers: ProviderTypes[]) => this.container.get(reftk, ...providers))
                    }
                });
            })
        }
        next();
    }
}
