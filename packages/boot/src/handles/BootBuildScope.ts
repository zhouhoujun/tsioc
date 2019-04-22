import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle } from '../core';
import { BootContext } from '../BootContext';
import { ResolveBootScope } from './ResolveBootScope';
import { ModuleBuildScope } from './ModuleBuildScope';

@Singleton
@Autorun('setup')
export class BootBuildScope extends CompositeHandle<BootContext> {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (ctx.bootstrap) {
            await next && next();
        } else {
            await super.execute(ctx, next);
        }
    }

    setup() {
        this.use(ModuleBuildScope)
            .use(ResolveBootScope);
    }
}
