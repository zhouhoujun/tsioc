import { Task } from '../decorators/Task';
import { InjectAcitityToken, SwitchConfigure } from '../core';
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

    protected async execute(): Promise<void> {
        let config = this.context.config as SwitchConfigure;
        let matchkey = await this.resolveExpression(config.switch);
        if (!isUndefined(matchkey)
            && config.cases.length
            && config.cases.some(it => it.key === matchkey)) {
            await this.execActivity(config.cases.find(it => it.key === matchkey).value, this.context);
        } else if (config.defaultBody) {
            await this.execActivity(config.defaultBody, this.context);
        }
    }
}
