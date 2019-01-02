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
@Task(DoWhileActivityToken, 'do & while')
export class DoWhileActivity extends ControlActivity {
    /**
     * do while condition.
     *
     * @type {Condition}
     * @memberof DoWhileActivity
     */
    while: Condition;

    async onActivityInit(config: DoWhileConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.while = await this.toExpression(config.while);
    }

    protected async execute(): Promise<any> {
        let config = this.context.config as DoWhileConfigure;
        await this.execActivity(config.do, this.context);
        let condition = await this.context.exec(this, this.while);
        while (condition) {
            await this.execActivity(config.do, this.context);
            condition = await this.context.exec(this, this.while);
        }
    }
}
