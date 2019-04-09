import { Task } from '../decorators/Task';
import { ActivityContext, ActivityType, Activity } from '../core';
import { ControlActivity } from './ControlActivity';

@Task('case')
export abstract class CaseActivity<T extends ActivityContext> extends Activity<T> {
    case: any;
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {

    }

}

/**
 * Switch control activity.
 *
 * @export
 * @class SwitchActivity
 * @extends {ControlActivity}
 */
@Task('switch')
export class SwitchActivity<T extends ActivityContext> extends ControlActivity<T> {

    defaults: ActivityType<T>[];

    addCase(activity: CaseActivity<T>) {
        this.use(activity);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let matchkey = await this.resolveSelector<any>(ctx);
        let casehandle = this.activities.find(it => it instanceof CaseActivity && it.case === matchkey);
        if (casehandle) {
            await this.execActivity(ctx, casehandle, next);
        } else if (this.defaults.length) {
            await this.execActivity(ctx, ...this.defaults.concat([next]));
        }
    }
}
