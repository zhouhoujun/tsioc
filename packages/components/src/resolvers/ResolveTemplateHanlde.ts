import { isNullOrUndefined, isArray } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { CTX_COMPONENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { ComponentProvider } from '../ComponentProvider';


export const ResolveTemplateHanlde = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {

    let annoation = ctx.annoation as IComponentMetadata;
    ctx.setValue(CTX_COMPONENT, ctx.value);
    let actInjector = ctx.reflects.getActionInjector();
    let compPdr = ctx.targetReflect.getDecorProviders().getInstance(ComponentProvider);
    let pCtx = compPdr.createTemplateContext(ctx.injector, {
        parent: ctx,
        template: annoation.template
    });

    await actInjector.getInstance(TemplateParseScope)
        .execute(pCtx);

    if (!isNullOrUndefined(pCtx.value)) {
        ctx.addChild(pCtx);
        ctx.setValue(CTX_COMPONENT_REF, isArray(pCtx.value) ?
            compPdr.createComponentRef(ctx.type, ctx.value, ctx, ...pCtx.value)
            : compPdr.createComponentRef(ctx.type, ctx.value, ctx, pCtx.value));
        await next();
    } else {
        ctx.remove(CTX_COMPONENT)
    }
};
