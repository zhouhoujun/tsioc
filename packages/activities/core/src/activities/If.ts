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
@Task(IfActivityToken)
export class IfActivity extends ControlActivity {

    /**
     * condition
     *
     * @type {Condition}
     * @memberof IfActivity
     */
    condition: Condition;
    /**
     * if body.
     *
     * @type {IActivity}
     * @memberof IfActivity
     */
    ifBody: IActivity;
    /**
     * else body.
     *
     * @type {IActivity}
     * @memberof IfActivity
     */
    elseBody?: IActivity;

    async onActivityInit(config: IfConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.ifBody = await this.buildActivity(config.ifBody);
        this.condition = await this.toExpression(config.if);
        if (config.elseBody) {
            this.elseBody = await this.buildActivity(config.elseBody);
        }
    }

    protected async execute(): Promise<void> {
        let condition = await this.context.exec(this, this.condition);
        if (condition) {
            await this.execIf();
        } else if (this.elseBody) {
            await this.execElse();
        }
    }

    protected async execIf(): Promise<void> {
        await this.ifBody.run(this.context);
    }

    protected async execElse(): Promise<void> {
        await this.elseBody.run(this.context);
    }

}
