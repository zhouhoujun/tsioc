import { IocResolveServicesAction } from './IocResolveServicesAction';
import { Singleton, isToken, InjectReference, ProviderTypes } from '@ts-ioc/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

@Singleton
export class ResovleServicesRefsAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx.targetRefs && ctx.targetRefs.length) {
            ctx.targetRefs.forEach(t => {
                let tk = isToken(t) ? t : t.getToken();
                ctx.types.forEach(ty => {
                    let reftk = new InjectReference(ty, tk);
                    if (this.container.has(reftk)) {
                        ctx.services.add(reftk, (...providers: ProviderTypes[]) => this.container.get(reftk, ...providers))
                    }
                });
            })
        }
        next();
    }
}
