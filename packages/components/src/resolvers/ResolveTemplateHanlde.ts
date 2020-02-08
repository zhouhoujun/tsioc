import { isArray } from '@tsdi/ioc';
import { CTX_COMPONENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentContext } from '../ComponentContext';


export const ResolveTemplateHanlde = async function (ctx: IComponentContext, next: () => Promise<void>): Promise<void> {
    ctx.setValue(CTX_COMPONENT, ctx.value);
    let actInjector = ctx.reflects.getActionInjector();
    let compPdr = ctx.componentProvider;
    let pCtx = compPdr.createTemplateContext(ctx.injector, {
        parent: ctx,
        template: ctx.annoation.template
    });

    await actInjector.getInstance(TemplateParseScope)
        .execute(pCtx);

    if (pCtx.value) {
        ctx.setValue(CTX_COMPONENT_REF, isArray(pCtx.value) ?
            compPdr.createComponentRef(ctx.type, ctx.value, ctx, ...pCtx.value)
            : compPdr.createComponentRef(ctx.type, ctx.value, ctx, pCtx.value));
        await next();
    } else {
        ctx.getParent()?.removeChild(ctx);
        ctx.remove(CTX_COMPONENT)
    }
};
