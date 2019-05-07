import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined } from '@tsdi/ioc';

export class DefaultParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (isNullOrUndefined(ctx.bindingValue)) {
            ctx.bindingValue = ctx.binding.defaultValue;
        }
        if (isNullOrUndefined(ctx.bindingValue)) {
            await next();
        }
    }
}
