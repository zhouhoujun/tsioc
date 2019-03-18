import { IocResolveServicesAction, ResolveServicesContext } from '@ts-ioc/core';
import { DIModuleExports } from '../services';
import { isClassType, IResolverContainer, lang, ProviderTypes } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../ContainerPool';

export class ResolveSerivesInExportAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx.getRaiseContainer().has(ContainerPoolToken)) {
            let curr = ctx.getRaiseContainer();
            curr.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                });
        }
        next();
    }

    depIterator(ctx: ResolveServicesContext, resolver: IResolverContainer) {
        ctx.targetRefs.forEach(t => {
            resolver.iterator((fac, tk) => {
                if (isClassType(tk) && ctx.types.some(ty => lang.isExtendsClass(tk, ty))) {
                    ctx.services.add(tk, (...providers: ProviderTypes[]) => fac(...providers));
                }
            })
        });
        if (resolver.has(DIModuleExports)) {
            resolver.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                })
        }
    }

}