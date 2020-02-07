import { isArray, isNullOrUndefined, IActionSetup } from '@tsdi/ioc';
import { BindingValueScope } from './BindingValueScope';
import { BuildHandles } from '@tsdi/boot';
import { IParseContext, CTX_BIND_BINDING, CTX_BIND_EXPRESSION } from './ParseContext';

/**
 * binding scope.
 *
 * @export
 * @class BindingScope
 * @extends {ParsersHandle}
 */
export class BindingScope extends BuildHandles<IParseContext> implements IActionSetup {

    async execute(ctx: IParseContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.hasValue(CTX_BIND_BINDING)) {
            await super.execute(ctx);
        }
        if (next) {
            await next();
        }
        // after all clean.
        ctx.destroy();
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
    let binding = ctx.getValue(CTX_BIND_BINDING);
    let expression = ctx.getValue(CTX_BIND_EXPRESSION);
    if (binding.type === Array && isArray(expression)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(expression.map(async tp => {
            let subCtx = ctx.clone(true).setOptions({
                type: ctx.type,
                parent: ctx,
                binding: binding,
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
