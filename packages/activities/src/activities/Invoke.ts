import { Task } from '../decorators/Task';
import { InjectAcitityToken, InvokeConfigure } from '../core';
import { ParamProviders } from '@ts-ioc/ioc';
import { ControlActivity } from './ControlActivity';

/**
 * while activity token.
 */
export const InvokeActivityToken = new InjectAcitityToken<InvokeActivity>('invoke');

/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task(InvokeActivityToken, 'invoke')
export class InvokeActivity extends ControlActivity {

    protected async execute(): Promise<any> {
        let config = this.context.config as InvokeConfigure;
        if (config.target && config.invoke) {
            let target = await this.resolveExpression(config.target);
            let invoke = await this.resolveExpression(config.invoke);
            let args: ParamProviders[];
            if (config.args) {
                args = await this.resolveExpression(config.args);
            }
            args = args || [];
            return this.container.invoke(target, invoke, ...args);
        }
    }
}
