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

    protected async execute(ctx: ActivityContext): Promise<void> {
        let target = await this.resolveExpression(this.target, ctx);
        let method = await this.resolveExpression(this.method, ctx);
        let args = await this.resolveExpression(this.args, ctx);
        if (target && method) {
            this.result = ctx.injector.invoke(target, method, ...(args || []));
        }
    }
}
