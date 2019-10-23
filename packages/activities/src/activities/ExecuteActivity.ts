import { isFunction } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators';
import { ActivityContext, Activity } from '../core';
import { ControlActivity } from './ControlActivity';

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
