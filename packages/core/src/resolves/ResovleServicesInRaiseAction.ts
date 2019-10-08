import { IocResolveServicesAction } from './IocResolveServicesAction';
import { isClassType, lang, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

export class ResovleServicesInRaiseAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        this.container.iterator((fac, tk) => {
            if (isClassType(tk) && ctx.types.some(ty => this.container.isExtends(tk, ty))) {
                ctx.services.register(tk, (...providers: ProviderTypes[]) => fac(...providers));
            }
        })
        next();
    }
}
