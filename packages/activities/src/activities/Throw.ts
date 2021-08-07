import { Input } from '@tsdi/components';
import { Task } from '../metadata/decor';
import { Expression } from '../core/ActivityMetadata';
import { IActivityContext } from '../core/IActivityContext';
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

    execute(ctx: IActivityContext): Promise<Error> {
        return ctx.resolveExpression(this.error);
    }
}
