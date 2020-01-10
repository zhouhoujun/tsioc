import { isArray, isNullOrUndefined, IActionSetup } from '@tsdi/ioc';
import { ParsersHandle } from './ParseHandle';
import { BindingValueScope } from './BindingValueScope';
import { ParseContext } from './ParseContext';

/**
 * binding scope.
 *
 * @export
 * @class BindingScope
 * @extends {ParsersHandle}
 */
export class BindingScope extends ParsersHandle implements IActionSetup {

    async execute(ctx: ParseContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.binding) {
            await super.execute(ctx);
        }
        if (next) {
            await next();
        }
    }

    setup() {
        this.use(BindingArrayHandle)
            .use(BindingValueScope)
    }
}

/**
 * binding array handle.
 *
 * @export
 * @class BindingArrayHandle
 * @extends {ParseHandle}
 */
export const BindingArrayHandle = async function (ctx: ParseContext, next: () => Promise<void>): Promise<void> {
    if (ctx.binding.type === Array && isArray(ctx.bindExpression)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(ctx.bindExpression.map(async tp => {
            let subCtx = ParseContext.parse(ctx.injector, {
                type: ctx.type,
                parent: ctx,
                binding: ctx.binding,
                bindExpression: tp,
                template: tp,
                decorator: ctx.decorator
            });
            await actInjector.getInstance(BindingScope).execute(subCtx);
            return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
        }));
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};
