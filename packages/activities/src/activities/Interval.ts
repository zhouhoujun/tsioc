import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, Expression, IntervalConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * Interval activity token.
 */
export const IntervalActivityToken = new InjectAcitityToken<IntervalActivity>('interval');

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task(IntervalActivityToken, 'interval')
export class IntervalActivity extends ControlActivity {

    protected async execute(): Promise<void> {
        let config = this.context.config as IntervalConfigure;
        let interval = await this.resolveExpression(config.interval);
        setInterval(() => {
            this.execActivity(config.body, this.context);
        }, interval);
    }
}
