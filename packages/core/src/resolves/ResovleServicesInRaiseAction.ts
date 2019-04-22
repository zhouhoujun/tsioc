import { IocResolveServicesAction } from './IocResolveServicesAction';
import { isClassType, lang, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

export class ResovleServicesInRaiseAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext<any>, next: () => void): void {
        this.container.iterator((fac, tk) => {
            if (isClassType(tk) && ctx.types.some(ty => lang.isExtendsClass(tk, ty))) {
                ctx.services.add(tk, (...providers: ProviderTypes[]) => fac(...providers));
            }
        })
        next();
    }
}
