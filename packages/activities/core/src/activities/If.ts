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

    protected async execute(): Promise<void> {
        let confg = this.context.config as IfConfigure;
        let condition = await this.resolveExpression(confg.if);
        if (condition) {
            await this.execIf(confg);
        } else {
            await this.execElse(confg);
        }
    }

    protected async execIf(confg: IfConfigure): Promise<void> {
        if (confg.ifBody) {
            await this.execActivity(confg.ifBody, this.context)
        }
    }

    protected async execElse(confg: IfConfigure): Promise<void> {
        if (confg.elseBody) {
            await this.execActivity(confg.elseBody, this.context);
        }
    }

}
