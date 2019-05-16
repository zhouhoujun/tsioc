import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isUndefined } from '@tsdi/ioc';

export class DefaultParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (isNullOrUndefined(ctx.template)) {
            if (ctx.binding) {
                ctx.value = ctx.binding.defaultValue;
            }
        } else if (ctx.binding && ctx.binding.type) {
            if (isNullOrUndefined(ctx.value)) {
                let ttype = lang.getClass(ctx.template);
                if (lang.isExtendsClass(ttype, ctx.binding.type)) {
                    ctx.value = ctx.template;
                }
            }
        } else {
            ctx.value = ctx.template;
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
