import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, Condition, DoWhileConfigure } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * do while activity token.
 */
export const DoWhileActivityToken = new InjectAcitityToken<DoWhileActivity>('dowhile');

/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ControlActivity}
 */
@Task(DoWhileActivityToken)
export class DoWhileActivity extends ControlActivity {
    /**
     * do while condition.
     *
     * @type {Condition}
     * @memberof DoWhileActivity
     */
    condition: Condition;
    /**
     * do while body.
     *
     * @type {IActivity}
     * @memberof DoWhileActivity
     */
    body: IActivity;

    async onActivityInit(config: DoWhileConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.body = await this.buildActivity(config.do);
        this.condition = await this.toExpression(config.while);
    }

    protected async execute(): Promise<any> {
        await this.execActivity(this.body, this.context);
        let condition = await this.context.exec(this, this.condition);
        while (condition) {
            await this.execActivity(this.body, this.context);
            condition = await this.context.exec(this, this.condition);
        }
    }
}
