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
@Task(DelayActivityToken, 'delay')
export class DelayActivity extends ControlActivity implements OnActivityInit {

    protected async execute(): Promise<any> {
        let config = this.context.config as DelayConfigure;
        let delay = await this.resolveExpression(config.delay);
        let defer = new Defer<any>();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        await this.execActivity(config.body, this.context);
    }
}

