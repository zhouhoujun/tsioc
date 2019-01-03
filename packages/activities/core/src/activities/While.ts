import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, Condition, WhileConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while activity token.
 */
export const WhileActivityToken = new InjectAcitityToken<WhileActivity>('while');

/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task(WhileActivityToken, 'while & body')
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
