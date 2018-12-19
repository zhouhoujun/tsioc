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
@Task(WhileActivityToken)
export class WhileActivity extends ControlActivity {
    /**
     * while condition.
     *
     * @type {Condition}
     * @memberof WhileActivity
     */
    condition: Condition;
    /**
     * while body.
     *
     * @type {IActivity}
     * @memberof WhileActivity
     */
    body: IActivity;

    async onActivityInit(config: WhileConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.body = await this.buildActivity(config.body);
        this.condition = await this.toExpression(config.while);
    }

    protected async execute(): Promise<any> {
        let condition = await this.context.exec(this, this.condition);
        while (condition) {
            await this.execActivity(this.body, this.context);
            condition = await this.context.exec(this, this.condition)
        }
    }
}
