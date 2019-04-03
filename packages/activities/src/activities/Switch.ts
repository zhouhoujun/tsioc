import { Task } from '../decorators/Task';
import { SwitchConfigure, ActivityContext, Activity } from '../core';
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

    addCase(activity: CaseActivity<T>) {
        this.use(activity);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = ctx.config as SwitchConfigure;
        let matchkey = await this.resolveExpression(config.switch);
        if (!isUndefined(matchkey)
            && config.cases.length
            && this.handles.some(it => it.case === matchkey)) {
            await this.execActivity(ctx, config.cases.find(it => it.key === matchkey).value);
        } else if (config.defaultBody) {
            await this.execActivity(ctx, config.defaultBody);
        }
    }
}
