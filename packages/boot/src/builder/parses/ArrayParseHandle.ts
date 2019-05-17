import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isArray, isNullOrUndefined } from '@tsdi/ioc';
import { ParseScope } from './ParseScope';
import { HandleRegisterer } from '../../core';

export class ArrayParseHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let registerer = this.container.get(HandleRegisterer);
        if (ctx.binding) {
            if (ctx.binding.type === Array && isArray(ctx.bindExpression)) {
                ctx.value = await Promise.all(ctx.bindExpression.map(async tp => {
                    let subCtx = ParseContext.parse(ctx.type, {
                        scope: ctx.scope,
                        template: tp,
                        decorator: ctx.decorator,
                        annoation: ctx.annoation
                    }, ctx.getRaiseContainer());
                    await registerer.get(ParseScope).execute(subCtx);
                    return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
                }));
            }
        } else if (isArray(ctx.template)) {
            ctx.value = await Promise.all(ctx.template.map(async tp => {
                let subCtx = ParseContext.parse(ctx.type, {
                    scope: ctx.scope,
                    template: tp,
                    decorator: ctx.decorator,
                    annoation: ctx.annoation
                }, ctx.getRaiseContainer());
                await registerer.get(ParseScope).execute(subCtx);
                return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
            }));
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }

    }
}
