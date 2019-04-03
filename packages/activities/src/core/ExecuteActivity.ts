import { Task } from '../decorators/Task';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';
import { PromiseUtil } from '@tsdi/ioc';


/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task({
    selector: 'execute'
})
export class ExecuteActivity<T extends ActivityContext> extends Activity<T>  {

    constructor(protected action: PromiseUtil.ActionHandle<T>) {
        super();
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        await this.execFuncs(ctx, [this.action], next);
    }
}
