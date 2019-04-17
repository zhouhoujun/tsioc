import { BootHandle } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { Singleton, isArray, isClass, isFunction } from '@tsdi/ioc';
import { Activity } from './Activity';
import { Activities } from './ActivityConfigure';

@Singleton
export class ActivityBuildHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target instanceof Activity) {
            let template = ctx.template || ctx.annoation.template;
            let option = isArray(template) ? { body: template, activity: Activities.sequence } : template;
            if (isClass(option) || isFunction(option)) {
                await ctx.target.init({ body: [option], activity: Activities.sequence })
            } else {
                await ctx.target.init(option);
            }
        }
        await next();
    }
}
