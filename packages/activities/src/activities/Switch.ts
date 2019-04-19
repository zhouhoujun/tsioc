import { Task } from '../decorators/Task';
import { ActivityContext, ActivityType, SwitchTemplate, Expression, Activity } from '../core';
import { isArray } from '@tsdi/ioc';

/**
 * Switch control activity.
 *
 * @export
 * @class SwitchActivity
 * @extends {ControlActivity}
 */
@Task('switch')
export class SwitchActivity<T extends ActivityContext> extends Activity<T> {

    defaults: ActivityType<T>[];
    cases: Map<string | number, ActivityType<T> | ActivityType<T>[]>;
    switch: Expression<string | number>;
    async init(option: SwitchTemplate<T>) {
        this.cases = new Map();
        option.cases.forEach(ca => {
            this.addCase(ca.case, ca.body);
        });
        this.switch = option.switch;
        this.defaults = isArray(option.defaults) ? option.defaults : [option.defaults];
        await super.init(option);
    }

    addCase(key: any, activity: ActivityType<T> | ActivityType<T>[]) {
        this.cases.set(key, activity);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let matchkey = await this.resolveExpression(this.switch, ctx);
        let activity = this.cases.get(matchkey);

        if (activity) {
            await this.execActivity(ctx, activity, next);
        } else if (this.defaults.length) {
            await this.execActivity(ctx, this.defaults, next);
        } else {
            await next();
        }
    }
}
