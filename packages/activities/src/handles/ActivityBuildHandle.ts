import { CompositeHandle } from '@tsdi/boot';
import { ActivityContext } from '../core';
import { Singleton, Autorun } from '@tsdi/ioc';
import { BuildTemplateHandle } from './BuildTemplateHandle';
import { TaskDecorBootBuildHandle } from './TaskDecorBootBuildHandle';


@Singleton
@Autorun('setup')
export class ActivityBuildHandle extends CompositeHandle<ActivityContext> {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        ctx.template = ctx.template || ctx.annoation.template;
        if (ctx.template) {
            await super.execute(ctx, next);
        } else {
            await next();
        }
    }

    setup() {
        this.use(TaskDecorBootBuildHandle)
            .use(BuildTemplateHandle)
    }
}
