import { BuildContext } from '@tsdi/boot';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';

export const ParseTemplateHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && !ctx.type && ctx.template) {

        let pCtx = TemplateContext.parse(ctx.injector, {
            parent: ctx,
            template: ctx.template
        });

        let actInjector = ctx.reflects.getActionInjector();

        await actInjector.getInstance(TemplateParseScope)
            .execute(pCtx);

        if (pCtx.value) {
            ctx.value = pCtx.getResultRef();
        }
    }
    await next();
};
