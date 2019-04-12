import { CompositeHandle } from '../core';
import { Singleton, Autorun } from '@tsdi/ioc';
import { BootContextCheckHandle } from './BootContextCheckHandle';
import { BootProvidersHandle } from './BootProvidersHandle';
import { BootDepsHandle } from './BootDepsHandle';
import { BootConfigureLoadHandle } from './BootConfigureLoadHandle';
import { RegisterModuleHandle } from './RegisterModuleHandle';
import { BootConfigureRegisterHandle } from './BootConfigureRegisterHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BootContext } from '../BootContext';

@Singleton
@Autorun('setup')
export class ModuleBuildHandle extends CompositeHandle<BootContext> {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (ctx.annoation && ctx.target) {
            await next && next();
        } else {
            await super.execute(ctx, next);
        }
    }

    setup() {
        this.use(BootContextCheckHandle)
            .use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterModuleHandle)
            .use(BootConfigureRegisterHandle)
            .use(ResolveModuleHandle);
    }
}
