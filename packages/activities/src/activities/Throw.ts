import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Expression } from '../core/ActivityMetadata';
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

    execute(ctx: ActivityContext): Promise<Error> {
        return ctx.resolveExpression(this.error);
    }
}
