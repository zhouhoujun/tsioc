import { Task } from '../decorators/Task';
import { ActivityContext, InvokeTargetOption, InvokeTarget, Expression } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task('invoke')
export class InvokeActivity<T extends ActivityContext> extends ControlActivity<T> {

    invoke: Expression<InvokeTarget>;
    async init(option: InvokeTargetOption<T>) {
        this.invoke = option.invoke;
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let invoke = await this.resolveExpression(this.invoke, ctx);
        if (invoke) {
            return this.container.invoke(invoke.target, invoke.method, ...(invoke.args || []));
        }
        await next();
    }
}
