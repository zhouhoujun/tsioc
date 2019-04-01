import { Task } from '../decorators/Task';
import { WhileConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'while & body')
export class WhileActivity extends ControlActivity {

    protected async execute(): Promise<any> {
        let config = this.context.config as WhileConfigure;
        let condition = await this.resolveExpression(config.while);
        while (condition) {
            await this.execActivity(config.body, this.context);
            condition = await this.resolveExpression(config.while);
        }
    }
}
