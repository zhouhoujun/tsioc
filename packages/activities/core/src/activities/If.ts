import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, Condition, IfConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * if activity token.
 */
export const IfActivityToken = new InjectAcitityToken<IfActivity>('if');

/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task(IfActivityToken, 'if')
export class IfActivity extends ControlActivity {

    /**
     * condition
     *
     * @type {Condition}
     * @memberof IfActivity
     */
    condition: Condition;

    async onActivityInit(config: IfConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.condition = await this.toExpression(config.if);
    }

    protected async execute(): Promise<void> {
        let condition = await this.context.exec(this, this.condition);
        if (condition) {
            await this.execIf();
        } else {
            await this.execElse();
        }
    }

    protected async execIf(): Promise<void> {
        let confg = this.context.config as IfConfigure;
        if (confg.ifBody) {
            await this.execActivity(confg.ifBody, this.context)
        }
    }

    protected async execElse(): Promise<void> {
        let confg = this.context.config as IfConfigure;
        if (confg.elseBody) {
            await this.execActivity(confg.elseBody, this.context);
        }
    }

}
