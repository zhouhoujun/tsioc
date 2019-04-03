import { Task } from '../decorators/Task';
import { SwitchConfigure, ActivityContext, Activity, ActivityType } from '../core';
import { isUndefined } from '@tsdi/ioc';
import { ControlActivity } from './ControlActivity';

@Task
export class CaseActivity<T extends ActivityContext> extends Activity<T> {
    case: any;

}

/**
 * Switch control activity.
 *
 * @export
 * @class SwitchActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'switch'
})
export class SwitchActivity<T extends ActivityContext> extends ControlActivity<T> {

    defaults: ActivityType<T>[];

    addCase(activity: CaseActivity<T>) {
        this.use(activity);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = ctx.config as SwitchConfigure;
        let matchkey = await this.resolveExpression(config.switch);
        let casehandle = this.handles.find(it => it.key === matchkey);
        if (casehandle) {
            await this.execActivity(ctx, casehandle, next);
        } else if (this.defaults.length) {
            await this.execActivity(ctx, ...this.defaults.concat([next]));
        }
    }
}
