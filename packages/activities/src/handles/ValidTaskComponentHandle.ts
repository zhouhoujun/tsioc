import { Handle, BuildContext } from '@tsdi/boot';
import { isArray } from '@tsdi/ioc';
import { SequenceActivity, ParallelActivity } from '../activities';

export class ValidTaskComponentHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.component) {
            if (isArray(ctx.component)) {
                // if (ctx.target instanceof SequenceActivity || ctx.target instanceof ParallelActivity) {
                //     ctx.target.add(...ctx.component);
                //     ctx.component = null;
                // } else {
                    let sequence = this.container.get(SequenceActivity);
                    sequence.add(...ctx.component);
                    ctx.component = sequence;
                // }
            }
        }
        await next();
    }
}
