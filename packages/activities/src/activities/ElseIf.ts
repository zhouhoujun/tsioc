import { Task } from '../decorators';
import { ActivityContext } from '../core';
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
export class ElseIfActivity<T = any> extends IfActivity<T> {

    protected async execute(ctx: ActivityContext): Promise<void> {
        let currScope = ctx.status.currentScope;
        if (currScope.has(IFStateKey) && !currScope.get(IFStateKey)) {
            await this.tryExec(ctx);
        }
    }
}
