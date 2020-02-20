import { isFunction, isString } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Activity } from '../core/Activity';
import { IActivityContext } from '../core/IActivityContext';

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

    @Input('action') action: string | ((ctx: IActivityContext, activity?: Activity) => void | Promise<void>);

    async execute(ctx: IActivityContext): Promise<T> {
        let action = isString(this.action) ? ctx.getExector().eval(this.action) : this.action;
        if (isFunction(action)) {
            return await action(ctx);
        }
    }
}
