import { Task } from '../decorators/Task';
import { ActivityContext, ThrowTemplate, Expression, Activity } from '../core';
import { Input } from '../decorators';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task('[throw]')
export class ThrowActivity extends Activity<Error> {

    @Input()
    throw: Expression<Error>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let error = await this.resolveExpression(this.throw, ctx);
        throw error;
    }
}
