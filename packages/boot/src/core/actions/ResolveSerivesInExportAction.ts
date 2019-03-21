import {
    ResolveServicesContext, IocResolveServicesAction, ResolveServicesScopeAction
} from '@ts-ioc/core';
import { DIModuleExports } from '../services';
import { Singleton, Autorun } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../ContainerPool';
import { IModuleResolver } from '../modules';


@Singleton
@Autorun('setup')
export class ResolveSerivesInExportAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx.getRaiseContainer().has(ContainerPoolToken)) {
            let curr = ctx.getRaiseContainer();
            curr.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                });

            // reset raise.
            curr.bindActionContext(ctx);
        }
        next();
    }

    depIterator(ctx: ResolveServicesContext, resolver: IModuleResolver) {
        ctx.setRaiseContainer(resolver.getContainer())
        ctx.setProviderContainer(resolver.getProviders());
        resolver.getContainer().get(ResolveServicesScopeAction).execute(ctx);
        if (resolver.has(DIModuleExports)) {
            resolver.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                })
        }
    }
}
