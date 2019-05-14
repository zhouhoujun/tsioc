import { PromiseUtil } from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { Activity, ActivityContext } from '../core';
import { TimerActivity } from './TimerActivity';
import { BodyActivity } from './BodyActivity';
import { Input } from '@tsdi/boot';
import { ControlerActivity } from './ControlerActivity';



/**
 * delay control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task('delay')
export class DelayActivity<T> extends ControlerActivity<T> {

    @Input()
    timer: TimerActivity;

    @Input()
    body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.timer.run(ctx);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, this.timer.result.value);
        await defer.promise;
        await this.body.run(ctx);
    }
}

