import { isNullOrUndefined, DecoratorProvider, isArray } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { CTX_TEMPLATE_REF, CTX_COMPONENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { RefSelector } from '../RefSelector';


export const ResolveTemplateHanlde = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {

    let annoation = ctx.annoation as IComponentMetadata;
    ctx.set(CTX_COMPONENT, ctx.value);
    let pCtx = TemplateContext.parse(ctx.injector, {
        parent: ctx,
        template: annoation.template
    });

    let actInjector = ctx.reflects.getActionInjector();

    await actInjector.getInstance(TemplateParseScope)
        .execute(pCtx);

    if (!isNullOrUndefined(pCtx.value)) {
        ctx.addChild(pCtx);
        let refSeltor = actInjector.getInstance(DecoratorProvider).resolve(ctx.decorator, RefSelector)
        ctx.set(CTX_COMPONENT_REF, refSeltor.createComponentRef(ctx.type, ctx.value, pCtx, pCtx.get(CTX_TEMPLATE_REF)));
        await next();
    } else {
        ctx.remove(CTX_COMPONENT)
    }
};
