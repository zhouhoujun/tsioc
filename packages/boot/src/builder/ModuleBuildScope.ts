import { CompositeHandle } from '../core';
import { BootContext } from '../BootContext';
import { ResolveBootHandle } from './ResolveBootHandle';
import { ResolveTypeHandle } from './ResolveTypeHandle';
import { BootDecoratorRegisterer } from './BootDecoratorRegisterer';


export class ModuleBuildScope extends CompositeHandle<BootContext> {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (ctx.target) {
            await next && next();
        } else {
            await super.execute(ctx, next);
        }
    }

    setup() {
        this.container.register(BootDecoratorRegisterer);
        this.use(ResolveTypeHandle)
            .use(ResolveBootHandle);
    }
}
