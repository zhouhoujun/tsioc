import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isArray, isNullOrUndefined } from '@tsdi/ioc';
import { ParseScope } from './ParseScope';
import { HandleRegisterer } from '../../core';

export class ArrayParseHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let registerer = this.container.get(HandleRegisterer);
        if (isArray(ctx.template) && ctx.binding && ctx.binding.type === Array) {
            ctx.bindingValue = await Promise.all(ctx.template.map(async tp => {
                let subCtx = ParseContext.parse(ctx.type, {
                    // target: ctx.target,
                    template: tp,
                    binding: ctx.binding,
                    decorator: ctx.decorator,
                    annoation: ctx.annoation
                 }, ctx.getRaiseContainer());
                await registerer.get(ParseScope).execute(subCtx);
                return subCtx.bindingValue;
            }));
        }

        if (isNullOrUndefined(ctx.bindingValue)) {
            await next();
        }

    }
}
