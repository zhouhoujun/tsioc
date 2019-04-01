import { Task } from '../decorators/Task';
import { IntervalConfigure, Activity } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'interval')
export class IntervalActivity extends ControlActivity {

    protected async execute(): Promise<void> {
        let config = this.context.config as IntervalConfigure;
        let interval = await this.resolveExpression(config.interval);
        setInterval(() => {
            this.execActivity(config.body, this.context);
        }, interval);
    }
}
