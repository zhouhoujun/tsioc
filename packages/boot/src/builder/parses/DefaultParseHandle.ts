import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, isObject, lang } from '@tsdi/ioc';

export class DefaultParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (isObject(ctx.template)) {
            let ttype = lang.getClass(ctx.template);
            if (ttype === ctx.binding.type) {
                ctx.bindingValue = ctx.template;
            }
        }
        if (isNullOrUndefined(ctx.bindingValue)) {
            ctx.bindingValue = ctx.binding.defaultValue;
        }
        if (isNullOrUndefined(ctx.bindingValue)) {
            await next();
        }
    }
}
