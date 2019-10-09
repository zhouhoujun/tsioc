import { Task } from '../decorators';
import { ActivityContext, Activity } from '../core';
import { Input } from '@tsdi/components';
import { ControlActivity } from './ControlActivity';
import { isFunction } from '@tsdi/ioc';

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
export class ExecuteActivity<T> extends ControlActivity<T> {

    @Input('action')  action: (ctx: ActivityContext, activity?: Activity<T>) => void | Promise<void>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        if (isFunction(this.action)) {
            await this.action(ctx, this);
        }
    }
}
