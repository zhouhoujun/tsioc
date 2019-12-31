import { PromiseUtil, lang } from '@tsdi/ioc';
import { ComponentRef } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivity } from './IActivity';
import { Activity } from './Activity';
import { ActivityResult } from './ActivityResult';


export class ActivityRef<T = any, TN extends Activity = Activity> extends ComponentRef<T, TN> implements IActivity<T> {
    isScope = true;

    get name(): string {
        return lang.getClassName(this.componentType);
    }

    private _result: ActivityResult<T>;
    get result(): ActivityResult<T> {
        return this._result;
    }

    async run(ctx: ActivityContext, next?: () => Promise<void>): Promise<void> {
        this._result = ctx.injector.get(ActivityResult) as ActivityResult<T>;
        await ctx.getExector().runActivity(ctx, this.nodeRef.rootNodes, next);
        this.result.value = ctx.result;
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

