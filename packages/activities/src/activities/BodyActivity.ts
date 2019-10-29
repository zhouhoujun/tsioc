import { isArray, PromiseUtil } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators';
import { ControlActivity } from './ControlActivity';
import { ActivityType, ActivityContext } from '../core';

/**
 * body activity.
 *
 * @export
 * @class BodyActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('[body]')
export class BodyActivity<T = any> extends ControlActivity<T> {

    private actions: PromiseUtil.ActionHandle<ActivityContext>[];
    @Input('body') activities: ActivityType | ActivityType[];

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.getExector().execActions(ctx, this.getActions());
    }

    protected getActions(): PromiseUtil.ActionHandle<ActivityContext>[] {
        if (!this.actions) {
            this.actions = (isArray(this.activities) ? this.activities : [this.activities]).map(ac => this.getExector().parseAction(ac))
        }
        return this.actions;
    }

}
