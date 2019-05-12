import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isBaseType, isUndefined } from '@tsdi/ioc';

export class DefaultParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (!isNullOrUndefined(ctx.template)) {
            if (ctx.binding.type && !isBaseType(ctx.binding.type)) {
                let ttype = lang.getClass(ctx.template);
                if (lang.isExtendsClass(ttype, ctx.binding.type)) {
                    ctx.bindingValue = ctx.template;
                }
            } else {
                ctx.bindingValue = ctx.template;
            }
        }
        if (isNullOrUndefined(ctx.bindingValue) && !isUndefined(ctx.binding.defaultValue)) {
            ctx.bindingValue = ctx.binding.defaultValue;
        }

        if (isNullOrUndefined(ctx.bindingValue)) {
            await next();
        }
    }
}
