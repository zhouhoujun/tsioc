import { Task } from '../decorators/Task';
import { InvokeConfigure, ActivityContext } from '../core';
import { ParamProviders } from '@tsdi/ioc';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'invoke'
})
export class InvokeActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = ctx.config as InvokeConfigure;
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
        await next();
    }
}
