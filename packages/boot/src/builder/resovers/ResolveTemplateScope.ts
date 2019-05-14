import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { ParseContext, ParseScope } from '../parses';
import { HandleRegisterer, TemplateManager } from '../../core';
import { isNullOrUndefined } from '@tsdi/ioc';

export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.annoation.template) {
            let pCtx = ParseContext.parse(ctx.type, {
                scope: ctx.target,
                template: ctx.annoation.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator
            }, ctx.getRaiseContainer());
            await this.container.get(HandleRegisterer).get(ParseScope).execute(pCtx);
            if (!isNullOrUndefined(pCtx.value)) {
                ctx.getRaiseContainer().get(TemplateManager)
                    .set(ctx.target, pCtx.value);
            }
        }
        if (next) {
            await next();
        }
    }
}
