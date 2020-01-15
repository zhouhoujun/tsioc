import { isNullOrUndefined, DecoratorProvider, isArray } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { CTX_COMPONENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { ComponentProvider } from '../ComponentProvider';


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
        let refSeltor = actInjector.getInstance(DecoratorProvider).resolve(ctx.decorator, ComponentProvider)
        ctx.set(CTX_COMPONENT_REF, isArray(pCtx.value) ?
            refSeltor.createComponentRef(ctx.type, ctx.value, ctx, ...pCtx.value)
            : refSeltor.createComponentRef(ctx.type, ctx.value, ctx, pCtx.value));
        await next();
    } else {
        ctx.remove(CTX_COMPONENT)
    }
};
