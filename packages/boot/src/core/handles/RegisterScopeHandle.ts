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
        ctx.regScope = ctx.annoation.regScope || RegScope.child;

        let moduleContainers: IContainer[] = [];
        if (!ctx.moduleContainer) {
            switch (ctx.regScope) {
                case RegScope.root:
                    moduleContainers.push(pools.getRoot());
                    break;
                case RegScope.all:
                    moduleContainers = pools.getContainers();
                    break;
                case RegScope.booModule:
                    moduleContainers.push(ctx.getRaiseContainer());
                    break;
                case RegScope.child:
                    moduleContainers.push(pools.create(ctx.getRaiseContainer()));
                    break;
            }
            await PromiseUtil.step(moduleContainers.map(c => () => {
                ctx.moduleContainer = c;
                ctx.setContext(() => c);
                return super.execute(ctx);
            }));
            await next();
        } else {
            await super.execute(ctx, next);
        }
    }


    setup() {
        this.use(RegisterModuleHandle)
            .use(RegisterImportsHandle)
            .use(RegisterModuleProvidersHandle)
            .use(RegisterModuleResolverHandle);
    }

}
