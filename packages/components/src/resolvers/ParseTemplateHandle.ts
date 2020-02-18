import { IBuildContext } from '@tsdi/boot';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { CTX_COMPONENT_PROVIDER } from '../ComponentProvider';
import { IComponentOption } from '../ComponentContext';

export const ParseTemplateHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    let template = ctx.getTemplate();
    if (!ctx.value && !ctx.type && template) {
        let options = {
            parent: ctx,
            template: template
        };
        let pCtx = ctx.getContextValue(CTX_COMPONENT_PROVIDER)?.createTemplateContext(ctx.injector, options) ?? TemplateContext.parse(ctx.injector, options) ;

        let actInjector = ctx.reflects.getActionInjector();

        await actInjector.getInstance(TemplateParseScope)
            .execute(pCtx);

        if (pCtx.value) {
            ctx.value = (<IComponentOption>ctx.getOptions()).attr ? pCtx.value : pCtx.getResultRef();
        }
    }
    await next();
};
