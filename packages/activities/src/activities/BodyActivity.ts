import { Task } from '../decorators';
import { ActivityContext, BodyTemplate, Activity, ActivityType, ActivityResult, ActivityConfigure, BodyConfigure } from '../core';
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

    protected body: ActivityType[];

    private bodyActions: PromiseUtil.ActionHandle<ActivityContext>[];

    onActivityInit(option: BodyConfigure) {
        super.onActivityInit(option);
        this.body = option.body || [];
    }

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
