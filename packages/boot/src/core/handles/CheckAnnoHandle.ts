import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';
import { isClass, Singleton } from '@tsdi/ioc';


@Singleton
export class CheckAnnoHandle extends AnnoationHandle {
    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.annoation && isClass(ctx.type)) {
            await next()
        }
    }
}
