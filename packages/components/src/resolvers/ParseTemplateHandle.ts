import { BuildContext } from '@tsdi/boot';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { CTX_COMPONENT_PROVIDER } from '../ComponentProvider';

export const ParseTemplateHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && !ctx.type && ctx.template) {
        let options = {
            parent: ctx,
            template: ctx.template
        };
        let pCtx = ctx.resolve(CTX_COMPONENT_PROVIDER)?.createTemplateContext(ctx.injector, options) ?? TemplateContext.parse(ctx.injector, options);

        let actInjector = ctx.reflects.getActionInjector();

        await actInjector.getInstance(TemplateParseScope)
            .execute(pCtx);

        if (pCtx.value) {
            ctx.value = ctx.getOptions().attr ? pCtx.value : pCtx.getResultRef();
        }
    }
    await next();
};
