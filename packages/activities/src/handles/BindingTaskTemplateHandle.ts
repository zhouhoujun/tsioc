import { Handle, BuildContext } from '@tsdi/boot';
import { Activity } from '../core';

export class BindingTaskTemplateHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.component instanceof Activity && ctx.target) {
            ctx.component.scope = ctx.target;
        }
        await next();
    }
}
