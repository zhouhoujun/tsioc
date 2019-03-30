import { IocCompositeAction } from '@tsdi/ioc';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ContainerPoolToken } from '../ContainerPool';
import { RegScope } from '../modules';
import { IContainer } from '@tsdi/core';
import { RegModuleAction } from './RegModuleAction';
import { RegModuleImportsAction } from './RegModuleImportsAction';
import { RegModuleProvidersAction } from './RegModuleProvidersAction';
import { RegModuleResolverAction } from './RegModuleResolverAction';

export class AnnoationRegisterScope extends IocCompositeAction<AnnoationActionContext> {
    async execute(ctx: AnnoationActionContext, next?: () => void): Promise<void> {
        let pools = this.container.get(ContainerPoolToken);
        if (!ctx.regScope) {
            ctx.regScope = ctx.annoation.regScope || RegScope.child;
        }

        let container = ctx.getRaiseContainer() as IContainer;
        if (ctx.regScope === RegScope.boot) {
            await super.execute(ctx, next);
        } else {
            let moduleContainers: IContainer[] = [];
            switch (ctx.regScope) {
                case RegScope.root:
                    moduleContainers.push(pools.getRoot());
                    break;
                case RegScope.all:
                    moduleContainers = pools.getContainers();
                    break;
                case RegScope.child:
                    moduleContainers.push(pools.create(container));
                    break;
            }

            if (moduleContainers.length === 1) {
                ctx.setRaiseContainer(moduleContainers[0]);
                super.execute(ctx, next);
            } else if (moduleContainers.length > 1) {
                moduleContainers.forEach(c => () => {
                    ctx.setRaiseContainer(c);
                    return super.execute(ctx);
                });
                // reset raise
                ctx.setRaiseContainer(container);
                await next();
            }
        }
    }

    setup() {
        this.registerAction(RegModuleAction)
            .registerAction(RegModuleImportsAction)
            .registerAction(RegModuleProvidersAction)
            .registerAction(RegModuleResolverAction);

        this.use(RegModuleAction)
            .use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleResolverAction);
    }
}
