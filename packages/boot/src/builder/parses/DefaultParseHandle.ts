import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isBaseType, isUndefined } from '@tsdi/ioc';

export class DefaultParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (ctx.binding && ctx.binding.type) {
            if (ctx.scope && !isNullOrUndefined(ctx.scope[ctx.binding.name])) {
                let sval = ctx.scope[ctx.binding.name];
                if (lang.isExtendsClass(lang.getClass(sval), ctx.binding.type)) {
                    ctx.value = sval;
                }
            }
            if (isNullOrUndefined(ctx.value)) {
                let ttype = lang.getClass(ctx.template);
                if (lang.isExtendsClass(ttype, ctx.binding.type)) {
                    ctx.value = ctx.template;
                }
            }
        } else {
            ctx.value = ctx.template;
        }

        if (ctx.binding && isNullOrUndefined(ctx.value) && !isUndefined(ctx.binding.defaultValue)) {
            ctx.value = ctx.binding.defaultValue;
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
