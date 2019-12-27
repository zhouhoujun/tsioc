import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Expression } from '../core/ActivityConfigure';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';

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
