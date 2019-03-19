import { IocResolveServicesAction, ResolveServicesContext } from './IocResolveServicesAction';
import { Singleton, isClassType, lang, ProviderTypes } from '@ts-ioc/ioc';

@Singleton
export class ResovleServicesInRaiseAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        let container = ctx.getRaiseContainer();
        if (ctx.targetRefs && ctx.targetRefs.length) {
            ctx.targetRefs.forEach(t => {
                container.iterator((fac, tk) => {
                    if (isClassType(tk) && ctx.types.some(ty => lang.isExtendsClass(tk, ty))) {
                        ctx.services.add(tk, (...providers: ProviderTypes[]) => fac(...providers));
                    }
                })
            });
        }

        next();
    }
}
