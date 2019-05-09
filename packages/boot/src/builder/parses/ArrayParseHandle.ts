import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isArray } from '@tsdi/ioc';
import { ParseScope } from './ParseScope';

export class ArrayParseHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (isArray(ctx.template) && ctx.binding.type === Array) {
            ctx.bindingValue = await Promise.all(ctx.template.map(async tp => {
                let subCtx = ParseContext.parse(ctx.type, {
                    template: tp,
                    binding: ctx.binding,
                    decorator: ctx.decorator,
                    annoation: ctx.annoation
                 }, ctx.getRaiseContainer());
                await this.container.get(ParseScope).execute(subCtx);
                return subCtx.bindingValue;
            }));
        }

        if (!ctx.bindingValue) {
            await next();
        }

    }
}
