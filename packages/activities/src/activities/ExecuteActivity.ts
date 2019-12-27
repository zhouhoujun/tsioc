import { isFunction, isString } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators';
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
export class ExecuteActivity<T> extends Activity<T> {

    @Input('action') action: string | ((ctx: ActivityContext, activity?: Activity<T>) => void | Promise<void>);

    protected async execute(ctx: ActivityContext): Promise<void> {
        let action = isString(this.action) ? this.getExector().eval(ctx, this.action) : this.action;
        if (isFunction(action)) {
            this.result.value = await action(ctx, this);
        }
    }
}
