import { Task } from '../decorators/Task';
import { ActivityContext, Expression, Activity } from '../core';
import { Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task('[throw]')
export class ThrowActivity extends Activity<Error> {

    constructor(
        @Inject('[throw]') protected error: Expression<Error>,
        @Inject(ContainerToken) container: IContainer) {
        super(container)
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        let error = await this.resolveExpression(this.error, ctx);
        throw error;
    }
}
