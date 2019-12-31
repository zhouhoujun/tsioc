import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { BodyActivity } from './BodyActivity';
import { IFStateKey } from './If';

/**
 * else activity.
 *
 * @export
 * @class ElseActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('else')
export class ElseActivity<T> extends ControlActivity<T> {

    @Input() body: BodyActivity<T>;
    protected async execute(ctx: ActivityContext): Promise<void> {
        let currScope = ctx.status.currentScope;
        if (currScope.has(IFStateKey) && !currScope.get(IFStateKey)) {
            await this.body.run(ctx);
        }
    }
}
