import { Task, Input } from '../decorators';
import { ActivityContext, Activity, ActivityType } from '../core';
import { PromiseUtil } from '@tsdi/ioc';

/**
 * body activity.
 *
 * @export
 * @class BodyActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('[body]')
export class BodyActivity<T> extends Activity<T> {
    isScope = true;

    @Input()
    protected body: ActivityType[];

    private bodyActions: PromiseUtil.ActionHandle<ActivityContext>[];

    protected async execBody(ctx: ActivityContext, next?: () => Promise<void>) {
        if (!this.bodyActions) {
            this.bodyActions = this.body.map(ac => this.toAction(ac));
        }
        await this.execActions(ctx, this.bodyActions, next);
    }

    protected execute(ctx: ActivityContext): Promise<void> {
        return this.execBody(ctx);
    }
}
