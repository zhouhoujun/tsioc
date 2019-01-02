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
    /**
     * while condition.
     *
     * @type {Condition}
     * @memberof WhileActivity
     */
    while: Condition;

    async onActivityInit(config: WhileConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.while = await this.toExpression(config.while);
    }

    protected async execute(): Promise<any> {
        let condition = await this.context.exec(this, this.while);
        let config = this.context.config as WhileConfigure;
        while (condition) {
            await this.execActivity(config.body, this.context);
            condition = await this.context.exec(this, this.while)
        }
    }
}
