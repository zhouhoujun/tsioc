import { Singleton } from '@ts-ioc/ioc';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';

@Singleton
export class RegisterImportsHandle extends AnnoationHandle {
    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.annoation.imports) {
            await ctx.moduleContainer.loadModule(...ctx.annoation.imports);
        }
        await next();
    }
}
