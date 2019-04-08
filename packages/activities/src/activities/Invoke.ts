import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { Token } from '@tsdi/ioc';
import { ControlActivity } from './ControlActivity';

export interface InvokeTarget {
    target: Token<any>,
    method: string,
    args: any[]
}

/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task('invoke')
export class InvokeActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let invoke = await this.resolveSelector<InvokeTarget>(ctx);
        if (invoke) {
            return this.container.invoke(invoke.target, invoke.method, ...(invoke.args || []));
        }
        await next();
    }
}
