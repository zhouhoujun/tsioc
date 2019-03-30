import { Singleton, Autorun } from '@tsdi/ioc';
import { RegisterExportsHandle } from './RegisterExportsHandle';
import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { AnnoationContext, CompositeHandle, Next, RegScope } from '../core';

@Singleton
@Autorun('setup')
export class RegisterChildModuleHandle extends CompositeHandle<AnnoationContext> {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.regScope === RegScope.child) {
            await super.execute(ctx, next);
        } else {
            await next();
        }
    }

    setup() {
        this.use(RegisterExportsHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
