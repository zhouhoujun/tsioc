import { IocCompositeAction } from '@tsdi/ioc';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ContainerPoolToken } from '../ContainerPoolToken';
import { RegFor } from '../modules';
import { IContainer } from '@tsdi/core';
import { RegModuleAction } from './RegModuleAction';
import { RegModuleImportsAction } from './RegModuleImportsAction';
import { RegModuleProvidersAction } from './RegModuleProvidersAction';
import { RegModuleResolverAction } from './RegModuleResolverAction';

export class AnnoationRegisterScope extends IocCompositeAction<AnnoationActionContext> {
    execute(ctx: AnnoationActionContext, next?: () => void): void {
        let pools = this.container.get(ContainerPoolToken);
        if (!ctx.regScope) {
            ctx.regScope = ctx.annoation.regFor || RegFor.child;
        }

        let container = ctx.getRaiseContainer() as IContainer;
        if (ctx.regScope === RegFor.boot) {
            return super.execute(ctx, next);
        }

        let moduleContainers: IContainer[] = [];
        switch (ctx.regScope) {
            case RegFor.root:
                moduleContainers.push(pools.getRoot());
                break;
            case RegFor.all:
                moduleContainers = pools.getContainers();
                break;
            case RegFor.child:
                moduleContainers.push(pools.create(container));
                break;
        }

        if (moduleContainers.length === 1) {
            ctx.setRaiseContainer(moduleContainers[0]);
            return super.execute(ctx, next);
        } else if (moduleContainers.length > 1) {
            moduleContainers.forEach(c => () => {
                ctx.setRaiseContainer(c);
                super.execute(ctx);
            });
            // reset raise
            ctx.setRaiseContainer(container);
            return next();
        }

    }

    setup() {
        this.use(RegModuleAction)
            .use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleResolverAction);
    }
}
