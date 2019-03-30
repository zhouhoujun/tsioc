import { AnnoationContext, AnnoationHandle } from './AnnoationHandle';
import { Next } from './Handle';
import { MetaAccessor } from '../services';
import { Singleton } from '@tsdi/ioc';

/**
 * meta accessor handle.
 *
 * @export
 * @class MetaAccessorHandle
 * @extends {AnnoationHandle}
 */
@Singleton
export class MetaAccessorHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {

        if (!ctx.annoation) {
            ctx.annoation = ctx.resolve(MetaAccessor)
                .getMetadata(ctx.type, ctx.getRaiseContainer())
        }

        await next();
    }
}
