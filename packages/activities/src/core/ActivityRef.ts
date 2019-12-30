import { ComponentRef } from '@tsdi/components';
import { ActivityContext, IActionRun } from './ActivityContext';
import { Activity } from './Activity';
import { PromiseUtil } from '@tsdi/ioc';



export class ActivityRef<T = any, TN extends Activity = Activity> extends ComponentRef<T, TN> implements IActionRun<ActivityContext> {
    async run(ctx: ActivityContext, next?: () => Promise<void>): Promise<void> {
        await ctx.getExector().runActivity(ctx, this.nodeRef.rootNodes, next);
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<T> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: ActivityContext, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }
}


