import { Defer } from '@ts-ioc/core';
import { Task } from '../decorators';
import { InjectAcitityToken, Expression, DelayConfigure, OnActivityInit, IActivity } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * deloy activity token.
 */
export const DelayActivityToken = new InjectAcitityToken<DelayActivity>('delay');

/**
 * while control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task(DelayActivityToken)
export class DelayActivity extends ControlActivity implements OnActivityInit {

    /**
     * delay time.
     *
     * @type {Expression<number>}
     * @memberof DelayActivity
     */
    delay: Expression<number>;

    /**
     * delay body.
     *
     * @type {IActivity}
     * @memberof DelayActivity
     */
    body?: IActivity;

    async onActivityInit(config: DelayConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.delay = await this.toExpression(config.delay, this);
        if (config.body) {
            this.body = await this.buildActivity(config.body);
        }
    }

    protected async execute(): Promise<any> {
        let delay = await this.context.exec(this, this.delay);
        let defer = new Defer<any>();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        if (this.body) {
            await this.body.run(this.context);
        }
    }
}

