import { Task } from '../decorators';
import { ActivityContext, BodyTemplate, Activity, ActivityType } from '../core';
import { PromiseUtil, lang } from '@tsdi/ioc';

/**
 * body activity.
 *
 * @export
 * @class BodyActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('body')
export class BodyActivity<T extends ActivityContext> extends Activity<T> {

    body: ActivityType<T>[];

    private bodyActions: PromiseUtil.ActionHandle<T>[];
    async init(option: BodyTemplate<T>) {
        this.body = option.body || [];
        await super.init(option);
    }

    protected async execBody(ctx: T, next?: () => Promise<void>) {
        if (!this.bodyActions) {
            this.bodyActions = this.body.map(ac => this.toAction(ac));
        }
        await this.execActions(ctx, this.bodyActions, next);
    }

    execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        return this.execBody(ctx, next);
    }
}
