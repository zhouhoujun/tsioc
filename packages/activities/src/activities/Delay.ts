import { PromiseUtil } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityContext } from '../core/ActivityContext';
import { TimerActivity } from './TimerActivity';
import { ActivityType } from '../core/ActivityMetadata';



/**
 * delay control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task('delay')
export class DelayActivity extends ControlActivity {

    @Input() timer: TimerActivity;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: ActivityContext): Promise<void> {
        let timeout = await this.timer.execute(ctx);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, timeout);
        await defer.promise;
        await ctx.getExector().runActivity(this.body);
    }
}

