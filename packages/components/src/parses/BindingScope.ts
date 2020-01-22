import { isArray, isNullOrUndefined, IActionSetup } from '@tsdi/ioc';
import { ParsersHandle } from './ParseHandle';
import { BindingValueScope } from './BindingValueScope';
import { IParseContext } from './ParseContext';

/**
 * binding scope.
 *
 * @export
 * @class BindingScope
 * @extends {ParsersHandle}
 */
export class BindingScope extends ParsersHandle implements IActionSetup {

    async execute(ctx: IParseContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.binding) {
            await super.execute(ctx);
        }
        if (next) {
            await next();
        }
        // after all clean.
        if (isNullOrUndefined(ctx.value)) {
            ctx.destroy();
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
export const BindingArrayHandle = async function (ctx: IParseContext, next: () => Promise<void>): Promise<void> {
    if (ctx.binding.type === Array && isArray(ctx.bindExpression)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(ctx.bindExpression.map(async tp => {
            let subCtx =  ctx.clone(true).setOptions({
                type: ctx.type,
                parent: ctx,
                binding: ctx.binding,
                bindExpression: tp,
                template: tp
            });
            await actInjector.getInstance(BindingScope).execute(subCtx);
            return subCtx.value ?? tp;
        }));
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};
