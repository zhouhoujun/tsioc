import { ParsersHandle, ParseHandle } from './ParseHandle';
import { BindingValueScope } from './BindingValueScope';
import { ParseContext } from './ParseContext';
import { HandleRegisterer } from '../../core';
import { isArray, isNullOrUndefined } from '@tsdi/ioc';

export class BindingScope extends ParsersHandle {

    setup() {

        this.use(BindingArrayHandle)
            .use(BindingValueScope, true)
    }
}


export class BindingArrayHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let registerer = this.container.get(HandleRegisterer);
        if (ctx.binding) {
            if (ctx.binding.type === Array && isArray(ctx.bindExpression)) {
                ctx.value = await Promise.all(ctx.bindExpression.map(async tp => {
                    let subCtx = ParseContext.parse(ctx.type, {
                        scope: ctx.scope,
                        bindExpression: tp,
                        template: tp,
                        decorator: ctx.decorator,
                        annoation: ctx.annoation
                    }, ctx.getRaiseContainer());
                    await registerer.get(BindingScope).execute(subCtx);
                    return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
                }));
            }
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }

    }
}
