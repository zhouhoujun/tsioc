import { PromiseUtil } from '@tsdi/ioc';
import { ComponentRef } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivity } from './IActivity';
import { Activity } from './Activity';


export class ActivityRef<T = any, TN extends Activity = Activity> extends ComponentRef<T, TN> implements IActivity {

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



/**
 * is acitivty instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvity(target: any): target is IActivity {
    return target instanceof Activity || target instanceof ActivityRef;
}

