import { IocResolveServicesAction } from './IocResolveServicesAction';
import { Singleton, isClassType, lang, ProviderTypes } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

@Singleton
export class ResovleServicesInRaiseAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        this.container.iterator((fac, tk) => {
            if (isClassType(tk) && ctx.types.some(ty => lang.isExtendsClass(tk, ty))) {
                ctx.services.add(tk, (...providers: ProviderTypes[]) => fac(...providers));
            }
        })
        next();
    }
}
