import {
    ResolveServicesContext, IocResolveServicesAction, ResolveServicesScope
} from '@tsdi/core';
import { DIModuleExports } from '../services';
import { IModuleResolver } from '../modules';


export class ResolveSerivesInExportAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext<any>, next: () => void): void {
        this.container.get(DIModuleExports).getResolvers()
            .forEach(r => {
                this.depIterator(ctx, r);
            });

        next();
    }

    depIterator(ctx: ResolveServicesContext<any>, resolver: IModuleResolver) {
        resolver.getContainer().get(ResolveServicesScope).execute(ctx);
        if (resolver.has(DIModuleExports)) {
            resolver.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                })
        }
    }
}
