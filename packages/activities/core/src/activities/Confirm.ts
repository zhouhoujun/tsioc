import { Task } from '../decorators';
import { InjectAcitityToken, Expression, ConfirmConfigure, IActivity } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * Confirm activity token.
 */
export const ConfirmActivityToken = new InjectAcitityToken<ConfirmActivity>('confirm');

/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task(ConfirmActivityToken)
export class ConfirmActivity extends ControlActivity {
    /**
     * Confirm time.
     *
     * @type {Expression<number>}
     * @memberof ConfirmActivity
     */
    confirm: Expression<boolean>;

    /**
     * confirm execute body.
     *
     * @type {IActivity}
     * @memberof ConfirmActivity
     */
    body: IActivity;

    async onActivityInit(config: ConfirmConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.confirm = await this.toExpression(config.confirm, this);
        this.body = await this.buildActivity(config.body);
    }

    protected async execute() {
        let confirm = this.context.exec(this, this.confirm);
        if (confirm) {
            this.body.run(this.context);
        }
    }
}
