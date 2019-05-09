import { CompositeHandle } from '../core';
import { BootContextCheckHandle } from './BootContextCheckHandle';
import { BootProvidersHandle } from './BootProvidersHandle';
import { BootDepsHandle } from './BootDepsHandle';
import { BootConfigureLoadHandle } from './BootConfigureLoadHandle';
import { RegisterModuleHandle } from './RegisterModuleHandle';
import { BootConfigureRegisterHandle } from './BootConfigureRegisterHandle';
import { BootContext } from '../BootContext';
import { ResolveBootHandle } from './ResolveBootHandle';
import { ResolveTypeHandle } from './ResolveTypeHandle';
import { BootDecoratorRegisterer } from './BootDecoratorRegisterer';


export class ModuleBuildScope extends CompositeHandle<BootContext> {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (ctx.annoation && ctx.target) {
            await next && next();
        } else {
            await super.execute(ctx, next);
        }
    }

    setup() {
        this.container.register(BootDecoratorRegisterer);
        this.use(BootContextCheckHandle)
            .use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterModuleHandle, true)
            .use(BootConfigureRegisterHandle)
            .use(ResolveTypeHandle)
            .use(ResolveBootHandle);
    }
}
