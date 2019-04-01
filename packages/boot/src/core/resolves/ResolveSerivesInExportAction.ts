import {
    ResolveServicesContext, IocResolveServicesAction, ResolveServicesScopeAction
} from '@tsdi/core';
import { DIModuleExports } from '../services';
import { Singleton, Autorun } from '@tsdi/ioc';
import { ContainerPoolToken } from '../ContainerPool';
import { IModuleResolver } from '../modules';


@Singleton
@Autorun('setup')
export class ResolveSerivesInExportAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext<any>, next: () => void): void {
        if (this.container.has(ContainerPoolToken)) {
            this.container.get(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                });

        }
        next();
    }

    depIterator(ctx: ResolveServicesContext<any>, resolver: IModuleResolver) {
        resolver.getContainer().get(ResolveServicesScopeAction).execute(ctx);
        if (resolver.has(DIModuleExports)) {
            resolver.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                })
        }
    }
}
