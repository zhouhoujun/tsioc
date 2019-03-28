import { Singleton, Autorun, PromiseUtil } from '@ts-ioc/ioc';
import { CompositeHandle } from './CompositeHandle';
import { AnnoationContext } from './AnnoationHandle';
import { ContainerPoolToken } from '../ContainerPool';
import { Next } from './Handle';
import { RegScope } from '../modules';
import { RegisterModuleHandle } from './RegisterModuleHandle';
import { RegisterImportsHandle } from './RegisterImportsHandle';
import { RegisterModuleProvidersHandle } from './RegisterModuleProvidersHandle';
import { RegisterModuleResolverHandle } from './RegisterModuleResolverHandle';
import { IContainer } from '@ts-ioc/core';


@Singleton
@Autorun('setup')
export class RegisterScopeHandle extends CompositeHandle<AnnoationContext> {

    async execute(ctx: AnnoationContext, next?: Next): Promise<void> {
        let pools = ctx.resolve(ContainerPoolToken);
        if (!ctx.regScope) {
            ctx.regScope = ctx.annoation.regScope || RegScope.child;
        }

        let container = ctx.getRaiseContainer();
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
                await super.execute(ctx, next);
            } else if (moduleContainers.length > 1) {
                await PromiseUtil.step(moduleContainers.map(c => () => {
                    ctx.setRaiseContainer(c);
                    return super.execute(ctx);
                }));
                // reset raise
                ctx.setRaiseContainer(container);
                await next();
            }
        }
    }


    setup() {
        this.use(RegisterModuleHandle)
            .use(RegisterImportsHandle)
            .use(RegisterModuleProvidersHandle)
            .use(RegisterModuleResolverHandle);
    }

}
