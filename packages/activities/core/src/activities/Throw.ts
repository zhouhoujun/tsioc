import { Task } from '../decorators';
import { InjectAcitityToken, ThrowConfigure } from '../core';
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
@Task(ThrowActivityToken, 'throw')
export class ThrowActivity extends ControlActivity {

    protected async execute(): Promise<void> {
        let config = this.context.config as ThrowConfigure;
        let error = await this.resolveExpression(config.throw);
        throw error;
    }
}
