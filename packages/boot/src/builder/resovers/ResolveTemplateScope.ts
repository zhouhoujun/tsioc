import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { TemplateParseScope, TemplateContext } from '../parses';
import { BuildHandleRegisterer } from '../../core';
import { isNullOrUndefined } from '@tsdi/ioc';

export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.annoation.template) {
            let raiseContainer = ctx.getRaiseContainer();
            let pCtx = TemplateContext.parse(ctx.type, {
                scope: ctx.target,
                template: ctx.annoation.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator
            }, raiseContainer);
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
