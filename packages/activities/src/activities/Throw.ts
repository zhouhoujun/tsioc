import { Task } from '../decorators/Task';
import { ThrowConfigure, ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'throw'
})
export class ThrowActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = this.context.config as ThrowConfigure;
        let error = await this.resolveExpression(config.throw);
        throw error;
    }
}
