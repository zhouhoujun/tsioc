import { BootHandle } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { Singleton, isArray } from '@tsdi/ioc';
import { Activity } from './Activity';
import { Activities } from './ActivityOption';

@Singleton
export class ActivityBuildHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target instanceof Activity) {
            let ann = ctx.annoation;
            let option = isArray(ann.template) ? { body: ann.template, activity: Activities.sequence } : ann.template;
            await ctx.target.init(option);
        }
        await next();
    }
}
