import { Task } from '../decorators';
import { InjectAcitityToken, Expression, ThrowConfigure } from '../core';
import { ControlActivity } from './ControlActivity';
/**
 * throw activity token.
 */
export const ThrowActivityToken = new InjectAcitityToken<ThrowActivity>('throw');

/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task(ThrowActivityToken, 'exception')
export class ThrowActivity extends ControlActivity {
    /**
     * throw exception error.
     *
     * @type {Condition}
     * @memberof ThrowActivity
     */
    exception: Expression<Error>;

    async onActivityInit(config: ThrowConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.exception = await this.toExpression(config.exception);
    }

    protected async execute(): Promise<void> {
        let error = await this.context.exec(this, this.exception);
        throw error;
    }
}
