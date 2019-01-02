import { Task } from '../decorators';
import { InjectAcitityToken, Expression, SwitchConfigure } from '../core';
import { isUndefined } from '@ts-ioc/core';
import { ControlActivity } from './ControlActivity';

/**
 * Switch activity token.
 */
export const SwitchActivityToken = new InjectAcitityToken<SwitchActivity>('switch');

/**
 * Switch control activity.
 *
 * @export
 * @class SwitchActivity
 * @extends {ControlActivity}
 */
@Task(SwitchActivityToken, 'switch')
export class SwitchActivity extends ControlActivity {
    /**
     * Switch condition.
     *
     * @type {Expression<any>}
     * @memberof SwitchActivity
     */
    switch: Expression<any>;

    async onActivityInit(config: SwitchConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.switch = await this.toExpression(config.switch);
    }

    protected async execute(): Promise<void> {
        let matchkey = await this.context.exec(this, this.switch);
        let config = this.context.config as SwitchConfigure;
        if (!isUndefined(matchkey)
            && config.cases.length
            && config.cases.some(it => it.key === matchkey)) {
            await this.execActivity(config.cases.find(it => it.key === matchkey).value, this.context);
        } else {
            await this.execActivity(config.defaultBody, this.context);
        }
    }
}
