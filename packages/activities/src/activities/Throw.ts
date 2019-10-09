import { Task } from '../decorators/Task';
import { ActivityContext, Expression } from '../core';
import { Input } from '@tsdi/components';
import { ControlActivity } from './ControlActivity';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task('[throw]')
export class ThrowActivity extends ControlActivity<Error> {

    @Input('throw') error: Expression<Error>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let error = await this.resolveExpression(this.error, ctx);
        throw error;
    }
}
