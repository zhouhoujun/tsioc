import { Task } from '../decorators/Task';
import { ActivityContext, Expression, Activity } from '../core';
import { Input } from '@tsdi/boot';
import { ControlerActivity } from './ControlerActivity';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task('[throw]')
export class ThrowActivity extends ControlerActivity<Error> {

    constructor(@Input('throw') protected error: Expression<Error>) {
        super()
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        let error = await this.resolveExpression(this.error, ctx);
        throw error;
    }
}
