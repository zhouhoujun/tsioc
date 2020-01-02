import { PromiseUtil } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityContext } from '../core/ActivityContext';
import { TimerActivity } from './TimerActivity';
import { BodyActivity } from './BodyActivity';



/**
 * delay control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task('delay')
export class DelayActivity<T> extends ControlActivity<T> {

    @Input() timer: TimerActivity;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.timer.run(ctx);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, this.timer.result);
        await defer.promise;
        await this.body.run(ctx);
    }
}

