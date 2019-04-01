import { Task } from '../decorators/Task';
import { ThrowConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'throw')
export class ThrowActivity extends ControlActivity {

    protected async execute(): Promise<void> {
        let config = this.context.config as ThrowConfigure;
        let error = await this.resolveExpression(config.throw);
        throw error;
    }
}
