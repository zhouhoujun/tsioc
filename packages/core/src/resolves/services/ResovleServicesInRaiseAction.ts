import { IocResolveServicesAction } from './IocResolveServicesAction';
import { isClassType, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

export class ResovleServicesInRaiseAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        ctx.injector.iterator((fac, tk) => {
            if (!ctx.services.has(tk) && isClassType(tk) && ctx.types.some(ty => ctx.reflects.isExtends(tk, ty))) {
                ctx.services.set(tk, (...providers: ProviderTypes[]) => fac(...providers));
            }
        })
        next();
    }
}
