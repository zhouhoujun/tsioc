import { Task } from '../decorators/Task';
import { ConfirmConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'confirm')
export class ConfirmActivity extends ControlActivity {

    protected async execute() {
        let config = this.context.config as ConfirmConfigure;
        let confirm = this.resolveExpression(config.confirm);
        if (confirm) {
            this.execActivity(config.body, this.context);
        }
    }
}
