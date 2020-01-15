import { Token, ProviderTypes } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Expression } from '../core/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';
import { Activity } from '../core/Activity';


/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task('invoke')
export class InvokeActivity<T = any> extends Activity<T> {

    @Input() target: Expression<Token>;

    @Input() method: Expression<string>;

    @Input() args: Expression<ProviderTypes[]>;

    async execute(ctx: ActivityContext): Promise<T> {
        let target = await ctx.resolveExpression(this.target);
        let method = await ctx.resolveExpression(this.method);
        let args = await ctx.resolveExpression(this.args);
        if (target && method) {
            return ctx.injector.invoke(target, method, ...(args || []));
        }
    }
}
