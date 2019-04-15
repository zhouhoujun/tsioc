import { BootHandle } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { Singleton } from '@tsdi/ioc';
import { Activity } from './Activity';
import { ActivityOption } from './ActivityOption';

@Singleton
export class ActivityBuildHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target instanceof Activity) {
            await ctx.target.init(ctx.annoation as ActivityOption<any>);
        }
        await next();
    }
}
