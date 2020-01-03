import { isNullOrUndefined, DecoratorProvider } from '@tsdi/ioc';
import { ResolveHandle, BuildContext } from '@tsdi/boot';
import { CTX_TEMPLATE_REF, CTX_COMPONENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { RefSelector } from '../RefSelector';


export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let options = ctx.getOptions();
        let annoation = ctx.annoation as IComponentMetadata;
        if (!options.scope && !options.parsing && options.template && !annoation.template) {
            annoation.template = options.template;
        }
        if (ctx.target && annoation.template) {
            let pCtx = TemplateContext.parse(ctx.injector, {
                scope: ctx.target,
                template: annoation.template,
                annoation: annoation,
                decorator: ctx.decorator
            });

            await this.actInjector.getInstance(TemplateParseScope)
                .execute(pCtx);

            if (!isNullOrUndefined(pCtx.value)) {
                pCtx.setParent(ctx);
                ctx.addChild(pCtx);
                let refSeltor = this.actInjector.getInstance(DecoratorProvider).resolve(pCtx.decorator, RefSelector)
                pCtx.set(CTX_TEMPLATE_REF, pCtx.value);
                ctx.set(CTX_COMPONENT, ctx.target);
                ctx.set(CTX_COMPONENT_REF, refSeltor.createComponentRef(ctx.type, ctx.target, pCtx, pCtx.value));
            }
        }
        await next();
    }
}
