import { Singleton, Autorun } from '@ts-ioc/ioc';
import { CompositeHandle } from './CompositeHandle';
import { AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';
import { RegScope } from '../modules';
import { RegisterExportsHandle } from './RegisterExportsHandle';
import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { RegisterGlobalRegisterHandle } from './RegisterGlobalRegisterHandle';

@Singleton
@Autorun('setup')
export class RegisterChildModuleHandle extends CompositeHandle<AnnoationContext> {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.regScope === RegScope.child) {
            super.execute(ctx, next);
        } else {
            await next();
        }
    }

    setup() {
        this.use(RegisterExportsHandle)
            .use(RegisterModuleRegisterHandle)
            .use(RegisterGlobalRegisterHandle);
    }
}
