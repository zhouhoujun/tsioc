import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { ParseContext, ParseScope } from '../parses';
import { HandleRegisterer } from '../../core';

export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.annoation.template) {
            let pCtx = ParseContext.parse(ctx.type, {
                // target: ctx.target,
                template: ctx.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator
            }, ctx.getRaiseContainer());
            await this.container.get(HandleRegisterer).get(ParseScope).execute(pCtx);
        }
        if (next) {
            await next();
        }
    }
}
