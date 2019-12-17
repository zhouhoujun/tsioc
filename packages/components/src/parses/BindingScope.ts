import { isArray, isNullOrUndefined, IActionSetup } from '@tsdi/ioc';
import { ParsersHandle, ParseHandle } from './ParseHandle';
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
export class BindingArrayHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (ctx.binding.type === Array && isArray(ctx.bindExpression)) {
            let options = ctx.getOptions();
            ctx.value = await Promise.all(ctx.bindExpression.map(async tp => {
                let subCtx = ParseContext.parse({
                    module: ctx.module,
                    scope: options.scope,
                    binding: ctx.binding,
                    bindExpression: tp,
                    template: tp,
                    decorator: ctx.decorator
                }, ctx.getFactory());
                await this.actInjector.get(BindingScope).execute(subCtx);
                return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
            }));
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
