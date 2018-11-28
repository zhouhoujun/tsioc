import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, Expression, IntervalConfigure, Activity } from '../core';
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
@Task(IntervalActivityToken)
export class IntervalActivity extends ControlActivity {

    /**
     * Interval time.
     *
     * @type {Expression<number>}
     * @memberof IntervalActivity
     */
    interval: Expression<number>;

    /**
     * body.
     *
     * @type {IActivity}
     * @memberof IntervalActivity
     */
    body: IActivity;

    async onActivityInit(config: IntervalConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.interval = await this.toExpression(config.interval);
        this.body = await this.buildActivity(config.body);
    }

    protected async execute(): Promise<void> {
        let interval = await this.context.exec(this, this.interval);
        setInterval(() => {
            this.body.run(this.context);
        }, interval);
    }
}
