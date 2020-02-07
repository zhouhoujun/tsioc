import { isArray } from '@tsdi/ioc';
import { CTX_COMPONENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentContext } from '../ComponentContext';


export const ResolveTemplateHanlde = async function (ctx: IComponentContext, next: () => Promise<void>): Promise<void> {

    let actInjector = ctx.reflects.getActionInjector();
    let compPdr = ctx.componentProvider;
    let pCtx = compPdr.createTemplateContext(ctx.injector, {
        parent: ctx,
        template: ctx.annoation.template
    });

    pCtx.setValue(CTX_COMPONENT, ctx.value);
    await actInjector.getInstance(TemplateParseScope)
        .execute(pCtx);

    if (!pCtx.destroyed) {
        ctx.addChild(pCtx);
        ctx.setValue(CTX_COMPONENT_REF, isArray(pCtx.value) ?
            compPdr.createComponentRef(ctx.type, ctx.value, ctx, ...pCtx.value)
            : compPdr.createComponentRef(ctx.type, ctx.value, ctx, pCtx.value));
        await next();
    } else {
        ctx.remove(CTX_COMPONENT)
    }
};
