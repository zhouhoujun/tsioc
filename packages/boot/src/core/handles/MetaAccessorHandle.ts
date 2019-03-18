import { AnnoationContext, AnnoationHandle } from './AnnoationHandle';
import { Next } from './Handle';
import { MetaAccessor } from '../services';
import { Singleton } from '@ts-ioc/ioc';

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

        ctx.annoation = ctx.resolve(MetaAccessor)
            .getMetadata(ctx.token, ctx.getRaiseContainer())
        if (!ctx.annoation) {
            await next();
        }

    }
}
