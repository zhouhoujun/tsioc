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

    /**
     * Interval time.
     *
     * @type {Expression<number>}
     * @memberof IntervalActivity
     */
    interval: Expression<number>;

    async onActivityInit(config: IntervalConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.interval = await this.toExpression(config.interval);
    }

    protected async execute(): Promise<void> {
        let interval = await this.context.exec(this, this.interval);
        let config = this.context.config as IntervalConfigure;
        setInterval(() => {
            this.execActivity(config.body, this.context);
        }, interval);
    }
}
