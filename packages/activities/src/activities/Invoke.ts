import { Task } from '../decorators/Task';
import { ActivityContext, InvokeTemplate, InvokeTarget, Expression, Activity } from '../core';


/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task('invoke')
export class InvokeActivity<T extends ActivityContext> extends Activity<T> {

    invoke: Expression<InvokeTarget>;
    async init(option: InvokeTemplate<T>) {
        this.invoke = option.invoke;
        await super.init(option);
    }

    async run(ctx: T, next: () => Promise<void>): Promise<void> {
        let invoke = await this.resolveExpression(this.invoke, ctx);
        if (invoke) {
            return this.getContainer().invoke(invoke.target, invoke.method, ...(invoke.args || []));
        }
        await next();
    }
}
