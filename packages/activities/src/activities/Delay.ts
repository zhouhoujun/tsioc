import { PromiseUtil } from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { DelayConfigure, OnActivityInit } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'delay')
export class DelayActivity extends ControlActivity implements OnActivityInit {

    protected async execute(): Promise<any> {
        let config = this.context.config as DelayConfigure;
        let delay = await this.resolveExpression(config.delay);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        await this.execActivity(config.body, this.context);
    }
}

