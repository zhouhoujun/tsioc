import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { IfActivity, IFStateKey } from './If';

/**
 * else if activity.
 *
 * @export
 * @class ElseIfActivity
 * @extends {IfActivity<T>}
 * @template T
 */
@Task('elseif')
export class ElseIfActivity extends IfActivity {
    async execute(ctx: ActivityContext): Promise<void> {
        let currScope = ctx.workflow.status.currentScope;
        if (currScope.context.hasValue(IFStateKey) && !currScope.context.getValue(IFStateKey)) {
            await this.tryExec(ctx);
        }
    }
}
