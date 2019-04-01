import { Task } from '../decorators/Task';
import { DoWhileConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'do & while')
export class DoWhileActivity extends ControlActivity {

    protected async execute(): Promise<any> {
        let config = this.context.config as DoWhileConfigure;
        await this.execActivity(config.do, this.context);
        let condition = await this.resolveExpression(config.while);
        while (condition) {
            await this.execActivity(config.do, this.context);
            condition = await this.resolveExpression(config.while);
        }
    }
}
