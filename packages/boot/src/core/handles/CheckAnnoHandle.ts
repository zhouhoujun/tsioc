import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';
import { isClass, Singleton } from '@ts-ioc/ioc';


@Singleton
export class CheckAnnoHandle extends AnnoationHandle {
    execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.annoation && isClass(ctx.type)) {
            return next()
        }
        return Promise.resolve();
    }
}
