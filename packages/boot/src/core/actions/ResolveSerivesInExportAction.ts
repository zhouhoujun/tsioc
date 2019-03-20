import {
    ResolveServicesContext, ResovleServicesInTargetAction,
    ResovleServicesInRaiseAction, ResovleServicesRefsAction
} from '@ts-ioc/core';
import { DIModuleExports } from '../services';
import { IResolverContainer, Singleton, IocCompositeAction, Autorun } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../ContainerPool';


@Singleton
@Autorun('setup')
export class ResolveSerivesInExportAction extends IocCompositeAction<ResolveServicesContext> {

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

    depIterator(ctx: ResolveServicesContext, resolver: IResolverContainer) {
        resolver.bindActionContext(ctx);
        super.execute(ctx);
        if (resolver.has(DIModuleExports)) {
            resolver.resolve(DIModuleExports).getResolvers()
                .forEach(r => {
                    this.depIterator(ctx, r);
                })
        }
    }

    setup() {
        this.use(ResovleServicesInTargetAction)
            .use(ResovleServicesRefsAction)
            .use(ResovleServicesInRaiseAction);
    }
}
