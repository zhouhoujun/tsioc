import { Handle, BuildContext } from '@tsdi/boot';
import { Activity } from '../core';
import { isArray } from '@tsdi/ioc';
import { SequenceActivity } from '../activities';

export class BindingTaskTemplateHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.component) {
            if (isArray(ctx.component)) {
                let sequence = this.container.get(SequenceActivity);
                sequence.add(...ctx.component);
                ctx.component = sequence;
            }

            if (ctx.component instanceof Activity && ctx.target) {
                ctx.component.scope = ctx.target;
            }
        }
        await next();
    }
}
