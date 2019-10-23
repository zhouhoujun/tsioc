import { isNullOrUndefined } from '@tsdi/ioc';
import { HandleRegisterer, ResolveHandle, BuildContext } from '@tsdi/boot';
import { TemplateParseScope, TemplateContext } from '../parses';

export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.scope && !ctx.parsing && ctx.template && !ctx.annoation.template) {
            ctx.annoation.template = ctx.template;
        }
        if (ctx.target && ctx.annoation.template) {
            let pCtx = TemplateContext.parse({
                scope: ctx.target,
                template: ctx.annoation.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator,
                raiseContainer: ctx.getContainerFactory()
            });
            await this.container.getInstance(HandleRegisterer)
                .get(TemplateParseScope)
                .execute(pCtx);
            if (!isNullOrUndefined(pCtx.value)) {
                ctx.composite = pCtx.value;
            }
        }
        await next();
    }
}
