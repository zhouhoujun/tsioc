import { TemplateParseScope, TemplateContext } from '../parses';
import { BuildHandleRegisterer, ResolveHandle, BuildContext } from '@tsdi/boot';
import { isNullOrUndefined } from '@tsdi/ioc';

export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.annoation.template) {
            let pCtx = TemplateContext.parse({
                scope: ctx.target,
                template: ctx.annoation.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator,
                raiseContainer: ctx.getContainerFactory()
            });
            await this.container
                .get(BuildHandleRegisterer)
                .get(TemplateParseScope)
                .execute(pCtx);
            if (!isNullOrUndefined(pCtx.value)) {
                ctx.component = pCtx.value;
            }
        }
        await next();
    }
}
