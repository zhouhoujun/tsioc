import { Task } from '../decorators';
import { InjectAcitityToken, Expression, ConfirmConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * Confirm activity token.
 */
export const ConfirmActivityToken = new InjectAcitityToken<ConfirmActivity>('confirm');

/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task(ConfirmActivityToken, 'confirm')
export class ConfirmActivity extends ControlActivity {

    protected async execute() {
        let config = this.context.config as ConfirmConfigure;
        let confirm = this.resolveExpression(config.confirm);
        if (confirm) {
            this.execActivity(config.body, this.context);
        }
    }
}
