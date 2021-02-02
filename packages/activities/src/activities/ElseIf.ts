import { Task } from '../decor';
import { IActivityContext } from '../core/IActivityContext';
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
    async execute(ctx: IActivityContext): Promise<void> {
        let currScope = ctx.runScope;
        if (currScope.hasValue(IFStateKey) && !currScope.getValue(IFStateKey)) {
            await this.tryExec(ctx);
        }
    }
}
