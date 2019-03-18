import { Next } from './Handle';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Singleton } from '@ts-ioc/ioc';

/**
 * register module handle.
 *
 * @export
 * @class RegisterModuleHandle
 * @extends {AnnoationHandle}
 */
@Singleton
export class RegisterModuleHandle extends AnnoationHandle {
    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        ctx.moduleContainer.register(ctx.type);
        await next();
    }
}
