import { isFunction, isString } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Activity } from '../core/Activity';
import { ActivityContext } from '../core/ActivityContext';

/**
 * execute activity.
 *
 * @export
 * @abstract
 * @class ExecuteActivity
 * @extends {ExecuteActivity<T>}
 * @template T
 */
@Task('execute')
export class ExecuteActivity extends Activity {

    @Input('action') action: string | ((ctx: ActivityContext, activity?: Activity) => void | Promise<void>);

    async execute(ctx: ActivityContext): Promise<void> {
        let action = isString(this.action) ? ctx.getExector().eval(this.action) : this.action;
        if (isFunction(action)) {
            await action(ctx, this);
        }
    }
}
